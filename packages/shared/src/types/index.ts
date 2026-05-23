import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  organizations,
  buildings,
  floors,
  units,
  tenants,
  shopProfiles,
  products,
  navNodes,
  navEdges,
  qrAnchors,
  mapVersions,
  amenities,
  analyticsEvents,
  users,
  wrongInfoReports,
} from '../schema';

// ─── Select types (reading from DB) ──────────────────────────────────────────
export type Organization = InferSelectModel<typeof organizations>;
export type Building = InferSelectModel<typeof buildings>;
export type Floor = InferSelectModel<typeof floors>;
export type Unit = InferSelectModel<typeof units>;
export type Tenant = InferSelectModel<typeof tenants>;
export type ShopProfile = InferSelectModel<typeof shopProfiles>;
export type Product = InferSelectModel<typeof products>;
export type NavNode = InferSelectModel<typeof navNodes>;
export type NavEdge = InferSelectModel<typeof navEdges>;
export type QrAnchor = InferSelectModel<typeof qrAnchors>;
export type MapVersion = InferSelectModel<typeof mapVersions>;
export type Amenity = InferSelectModel<typeof amenities>;
export type AnalyticsEvent = InferSelectModel<typeof analyticsEvents>;
export type User = InferSelectModel<typeof users>;
export type WrongInfoReport = InferSelectModel<typeof wrongInfoReports>;

// ─── Insert types (writing to DB) ────────────────────────────────────────────
export type NewBuilding = InferInsertModel<typeof buildings>;
export type NewFloor = InferInsertModel<typeof floors>;
export type NewUnit = InferInsertModel<typeof units>;
export type NewTenant = InferInsertModel<typeof tenants>;
export type NewShopProfile = InferInsertModel<typeof shopProfiles>;
export type NewNavNode = InferInsertModel<typeof navNodes>;
export type NewNavEdge = InferInsertModel<typeof navEdges>;
export type NewQrAnchor = InferInsertModel<typeof qrAnchors>;

// ─── GeoJSON types used across the platform ──────────────────────────────────
export type GeoJSONPoint = { type: 'Point'; coordinates: [number, number] };
export type GeoJSONPolygon = { type: 'Polygon'; coordinates: [number, number][][] };
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon;

export interface GeoJSONFeature<G = GeoJSONPolygon | GeoJSONPoint, P = Record<string, unknown>> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

export interface GeoJSONFeatureCollection<F = GeoJSONFeature> {
  type: 'FeatureCollection';
  features: F[];
}

// Unit feature properties served to the map frontend
export interface UnitFeatureProperties {
  id: string;
  unitCode: string;
  unitName: string | null;
  status: string;
  floorId: string;
  shopId: string | null;
  shopName: string | null;
  category: string | null;
  isPublished: boolean;
}

// Floor map GeoJSON — what the MapLibre component receives
export interface FloorMapGeoJSON {
  floorId: string;
  floorNumber: number;
  floorName: string;
  version: string;
  units: GeoJSONFeatureCollection<GeoJSONFeature<GeoJSONPolygon, UnitFeatureProperties>>;
  amenities: GeoJSONFeatureCollection<GeoJSONFeature<GeoJSONPoint>>;
  navNodes: GeoJSONFeatureCollection<GeoJSONFeature<GeoJSONPoint>>;
}

// QR anchor resolution response
export interface QrResolution {
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorNumber: number;
  anchorNodeId: string;
  anchorLabel: string;
}

// Route returned by routing API
export interface RouteStep {
  nodeId: string;
  floorId: string;
  floorNumber: number;
  type: string;
  coordinates: [number, number];
  instruction?: string; // "Take elevator to Floor 3"
}

export interface Route {
  totalDistanceM: number;
  steps: RouteStep[];
  floorChanges: Array<{ atNodeId: string; type: string; toFloorNumber: number }>;
}

// User roles — mirrors DB enum
export type UserRole =
  | 'super_admin'
  | 'org_owner'
  | 'building_manager'
  | 'floor_manager'
  | 'tenant_admin'
  | 'tenant_staff'
  | 'public';

// JWT payload shape
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  orgId: string | null;
  tenantId: string | null;
  iat?: number;
  exp?: number;
}
