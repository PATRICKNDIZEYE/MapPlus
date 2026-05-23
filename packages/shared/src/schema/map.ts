import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { buildings } from './buildings';
import { floors } from './floors';

export const mapVersionStatusEnum = pgEnum('map_version_status', [
  'draft',
  'published',
  'archived',
]);

export const mapVersions = pgTable('map_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildingId: uuid('building_id')
    .notNull()
    .references(() => buildings.id, { onDelete: 'cascade' }),
  floorId: uuid('floor_id')
    .notNull()
    .references(() => floors.id, { onDelete: 'cascade' }),
  versionString: varchar('version_string', { length: 20 }).notNull(), // "1.0", "1.1"
  status: mapVersionStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBy: uuid('published_by'), // FK to users (loose ref to avoid circular)
  changeSummary: text('change_summary'),
  // CDN URL of the pre-generated GeoJSON snapshot for this version
  geojsonUrl: text('geojson_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Amenity markers — separate from units (they have no tenant, just a type + nav node)
export const amenityTypeEnum = pgEnum('amenity_type', [
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

export const amenities = pgTable('amenities', {
  id: uuid('id').primaryKey().defaultRandom(),
  buildingId: uuid('building_id')
    .notNull()
    .references(() => buildings.id, { onDelete: 'cascade' }),
  floorId: uuid('floor_id')
    .notNull()
    .references(() => floors.id, { onDelete: 'cascade' }),
  type: amenityTypeEnum('type').notNull(),
  label: varchar('label', { length: 200 }),
  navNodeId: uuid('nav_node_id'), // links to nav_nodes for routing
  isActive: varchar('is_active', { length: 10 }).default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
