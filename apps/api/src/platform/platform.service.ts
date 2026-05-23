import {
  Injectable, ForbiddenException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { eq, sql, desc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  organizations, buildings, tenants, units, orders, rentavanceAdvances,
  rentPayments, platformConfig, shopProfiles,
} from '@mallguide/shared';
import type { JwtPayload } from '@mallguide/shared';
import { PlatformConfigService } from './platform-config.service';

interface CreateOrgInput {
  name: string;
  type?: 'building_owner' | 'management_company' | 'property_manager';
  contactEmail?: string;
  contactPhone?: string;
}

interface CreateBuildingInput {
  orgId: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  country?: string;
  floorsCount?: number;
}

interface PlatformConfigUpdate {
  key: string;
  valueText?: string | null;
  valueJson?: unknown;
  isSecret?: boolean;
  description?: string;
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly db: DatabaseService,
    private readonly configCache: PlatformConfigService,
  ) {}

  private assertSuperAdmin(caller: JwtPayload) {
    if (caller.role !== 'super_admin') {
      throw new ForbiddenException('Super admin only');
    }
  }

  // ─── Organizations & buildings ──────────────────────────────────────────

  async listOrgs(caller: JwtPayload) {
    this.assertSuperAdmin(caller);
    const rows = await this.db.db
      .select({
        id: organizations.id,
        name: organizations.name,
        type: organizations.type,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        buildingCount: sql<number>`(SELECT COUNT(*)::int FROM buildings WHERE org_id = ${organizations.id})`,
        tenantCount:   sql<number>`(SELECT COUNT(*)::int FROM tenants   WHERE org_id = ${organizations.id})`,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));
    return rows;
  }

  async createOrg(input: CreateOrgInput, caller: JwtPayload) {
    this.assertSuperAdmin(caller);
    const [row] = await this.db.db.insert(organizations).values({
      name: input.name,
      type: input.type ?? 'building_owner',
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
    }).returning();
    if (!row) throw new Error('Failed to create organization');
    return row;
  }

  async listBuildings(caller: JwtPayload) {
    this.assertSuperAdmin(caller);
    return this.db.db
      .select({
        id: buildings.id,
        orgId: buildings.orgId,
        orgName: organizations.name,
        name: buildings.name,
        slug: buildings.slug,
        address: buildings.address,
        city: buildings.city,
        status: buildings.status,
        floorsCount: buildings.floorsCount,
        isPublic: buildings.isPublic,
        unitCount:   sql<number>`(SELECT COUNT(*)::int FROM units WHERE building_id = ${buildings.id})`,
        tenantCount: sql<number>`(SELECT COUNT(DISTINCT tenant_id)::int FROM units WHERE building_id = ${buildings.id} AND tenant_id IS NOT NULL)`,
        createdAt: buildings.createdAt,
      })
      .from(buildings)
      .leftJoin(organizations, eq(organizations.id, buildings.orgId))
      .orderBy(desc(buildings.createdAt));
  }

  async createBuilding(input: CreateBuildingInput, caller: JwtPayload) {
    this.assertSuperAdmin(caller);

    // Slug must be unique — guard early with a friendlier error.
    const [existing] = await this.db.db
      .select({ id: buildings.id })
      .from(buildings)
      .where(eq(buildings.slug, input.slug))
      .limit(1);
    if (existing) throw new BadRequestException('Slug already taken');

    const [row] = await this.db.db.insert(buildings).values({
      orgId:   input.orgId,
      name:    input.name,
      slug:    input.slug,
      address: input.address ?? null,
      city:    input.city ?? 'Kigali',
      country: input.country ?? 'Rwanda',
      floorsCount: input.floorsCount ?? 1,
      status:  'onboarding',
    }).returning();
    if (!row) throw new Error('Failed to create building');
    return row;
  }

  async suspendBuilding(buildingId: string, caller: JwtPayload) {
    this.assertSuperAdmin(caller);
    const [row] = await this.db.db
      .update(buildings)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(buildings.id, buildingId))
      .returning();
    if (!row) throw new NotFoundException('Building not found');
    return row;
  }

  async activateBuilding(buildingId: string, caller: JwtPayload) {
    this.assertSuperAdmin(caller);
    const [row] = await this.db.db
      .update(buildings)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(buildings.id, buildingId))
      .returning();
    if (!row) throw new NotFoundException('Building not found');
    return row;
  }

  // ─── Platform-wide cross-mall stats ─────────────────────────────────────

  async overview(caller: JwtPayload) {
    this.assertSuperAdmin(caller);

    const countsResult = await this.db.db.execute<{
      org_count: string; building_count: string; active_buildings: string;
      tenant_count: string; product_count: string;
    }>(sql`
      SELECT
        (SELECT COUNT(*) FROM organizations)::text AS org_count,
        (SELECT COUNT(*) FROM buildings)::text AS building_count,
        (SELECT COUNT(*) FROM buildings WHERE status = 'active')::text AS active_buildings,
        (SELECT COUNT(*) FROM tenants)::text AS tenant_count,
        (SELECT COUNT(*) FROM products WHERE is_published = true)::text AS product_count
    `);
    const counts = countsResult.rows[0];

    const moneyResult = await this.db.db.execute<{
      gmv_total: string; advance_principal: string; advance_outstanding: string;
      rent_collected: string;
    }>(sql`
      SELECT
        COALESCE((SELECT SUM(total_amount) FROM orders WHERE status = 'paid'), 0)::text AS gmv_total,
        COALESCE((SELECT SUM(amount_advanced) FROM rentavance_advances WHERE status IN ('disbursed','repaying')), 0)::text AS advance_principal,
        (COALESCE((SELECT SUM(total_due) FROM rentavance_advances WHERE status IN ('disbursed','repaying')), 0)
          - COALESCE((SELECT SUM(amount) FROM rentavance_repayments), 0))::text AS advance_outstanding,
        COALESCE((SELECT SUM(amount_paid) FROM rent_payments WHERE status = 'paid'), 0)::text AS rent_collected
    `);
    const money = moneyResult.rows[0];

    const recentOrgs = await this.db.db
      .select({
        id: organizations.id,
        name: organizations.name,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt))
      .limit(5);

    return {
      counts: {
        orgs:        Number(counts?.org_count ?? 0),
        buildings:   Number(counts?.building_count ?? 0),
        active:      Number(counts?.active_buildings ?? 0),
        tenants:     Number(counts?.tenant_count ?? 0),
        products:    Number(counts?.product_count ?? 0),
      },
      money: {
        gmvTotal:           Number(money?.gmv_total ?? 0),
        advancePrincipal:   Number(money?.advance_principal ?? 0),
        advanceOutstanding: Number(money?.advance_outstanding ?? 0),
        rentCollected:      Number(money?.rent_collected ?? 0),
      },
      recentOrgs,
    };
  }

  async settlement(caller: JwtPayload) {
    this.assertSuperAdmin(caller);
    // Per-mall money summary: rent collected, GMV, outstanding advances.
    return this.db.db.execute<{
      building_id: string; building_name: string; org_name: string;
      gmv: string; rent_collected: string; advance_outstanding: string;
    }>(sql`
      SELECT
        b.id AS building_id,
        b.name AS building_name,
        o.name AS org_name,
        COALESCE((SELECT SUM(o2.total_amount) FROM orders o2 WHERE o2.building_id = b.id AND o2.status = 'paid'), 0)::text AS gmv,
        COALESCE((
          SELECT SUM(rp.amount_paid) FROM rent_payments rp
          JOIN lease_contracts lc ON lc.id = rp.contract_id
          JOIN units u ON u.id = lc.unit_id
          WHERE u.building_id = b.id AND rp.status = 'paid'
        ), 0)::text AS rent_collected,
        COALESCE((
          SELECT SUM(ra.total_due) FROM rentavance_advances ra
          JOIN tenants t ON t.id = ra.tenant_id
          JOIN units u ON u.tenant_id = t.id
          WHERE u.building_id = b.id AND ra.status IN ('disbursed', 'repaying')
        ), 0)::text AS advance_outstanding
      FROM buildings b
      LEFT JOIN organizations o ON o.id = b.org_id
      ORDER BY b.created_at DESC
    `).then((r) => r.rows.map((row) => ({
      buildingId:        row.building_id,
      buildingName:      row.building_name,
      orgName:           row.org_name,
      gmv:               Number(row.gmv),
      rentCollected:     Number(row.rent_collected),
      advanceOutstanding: Number(row.advance_outstanding),
    })));
  }

  // ─── Platform config (key/value) ────────────────────────────────────────

  async listConfig(caller: JwtPayload) {
    this.assertSuperAdmin(caller);
    const rows = await this.db.db
      .select()
      .from(platformConfig)
      .orderBy(platformConfig.key);
    // Mask secrets in transit — UI can request the raw value via a different endpoint.
    return rows.map((r) => ({
      ...r,
      valueText: r.isSecret === 'Y' && r.valueText ? '••••••••' : r.valueText,
    }));
  }

  async upsertConfig(input: PlatformConfigUpdate, caller: JwtPayload) {
    this.assertSuperAdmin(caller);
    const isSecret = input.isSecret ? 'Y' : 'N';
    const [row] = await this.db.db
      .insert(platformConfig)
      .values({
        key:        input.key,
        valueText:  input.valueText ?? null,
        valueJson:  input.valueJson as object | null ?? null,
        isSecret,
        description: input.description ?? null,
        updatedBy: caller.sub,
      })
      .onConflictDoUpdate({
        target: platformConfig.key,
        set: {
          valueText:  input.valueText ?? null,
          valueJson:  input.valueJson as object | null ?? null,
          isSecret,
          description: input.description ?? null,
          updatedBy: caller.sub,
          updatedAt: new Date(),
        },
      })
      .returning();
    // Invalidate the cached read so the new value takes effect immediately.
    this.configCache.invalidate(input.key);
    return row!;
  }
}
