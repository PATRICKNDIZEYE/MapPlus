"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.units = exports.unitStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const floors_1 = require("./floors");
const buildings_1 = require("./buildings");
const tenants_1 = require("./tenants");
exports.unitStatusEnum = (0, pg_core_1.pgEnum)('unit_status', [
    'occupied',
    'vacant',
    'reserved',
    'maintenance',
    'non_leasable',
]);
exports.units = (0, pg_core_1.pgTable)('units', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    floorId: (0, pg_core_1.uuid)('floor_id')
        .notNull()
        .references(() => floors_1.floors.id, { onDelete: 'cascade' }),
    buildingId: (0, pg_core_1.uuid)('building_id')
        .notNull()
        .references(() => buildings_1.buildings.id, { onDelete: 'cascade' }),
    unitCode: (0, pg_core_1.varchar)('unit_code', { length: 50 }).notNull(),
    unitName: (0, pg_core_1.varchar)('unit_name', { length: 200 }),
    areaSqm: (0, pg_core_1.numeric)('area_sqm', { precision: 10, scale: 2 }),
    status: (0, exports.unitStatusEnum)('status').notNull().default('vacant'),
    tenantId: (0, pg_core_1.uuid)('tenant_id').references(() => tenants_1.tenants.id, { onDelete: 'set null' }),
    visibility: (0, pg_core_1.boolean)('visibility').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    buildingFloorIdx: (0, pg_core_1.index)('units_building_floor_idx').on(table.buildingId, table.floorId),
    unitCodeIdx: (0, pg_core_1.index)('units_unit_code_idx').on(table.buildingId, table.unitCode),
    tenantIdx: (0, pg_core_1.index)('units_tenant_idx').on(table.tenantId),
}));
