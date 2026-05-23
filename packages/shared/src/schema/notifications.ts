import {
  pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, jsonb, index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const notificationCategoryEnum = pgEnum('notification_category', [
  'rent_due',
  'rent_paid',
  'advance_approved',
  'advance_disbursed',
  'advance_repaid',
  'order_status',
  'delivery_update',
  'incident',
  'utility_bill',
  'system',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    category: notificationCategoryEnum('category').notNull(),
    title:    varchar('title', { length: 200 }).notNull(),
    body:     text('body').notNull(),

    // Deep-link target inside the app (e.g. '/admin/incidents/abc-123')
    href: varchar('href', { length: 500 }),

    // Arbitrary metadata for clients to interpret (counts, ids, etc.)
    meta: jsonb('meta'),

    isRead:  boolean('is_read').notNull().default(false),
    readAt:  timestamp('read_at', { withTimezone: true }),

    // Email/SMS dispatch tracking — null if in-app only
    emailedAt: timestamp('emailed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx:    index('notifications_user_idx').on(table.userId),
    unreadIdx:  index('notifications_unread_idx').on(table.userId, table.isRead),
    createdIdx: index('notifications_created_idx').on(table.createdAt),
  }),
);
