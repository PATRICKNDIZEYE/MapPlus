"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.floors = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const buildings_1 = require("./buildings");
exports.floors = (0, pg_core_1.pgTable)('floors', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    buildingId: (0, pg_core_1.uuid)('building_id')
        .notNull()
        .references(() => buildings_1.buildings.id, { onDelete: 'cascade' }),
    floorNumber: (0, pg_core_1.integer)('floor_number').notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 200 }).notNull(),
    shortName: (0, pg_core_1.varchar)('short_name', { length: 20 }),
    floorPlanUrl: (0, pg_core_1.text)('floor_plan_url'),
    elevationM: (0, pg_core_1.numeric)('elevation_m', { precision: 6, scale: 2 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    buildingIdx: (0, pg_core_1.index)('floors_building_idx').on(table.buildingId),
}));
