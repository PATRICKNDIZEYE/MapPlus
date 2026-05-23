import {
  pgTable,
  uuid,
  varchar,
  numeric,
  boolean,
  timestamp,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { floors } from './floors';
import { buildings } from './buildings';
import { tenants } from './tenants';

export const unitStatusEnum = pgEnum('unit_status', [
  'occupied',
  'vacant',
  'reserved',
  'maintenance',
  'non_leasable',
]);

export const units = pgTable(
  'units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    floorId: uuid('floor_id')
      .notNull()
      .references(() => floors.id, { onDelete: 'cascade' }),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    unitCode: varchar('unit_code', { length: 50 }).notNull(),
    unitName: varchar('unit_name', { length: 200 }),
    // geometry column GEOMETRY(Polygon,4326) added via raw migration SQL
    areaSqm: numeric('area_sqm', { precision: 10, scale: 2 }),
    status: unitStatusEnum('status').notNull().default('vacant'),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    visibility: boolean('visibility').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    buildingFloorIdx: index('units_building_floor_idx').on(table.buildingId, table.floorId),
    unitCodeIdx: index('units_unit_code_idx').on(table.buildingId, table.unitCode),
    tenantIdx: index('units_tenant_idx').on(table.tenantId),
  }),
);
