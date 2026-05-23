"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.amenities = exports.amenityTypeEnum = exports.mapVersions = exports.mapVersionStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const buildings_1 = require("./buildings");
const floors_1 = require("./floors");
exports.mapVersionStatusEnum = (0, pg_core_1.pgEnum)('map_version_status', [
    'draft',
    'published',
    'archived',
]);
exports.mapVersions = (0, pg_core_1.pgTable)('map_versions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    buildingId: (0, pg_core_1.uuid)('building_id')
        .notNull()
        .references(() => buildings_1.buildings.id, { onDelete: 'cascade' }),
    floorId: (0, pg_core_1.uuid)('floor_id')
        .notNull()
        .references(() => floors_1.floors.id, { onDelete: 'cascade' }),
    versionString: (0, pg_core_1.varchar)('version_string', { length: 20 }).notNull(),
    status: (0, exports.mapVersionStatusEnum)('status').notNull().default('draft'),
    publishedAt: (0, pg_core_1.timestamp)('published_at', { withTimezone: true }),
    publishedBy: (0, pg_core_1.uuid)('published_by'),
    changeSummary: (0, pg_core_1.text)('change_summary'),
    geojsonUrl: (0, pg_core_1.text)('geojson_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.amenityTypeEnum = (0, pg_core_1.pgEnum)('amenity_type', [
    'restroom_male',
    'restroom_female',
    'restroom_unisex',
    'elevator',
    'stairs',
    'escalator',
    'atm',
    'info_desk',
    'entrance',
    'exit',
    'parking',
    'prayer_room',
    'first_aid',
    'food_court',
]);
exports.amenities = (0, pg_core_1.pgTable)('amenities', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    buildingId: (0, pg_core_1.uuid)('building_id')
        .notNull()
        .references(() => buildings_1.buildings.id, { onDelete: 'cascade' }),
    floorId: (0, pg_core_1.uuid)('floor_id')
        .notNull()
        .references(() => floors_1.floors.id, { onDelete: 'cascade' }),
    type: (0, exports.amenityTypeEnum)('type').notNull(),
    label: (0, pg_core_1.varchar)('label', { length: 200 }),
    navNodeId: (0, pg_core_1.uuid)('nav_node_id'),
    isActive: (0, pg_core_1.varchar)('is_active', { length: 10 }).default('true'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
