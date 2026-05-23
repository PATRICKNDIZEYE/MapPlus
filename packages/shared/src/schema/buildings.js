"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildings = exports.buildingStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const organizations_1 = require("./organizations");
exports.buildingStatusEnum = (0, pg_core_1.pgEnum)('building_status', [
    'active',
    'inactive',
    'onboarding',
    'suspended',
]);
exports.buildings = (0, pg_core_1.pgTable)('buildings', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    orgId: (0, pg_core_1.uuid)('org_id')
        .notNull()
        .references(() => organizations_1.organizations.id, { onDelete: 'restrict' }),
    name: (0, pg_core_1.varchar)('name', { length: 200 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 100 }).notNull().unique(),
    address: (0, pg_core_1.text)('address'),
    city: (0, pg_core_1.varchar)('city', { length: 100 }).notNull().default('Kigali'),
    country: (0, pg_core_1.varchar)('country', { length: 100 }).notNull().default('Rwanda'),
    lat: (0, pg_core_1.numeric)('lat', { precision: 10, scale: 7 }),
    lng: (0, pg_core_1.numeric)('lng', { precision: 10, scale: 7 }),
    floorsCount: (0, pg_core_1.integer)('floors_count').notNull().default(1),
    operatingHours: (0, pg_core_1.jsonb)('operating_hours'),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 100 }).notNull().default('Africa/Kigali'),
    status: (0, exports.buildingStatusEnum)('status').notNull().default('onboarding'),
    coverPhotoUrl: (0, pg_core_1.text)('cover_photo_url'),
    description: (0, pg_core_1.text)('description'),
    isPublic: (0, pg_core_1.boolean)('is_public').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)('buildings_org_idx').on(table.orgId),
    statusIdx: (0, pg_core_1.index)('buildings_status_idx').on(table.status),
}));
