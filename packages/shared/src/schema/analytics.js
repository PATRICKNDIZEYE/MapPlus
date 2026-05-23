"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrongInfoReports = exports.analyticsEvents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.analyticsEvents = (0, pg_core_1.pgTable)('analytics_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 100 }).notNull(),
    buildingId: (0, pg_core_1.uuid)('building_id'),
    floorId: (0, pg_core_1.uuid)('floor_id'),
    shopId: (0, pg_core_1.uuid)('shop_id'),
    searchQuery: (0, pg_core_1.text)('search_query'),
    resultCount: (0, pg_core_1.integer)('result_count'),
    sessionId: (0, pg_core_1.varchar)('session_id', { length: 100 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    buildingCreatedIdx: (0, pg_core_1.index)('analytics_building_created_idx').on(table.buildingId, table.createdAt),
    eventTypeIdx: (0, pg_core_1.index)('analytics_event_type_idx').on(table.eventType),
    shopIdx: (0, pg_core_1.index)('analytics_shop_idx').on(table.shopId),
}));
exports.wrongInfoReports = (0, pg_core_1.pgTable)('wrong_info_reports', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    shopId: (0, pg_core_1.uuid)('shop_id').notNull(),
    reportType: (0, pg_core_1.varchar)('report_type', { length: 50 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    reporterSession: (0, pg_core_1.varchar)('reporter_session', { length: 100 }),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('open'),
    resolvedBy: (0, pg_core_1.uuid)('resolved_by'),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
