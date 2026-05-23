import {
  pgTable, uuid, varchar, text, timestamp, pgEnum, index,
} from 'drizzle-orm/pg-core';
import { buildings } from './buildings';
import { floors } from './floors';
import { users } from './users';

export const incidentTypeEnum = pgEnum('incident_type', [
  'security',     // theft, altercation, suspicious activity
  'maintenance',  // broken fixture, leak, electrical
  'cleaning',     // spill, garbage, restroom
  'safety',       // fire risk, blocked exit
  'other',
]);

export const incidentStatusEnum = pgEnum('incident_status', [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
]);

export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buildingId: uuid('building_id').notNull().references(() => buildings.id, { onDelete: 'cascade' }),
    floorId:    uuid('floor_id').references(() => floors.id, { onDelete: 'set null' }),

    type:   incidentTypeEnum('type').notNull(),
    status: incidentStatusEnum('status').notNull().default('open'),

    title:       varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    photoUrl:    text('photo_url'),
    location:    varchar('location', { length: 200 }), // free-text within building

    reportedBy: uuid('reported_by').references(() => users.id, { onDelete: 'set null' }),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),

    reportedAt:  timestamp('reported_at',  { withTimezone: true }).notNull().defaultNow(),
    assignedAt:  timestamp('assigned_at',  { withTimezone: true }),
    resolvedAt:  timestamp('resolved_at',  { withTimezone: true }),
    resolutionNote: text('resolution_note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    buildingIdx: index('incidents_building_idx').on(table.buildingId),
    statusIdx:   index('incidents_status_idx').on(table.status),
    typeIdx:     index('incidents_type_idx').on(table.type),
    assignedIdx: index('incidents_assigned_idx').on(table.assignedTo),
  }),
);
