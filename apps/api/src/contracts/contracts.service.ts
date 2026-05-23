import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import {
  leaseContracts, tenants, units, shopProfiles, floors, buildings, organizations, users,
} from '@mallguide/shared';
import type { JwtPayload } from '@mallguide/shared';

function dateToIso(v: unknown): string | null {
  if (v == null) return null;
  // Accept Date, ISO string, or anything String()able that parses to a date.
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function dateToIsoDate(v: unknown): string | null {
  const s = dateToIso(v);
  return s ? s.slice(0, 10) : null;
}

interface AssignWithContractInput {
  unitId: string;
  // Tenant + shop
  legalName:       string;
  tradeName:       string;
  publicName:      string;
  category?:       string | null;
  description?:    string | null;
  contactEmail?:   string | null;
  contactPhone?:   string | null;
  contactWhatsapp?:string | null;
  // Lease terms
  monthlyRent:     number;
  currency?:       string;
  depositAmount?:  number | null;
  leaseStart:      string;  // ISO date YYYY-MM-DD
  leaseEnd?:       string | null;
  rentDueDay?:     number;
  annualEscalationPct?: number | null;
  permittedUse?:   string | null;
  noticePeriodDays?: number;
  // Free-form extra clauses entered by the building owner
  extraClauses?:   string | null;
}

@Injectable()
export class ContractsService {
  constructor(private db: DatabaseService) {}

  /**
   * Single atomic action: creates the tenant + shop profile + leases the unit
   * + drafts a lease contract. The contract is returned and must be signed
   * separately (by owner first, then tenant).
   */
  async assignWithContract(caller: JwtPayload, input: AssignWithContractInput) {
    if (!caller.orgId) throw new ForbiddenException('Caller has no organisation.');
    if (input.monthlyRent <= 0) throw new BadRequestException('Monthly rent must be greater than 0.');
    if (!input.leaseStart) throw new BadRequestException('Lease start date is required.');

    return this.db.db.transaction(async (tx) => {
      // 1. Unit must be vacant
      const [unit] = await tx
        .select({
          id: units.id,
          status: units.status,
          buildingId: units.buildingId,
          floorId: units.floorId,
          unitCode: units.unitCode,
          areaSqm: units.areaSqm,
        })
        .from(units)
        .where(eq(units.id, input.unitId))
        .limit(1);
      if (!unit) throw new NotFoundException('Unit not found.');
      if (unit.status !== 'vacant') {
        throw new BadRequestException(`Unit is currently ${unit.status}. Free it before reassigning.`);
      }

      // 2. Look up building + org + floor for contract context
      const [building] = await tx.select().from(buildings).where(eq(buildings.id, unit.buildingId)).limit(1);
      const [floor]    = await tx.select().from(floors).where(eq(floors.id, unit.floorId)).limit(1);
      const [org]      = await tx.select().from(organizations).where(eq(organizations.id, caller.orgId!)).limit(1);
      if (!building || !floor || !org) throw new NotFoundException('Building / floor / organisation not found.');

      // 3. Insert tenant
      const currency = input.currency ?? 'USD';
      const [tenant] = await tx.insert(tenants).values({
        orgId: caller.orgId!,
        legalName: input.legalName.trim(),
        tradeName: input.tradeName.trim(),
        contactEmail:    input.contactEmail ?? null,
        contactPhone:    input.contactPhone ?? null,
        contactWhatsapp: input.contactWhatsapp ?? input.contactPhone ?? null,
        monthlyRent:     String(input.monthlyRent),
        currency,
        depositAmount:   input.depositAmount != null ? String(input.depositAmount) : null,
        leaseStart:      input.leaseStart,
        leaseEnd:        input.leaseEnd ?? null,
      }).returning();
      if (!tenant) throw new Error('Failed to create tenant.');

      // 4. Insert shop profile
      const [shop] = await tx.insert(shopProfiles).values({
        tenantId:    tenant.id,
        unitId:      input.unitId,
        publicName:  input.publicName.trim(),
        description: input.description ?? null,
        category:    input.category ?? null,
        isPublished: true,
      }).returning();
      if (!shop) throw new Error('Failed to create shop profile.');

      // 5. Mark unit occupied + assign tenant
      await tx.update(units)
        .set({ status: 'occupied', tenantId: tenant.id, updatedAt: new Date() })
        .where(eq(units.id, input.unitId));

      // 6. Generate a contract number — building slug + year + 4-digit sequence
      const yr = new Date().getFullYear();
      const buildingPrefix = (building.slug ?? 'BLD').slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const countRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(leaseContracts)
        .where(and(
          eq(leaseContracts.orgId, caller.orgId!),
          sql`EXTRACT(year FROM ${leaseContracts.createdAt}) = ${yr}`,
        ));
      const seq = ((countRows[0]?.count) ?? 0) + 1;
      const contractNumber = `${buildingPrefix}-${yr}-${String(seq).padStart(4, '0')}`;

      // 7. Build the structured terms blob — the source of truth for the
      // rendered contract document
      const terms = {
        landlord: {
          name:    org.name,
          address: building.address ?? null,
          building: building.name,
        },
        tenant: {
          legalName: input.legalName.trim(),
          tradeName: input.tradeName.trim(),
          email:     input.contactEmail ?? null,
          phone:     input.contactPhone ?? null,
        },
        premises: {
          unitCode:    unit.unitCode,
          floorName:   floor.name,
          floorNumber: floor.floorNumber,
          areaSqm:     unit.areaSqm ? Number(unit.areaSqm) : null,
          permittedUse: input.permittedUse ?? input.category ?? null,
        },
        financial: {
          monthlyRent: input.monthlyRent,
          currency,
          depositAmount: input.depositAmount ?? null,
          rentDueDay:    input.rentDueDay ?? 1,
          annualEscalationPct: input.annualEscalationPct ?? null,
        },
        term: {
          start: input.leaseStart,
          end:   input.leaseEnd ?? null,
          noticePeriodDays: input.noticePeriodDays ?? 60,
        },
        extraClauses: input.extraClauses ?? null,
      };

      // 8. Create the draft contract
      const [contract] = await tx.insert(leaseContracts).values({
        orgId:    caller.orgId!,
        tenantId: tenant.id,
        unitId:   input.unitId,
        contractNumber,
        monthlyRent:    String(input.monthlyRent),
        currency,
        depositAmount:  input.depositAmount != null ? String(input.depositAmount) : null,
        leaseStart:     input.leaseStart,
        leaseEnd:       input.leaseEnd ?? null,
        rentDueDay:     input.rentDueDay ?? 1,
        annualEscalationPct: input.annualEscalationPct != null ? String(input.annualEscalationPct) : null,
        permittedUse:   input.permittedUse ?? input.category ?? null,
        noticePeriodDays: input.noticePeriodDays ?? 60,
        terms,
        status: 'draft',
      }).returning();
      if (!contract) throw new Error('Failed to create contract.');

      return { contract, tenant, shop };
    });
  }

  async byId(contractId: string) {
    const [row] = await this.db.db
      .select({
        contract: leaseContracts,
        tenantTradeName: tenants.tradeName,
        tenantLegalName: tenants.legalName,
        unitCode: units.unitCode,
        floorName: floors.name,
        buildingName: buildings.name,
        orgName: organizations.name,
        ownerSignerEmail: users.email,
      })
      .from(leaseContracts)
      .innerJoin(tenants, eq(tenants.id, leaseContracts.tenantId))
      .innerJoin(units, eq(units.id, leaseContracts.unitId))
      .innerJoin(floors, eq(floors.id, units.floorId))
      .innerJoin(buildings, eq(buildings.id, units.buildingId))
      .innerJoin(organizations, eq(organizations.id, leaseContracts.orgId))
      .leftJoin(users, eq(users.id, leaseContracts.ownerSignedBy))
      .where(eq(leaseContracts.id, contractId))
      .limit(1);

    if (!row) throw new NotFoundException('Contract not found.');

    const c = row.contract;
    return {
      ...c,
      monthlyRent:    Number(c.monthlyRent),
      depositAmount:  c.depositAmount   ? Number(c.depositAmount)   : null,
      annualEscalationPct: c.annualEscalationPct ? Number(c.annualEscalationPct) : null,
      // lease_start/end are already strings (date mode: 'string')
      leaseStart: c.leaseStart,
      leaseEnd:   c.leaseEnd,
      ownerSignedAt:   dateToIso(c.ownerSignedAt),
      tenantSignedAt:  dateToIso(c.tenantSignedAt),
      createdAt:       dateToIso(c.createdAt) ?? '',
      updatedAt:       dateToIso(c.updatedAt) ?? '',
      // joined display fields
      tenantTradeName: row.tenantTradeName,
      tenantLegalName: row.tenantLegalName,
      unitCode:        row.unitCode,
      floorName:       row.floorName,
      buildingName:    row.buildingName,
      orgName:         row.orgName,
      ownerSignerEmail: row.ownerSignerEmail,
    };
  }

  async listByTenant(tenantId: string) {
    const rows = await this.db.db
      .select()
      .from(leaseContracts)
      .where(eq(leaseContracts.tenantId, tenantId))
      .orderBy(desc(leaseContracts.createdAt));
    return rows.map((c) => ({
      ...c,
      monthlyRent:    Number(c.monthlyRent),
      depositAmount:  c.depositAmount ? Number(c.depositAmount) : null,
      leaseStart: c.leaseStart,
      leaseEnd:   c.leaseEnd,
      ownerSignedAt:  dateToIso(c.ownerSignedAt),
      tenantSignedAt: dateToIso(c.tenantSignedAt),
      createdAt:      dateToIso(c.createdAt) ?? '',
    }));
  }

  /** Owner side: signs the contract. Transitions draft → pending_tenant. */
  async signByOwner(caller: JwtPayload, contractId: string, fullName: string) {
    if (!caller.orgId) throw new ForbiddenException('Caller has no organisation.');

    return this.db.db.transaction(async (tx) => {
      const [c] = await tx.select().from(leaseContracts).where(eq(leaseContracts.id, contractId)).limit(1);
      if (!c) throw new NotFoundException('Contract not found.');
      if (c.orgId !== caller.orgId) throw new ForbiddenException('Not your contract.');
      if (c.status !== 'draft' && c.status !== 'pending_tenant') {
        throw new BadRequestException(`Contract is ${c.status}; cannot sign.`);
      }

      // Generate a tenant signing token if not already set
      const token = c.tenantSignToken ?? randomUUID().replace(/-/g, '');
      const nextStatus = c.tenantSignedAt ? 'active' : 'pending_tenant';

      const [updated] = await tx
        .update(leaseContracts)
        .set({
          ownerSignedAt: new Date(),
          ownerSignedBy: caller.sub,
          ownerSignerName: fullName.trim(),
          tenantSignToken: token,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(leaseContracts.id, contractId))
        .returning();
      return updated!;
    });
  }

  /**
   * Tenant side: signs via the issued token. Single-use — clears the token
   * on success. Transitions pending_tenant → active.
   */
  async signByTenant(token: string, signerName: string) {
    if (!token) throw new BadRequestException('Missing signing token.');
    return this.db.db.transaction(async (tx) => {
      const [c] = await tx
        .select()
        .from(leaseContracts)
        .where(eq(leaseContracts.tenantSignToken, token))
        .limit(1);
      if (!c) throw new NotFoundException('Invalid or used signing link.');
      if (!c.ownerSignedAt) throw new BadRequestException('Awaiting owner signature first.');

      const [updated] = await tx
        .update(leaseContracts)
        .set({
          tenantSignedAt: new Date(),
          tenantSignerName: signerName.trim(),
          tenantSignToken: null,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(leaseContracts.id, c.id))
        .returning();
      return updated!;
    });
  }

  async terminate(caller: JwtPayload, contractId: string) {
    if (!caller.orgId) throw new ForbiddenException('Caller has no organisation.');
    const [c] = await this.db.db.select().from(leaseContracts).where(eq(leaseContracts.id, contractId)).limit(1);
    if (!c) throw new NotFoundException('Contract not found.');
    if (c.orgId !== caller.orgId) throw new ForbiddenException('Not your contract.');
    const [updated] = await this.db.db
      .update(leaseContracts)
      .set({ status: 'terminated', updatedAt: new Date() })
      .where(eq(leaseContracts.id, contractId))
      .returning();
    return updated!;
  }
}
