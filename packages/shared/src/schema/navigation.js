"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NAV_NODES_GEOMETRY_MIGRATION = exports.qrAnchors = exports.navEdges = exports.navNodes = exports.navNodeTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const buildings_1 = require("./buildings");
const floors_1 = require("./floors");
exports.navNodeTypeEnum = {
    ENTRANCE: 'entrance',
    EXIT: 'exit',
    CORRIDOR: 'corridor',
    STAIRS_TOP: 'stairs_top',
    STAIRS_BOTTOM: 'stairs_bottom',
    ELEVATOR: 'elevator',
    ESCALATOR: 'escalator',
    UNIT_DOOR: 'unit_door',
    AMENITY: 'amenity',
    QR_ANCHOR: 'qr_anchor',
};
exports.navNodes = (0, pg_core_1.pgTable)('nav_nodes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    buildingId: (0, pg_core_1.uuid)('building_id')
        .notNull()
        .references(() => buildings_1.buildings.id, { onDelete: 'cascade' }),
    floorId: (0, pg_core_1.uuid)('floor_id')
        .notNull()
        .references(() => floors_1.floors.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    label: (0, pg_core_1.varchar)('label', { length: 200 }),
    accessible: (0, pg_core_1.boolean)('accessible').notNull().default(true),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    buildingFloorIdx: (0, pg_core_1.index)('nav_nodes_building_floor_idx').on(table.buildingId, table.floorId),
    typeIdx: (0, pg_core_1.index)('nav_nodes_type_idx').on(table.type),
}));
exports.navEdges = (0, pg_core_1.pgTable)('nav_edges', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    fromNodeId: (0, pg_core_1.uuid)('from_node_id')
        .notNull()
        .references(() => exports.navNodes.id, { onDelete: 'cascade' }),
    toNodeId: (0, pg_core_1.uuid)('to_node_id')
        .notNull()
        .references(() => exports.navNodes.id, { onDelete: 'cascade' }),
    distanceM: (0, pg_core_1.numeric)('distance_m', { precision: 8, scale: 2 }).notNull(),
    bidirectional: (0, pg_core_1.boolean)('bidirectional').notNull().default(true),
    floorChange: (0, pg_core_1.varchar)('floor_change', { length: 20 }),
    accessible: (0, pg_core_1.boolean)('accessible').notNull().default(true),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
}, (table) => ({
    fromNodeIdx: (0, pg_core_1.index)('nav_edges_from_idx').on(table.fromNodeId),
    toNodeIdx: (0, pg_core_1.index)('nav_edges_to_idx').on(table.toNodeId),
}));
exports.qrAnchors = (0, pg_core_1.pgTable)('qr_anchors', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    buildingId: (0, pg_core_1.uuid)('building_id')
        .notNull()
        .references(() => buildings_1.buildings.id, { onDelete: 'cascade' }),
    floorId: (0, pg_core_1.uuid)('floor_id')
        .notNull()
        .references(() => floors_1.floors.id, { onDelete: 'cascade' }),
    navNodeId: (0, pg_core_1.uuid)('nav_node_id')
        .notNull()
        .references(() => exports.navNodes.id, { onDelete: 'restrict' }),
    label: (0, pg_core_1.varchar)('label', { length: 200 }).notNull(),
    shortCode: (0, pg_core_1.varchar)('short_code', { length: 20 }).notNull().unique(),
    qrUrl: (0, pg_core_1.varchar)('qr_url', { length: 500 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.NAV_NODES_GEOMETRY_MIGRATION = (0, drizzle_orm_1.sql) `
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'nav_nodes' AND column_name = 'geometry'
    ) THEN
      ALTER TABLE nav_nodes ADD COLUMN geometry GEOMETRY(Point, 4326);
      CREATE INDEX nav_nodes_geometry_gist ON nav_nodes USING GIST (geometry);
    END IF;
  END $$;
`;
