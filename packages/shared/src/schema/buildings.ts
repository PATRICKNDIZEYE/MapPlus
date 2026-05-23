import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const buildingStatusEnum = pgEnum('building_status', [
  'active',
  'inactive',
  'onboarding',
  'suspended',
]);

export const buildings = pgTable(
  'buildings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    address: text('address'),
    city: varchar('city', { length: 100 }).notNull().default('Kigali'),
    country: varchar('country', { length: 100 }).notNull().default('Rwanda'),
    lat: numeric('lat', { precision: 10, scale: 7 }),
    lng: numeric('lng', { precision: 10, scale: 7 }),
    floorsCount: integer('floors_count').notNull().default(1),
    operatingHours: jsonb('operating_hours'),
    timezone: varchar('timezone', { length: 100 }).notNull().default('Africa/Kigali'),
    status: buildingStatusEnum('status').notNull().default('onboarding'),
    coverPhotoUrl: text('cover_photo_url'),
    description: text('description'),
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('buildings_org_idx').on(table.orgId),
    statusIdx: index('buildings_status_idx').on(table.status),
  }),
);
