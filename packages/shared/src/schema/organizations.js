"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizations = exports.orgTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.orgTypeEnum = (0, pg_core_1.pgEnum)('org_type', [
    'building_owner',
    'management_company',
    'property_manager',
]);
exports.organizations = (0, pg_core_1.pgTable)('organizations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 200 }).notNull(),
    type: (0, exports.orgTypeEnum)('type').notNull().default('building_owner'),
    contactEmail: (0, pg_core_1.varchar)('contact_email', { length: 200 }),
    contactPhone: (0, pg_core_1.varchar)('contact_phone', { length: 50 }),
    logoUrl: (0, pg_core_1.text)('logo_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
