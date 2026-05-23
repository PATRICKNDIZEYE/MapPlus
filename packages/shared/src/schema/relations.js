"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapVersionsRelations = exports.navEdgesRelations = exports.navNodesRelations = exports.productsRelations = exports.shopProfilesRelations = exports.unitsRelations = exports.tenantsRelations = exports.floorsRelations = exports.buildingsRelations = exports.usersRelations = exports.organizationsRelations = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const organizations_1 = require("./organizations");
const users_1 = require("./users");
const buildings_1 = require("./buildings");
const floors_1 = require("./floors");
const tenants_1 = require("./tenants");
const units_1 = require("./units");
const shops_1 = require("./shops");
const navigation_1 = require("./navigation");
const map_1 = require("./map");
exports.organizationsRelations = (0, drizzle_orm_1.relations)(organizations_1.organizations, ({ many }) => ({
    buildings: many(buildings_1.buildings),
    users: many(users_1.users),
    tenants: many(tenants_1.tenants),
}));
exports.usersRelations = (0, drizzle_orm_1.relations)(users_1.users, ({ one }) => ({
    organization: one(organizations_1.organizations, { fields: [users_1.users.orgId], references: [organizations_1.organizations.id] }),
    tenant: one(tenants_1.tenants, { fields: [users_1.users.tenantId], references: [tenants_1.tenants.id] }),
}));
exports.buildingsRelations = (0, drizzle_orm_1.relations)(buildings_1.buildings, ({ one, many }) => ({
    organization: one(organizations_1.organizations, { fields: [buildings_1.buildings.orgId], references: [organizations_1.organizations.id] }),
    floors: many(floors_1.floors),
}));
exports.floorsRelations = (0, drizzle_orm_1.relations)(floors_1.floors, ({ one, many }) => ({
    building: one(buildings_1.buildings, { fields: [floors_1.floors.buildingId], references: [buildings_1.buildings.id] }),
    units: many(units_1.units),
    navNodes: many(navigation_1.navNodes),
    mapVersions: many(map_1.mapVersions),
}));
exports.tenantsRelations = (0, drizzle_orm_1.relations)(tenants_1.tenants, ({ one, many }) => ({
    organization: one(organizations_1.organizations, { fields: [tenants_1.tenants.orgId], references: [organizations_1.organizations.id] }),
    units: many(units_1.units),
    shopProfiles: many(shops_1.shopProfiles),
}));
exports.unitsRelations = (0, drizzle_orm_1.relations)(units_1.units, ({ one, many }) => ({
    floor: one(floors_1.floors, { fields: [units_1.units.floorId], references: [floors_1.floors.id] }),
    building: one(buildings_1.buildings, { fields: [units_1.units.buildingId], references: [buildings_1.buildings.id] }),
    tenant: one(tenants_1.tenants, { fields: [units_1.units.tenantId], references: [tenants_1.tenants.id] }),
    shopProfile: many(shops_1.shopProfiles),
}));
exports.shopProfilesRelations = (0, drizzle_orm_1.relations)(shops_1.shopProfiles, ({ one, many }) => ({
    tenant: one(tenants_1.tenants, { fields: [shops_1.shopProfiles.tenantId], references: [tenants_1.tenants.id] }),
    unit: one(units_1.units, { fields: [shops_1.shopProfiles.unitId], references: [units_1.units.id] }),
    products: many(shops_1.products),
}));
exports.productsRelations = (0, drizzle_orm_1.relations)(shops_1.products, ({ one }) => ({
    shop: one(shops_1.shopProfiles, { fields: [shops_1.products.shopId], references: [shops_1.shopProfiles.id] }),
}));
exports.navNodesRelations = (0, drizzle_orm_1.relations)(navigation_1.navNodes, ({ one, many }) => ({
    building: one(buildings_1.buildings, { fields: [navigation_1.navNodes.buildingId], references: [buildings_1.buildings.id] }),
    floor: one(floors_1.floors, { fields: [navigation_1.navNodes.floorId], references: [floors_1.floors.id] }),
    outgoingEdges: many(navigation_1.navEdges, { relationName: 'fromNode' }),
    incomingEdges: many(navigation_1.navEdges, { relationName: 'toNode' }),
}));
exports.navEdgesRelations = (0, drizzle_orm_1.relations)(navigation_1.navEdges, ({ one }) => ({
    fromNode: one(navigation_1.navNodes, {
        fields: [navigation_1.navEdges.fromNodeId],
        references: [navigation_1.navNodes.id],
        relationName: 'fromNode',
    }),
    toNode: one(navigation_1.navNodes, {
        fields: [navigation_1.navEdges.toNodeId],
        references: [navigation_1.navNodes.id],
        relationName: 'toNode',
    }),
}));
exports.mapVersionsRelations = (0, drizzle_orm_1.relations)(map_1.mapVersions, ({ one }) => ({
    building: one(buildings_1.buildings, { fields: [map_1.mapVersions.buildingId], references: [buildings_1.buildings.id] }),
    floor: one(floors_1.floors, { fields: [map_1.mapVersions.floorId], references: [floors_1.floors.id] }),
}));
