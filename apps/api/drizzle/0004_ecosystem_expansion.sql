-- ─── Phase 1: 4-app ecosystem foundation ────────────────────────────────────
-- Adds new roles, the products extension, and seven new tables
-- (orders, piggybox wallets/tx, rentavance advances/repayments,
--  delivery jobs/routes, incidents, utility bills, notifications).
-- All ENUM types are added idempotently so re-runs are safe.

-- ── Role expansion ──────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accounts';
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'security';
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'maintenance';
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery_personnel';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── Products extension (the existing products table gets new columns) ───────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS sku VARCHAR(80),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS stock_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_buy_and_try_eligible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS products_tenant_idx    ON products(tenant_id);
CREATE INDEX IF NOT EXISTS products_category_idx  ON products(category);
CREATE INDEX IF NOT EXISTS products_published_idx ON products(is_published);

-- ── ORDERS ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'requested', 'accepted', 'picked_up', 'in_delivery',
    'delivered', 'paid', 'returned', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  shopper_session_id VARCHAR(80),
  shopper_name       VARCHAR(200),
  shopper_phone      VARCHAR(50),

  tenant_id   UUID NOT NULL REFERENCES tenants(id)   ON DELETE RESTRICT,
  product_id  UUID NOT NULL REFERENCES products(id)  ON DELETE RESTRICT,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,

  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL,
  delivery_fee  NUMERIC(12,2) NOT NULL,
  total_amount  NUMERIC(12,2) NOT NULL,
  currency      VARCHAR(3) NOT NULL DEFAULT 'RWF',

  delivery_address TEXT NOT NULL,
  delivery_notes   TEXT,

  status order_status NOT NULL DEFAULT 'requested',

  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_up_at  TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  returned_at   TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_tenant_idx   ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS orders_status_idx   ON orders(status);
CREATE INDEX IF NOT EXISTS orders_building_idx ON orders(building_id);
CREATE INDEX IF NOT EXISTS orders_shopper_idx  ON orders(shopper_user_id);
CREATE INDEX IF NOT EXISTS orders_session_idx  ON orders(shopper_session_id);

-- ── PIGGYBOX ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE piggybox_tx_type   AS ENUM ('deposit', 'withdraw', 'rent_forward', 'advance_repayment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE piggybox_tx_source AS ENUM ('manual', 'sale', 'system');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS piggybox_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  currency       VARCHAR(3)    NOT NULL DEFAULT 'RWF',
  balance        NUMERIC(14,2) NOT NULL DEFAULT 0,
  locked_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  rent_due_day   INTEGER       NOT NULL DEFAULT 1,
  locked_until   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS piggybox_wallets_tenant_idx ON piggybox_wallets(tenant_id);

CREATE TABLE IF NOT EXISTS piggybox_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES piggybox_wallets(id) ON DELETE CASCADE,
  type   piggybox_tx_type   NOT NULL,
  source piggybox_tx_source NOT NULL,
  amount   NUMERIC(14,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RWF',
  reference_id UUID,
  note VARCHAR(200),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS piggybox_tx_wallet_idx   ON piggybox_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS piggybox_tx_type_idx     ON piggybox_transactions(type);
CREATE INDEX IF NOT EXISTS piggybox_tx_occurred_idx ON piggybox_transactions(occurred_at);

-- ── RENTAVANCE ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE rentavance_status AS ENUM (
    'requested', 'approved', 'rejected',
    'disbursed', 'repaying', 'repaid', 'defaulted'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS rentavance_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id)         ON DELETE RESTRICT,
  contract_id UUID NOT NULL REFERENCES lease_contracts(id) ON DELETE RESTRICT,
  amount_advanced NUMERIC(14,2) NOT NULL,
  interest_rate   NUMERIC(5,4)  NOT NULL,
  interest_amount NUMERIC(14,2) NOT NULL,
  total_due       NUMERIC(14,2) NOT NULL,
  currency        VARCHAR(3)    NOT NULL DEFAULT 'RWF',
  collateral_notes TEXT,
  status rentavance_status NOT NULL DEFAULT 'requested',
  approved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at  TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  repaid_at    TIMESTAMPTZ,
  due_by       DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rentavance_tenant_idx   ON rentavance_advances(tenant_id);
CREATE INDEX IF NOT EXISTS rentavance_contract_idx ON rentavance_advances(contract_id);
CREATE INDEX IF NOT EXISTS rentavance_status_idx   ON rentavance_advances(status);

CREATE TABLE IF NOT EXISTS rentavance_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID NOT NULL REFERENCES rentavance_advances(id) ON DELETE CASCADE,
  amount   NUMERIC(14,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RWF',
  source_tx_id UUID,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rentavance_repayments_advance_idx ON rentavance_repayments(advance_id);

-- ── DELIVERY ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE delivery_job_status AS ENUM (
    'queued', 'accepted', 'picking', 'picked',
    'delivering', 'delivered', 'returned', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS delivery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id)     ON DELETE CASCADE,
  building_id  UUID NOT NULL REFERENCES buildings(id)  ON DELETE RESTRICT,
  personnel_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status delivery_job_status NOT NULL DEFAULT 'queued',
  queued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at  TIMESTAMPTZ,
  pod_photo_url TEXT,
  return_reason VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_jobs_order_idx     ON delivery_jobs(order_id);
CREATE INDEX IF NOT EXISTS delivery_jobs_status_idx    ON delivery_jobs(status);
CREATE INDEX IF NOT EXISTS delivery_jobs_personnel_idx ON delivery_jobs(personnel_id);
CREATE INDEX IF NOT EXISTS delivery_jobs_building_idx  ON delivery_jobs(building_id);

CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
  nav_node_ids JSONB NOT NULL,
  total_distance_m NUMERIC(10,2),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_routes_job_idx ON delivery_routes(job_id);

-- ── INCIDENTS ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE incident_type   AS ENUM ('security', 'maintenance', 'cleaning', 'safety', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id    UUID REFERENCES floors(id) ON DELETE SET NULL,
  type   incident_type   NOT NULL,
  status incident_status NOT NULL DEFAULT 'open',
  title       VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  photo_url   TEXT,
  location    VARCHAR(200),
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incidents_building_idx ON incidents(building_id);
CREATE INDEX IF NOT EXISTS incidents_status_idx   ON incidents(status);
CREATE INDEX IF NOT EXISTS incidents_type_idx     ON incidents(type);
CREATE INDEX IF NOT EXISTS incidents_assigned_idx ON incidents(assigned_to);

-- ── UTILITY BILLS ───────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE utility_type        AS ENUM ('electricity', 'water', 'gas', 'internet', 'common_area', 'security', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE utility_bill_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  utility_type utility_type        NOT NULL,
  status       utility_bill_status NOT NULL DEFAULT 'draft',
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  unit_allocation_pct NUMERIC(5,4),
  amount   NUMERIC(14,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RWF',
  notes TEXT,
  due_date DATE,
  paid_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS utility_bills_building_idx ON utility_bills(building_id);
CREATE INDEX IF NOT EXISTS utility_bills_tenant_idx   ON utility_bills(tenant_id);
CREATE INDEX IF NOT EXISTS utility_bills_status_idx   ON utility_bills(status);
CREATE INDEX IF NOT EXISTS utility_bills_period_idx   ON utility_bills(period_start, period_end);

-- ── NOTIFICATIONS ───────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'rent_due', 'rent_paid',
    'advance_approved', 'advance_disbursed', 'advance_repaid',
    'order_status', 'delivery_update',
    'incident', 'utility_bill', 'system'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  title VARCHAR(200) NOT NULL,
  body  TEXT NOT NULL,
  href  VARCHAR(500),
  meta  JSONB,
  is_read   BOOLEAN NOT NULL DEFAULT FALSE,
  read_at   TIMESTAMPTZ,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx  ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications(created_at);
