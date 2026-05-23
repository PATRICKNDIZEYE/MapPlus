import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { utilityBills, tenants, units } from '@mallguide/shared';
import type { NewUtilityBill, UtilityBill } from '@mallguide/shared';
import { NotificationsService } from '../notifications/notifications.service';

type UtilityType = 'electricity' | 'water' | 'gas' | 'internet' | 'common_area' | 'security' | 'other';
type BillStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface ListFilters {
  buildingId?: string;
  tenantId?: string;
  periodStart?: string; // ISO date
  periodEnd?: string;   // ISO date
  status?: BillStatus;
}

interface SplitInput {
  buildingId: string;
  utilityType: UtilityType;
  periodStart: string;
  periodEnd:   string;
  totalAmount: number;
  currency?:   string;
  dueDate?:    string;
  notes?:      string;
}

@Injectable()
export class UtilitiesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(filters: ListFilters = {}) {
    const conds: SQL[] = [];
    if (filters.buildingId)  conds.push(eq(utilityBills.buildingId, filters.buildingId));
    if (filters.tenantId)    conds.push(eq(utilityBills.tenantId, filters.tenantId));
    if (filters.status)      conds.push(eq(utilityBills.status, filters.status));
    if (filters.periodStart) conds.push(gte(utilityBills.periodStart, filters.periodStart));
    if (filters.periodEnd)   conds.push(lte(utilityBills.periodEnd, filters.periodEnd));

    return this.db.db
      .select({
        id: utilityBills.id,
        tenantId: utilityBills.tenantId,
        tenantName: tenants.tradeName,
        buildingId: utilityBills.buildingId,
        utilityType: utilityBills.utilityType,
        status: utilityBills.status,
        periodStart: utilityBills.periodStart,
        periodEnd: utilityBills.periodEnd,
        amount: utilityBills.amount,
        currency: utilityBills.currency,
        dueDate: utilityBills.dueDate,
        paidAt: utilityBills.paidAt,
        notes: utilityBills.notes,
        unitAllocationPct: utilityBills.unitAllocationPct,
      })
      .from(utilityBills)
      .leftJoin(tenants, eq(tenants.id, utilityBills.tenantId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(utilityBills.periodStart));
  }

  async createBill(input: NewUtilityBill) {
    const [row] = await this.db.db.insert(utilityBills).values(input).returning();
    if (!row) throw new Error('Failed to create utility bill');
    return row;
  }

  /**
   * Split a building-wide utility cost across all tenants by occupied-unit area share.
   * Returns the created bills. Caller passes the total amount; each tenant gets
   * a proportional share of it.
   */
  async split(input: SplitInput) {
    // Fetch tenants with their total area in this building
    const rows = await this.db.db
      .select({
        tenantId: units.tenantId,
        totalArea: sql<string>`COALESCE(SUM(${units.areaSqm}), 0)`.as('total_area'),
      })
      .from(units)
      .where(and(
        eq(units.buildingId, input.buildingId),
        eq(units.status, 'occupied'),
      ))
      .groupBy(units.tenantId);

    const eligible = rows.filter((r) => r.tenantId && Number(r.totalArea) > 0);
    const totalBuildingArea = eligible.reduce((sum, r) => sum + Number(r.totalArea), 0);
    if (totalBuildingArea === 0) return [];

    const created: UtilityBill[] = [];
    for (const r of eligible) {
      const pct = Number(r.totalArea) / totalBuildingArea;
      const amount = input.totalAmount * pct;
      const [bill] = await this.db.db.insert(utilityBills).values({
        buildingId: input.buildingId,
        tenantId: r.tenantId!,
        utilityType: input.utilityType,
        status: 'draft',
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        amount: amount.toFixed(2),
        currency: input.currency ?? 'RWF',
        unitAllocationPct: pct.toFixed(4),
        dueDate: input.dueDate,
        notes: input.notes,
      }).returning();
      if (bill) created.push(bill);
    }
    return created;
  }

  async send(id: string) {
    const [bill] = await this.db.db
      .update(utilityBills)
      .set({ status: 'sent', updatedAt: new Date() })
      .where(eq(utilityBills.id, id))
      .returning();
    if (!bill) throw new NotFoundException('Bill not found');

    // Find tenant_admin users for the tenant and notify them
    const recipients = await this.db.db.execute<{ id: string }>(
      sql`SELECT id FROM users WHERE tenant_id = ${bill.tenantId} AND role IN ('tenant_admin', 'tenant_staff')`,
    );
    for (const r of recipients.rows) {
      await this.notifications.create({
        userId: r.id,
        category: 'utility_bill',
        title: `New ${bill.utilityType.replace('_', ' ')} bill`,
        body: `Amount due: ${bill.amount} ${bill.currency} by ${bill.dueDate ?? 'soon'}`,
        href: `/tenant/bills/${bill.id}`,
        meta: { billId: bill.id, amount: bill.amount },
      });
    }
    return bill;
  }

  async markPaid(id: string) {
    const [bill] = await this.db.db
      .update(utilityBills)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(utilityBills.id, id))
      .returning();
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  async cancel(id: string) {
    const [bill] = await this.db.db
      .update(utilityBills)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(utilityBills.id, id))
      .returning();
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }
}
