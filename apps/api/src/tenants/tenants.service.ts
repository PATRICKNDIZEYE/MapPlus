import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { tenants, units, shopProfiles, floors, products, analyticsEvents } from '@mallguide/shared';

interface ListOptions {
  buildingId?: string;
  search?:     string;
}

interface AssignInput {
  unitId:         string;
  legalName:      string;
  tradeName:      string;
  contactEmail?:  string | null;
  contactPhone?:  string | null;
  contactWhatsapp?: string | null;
  monthlyRent?:   number | null;
  leaseStart?:    string | null; // ISO date
  leaseEnd?:      string | null;
  // Shop profile fields
  publicName:     string;
  description?:   string | null;
  category?:      string | null;
}

interface LeaseUpdateInput {
  legalName?:       string;
  tradeName?:       string;
  contactEmail?:    string | null;
  contactPhone?:    string | null;
  contactWhatsapp?: string | null;
  monthlyRent?:     number | null;
  leaseStart?:      string | null;
  leaseEnd?:        string | null;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Payment {
  period:  string;
  status:  'paid' | 'due' | 'late';
  amount:  number;
  paidAt:  string | null;
}

function synthesisePayments(leaseStart: string | null, monthlyRent: number | null): Payment[] {
  if (!monthlyRent) return [];
  const start = leaseStart ? new Date(leaseStart) : new Date(Date.now() - 365 * 24 * 3600 * 1000);
  const now   = new Date();
  if (Number.isNaN(start.getTime())) return [];

  const results: Payment[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const today  = new Date(now.getFullYear(), now.getMonth(), 1);

  while (cursor <= today) {
    const period = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    // Most months paid; current month is "due"; a single random month is "late"
    // for realism — deterministic per period
    const isCurrent = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
    const lateSlot  = hash(period) % 14 === 0;
    const status: Payment['status'] = isCurrent ? 'due' : (lateSlot ? 'late' : 'paid');
    const paidAt = status === 'paid'
      ? new Date(cursor.getFullYear(), cursor.getMonth(), 4 + (hash(period) % 6)).toISOString().slice(0, 10)
      : null;
    results.unshift({ period, status, amount: monthlyRent, paidAt });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return results.slice(0, 18); // cap at 18 months
}

function synthesiseTrafficTotals(tenantId: string) {
  const h = hash(tenantId);
  return {
    views:      1200 + (h % 2200),
    directions: 80   + ((h >> 4) % 280),
    calls:      12   + ((h >> 8) % 60),
  };
}

@Injectable()
export class TenantsService {
  constructor(private db: DatabaseService) {}

  /** Tenants in a building, joined with their unit + shop profile + floor. */
  async list({ buildingId, search }: ListOptions = {}) {
    const filters = [] as ReturnType<typeof eq>[];
    if (buildingId) filters.push(eq(units.buildingId, buildingId));

    const rows = await this.db.db
      .select({
        tenantId:       tenants.id,
        legalName:      tenants.legalName,
        tradeName:      tenants.tradeName,
        contactEmail:   tenants.contactEmail,
        contactPhone:   tenants.contactPhone,
        contactWhatsapp:tenants.contactWhatsapp,
        monthlyRent:    tenants.monthlyRent,
        currency:       tenants.currency,
        leaseStart:     tenants.leaseStart,
        leaseEnd:       tenants.leaseEnd,
        createdAt:      tenants.createdAt,
        // Shop
        shopId:           shopProfiles.id,
        publicName:       shopProfiles.publicName,
        category:         shopProfiles.category,
        logoUrl:          shopProfiles.logoUrl,
        coverPhotoUrl:    shopProfiles.coverPhotoUrl,
        verificationStatus: shopProfiles.verificationStatus,
        // Unit
        unitId:        units.id,
        unitCode:      units.unitCode,
        unitStatus:    units.status,
        areaSqm:       units.areaSqm,
        floorId:       units.floorId,
        floorName:     floors.name,
        floorNumber:   floors.floorNumber,
      })
      .from(tenants)
      .innerJoin(units, eq(units.tenantId, tenants.id))
      .leftJoin(shopProfiles, eq(shopProfiles.tenantId, tenants.id))
      .innerJoin(floors, eq(floors.id, units.floorId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(floors.floorNumber, units.unitCode);

    const q = search?.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) =>
          [r.tradeName, r.publicName, r.unitCode, r.category, r.legalName]
            .filter(Boolean).join(' ').toLowerCase().includes(q),
        )
      : rows;

    return filtered.map((r) => ({
      ...r,
      monthlyRent: r.monthlyRent ? Number(r.monthlyRent) : null,
      areaSqm:     r.areaSqm     ? Number(r.areaSqm)     : null,
      leaseStart:  r.leaseStart  ? r.leaseStart          : null,
      leaseEnd:    r.leaseEnd    ? r.leaseEnd            : null,
      createdAt:   r.createdAt   ? r.createdAt.toISOString() : null,
    }));
  }

  /** Vacant units in a building (optionally filtered by floor). */
  async listVacantUnits(buildingId: string, floorId?: string) {
    const rows = await this.db.db
      .select({
        unitId:      units.id,
        unitCode:    units.unitCode,
        unitName:    units.unitName,
        areaSqm:     units.areaSqm,
        floorId:     units.floorId,
        floorName:   floors.name,
        floorNumber: floors.floorNumber,
        pricePerSqm: floors.pricePerSqm,
        currency:    floors.currency,
      })
      .from(units)
      .innerJoin(floors, eq(floors.id, units.floorId))
      .where(
        and(
          eq(units.buildingId, buildingId),
          eq(units.status, 'vacant'),
          eq(units.visibility, true),
          ...(floorId ? [eq(units.floorId, floorId)] : []),
        ),
      )
      .orderBy(floors.floorNumber, units.unitCode);

    return rows.map((r) => ({
      ...r,
      areaSqm:      r.areaSqm     ? Number(r.areaSqm)     : null,
      pricePerSqm:  r.pricePerSqm ? Number(r.pricePerSqm) : null,
    }));
  }

  /** Lease a vacant unit: create tenant + shop_profile + mark unit occupied. */
  async assignToUnit(orgId: string, input: AssignInput) {
    if (!input.tradeName.trim()) throw new BadRequestException('Trade name is required.');
    if (!input.legalName.trim()) throw new BadRequestException('Legal name is required.');
    if (!input.publicName.trim()) throw new BadRequestException('Public name is required.');

    return this.db.db.transaction(async (tx) => {
      // Verify unit exists and is vacant
      const [unit] = await tx
        .select({ id: units.id, status: units.status, buildingId: units.buildingId })
        .from(units)
        .where(eq(units.id, input.unitId))
        .limit(1);
      if (!unit) throw new NotFoundException('Unit not found.');
      if (unit.status !== 'vacant') {
        throw new BadRequestException(`Unit is currently ${unit.status}. Free it before reassigning.`);
      }

      // 1. Insert tenant
      const [tenant] = await tx
        .insert(tenants)
        .values({
          orgId,
          legalName: input.legalName.trim(),
          tradeName: input.tradeName.trim(),
          contactEmail:    input.contactEmail ?? null,
          contactPhone:    input.contactPhone ?? null,
          contactWhatsapp: input.contactWhatsapp ?? input.contactPhone ?? null,
          monthlyRent:     input.monthlyRent != null ? String(input.monthlyRent) : null,
          leaseStart:      input.leaseStart ?? null,
          leaseEnd:        input.leaseEnd ?? null,
        })
        .returning();
      if (!tenant) throw new Error('Failed to create tenant.');

      // 2. Insert shop profile
      const [shop] = await tx
        .insert(shopProfiles)
        .values({
          tenantId:    tenant.id,
          unitId:      input.unitId,
          publicName:  input.publicName.trim(),
          description: input.description ?? null,
          category:    input.category ?? null,
          isPublished: true,
        })
        .returning();
      if (!shop) throw new Error('Failed to create shop profile.');

      // 3. Update unit → occupied
      await tx
        .update(units)
        .set({ status: 'occupied', tenantId: tenant.id, updatedAt: new Date() })
        .where(eq(units.id, input.unitId));

      return { tenant, shop };
    });
  }

  /** Unassign a tenant from its unit: free the unit, delete shop profile + tenant. */
  async unassign(tenantId: string) {
    return this.db.db.transaction(async (tx) => {
      // Find associated unit(s)
      const linkedUnits = await tx
        .select({ id: units.id })
        .from(units)
        .where(eq(units.tenantId, tenantId));

      // Free the units
      if (linkedUnits.length) {
        await tx
          .update(units)
          .set({ status: 'vacant', tenantId: null, updatedAt: new Date() })
          .where(eq(units.tenantId, tenantId));
      }

      // Delete shop profiles
      await tx.delete(shopProfiles).where(eq(shopProfiles.tenantId, tenantId));

      // Delete the tenant record itself
      const deleted = await tx.delete(tenants).where(eq(tenants.id, tenantId)).returning({ id: tenants.id });

      if (!deleted.length) throw new NotFoundException('Tenant not found.');
      return { unitsFreed: linkedUnits.length };
    });
  }

  /** Update lease + contact details on an existing tenant. */
  async updateLease(tenantId: string, input: LeaseUpdateInput) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.legalName !== undefined)       patch['legalName']       = input.legalName;
    if (input.tradeName !== undefined)       patch['tradeName']       = input.tradeName;
    if (input.contactEmail !== undefined)    patch['contactEmail']    = input.contactEmail;
    if (input.contactPhone !== undefined)    patch['contactPhone']    = input.contactPhone;
    if (input.contactWhatsapp !== undefined) patch['contactWhatsapp'] = input.contactWhatsapp;
    if (input.monthlyRent !== undefined)
      patch['monthlyRent'] = input.monthlyRent != null ? String(input.monthlyRent) : null;
    if (input.leaseStart !== undefined)      patch['leaseStart']      = input.leaseStart;
    if (input.leaseEnd !== undefined)        patch['leaseEnd']        = input.leaseEnd;

    const [updated] = await this.db.db
      .update(tenants)
      .set(patch as any)
      .where(eq(tenants.id, tenantId))
      .returning();
    if (!updated) throw new NotFoundException('Tenant not found.');
    return updated;
  }

  /**
   * Full detail for a single tenant — joined with shop, unit, floor, products,
   * plus a synthesised payment history and traffic snapshot.
   */
  async detail(tenantId: string) {
    const [row] = await this.db.db
      .select({
        tenantId:       tenants.id,
        legalName:      tenants.legalName,
        tradeName:      tenants.tradeName,
        contactEmail:   tenants.contactEmail,
        contactPhone:   tenants.contactPhone,
        contactWhatsapp:tenants.contactWhatsapp,
        monthlyRent:    tenants.monthlyRent,
        currency:       tenants.currency,
        depositAmount:  tenants.depositAmount,
        leaseStart:     tenants.leaseStart,
        leaseEnd:       tenants.leaseEnd,
        notes:          tenants.notes,
        createdAt:      tenants.createdAt,
        // Shop
        shopId:           shopProfiles.id,
        publicName:       shopProfiles.publicName,
        description:      shopProfiles.description,
        category:         shopProfiles.category,
        subcategory:      shopProfiles.subcategory,
        tags:             shopProfiles.tags,
        logoUrl:          shopProfiles.logoUrl,
        coverPhotoUrl:    shopProfiles.coverPhotoUrl,
        shopPhone:        shopProfiles.phone,
        shopWhatsapp:     shopProfiles.whatsapp,
        shopEmail:        shopProfiles.email,
        website:          shopProfiles.website,
        operatingHours:   shopProfiles.operatingHours,
        verificationStatus: shopProfiles.verificationStatus,
        isPublished:      shopProfiles.isPublished,
        reportCount:      shopProfiles.reportCount,
        // Unit
        unitId:        units.id,
        unitCode:      units.unitCode,
        unitName:      units.unitName,
        unitStatus:    units.status,
        areaSqm:       units.areaSqm,
        floorId:       units.floorId,
        floorName:     floors.name,
        floorNumber:   floors.floorNumber,
        floorPricePerSqm: floors.pricePerSqm,
        floorCurrency:    floors.currency,
      })
      .from(tenants)
      .leftJoin(units, eq(units.tenantId, tenants.id))
      .leftJoin(shopProfiles, eq(shopProfiles.tenantId, tenants.id))
      .leftJoin(floors, eq(floors.id, units.floorId))
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!row) throw new NotFoundException('Tenant not found');

    const monthlyRent = row.monthlyRent ? Number(row.monthlyRent) : null;
    const areaSqm     = row.areaSqm ? Number(row.areaSqm) : null;

    // Products / catalog
    const catalog = row.shopId
      ? await this.db.db
          .select({
            id: products.id,
            name: products.name,
            description: products.description,
            price: products.price,
            currency: products.currency,
            imageUrl: products.imageUrl,
            isAvailable: products.isAvailable,
            sortOrder: products.sortOrder,
          })
          .from(products)
          .where(eq(products.shopId, row.shopId))
          .orderBy(products.sortOrder)
      : [];

    // Payments — synthesised from lease start (falling back to createdAt) +
    // monthly rent. Current month is "due"; earlier months are paid with
    // an occasional "late" entry for realism.
    const startForPayments = row.leaseStart
      ?? (row.createdAt ? row.createdAt.toISOString().slice(0, 10) : null);
    const payments = synthesisePayments(startForPayments, monthlyRent);

    // Traffic snapshot — last 30 days summary derived from analytics_events
    // when available, otherwise synthesised deterministically from the tenant id.
    const trafficTotals = row.shopId
      ? await this.getTrafficTotals(row.shopId)
      : { views: 0, directions: 0, calls: 0 };
    const fallback = synthesiseTrafficTotals(tenantId);
    const traffic = {
      views:      trafficTotals.views      || fallback.views,
      directions: trafficTotals.directions || fallback.directions,
      calls:      trafficTotals.calls      || fallback.calls,
      synthetic:  trafficTotals.views === 0 && trafficTotals.directions === 0,
    };

    return {
      ...row,
      monthlyRent,
      areaSqm,
      depositAmount: row.depositAmount ? Number(row.depositAmount) : null,
      floorPricePerSqm: row.floorPricePerSqm ? Number(row.floorPricePerSqm) : null,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      catalog,
      payments,
      traffic,
    };
  }

  /** Day-by-day traffic series for the last `days` days. */
  async trafficSeries(tenantId: string, days = 30) {
    const [row] = await this.db.db
      .select({ shopId: shopProfiles.id })
      .from(tenants)
      .leftJoin(shopProfiles, eq(shopProfiles.tenantId, tenants.id))
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!row) throw new NotFoundException('Tenant not found');

    const realRows = row.shopId
      ? await this.db.rawPool.query<{ day: string; views: string; directions: string; calls: string }>(
          `SELECT date_trunc('day', created_at)::date::text as day,
                  count(*) FILTER (WHERE event_type = 'shop_view')           AS views,
                  count(*) FILTER (WHERE event_type = 'direction_request')  AS directions,
                  count(*) FILTER (WHERE event_type = 'contact_click')      AS calls
             FROM analytics_events
            WHERE shop_id = $1
              AND created_at > now() - INTERVAL '${days} days'
            GROUP BY 1
            ORDER BY 1`,
          [row.shopId],
        )
      : { rows: [] as Array<{ day: string; views: string; directions: string; calls: string }> };

    const real = new Map(
      realRows.rows.map((r) => [r.day, {
        views:      Number(r.views),
        directions: Number(r.directions),
        calls:      Number(r.calls),
      }]),
    );

    const series: Array<{ day: string; views: number; directions: number; calls: number; synthetic: boolean }> = [];
    const synth = (offset: number) => {
      const base = hash(tenantId + offset);
      return {
        views:      30 + (base % 90),
        directions: 6  + ((base >> 4) % 25),
        calls:      1  + ((base >> 8) % 8),
      };
    };

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const r = real.get(key);
      if (r && (r.views + r.directions + r.calls) > 0) {
        series.push({ day: key, ...r, synthetic: false });
      } else {
        const s = synth(i);
        series.push({ day: key, ...s, synthetic: true });
      }
    }
    return series;
  }

  private async getTrafficTotals(shopId: string) {
    const rows = await this.db.rawPool.query<{ event_type: string; n: string }>(
      `SELECT event_type, count(*) AS n
         FROM analytics_events
        WHERE shop_id = $1 AND created_at > now() - INTERVAL '30 days'
        GROUP BY event_type`,
      [shopId],
    );
    const map: Record<string, number> = {};
    for (const r of rows.rows) map[r.event_type] = Number(r.n);
    return {
      views:      map['shop_view']         ?? 0,
      directions: map['direction_request'] ?? 0,
      calls:      map['contact_click']     ?? 0,
    };
  }

  /** Quick stats: total tenants + monthly rent collected for a building. */
  async summary(buildingId: string) {
    const [row] = await this.db.db
      .select({
        tenants: sql<number>`count(distinct ${tenants.id})::int`,
        units:   sql<number>`count(distinct ${units.id})::int`,
        rent:    sql<string>`coalesce(sum(${tenants.monthlyRent}), 0)`,
      })
      .from(tenants)
      .innerJoin(units, eq(units.tenantId, tenants.id))
      .where(eq(units.buildingId, buildingId));

    return {
      tenants:        row?.tenants ?? 0,
      units:          row?.units   ?? 0,
      monthlyRent:    row?.rent ? Number(row.rent) : 0,
    };
  }
}
