import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    legalName: varchar('legal_name', { length: 200 }).notNull(),
    tradeName: varchar('trade_name', { length: 200 }),
    contactEmail: varchar('contact_email', { length: 200 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    contactWhatsapp: varchar('contact_whatsapp', { length: 50 }),
    leaseStart: date('lease_start'),
    leaseEnd: date('lease_end'),
    depositAmount: numeric('deposit_amount', { precision: 12, scale: 2 }),
    monthlyRent: numeric('monthly_rent', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('RWF'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('tenants_org_idx').on(table.orgId),
  }),
);
