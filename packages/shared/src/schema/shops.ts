import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { units } from './units';

export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified',
  'verified',
  'needs_review',
  'reported_wrong',
]);

export const shopProfiles = pgTable(
  'shop_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'restrict' }),
    publicName: varchar('public_name', { length: 200 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),
    subcategory: varchar('subcategory', { length: 100 }),
    // Searchable tags: ["shoes", "sneakers", "nike", "footwear"]
    tags: text('tags').array(),
    logoUrl: text('logo_url'),
    coverPhotoUrl: text('cover_photo_url'),
    phone: varchar('phone', { length: 50 }),
    whatsapp: varchar('whatsapp', { length: 50 }),
    email: varchar('email', { length: 200 }),
    website: varchar('website', { length: 500 }),
    // JSONB: { monday: { open: "08:00", close: "20:00", closed: false }, ... }
    operatingHours: jsonb('operating_hours'),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by'),
    reportCount: integer('report_count').notNull().default(0),
    lastReportedAt: timestamp('last_reported_at', { withTimezone: true }),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index('shop_profiles_category_idx').on(table.category),
    verificationIdx: index('shop_profiles_verification_idx').on(table.verificationStatus),
    unitIdx: index('shop_profiles_unit_idx').on(table.unitId),
    // Full-text search index created via raw migration (see drizzle/migrations)
  }),
);

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  shopId: uuid('shop_id')
    .notNull()
    .references(() => shopProfiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  price: varchar('price', { length: 50 }), // kept as string to support "from 5,000 RWF"
  currency: varchar('currency', { length: 3 }).default('RWF'),
  imageUrl: text('image_url'),
  isAvailable: boolean('is_available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

