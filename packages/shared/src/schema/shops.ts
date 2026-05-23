import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
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

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shopProfiles.id, { onDelete: 'cascade' }),
    // tenantId added for direct-by-tenant queries (Tenant Hub product mgmt). Nullable so
    // existing rows don't need backfilling immediately; new inserts will set it.
    tenantId: uuid('tenant_id'),

    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    sku: varchar('sku', { length: 80 }),
    category: varchar('category', { length: 100 }),

    // Legacy display-string price ("from 5,000 RWF") — kept for backward compatibility.
    price: varchar('price', { length: 50 }),
    // Numeric price introduced for Buy & Try checkout. Nullable until backfilled.
    priceAmount: numeric('price_amount', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('RWF'),

    stockCount: integer('stock_count').notNull().default(0),

    // Legacy single image. New uploads also populate the images JSONB array below.
    imageUrl: text('image_url'),
    // [{ url: string, isPrimary?: boolean }, ...]
    images: jsonb('images').notNull().default([]),

    // Legacy availability flag — paired with isPublished for Buy & Try gating.
    isAvailable: boolean('is_available').notNull().default(true),
    isPublished: boolean('is_published').notNull().default(false),
    isBuyAndTryEligible: boolean('is_buy_and_try_eligible').notNull().default(true),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shopIdx:      index('products_shop_idx').on(table.shopId),
    tenantIdx:    index('products_tenant_idx').on(table.tenantId),
    categoryIdx:  index('products_category_idx').on(table.category),
    publishedIdx: index('products_published_idx').on(table.isPublished),
  }),
);

