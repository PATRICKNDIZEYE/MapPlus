"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.products = exports.shopProfiles = exports.verificationStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const tenants_1 = require("./tenants");
const units_1 = require("./units");
exports.verificationStatusEnum = (0, pg_core_1.pgEnum)('verification_status', [
    'unverified',
    'verified',
    'needs_review',
    'reported_wrong',
]);
exports.shopProfiles = (0, pg_core_1.pgTable)('shop_profiles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id')
        .notNull()
        .references(() => tenants_1.tenants.id, { onDelete: 'cascade' }),
    unitId: (0, pg_core_1.uuid)('unit_id')
        .notNull()
        .references(() => units_1.units.id, { onDelete: 'restrict' }),
    publicName: (0, pg_core_1.varchar)('public_name', { length: 200 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    category: (0, pg_core_1.varchar)('category', { length: 100 }),
    subcategory: (0, pg_core_1.varchar)('subcategory', { length: 100 }),
    tags: (0, pg_core_1.text)('tags').array(),
    logoUrl: (0, pg_core_1.text)('logo_url'),
    coverPhotoUrl: (0, pg_core_1.text)('cover_photo_url'),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    whatsapp: (0, pg_core_1.varchar)('whatsapp', { length: 50 }),
    email: (0, pg_core_1.varchar)('email', { length: 200 }),
    website: (0, pg_core_1.varchar)('website', { length: 500 }),
    operatingHours: (0, pg_core_1.jsonb)('operating_hours'),
    verificationStatus: (0, exports.verificationStatusEnum)('verification_status')
        .notNull()
        .default('unverified'),
    lastVerifiedAt: (0, pg_core_1.timestamp)('last_verified_at', { withTimezone: true }),
    verifiedBy: (0, pg_core_1.uuid)('verified_by'),
    reportCount: (0, pg_core_1.integer)('report_count').notNull().default(0),
    lastReportedAt: (0, pg_core_1.timestamp)('last_reported_at', { withTimezone: true }),
    isPublished: (0, pg_core_1.boolean)('is_published').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    categoryIdx: (0, pg_core_1.index)('shop_profiles_category_idx').on(table.category),
    verificationIdx: (0, pg_core_1.index)('shop_profiles_verification_idx').on(table.verificationStatus),
    unitIdx: (0, pg_core_1.index)('shop_profiles_unit_idx').on(table.unitId),
}));
exports.products = (0, pg_core_1.pgTable)('products', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    shopId: (0, pg_core_1.uuid)('shop_id')
        .notNull()
        .references(() => exports.shopProfiles.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 200 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    price: (0, pg_core_1.varchar)('price', { length: 50 }),
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).default('RWF'),
    imageUrl: (0, pg_core_1.text)('image_url'),
    isAvailable: (0, pg_core_1.boolean)('is_available').notNull().default(true),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
