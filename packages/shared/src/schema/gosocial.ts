import {
  pgTable, uuid, varchar, text, timestamp, pgEnum, jsonb, index, boolean,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './shops';
import { users } from './users';

export const socialPlatformEnum = pgEnum('social_platform', [
  'instagram',
  'facebook',
  'tiktok',
  'twitter',
]);

export const socialPostStatusEnum = pgEnum('social_post_status', [
  'draft',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled',
]);

/**
 * Per-tenant connected social accounts. Tokens are encrypted at rest in
 * production (Phase-5 polish wires the at-rest encryption layer); for now
 * the column is plain text so dev flows work without KMS.
 */
export const tenantSocialAccounts = pgTable(
  'tenant_social_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    platform: socialPlatformEnum('platform').notNull(),

    // Account identity returned by the platform (handle, page id, etc.)
    accountId:    varchar('account_id', { length: 200 }).notNull(),
    accountLabel: varchar('account_label', { length: 200 }),

    accessToken:  text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    expiresAt:    timestamp('expires_at', { withTimezone: true }),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx:    index('tenant_social_accounts_tenant_idx').on(table.tenantId),
    platformIdx:  index('tenant_social_accounts_platform_idx').on(table.tenantId, table.platform),
  }),
);

/**
 * A scheduled or published post. Caption + hashtags + media all live on the
 * row; per-platform delivery results land in `platformResults` JSONB.
 */
export const socialPosts = pgTable(
  'social_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),

    // Which platforms to publish on — array of socialPlatformEnum values.
    platforms: jsonb('platforms').notNull().default([]),

    caption:  text('caption').notNull(),
    hashtags: jsonb('hashtags').notNull().default([]),
    mediaUrls: jsonb('media_urls').notNull().default([]),

    status: socialPostStatusEnum('status').notNull().default('draft'),

    scheduledAt:  timestamp('scheduled_at',  { withTimezone: true }),
    publishedAt:  timestamp('published_at',  { withTimezone: true }),
    publishError: text('publish_error'),

    // [{ platform, postId, postUrl, publishedAt, error? }, ...]
    platformResults: jsonb('platform_results').notNull().default([]),

    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx:    index('social_posts_tenant_idx').on(table.tenantId),
    statusIdx:    index('social_posts_status_idx').on(table.status),
    scheduledIdx: index('social_posts_scheduled_idx').on(table.scheduledAt),
  }),
);
