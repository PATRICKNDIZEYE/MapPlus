import {
  pgTable, uuid, varchar, text, numeric, timestamp, pgEnum, date, index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { leaseContracts } from './contracts';
import { users } from './users';

export const rentavanceStatusEnum = pgEnum('rentavance_status', [
  'requested',   // tenant requested advance
  'approved',    // admin approved
  'rejected',    // admin rejected
  'disbursed',   // funds sent to landlord
  'repaying',    // repayment underway
  'repaid',      // fully repaid
  'defaulted',   // missed repayment window
]);

export const rentavanceAdvances = pgTable(
  'rentavance_advances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    contractId: uuid('contract_id').notNull().references(() => leaseContracts.id, { onDelete: 'restrict' }),

    amountAdvanced: numeric('amount_advanced', { precision: 14, scale: 2 }).notNull(),
    interestRate:   numeric('interest_rate',   { precision: 5,  scale: 4 }).notNull(), // flat fee, e.g. 0.03 = 3%
    interestAmount: numeric('interest_amount', { precision: 14, scale: 2 }).notNull(),
    totalDue:       numeric('total_due',       { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RWF'),

    // Collateral notes from approval — typically a value estimate of shop stock
    collateralNotes: text('collateral_notes'),

    status: rentavanceStatusEnum('status').notNull().default('requested'),

    approvedBy:  uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt:  timestamp('approved_at',  { withTimezone: true }),
    disbursedAt: timestamp('disbursed_at', { withTimezone: true }),
    repaidAt:    timestamp('repaid_at',    { withTimezone: true }),

    // Must be repaid by this date — typically disbursedAt + 30 days
    dueBy: date('due_by', { mode: 'string' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx:   index('rentavance_tenant_idx').on(table.tenantId),
    contractIdx: index('rentavance_contract_idx').on(table.contractId),
    statusIdx:   index('rentavance_status_idx').on(table.status),
  }),
);

export const rentavanceRepayments = pgTable(
  'rentavance_repayments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    advanceId: uuid('advance_id').notNull().references(() => rentavanceAdvances.id, { onDelete: 'cascade' }),

    amount:   numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RWF'),

    // Where the repayment came from — typically a piggybox transaction
    sourceTxId: uuid('source_tx_id'),

    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    advanceIdx: index('rentavance_repayments_advance_idx').on(table.advanceId),
  }),
);
