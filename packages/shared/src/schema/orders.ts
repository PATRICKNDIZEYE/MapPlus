import {
  pgTable, uuid, varchar, text, integer, numeric, timestamp, pgEnum, index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './shops';
import { users } from './users';
import { buildings } from './buildings';

export const orderStatusEnum = pgEnum('order_status', [
  'requested',     // shopper placed Buy & Try request, delivery fee paid
  'accepted',      // tenant + delivery personnel acknowledged
  'picked_up',     // delivery picked from shop
  'in_delivery',   // en route to shopper
  'delivered',     // handed to shopper, awaiting decision
  'paid',          // shopper paid in full
  'returned',      // shopper rejected — back at shop
  'cancelled',     // cancelled before pickup
]);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Shopper may be anonymous (QR session). Stored as a session token in that case.
    shopperUserId: uuid('shopper_user_id').references(() => users.id, { onDelete: 'set null' }),
    shopperSessionId: varchar('shopper_session_id', { length: 80 }),
    shopperName:  varchar('shopper_name', { length: 200 }),
    shopperPhone: varchar('shopper_phone', { length: 50 }),

    tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    productId:  uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
    buildingId: uuid('building_id').notNull().references(() => buildings.id, { onDelete: 'restrict' }),

    quantity:    integer('quantity').notNull().default(1),
    unitPrice:   numeric('unit_price',   { precision: 12, scale: 2 }).notNull(),
    deliveryFee: numeric('delivery_fee', { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    currency:    varchar('currency', { length: 3 }).notNull().default('RWF'),

    deliveryAddress: text('delivery_address').notNull(),
    deliveryNotes:   text('delivery_notes'),

    status: orderStatusEnum('status').notNull().default('requested'),

    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    pickedUpAt:  timestamp('picked_up_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    paidAt:      timestamp('paid_at',      { withTimezone: true }),
    returnedAt:  timestamp('returned_at',  { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx:   index('orders_tenant_idx').on(table.tenantId),
    statusIdx:   index('orders_status_idx').on(table.status),
    buildingIdx: index('orders_building_idx').on(table.buildingId),
    shopperIdx:  index('orders_shopper_idx').on(table.shopperUserId),
    sessionIdx:  index('orders_session_idx').on(table.shopperSessionId),
  }),
);
