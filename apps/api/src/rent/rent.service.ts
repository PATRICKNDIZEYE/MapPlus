import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, gte, lte, sql, inArray, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { rentPayments, leaseContracts, tenants } from '@mallguide/shared';
import type { NewRentPayment } from '@mallguide/shared';
import { NotificationsService } from '../notifications/notifications.service';

type RentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
type RentMethod = 'mtn_momo' | 'airtel_money' | 'bank_transfer' | 'cash' | 'piggybox_forward' | 'rentavance' | 'other';

interface ListFilters {
  buildingId?: string;
  tenantId?:   string;
  status?:     RentStatus;
  dueBefore?:  string;
  dueAfter?:   string;
}

interface MarkPaidInput {
  id: string;
  amount: number;
  method: RentMethod;
  externalRef?: string;
  notes?: string;
  recordedBy: string;
}

@Injectable()
export class RentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(filters: ListFilters = {}) {
    const conds: SQL[] = [];
    if (filters.tenantId) conds.push(eq(rentPayments.tenantId, filters.tenantId));
    if (filters.status)   conds.push(eq(rentPayments.status, filters.status));
    if (filters.dueBefore) conds.push(lte(rentPayments.dueDate, filters.dueBefore));
    if (filters.dueAfter)  conds.push(gte(rentPayments.dueDate, filters.dueAfter));

    return this.db.db
      .select({
        id: rentPayments.id,
        tenantId: rentPayments.tenantId,
        tenantName: tenants.tradeName,
        contractId: rentPayments.contractId,
        contractNumber: leaseContracts.contractNumber,
        periodStart: rentPayments.periodStart,
        periodEnd: rentPayments.periodEnd,
        dueDate: rentPayments.dueDate,
        amountDue: rentPayments.amountDue,
        amountPaid: rentPayments.amountPaid,
        currency: rentPayments.currency,
        method: rentPayments.method,
        status: rentPayments.status,
        paidAt: rentPayments.paidAt,
        externalRef: rentPayments.externalRef,
      })
      .from(rentPayments)
      .leftJoin(tenants, eq(tenants.id, rentPayments.tenantId))
      .leftJoin(leaseContracts, eq(leaseContracts.id, rentPayments.contractId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(rentPayments.dueDate));
  }

  async generatePeriod(contractId: string, periodStart: string, periodEnd: string, dueDate: string) {
    const [contract] = await this.db.db
      .select()
      .from(leaseContracts)
      .where(eq(leaseContracts.id, contractId));
    if (!contract) throw new NotFoundException('Contract not found');

    const [row] = await this.db.db.insert(rentPayments).values({
      tenantId: contract.tenantId,
      contractId: contract.id,
      periodStart,
      periodEnd,
      dueDate,
      amountDue: contract.monthlyRent,
      currency: contract.currency,
      status: 'pending',
    }).returning();
    return row;
  }

  async markPaid(input: MarkPaidInput) {
    const [existing] = await this.db.db.select().from(rentPayments).where(eq(rentPayments.id, input.id));
    if (!existing) throw new NotFoundException('Payment not found');

    const newPaid = Number(existing.amountPaid) + input.amount;
    const due = Number(existing.amountDue);
    const status: RentStatus =
      newPaid >= due ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

    const [row] = await this.db.db
      .update(rentPayments)
      .set({
        amountPaid: newPaid.toFixed(2),
        status,
        method: input.method,
        externalRef: input.externalRef ?? existing.externalRef,
        notes: input.notes ?? existing.notes,
        paidAt: status === 'paid' ? new Date() : existing.paidAt,
        recordedBy: input.recordedBy,
        updatedAt: new Date(),
      })
      .where(eq(rentPayments.id, input.id))
      .returning();

    if (status === 'paid' && row) {
      const tenantUsers = await this.db.db.execute<{ id: string }>(
        sql`SELECT id FROM users WHERE tenant_id = ${row.tenantId} AND role IN ('tenant_admin', 'tenant_staff')`,
      );
      for (const u of tenantUsers.rows) {
        await this.notifications.create({
          userId: u.id,
          category: 'rent_paid',
          title: `Rent paid for ${row.periodStart} – ${row.periodEnd}`,
          body: `Receipt: ${row.amountPaid} ${row.currency}`,
          href: `/tenant/rent/${row.id}`,
          meta: { paymentId: row.id },
        });
      }
    }

    return row;
  }

  async bulkRemind(buildingId: string, dueBefore: string) {
    // Find pending/partial payments due before the given date in this building
    const due = await this.db.db
      .select({
        id: rentPayments.id,
        tenantId: rentPayments.tenantId,
        amountDue: rentPayments.amountDue,
        amountPaid: rentPayments.amountPaid,
        currency: rentPayments.currency,
        dueDate: rentPayments.dueDate,
      })
      .from(rentPayments)
      .where(and(
        inArray(rentPayments.status, ['pending', 'partial']),
        lte(rentPayments.dueDate, dueBefore),
      ));

    let notified = 0;
    for (const p of due) {
      const recipients = await this.db.db.execute<{ id: string }>(
        sql`SELECT id FROM users WHERE tenant_id = ${p.tenantId} AND role IN ('tenant_admin', 'tenant_staff')`,
      );
      for (const r of recipients.rows) {
        await this.notifications.create({
          userId: r.id,
          category: 'rent_due',
          title: `Rent due ${p.dueDate}`,
          body: `Outstanding: ${(Number(p.amountDue) - Number(p.amountPaid)).toFixed(2)} ${p.currency}`,
          href: `/tenant/rent/${p.id}`,
          meta: { paymentId: p.id, dueDate: p.dueDate },
        });
        notified += 1;
      }
    }
    return { count: due.length, notified };
  }

  async summary(buildingId: string) {
    // Aggregate by status across all rent payments for tenants in this building.
    const rows = await this.db.db.execute<{ status: string; total: string; count: string }>(
      sql`
        SELECT rp.status, SUM(rp.amount_due)::text AS total, COUNT(*)::text AS count
        FROM rent_payments rp
        JOIN lease_contracts lc ON lc.id = rp.contract_id
        JOIN units u ON u.id = lc.unit_id
        WHERE u.building_id = ${buildingId}
        GROUP BY rp.status
      `,
    );
    const out: Record<string, { total: number; count: number }> = {};
    for (const r of rows.rows) {
      out[r.status] = { total: Number(r.total), count: Number(r.count) };
    }
    return out;
  }
}
