-- Go Social AI: per-tenant social account connections + scheduled posts.

DO $$ BEGIN
  CREATE TYPE social_platform AS ENUM ('instagram', 'facebook', 'tiktok', 'twitter');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE social_post_status AS ENUM (
    'draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS tenant_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,

  account_id    VARCHAR(200) NOT NULL,
  account_label VARCHAR(200),

  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenant_social_accounts_tenant_idx   ON tenant_social_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_social_accounts_platform_idx ON tenant_social_accounts(tenant_id, platform);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  platforms JSONB NOT NULL DEFAULT '[]',

  caption    TEXT NOT NULL,
  hashtags   JSONB NOT NULL DEFAULT '[]',
  media_urls JSONB NOT NULL DEFAULT '[]',

  status social_post_status NOT NULL DEFAULT 'draft',

  scheduled_at  TIMESTAMPTZ,
  published_at  TIMESTAMPTZ,
  publish_error TEXT,

  platform_results JSONB NOT NULL DEFAULT '[]',

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_posts_tenant_idx    ON social_posts(tenant_id);
CREATE INDEX IF NOT EXISTS social_posts_status_idx    ON social_posts(status);
CREATE INDEX IF NOT EXISTS social_posts_scheduled_idx ON social_posts(scheduled_at);
