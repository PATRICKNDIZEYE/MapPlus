-- Map+ initial database migration
-- Run AFTER Docker container initializes PostGIS extensions (scripts/init-db.sql)

-- Enums
CREATE TYPE "org_type" AS ENUM ('building_owner', 'management_company', 'property_manager');
CREATE TYPE "user_role" AS ENUM ('super_admin', 'org_owner', 'building_manager', 'floor_manager', 'tenant_admin', 'tenant_staff', 'public');
CREATE TYPE "building_status" AS ENUM ('active', 'inactive', 'onboarding', 'suspended');
CREATE TYPE "unit_status" AS ENUM ('occupied', 'vacant', 'reserved', 'maintenance', 'non_leasable');
CREATE TYPE "verification_status" AS ENUM ('unverified', 'verified', 'needs_review', 'reported_wrong');
CREATE TYPE "map_version_status" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "amenity_type" AS ENUM ('restroom_male', 'restroom_female', 'restroom_unisex', 'elevator', 'stairs', 'escalator', 'atm', 'info_desk', 'entrance', 'exit', 'parking', 'prayer_room', 'first_aid', 'food_court');

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type org_type NOT NULL DEFAULT 'building_owner',
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role NOT NULL DEFAULT 'public',
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  tenant_id UUID, -- FK to tenants added after tenants table
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_org_idx ON users (org_id);

-- Buildings
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100) NOT NULL DEFAULT 'Kigali',
  country VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  floors_count INTEGER NOT NULL DEFAULT 1,
  operating_hours JSONB,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Kigali',
  status building_status NOT NULL DEFAULT 'onboarding',
  cover_photo_url TEXT,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX buildings_org_idx ON buildings (org_id);
CREATE INDEX buildings_status_idx ON buildings (status);

-- Floors
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(20),
  floor_plan_url TEXT,
  elevation_m NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX floors_building_idx ON floors (building_id);
CREATE UNIQUE INDEX floors_building_number_idx ON floors (building_id, floor_number);

-- Tenants (private — lease data never exposed publicly)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  legal_name VARCHAR(200) NOT NULL,
  trade_name VARCHAR(200),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  contact_whatsapp VARCHAR(50),
  lease_start DATE,
  lease_end DATE,
  deposit_amount NUMERIC(12,2),
  monthly_rent NUMERIC(12,2),
  currency VARCHAR(3) NOT NULL DEFAULT 'RWF',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tenants_org_idx ON tenants (org_id);

-- Add tenant FK to users now that tenants table exists
ALTER TABLE users ADD CONSTRAINT users_tenant_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

-- Units (with PostGIS geometry)
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_code VARCHAR(50) NOT NULL,
  unit_name VARCHAR(200),
  geometry GEOMETRY(Polygon, 4326),  -- digitized unit polygon
  area_sqm NUMERIC(10,2),
  status unit_status NOT NULL DEFAULT 'vacant',
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  visibility BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX units_building_floor_idx ON units (building_id, floor_id);
CREATE INDEX units_unit_code_idx ON units (building_id, unit_code);
CREATE INDEX units_tenant_idx ON units (tenant_id);
CREATE INDEX units_geometry_gist ON units USING GIST (geometry);

-- Shop Profiles (public-facing — linked to tenant + unit)
CREATE TABLE shop_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  public_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tags TEXT[],
  logo_url TEXT,
  cover_photo_url TEXT,
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  email VARCHAR(200),
  website VARCHAR(500),
  operating_hours JSONB,
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  last_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  report_count INTEGER NOT NULL DEFAULT 0,
  last_reported_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shop_profiles_category_idx ON shop_profiles (category);
CREATE INDEX shop_profiles_unit_idx ON shop_profiles (unit_id);
CREATE INDEX shop_profiles_verification_idx ON shop_profiles (verification_status);
-- Full-text search index (tags excluded from expression — searched via GIN array index below)
CREATE INDEX shop_profiles_fts_idx ON shop_profiles USING GIN (
  to_tsvector('english',
    coalesce(public_name,'') || ' ' ||
    coalesce(description,'') || ' ' ||
    coalesce(category,'')
  )
);
-- GIN index on tags array for fast array containment queries
CREATE INDEX shop_profiles_tags_idx ON shop_profiles USING GIN (tags);
-- Trigram index for fuzzy matching
CREATE INDEX shop_profiles_trgm_idx ON shop_profiles USING GIN (public_name gin_trgm_ops);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shop_profiles(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'RWF',
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX products_shop_idx ON products (shop_id);

-- Navigation Nodes (with PostGIS geometry)
CREATE TABLE nav_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  geometry GEOMETRY(Point, 4326),
  label VARCHAR(200),
  accessible BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX nav_nodes_building_floor_idx ON nav_nodes (building_id, floor_id);
CREATE INDEX nav_nodes_type_idx ON nav_nodes (type);
CREATE INDEX nav_nodes_geometry_gist ON nav_nodes USING GIST (geometry);

-- Navigation Edges
CREATE TABLE nav_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES nav_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES nav_nodes(id) ON DELETE CASCADE,
  distance_m NUMERIC(8,2) NOT NULL,
  bidirectional BOOLEAN NOT NULL DEFAULT true,
  floor_change VARCHAR(20),
  accessible BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX nav_edges_from_idx ON nav_edges (from_node_id);
CREATE INDEX nav_edges_to_idx ON nav_edges (to_node_id);

-- QR Anchors
CREATE TABLE qr_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  nav_node_id UUID NOT NULL REFERENCES nav_nodes(id) ON DELETE RESTRICT,
  label VARCHAR(200) NOT NULL,
  short_code VARCHAR(20) NOT NULL UNIQUE,
  qr_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Amenities
CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  type amenity_type NOT NULL,
  label VARCHAR(200),
  nav_node_id UUID REFERENCES nav_nodes(id) ON DELETE SET NULL,
  is_active VARCHAR(10) DEFAULT 'true',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Map Versions
CREATE TABLE map_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  version_string VARCHAR(20) NOT NULL,
  status map_version_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_summary TEXT,
  geojson_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX map_versions_floor_status_idx ON map_versions (floor_id, status);

-- Analytics Events (append-only, partition by month for large deployments)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  building_id UUID,
  floor_id UUID,
  shop_id UUID,
  search_query TEXT,
  result_count INTEGER,
  session_id VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX analytics_building_created_idx ON analytics_events (building_id, created_at);
CREATE INDEX analytics_event_type_idx ON analytics_events (event_type);
CREATE INDEX analytics_shop_idx ON analytics_events (shop_id);

-- Wrong-info Reports
CREATE TABLE wrong_info_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  description TEXT,
  reporter_session VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
