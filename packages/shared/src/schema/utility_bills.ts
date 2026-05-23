import {
  pgTable, uuid, varchar, text, numeric, timestamp, pgEnum, date, index,
} from 'drizzle-orm/pg-core';
import { buildings } from './buildings';
import { tenants } from './tenants';

export const utilityTypeEnum = pgEnum('utility_type', [
  'electricity',
  'water',
  'gas',
  'internet',
  'common_area',  // shared maintenance / cleaning levy
  'security',
  'other',
]);

export const utilityBillStatusEnum = pgEnum('utility_bill_status', [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
]);

export const utilityBills = pgTable(
  'utility_bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buildingId: uuid('building_id').notNull().references(() => buildings.id, { onDelete: 'cascade' }),
    tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

    utilityType: utilityTypeEnum('utility_type').notNull(),
    status:      utilityBillStatusEnum('status').notNull().default('draft'),

    periodStart: date('period_start', { mode: 'string' }).notNull(),
    periodEnd:   date('period_end',   { mode: 'string' }).notNull(),

    // Tenant's share of the building-wide bill, e.g. by area-sqm allocation
    unitAllocationPct: numeric('unit_allocation_pct', { precision: 5,  scale: 4 }),
    amount:            numeric('amount',             { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RWF'),

    notes:   text('notes'),
    dueDate: date('due_date', { mode: 'string' }),
    paidAt:  timestamp('paid_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    buildingIdx: index('utility_bills_building_idx').on(table.buildingId),
    tenantIdx:   index('utility_bills_tenant_idx').on(table.tenantId),
    statusIdx:   index('utility_bills_status_idx').on(table.status),
    periodIdx:   index('utility_bills_period_idx').on(table.periodStart, table.periodEnd),
  }),
);
