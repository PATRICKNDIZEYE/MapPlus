import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { tenants } from './tenants';

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'org_owner',
  'building_manager',
  'floor_manager',
  'accounts',
  'security',
  'maintenance',
  'tenant_admin',
  'tenant_staff',
  'delivery_personnel',
  'public',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 200 }).notNull().unique(),
  // Nullable so Google-only accounts (no password set) are valid.
  passwordHash: varchar('password_hash', { length: 200 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  googleSub: varchar('google_sub', { length: 100 }).unique(),
  role: userRoleEnum('role').notNull().default('public'),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'set null' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
