import {
  pgTable, uuid, varchar, integer, numeric, timestamp, pgEnum, index, date,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const piggyboxTxTypeEnum = pgEnum('piggybox_tx_type', [
  'deposit',            // manual or per-sale auto-deposit
  'withdraw',           // admin-only force unlock
  'rent_forward',       // automated on rent-due day
  'advance_repayment',  // RentAvance repayment deduction
]);

export const piggyboxTxSourceEnum = pgEnum('piggybox_tx_source', [
  'manual',     // tenant deposit form
  'sale',       // automatic on order completion
  'system',     // cron / admin
]);

export const piggyboxWallets = pgTable(
  'piggybox_wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }).unique(),

    currency: varchar('currency', { length: 3 }).notNull().default('RWF'),
    balance:       numeric('balance',        { precision: 14, scale: 2 }).notNull().default('0'),
    lockedBalance: numeric('locked_balance', { precision: 14, scale: 2 }).notNull().default('0'),

    // Day of month rent forwards run — derived from active lease but cached here for the cron job
    rentDueDay: integer('rent_due_day').notNull().default(1),

    // Locked until this date — early withdrawals require admin override
    lockedUntil: date('locked_until', { mode: 'string' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('piggybox_wallets_tenant_idx').on(table.tenantId),
  }),
);

export const piggyboxTransactions = pgTable(
  'piggybox_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id').notNull().references(() => piggyboxWallets.id, { onDelete: 'cascade' }),

    type:   piggyboxTxTypeEnum('type').notNull(),
    source: piggyboxTxSourceEnum('source').notNull(),

    amount:   numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RWF'),

    // Free-form context — order id, advance id, admin note, etc.
    referenceId: uuid('reference_id'),
    note: varchar('note', { length: 200 }),

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    walletIdx: index('piggybox_tx_wallet_idx').on(table.walletId),
    typeIdx:   index('piggybox_tx_type_idx').on(table.type),
    occurredIdx: index('piggybox_tx_occurred_idx').on(table.occurredAt),
  }),
);
