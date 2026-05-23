/**
 * All Drizzle relations defined here to avoid circular imports between schema files.
 * Import this in schema/index.ts so the ORM picks them up.
 */
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';
import { buildings } from './buildings';
import { floors } from './floors';
import { tenants } from './tenants';
import { units } from './units';
import { shopProfiles, products } from './shops';
import { navNodes, navEdges } from './navigation';
import { mapVersions } from './map';

export const organizationsRelations = relations(organizations, ({ many }) => ({
  buildings: many(buildings),
  users: many(users),
  tenants: many(tenants),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  organization: one(organizations, { fields: [buildings.orgId], references: [organizations.id] }),
  floors: many(floors),
}));

export const floorsRelations = relations(floors, ({ one, many }) => ({
  building: one(buildings, { fields: [floors.buildingId], references: [buildings.id] }),
  units: many(units),
  navNodes: many(navNodes),
  mapVersions: many(mapVersions),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  organization: one(organizations, { fields: [tenants.orgId], references: [organizations.id] }),
  units: many(units),
  shopProfiles: many(shopProfiles),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  floor: one(floors, { fields: [units.floorId], references: [floors.id] }),
  building: one(buildings, { fields: [units.buildingId], references: [buildings.id] }),
  tenant: one(tenants, { fields: [units.tenantId], references: [tenants.id] }),
  shopProfile: many(shopProfiles),
}));

export const shopProfilesRelations = relations(shopProfiles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shopProfiles.tenantId], references: [tenants.id] }),
  unit: one(units, { fields: [shopProfiles.unitId], references: [units.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  shop: one(shopProfiles, { fields: [products.shopId], references: [shopProfiles.id] }),
}));

export const navNodesRelations = relations(navNodes, ({ one, many }) => ({
  building: one(buildings, { fields: [navNodes.buildingId], references: [buildings.id] }),
  floor: one(floors, { fields: [navNodes.floorId], references: [floors.id] }),
  outgoingEdges: many(navEdges, { relationName: 'fromNode' }),
  incomingEdges: many(navEdges, { relationName: 'toNode' }),
}));

export const navEdgesRelations = relations(navEdges, ({ one }) => ({
  fromNode: one(navNodes, {
    fields: [navEdges.fromNodeId],
    references: [navNodes.id],
    relationName: 'fromNode',
  }),
  toNode: one(navNodes, {
    fields: [navEdges.toNodeId],
    references: [navNodes.id],
    relationName: 'toNode',
  }),
}));

export const mapVersionsRelations = relations(mapVersions, ({ one }) => ({
  building: one(buildings, { fields: [mapVersions.buildingId], references: [buildings.id] }),
  floor: one(floors, { fields: [mapVersions.floorId], references: [floors.id] }),
}));
