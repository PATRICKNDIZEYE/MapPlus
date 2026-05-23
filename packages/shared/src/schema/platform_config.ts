import {
  pgTable, uuid, varchar, text, jsonb, timestamp, index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Platform-wide configuration — only super_admin can read/write.
 * Stored as a key/value table so config can be added without migrations.
 * Examples: anthropic_api_key (encrypted at rest in prod), default_delivery_fee_rwf,
 * rentavance_interest_rate, momo_collection_subscription_key.
 */
export const platformConfig = pgTable(
  'platform_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    key:        varchar('key', { length: 100 }).notNull().unique(),
    valueText:  text('value_text'),
    valueJson:  jsonb('value_json'),

    // Whether the value is sensitive (API keys, credentials). UI masks these.
    isSecret:   varchar('is_secret', { length: 1 }).notNull().default('N'), // 'Y' or 'N'

    description: text('description'),

    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyIdx: index('platform_config_key_idx').on(table.key),
  }),
);
