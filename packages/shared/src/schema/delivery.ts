import {
  pgTable, uuid, varchar, text, numeric, timestamp, pgEnum, jsonb, index,
} from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { users } from './users';
import { buildings } from './buildings';

export const deliveryJobStatusEnum = pgEnum('delivery_job_status', [
  'queued',      // unassigned, awaiting personnel
  'accepted',    // personnel accepted the job
  'picking',     // personnel walking to shop
  'picked',      // item collected from tenant
  'delivering',  // en route to shopper
  'delivered',   // handed over
  'returned',    // shopper rejected — taken back
  'cancelled',
]);

export const deliveryJobs = pgTable(
  'delivery_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId:    uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    buildingId: uuid('building_id').notNull().references(() => buildings.id, { onDelete: 'restrict' }),
    personnelId: uuid('personnel_id').references(() => users.id, { onDelete: 'set null' }),

    status: deliveryJobStatusEnum('status').notNull().default('queued'),

    queuedAt:     timestamp('queued_at',     { withTimezone: true }).notNull().defaultNow(),
    acceptedAt:   timestamp('accepted_at',   { withTimezone: true }),
    pickedUpAt:   timestamp('picked_up_at',  { withTimezone: true }),
    deliveredAt:  timestamp('delivered_at',  { withTimezone: true }),
    returnedAt:   timestamp('returned_at',   { withTimezone: true }),

    // POD = Proof of Delivery (photo URL captured on handover)
    podPhotoUrl:   text('pod_photo_url'),
    returnReason:  varchar('return_reason', { length: 200 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx:     index('delivery_jobs_order_idx').on(table.orderId),
    statusIdx:    index('delivery_jobs_status_idx').on(table.status),
    personnelIdx: index('delivery_jobs_personnel_idx').on(table.personnelId),
    buildingIdx:  index('delivery_jobs_building_idx').on(table.buildingId),
  }),
);

export const deliveryRoutes = pgTable(
  'delivery_routes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id').notNull().references(() => deliveryJobs.id, { onDelete: 'cascade' }),

    // Ordered list of nav_node ids to traverse
    navNodeIds: jsonb('nav_node_ids').notNull(),
    totalDistanceM: numeric('total_distance_m', { precision: 10, scale: 2 }),

    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    jobIdx: index('delivery_routes_job_idx').on(table.jobId),
  }),
);
