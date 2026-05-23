"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenants = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const organizations_1 = require("./organizations");
exports.tenants = (0, pg_core_1.pgTable)('tenants', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    orgId: (0, pg_core_1.uuid)('org_id')
        .notNull()
        .references(() => organizations_1.organizations.id, { onDelete: 'restrict' }),
    legalName: (0, pg_core_1.varchar)('legal_name', { length: 200 }).notNull(),
    tradeName: (0, pg_core_1.varchar)('trade_name', { length: 200 }),
    contactEmail: (0, pg_core_1.varchar)('contact_email', { length: 200 }),
    contactPhone: (0, pg_core_1.varchar)('contact_phone', { length: 50 }),
    contactWhatsapp: (0, pg_core_1.varchar)('contact_whatsapp', { length: 50 }),
    leaseStart: (0, pg_core_1.date)('lease_start'),
    leaseEnd: (0, pg_core_1.date)('lease_end'),
    depositAmount: (0, pg_core_1.numeric)('deposit_amount', { precision: 12, scale: 2 }),
    monthlyRent: (0, pg_core_1.numeric)('monthly_rent', { precision: 12, scale: 2 }),
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).notNull().default('RWF'),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)('tenants_org_idx').on(table.orgId),
}));
