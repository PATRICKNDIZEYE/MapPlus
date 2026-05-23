import {
  pgTable, uuid, varchar, text, numeric, timestamp, pgEnum, date, index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { leaseContracts } from './contracts';
import { users } from './users';

export const rentPaymentMethodEnum = pgEnum('rent_payment_method', [
  'mtn_momo',
  'airtel_money',
  'bank_transfer',
  'cash',
  'piggybox_forward',
  'rentavance',
  'other',
]);

export const rentPaymentStatusEnum = pgEnum('rent_payment_status', [
  'pending',
  'paid',
  'partial',
  'overdue',
  'cancelled',
]);

export const rentPayments = pgTable(
  'rent_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    contractId: uuid('contract_id').notNull().references(() => leaseContracts.id, { onDelete: 'restrict' }),

    // Period this payment covers (e.g. period_start = 2026-06-01, period_end = 2026-06-30)
    periodStart: date('period_start', { mode: 'string' }).notNull(),
    periodEnd:   date('period_end',   { mode: 'string' }).notNull(),
    dueDate:     date('due_date',     { mode: 'string' }).notNull(),

    amountDue:  numeric('amount_due',  { precision: 14, scale: 2 }).notNull(),
    amountPaid: numeric('amount_paid', { precision: 14, scale: 2 }).notNull().default('0'),
    currency:   varchar('currency', { length: 3 }).notNull().default('RWF'),

    method: rentPaymentMethodEnum('method'),
    status: rentPaymentStatusEnum('status').notNull().default('pending'),

    // External payment reference (MoMo transaction id, bank ref, etc.)
    externalRef: varchar('external_ref', { length: 200 }),
    notes: text('notes'),

    paidAt:    timestamp('paid_at', { withTimezone: true }),
    recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx:   index('rent_payments_tenant_idx').on(table.tenantId),
    contractIdx: index('rent_payments_contract_idx').on(table.contractId),
    statusIdx:   index('rent_payments_status_idx').on(table.status),
    dueDateIdx:  index('rent_payments_due_idx').on(table.dueDate),
    periodIdx:   index('rent_payments_period_idx').on(table.periodStart, table.periodEnd),
  }),
);
