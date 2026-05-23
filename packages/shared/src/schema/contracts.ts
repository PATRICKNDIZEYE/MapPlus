import {
  pgTable, uuid, varchar, text, integer, numeric, boolean, timestamp, date, jsonb, pgEnum, index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { tenants } from './tenants';
import { units } from './units';
import { users } from './users';

export const contractStatusEnum = pgEnum('contract_status', [
  'draft',                // being built in the wizard
  'pending_tenant',       // owner signed, awaiting tenant
  'active',               // both parties signed, lease running
  'terminated',           // lease cancelled
  'expired',              // lease end date passed
]);

export const leaseContracts = pgTable(
  'lease_contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId:    uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    unitId:   uuid('unit_id').notNull().references(() => units.id, { onDelete: 'restrict' }),

    // Human-readable contract number, e.g. CHIC-2026-0142
    contractNumber: varchar('contract_number', { length: 32 }).notNull().unique(),

    // Financial / lease terms — frozen at signing
    monthlyRent:    numeric('monthly_rent',    { precision: 12, scale: 2 }).notNull(),
    currency:       varchar('currency', { length: 3 }).notNull().default('USD'),
    depositAmount:  numeric('deposit_amount',  { precision: 12, scale: 2 }),
    // Stored as DATE (no time) — drizzle returns ISO strings like '2026-06-01'
    leaseStart:     date('lease_start',  { mode: 'string' }).notNull(),
    leaseEnd:       date('lease_end',    { mode: 'string' }),
    rentDueDay:     integer('rent_due_day').notNull().default(1),  // 1..28
    annualEscalationPct: numeric('annual_escalation_pct', { precision: 5, scale: 2 }),
    permittedUse:   varchar('permitted_use', { length: 200 }),
    noticePeriodDays: integer('notice_period_days').notNull().default(60),

    // Full document — terms in structured form + extra clauses
    terms: jsonb('terms').notNull(),

    // Signatures
    ownerSignedAt:   timestamp('owner_signed_at',  { withTimezone: true }),
    ownerSignedBy:   uuid('owner_signed_by').references(() => users.id, { onDelete: 'set null' }),
    ownerSignerName: varchar('owner_signer_name', { length: 200 }),

    tenantSignedAt:   timestamp('tenant_signed_at',  { withTimezone: true }),
    tenantSignerName: varchar('tenant_signer_name', { length: 200 }),
    // Optional tenant-side sign link token — short-lived, single-use
    tenantSignToken:  varchar('tenant_sign_token', { length: 80 }),

    status: contractStatusEnum('status').notNull().default('draft'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx:    index('lease_contracts_org_idx').on(table.orgId),
    tenantIdx: index('lease_contracts_tenant_idx').on(table.tenantId),
    unitIdx:   index('lease_contracts_unit_idx').on(table.unitId),
    statusIdx: index('lease_contracts_status_idx').on(table.status),
  }),
);
