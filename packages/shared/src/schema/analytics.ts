import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// Append-only event log. Partitioned by month in production via raw SQL.
// Never update or delete rows — analytics data is immutable.
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Event types that matter most for the building owner dashboard:
    // search | shop_view | direction_request | qr_scan | contact_click | wrong_info_report
    eventType: varchar('event_type', { length: 100 }).notNull(),
    buildingId: uuid('building_id'),
    floorId: uuid('floor_id'),
    shopId: uuid('shop_id'),
    searchQuery: text('search_query'),
    // result_count = 0 → failed search (key business signal)
    resultCount: integer('result_count'),
    sessionId: varchar('session_id', { length: 100 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    buildingCreatedIdx: index('analytics_building_created_idx').on(
      table.buildingId,
      table.createdAt,
    ),
    eventTypeIdx: index('analytics_event_type_idx').on(table.eventType),
    shopIdx: index('analytics_shop_idx').on(table.shopId),
  }),
);

// Wrong-info reports queue — actionable items for building manager review
export const wrongInfoReports = pgTable('wrong_info_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  shopId: uuid('shop_id').notNull(),
  reportType: varchar('report_type', { length: 50 }).notNull(), // 'wrong_location'|'wrong_info'|'closed'|'other'
  description: text('description'),
  reporterSession: varchar('reporter_session', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull().default('open'), // open|reviewing|resolved|dismissed
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
