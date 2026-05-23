-- Platform-wide configuration table. Only super_admin can read/write.
-- Stored as key/value rows so new settings don't require migrations.

CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) NOT NULL UNIQUE,
  value_text  TEXT,
  value_json  JSONB,
  is_secret   VARCHAR(1) NOT NULL DEFAULT 'N',
  description TEXT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_config_key_idx ON platform_config(key);

-- Seed sensible defaults so the UI has something to render on first boot.
INSERT INTO platform_config (key, value_text, is_secret, description) VALUES
  ('default_delivery_fee_rwf', '1500',  'N', 'Flat delivery fee charged on every Buy & Try order, in RWF.'),
  ('rentavance_interest_rate', '0.03',  'N', 'Flat fee on RentAvance principal (e.g. 0.03 = 3% per 30 days).'),
  ('rentavance_min_savings_pct', '0.60','N', 'Minimum fraction of monthly rent saved to qualify for an advance.'),
  ('rentavance_max_coverage_pct','0.40','N', 'Max share of rent the platform will cover via an advance.'),
  ('min_lease_age_days', '90', 'N', 'Tenant lease must be at least this many days old to request an advance.'),
  ('anthropic_model', 'claude-sonnet-4-6', 'N', 'Default Claude model for Go Social caption generation.')
ON CONFLICT (key) DO NOTHING;
