import {
  pgTable,
  uuid,
  varchar,
  numeric,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { buildings } from './buildings';
import { floors } from './floors';

export const navNodeTypeEnum = {
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
} as const;

export const navNodes = pgTable(
  'nav_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    floorId: uuid('floor_id')
      .notNull()
      .references(() => floors.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    // geometry GEOMETRY(Point, 4326) — added via raw migration SQL
    label: varchar('label', { length: 200 }),
    accessible: boolean('accessible').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    buildingFloorIdx: index('nav_nodes_building_floor_idx').on(table.buildingId, table.floorId),
    typeIdx: index('nav_nodes_type_idx').on(table.type),
  }),
);

export const navEdges = pgTable(
  'nav_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromNodeId: uuid('from_node_id')
      .notNull()
      .references(() => navNodes.id, { onDelete: 'cascade' }),
    toNodeId: uuid('to_node_id')
      .notNull()
      .references(() => navNodes.id, { onDelete: 'cascade' }),
    distanceM: numeric('distance_m', { precision: 8, scale: 2 }).notNull(),
    bidirectional: boolean('bidirectional').notNull().default(true),
    floorChange: varchar('floor_change', { length: 20 }),
    accessible: boolean('accessible').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => ({
    fromNodeIdx: index('nav_edges_from_idx').on(table.fromNodeId),
    toNodeIdx: index('nav_edges_to_idx').on(table.toNodeId),
  }),
);

export const qrAnchors = pgTable('qr_anchors', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildingId: uuid('building_id')
    .notNull()
    .references(() => buildings.id, { onDelete: 'cascade' }),
  floorId: uuid('floor_id')
    .notNull()
    .references(() => floors.id, { onDelete: 'cascade' }),
  navNodeId: uuid('nav_node_id')
    .notNull()
    .references(() => navNodes.id, { onDelete: 'restrict' }),
  label: varchar('label', { length: 200 }).notNull(),
  shortCode: varchar('short_code', { length: 20 }).notNull().unique(),
  qrUrl: varchar('qr_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const NAV_NODES_GEOMETRY_MIGRATION = sql`
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
