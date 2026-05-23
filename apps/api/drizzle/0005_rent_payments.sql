-- Rent payment tracking — one row per (contract, period). Drives the rent
-- roll dashboard, due reminders, and the MoMo collection flow.

DO $$ BEGIN
  CREATE TYPE rent_payment_method AS ENUM (
    'mtn_momo', 'airtel_money', 'bank_transfer',
    'cash', 'piggybox_forward', 'rentavance', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE rent_payment_status AS ENUM (
    'pending', 'paid', 'partial', 'overdue', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id)         ON DELETE RESTRICT,
  contract_id UUID NOT NULL REFERENCES lease_contracts(id) ON DELETE RESTRICT,

  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  due_date     DATE NOT NULL,

  amount_due  NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency    VARCHAR(3) NOT NULL DEFAULT 'RWF',

  method rent_payment_method,
  status rent_payment_status NOT NULL DEFAULT 'pending',

  external_ref VARCHAR(200),
  notes TEXT,

  paid_at     TIMESTAMPTZ,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rent_payments_tenant_idx   ON rent_payments(tenant_id);
CREATE INDEX IF NOT EXISTS rent_payments_contract_idx ON rent_payments(contract_id);
CREATE INDEX IF NOT EXISTS rent_payments_status_idx   ON rent_payments(status);
CREATE INDEX IF NOT EXISTS rent_payments_due_idx      ON rent_payments(due_date);
CREATE INDEX IF NOT EXISTS rent_payments_period_idx   ON rent_payments(period_start, period_end);
