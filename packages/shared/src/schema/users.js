"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const organizations_1 = require("./organizations");
const tenants_1 = require("./tenants");
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', [
    'super_admin',
    'org_owner',
    'building_manager',
    'floor_manager',
    'tenant_admin',
    'tenant_staff',
    'public',
]);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.varchar)('email', { length: 200 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 200 }).notNull(),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    role: (0, exports.userRoleEnum)('role').notNull().default('public'),
    orgId: (0, pg_core_1.uuid)('org_id').references(() => organizations_1.organizations.id, { onDelete: 'set null' }),
    tenantId: (0, pg_core_1.uuid)('tenant_id').references(() => tenants_1.tenants.id, { onDelete: 'set null' }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
