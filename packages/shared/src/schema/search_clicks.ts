import {
  pgTable, uuid, varchar, integer, timestamp, index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { buildings } from './buildings';

/**
 * Records each click a shopper makes on a search result. Used by Phase-7
 * ML to train a click-through ranker and surface popular shops.
 */
export const searchClicks = pgTable(
  'search_clicks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    query:  varchar('query', { length: 500 }).notNull(),
    locale: varchar('locale', { length: 8 }),

    resultType: varchar('result_type', { length: 20 }).notNull(), // 'shop' | 'product'
    resultId:   uuid('result_id').notNull(),
    rank:       integer('rank').notNull(),

    shopperSessionId: varchar('shopper_session_id', { length: 80 }),
    shopperUserId:    uuid('shopper_user_id').references(() => users.id, { onDelete: 'set null' }),
    buildingId:       uuid('building_id').references(() => buildings.id, { onDelete: 'set null' }),

    clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    queryIdx:   index('search_clicks_query_idx').on(table.query),
    resultIdx:  index('search_clicks_result_idx').on(table.resultType, table.resultId),
    clickedIdx: index('search_clicks_clicked_idx').on(table.clickedAt),
  }),
);
