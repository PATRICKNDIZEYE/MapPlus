-- Lease contracts between building owner and tenant
DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('draft', 'pending_tenant', 'active', 'terminated', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS lease_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id    UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,

  contract_number VARCHAR(32) NOT NULL UNIQUE,

  monthly_rent   NUMERIC(12,2) NOT NULL,
  currency       VARCHAR(3) NOT NULL DEFAULT 'USD',
  deposit_amount NUMERIC(12,2),
  lease_start    DATE NOT NULL,
  lease_end      DATE,
  rent_due_day   INTEGER NOT NULL DEFAULT 1,
  annual_escalation_pct NUMERIC(5,2),
  permitted_use  VARCHAR(200),
  notice_period_days INTEGER NOT NULL DEFAULT 60,

  terms JSONB NOT NULL,

  owner_signed_at  TIMESTAMPTZ,
  owner_signed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_signer_name VARCHAR(200),

  tenant_signed_at  TIMESTAMPTZ,
  tenant_signer_name VARCHAR(200),
  tenant_sign_token VARCHAR(80),

  status contract_status NOT NULL DEFAULT 'draft',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lease_contracts_org_idx    ON lease_contracts(org_id);
CREATE INDEX IF NOT EXISTS lease_contracts_tenant_idx ON lease_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS lease_contracts_unit_idx   ON lease_contracts(unit_id);
CREATE INDEX IF NOT EXISTS lease_contracts_status_idx ON lease_contracts(status);
