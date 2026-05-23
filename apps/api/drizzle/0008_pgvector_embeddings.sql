-- ML search: pgvector extension + embedding columns on shops + products.
-- Embeddings come from sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
-- (384-dim, multilingual including Kinyarwanda) via Transformers.js in the API.

CREATE EXTENSION IF NOT EXISTS vector;

-- Shop semantic search column
ALTER TABLE shop_profiles
  ADD COLUMN IF NOT EXISTS search_embedding vector(384);

-- Product semantic search column
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_embedding vector(384);

-- IVF indexes for ANN search. 100 lists is a sensible default for the
-- pilot scale (~1k rows); increase as the catalog grows past 10k.
CREATE INDEX IF NOT EXISTS shop_profiles_embedding_idx
  ON shop_profiles
  USING ivfflat (search_embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS products_embedding_idx
  ON products
  USING ivfflat (search_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Click tracking — feeds the future learning-to-rank reranker.
-- Logs which result a shopper picked from a search query so we can
-- learn what "good" looks like over time.
CREATE TABLE IF NOT EXISTS search_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query VARCHAR(500) NOT NULL,
  locale VARCHAR(8),
  result_type VARCHAR(20) NOT NULL, -- 'shop' | 'product'
  result_id UUID NOT NULL,
  rank INTEGER NOT NULL, -- position in result list (0-indexed)
  shopper_session_id VARCHAR(80),
  shopper_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS search_clicks_query_idx   ON search_clicks(query);
CREATE INDEX IF NOT EXISTS search_clicks_result_idx  ON search_clicks(result_type, result_id);
CREATE INDEX IF NOT EXISTS search_clicks_clicked_idx ON search_clicks(clicked_at);
