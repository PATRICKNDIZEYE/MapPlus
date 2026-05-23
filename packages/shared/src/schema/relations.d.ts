export declare const organizationsRelations: import("node_modules/drizzle-orm").Relations<"organizations", {
    buildings: import("node_modules/drizzle-orm").Many<"buildings">;
    users: import("node_modules/drizzle-orm").Many<"users">;
    tenants: import("node_modules/drizzle-orm").Many<"tenants">;
}>;
export declare const usersRelations: import("node_modules/drizzle-orm").Relations<"users", {
    organization: import("node_modules/drizzle-orm").One<"organizations", false>;
    tenant: import("node_modules/drizzle-orm").One<"tenants", false>;
}>;
export declare const buildingsRelations: import("node_modules/drizzle-orm").Relations<"buildings", {
    organization: import("node_modules/drizzle-orm").One<"organizations", true>;
    floors: import("node_modules/drizzle-orm").Many<"floors">;
}>;
export declare const floorsRelations: import("node_modules/drizzle-orm").Relations<"floors", {
    building: import("node_modules/drizzle-orm").One<"buildings", true>;
    units: import("node_modules/drizzle-orm").Many<"units">;
    navNodes: import("node_modules/drizzle-orm").Many<"nav_nodes">;
    mapVersions: import("node_modules/drizzle-orm").Many<"map_versions">;
}>;
export declare const tenantsRelations: import("node_modules/drizzle-orm").Relations<"tenants", {
    organization: import("node_modules/drizzle-orm").One<"organizations", true>;
    units: import("node_modules/drizzle-orm").Many<"units">;
    shopProfiles: import("node_modules/drizzle-orm").Many<"shop_profiles">;
}>;
export declare const unitsRelations: import("node_modules/drizzle-orm").Relations<"units", {
    floor: import("node_modules/drizzle-orm").One<"floors", true>;
    building: import("node_modules/drizzle-orm").One<"buildings", true>;
    tenant: import("node_modules/drizzle-orm").One<"tenants", false>;
    shopProfile: import("node_modules/drizzle-orm").Many<"shop_profiles">;
}>;
export declare const shopProfilesRelations: import("node_modules/drizzle-orm").Relations<"shop_profiles", {
    tenant: import("node_modules/drizzle-orm").One<"tenants", true>;
    unit: import("node_modules/drizzle-orm").One<"units", true>;
    products: import("node_modules/drizzle-orm").Many<"products">;
}>;
export declare const productsRelations: import("node_modules/drizzle-orm").Relations<"products", {
    shop: import("node_modules/drizzle-orm").One<"shop_profiles", true>;
}>;
export declare const navNodesRelations: import("node_modules/drizzle-orm").Relations<"nav_nodes", {
    building: import("node_modules/drizzle-orm").One<"buildings", true>;
    floor: import("node_modules/drizzle-orm").One<"floors", true>;
    outgoingEdges: import("node_modules/drizzle-orm").Many<"nav_edges">;
    incomingEdges: import("node_modules/drizzle-orm").Many<"nav_edges">;
}>;
export declare const navEdgesRelations: import("node_modules/drizzle-orm").Relations<"nav_edges", {
    fromNode: import("node_modules/drizzle-orm").One<"nav_nodes", true>;
    toNode: import("node_modules/drizzle-orm").One<"nav_nodes", true>;
}>;
export declare const mapVersionsRelations: import("node_modules/drizzle-orm").Relations<"map_versions", {
    building: import("node_modules/drizzle-orm").One<"buildings", true>;
    floor: import("node_modules/drizzle-orm").One<"floors", true>;
}>;
