import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmbeddingService } from './embedding.service';

/**
 * Hybrid retrieval: Postgres FTS (lexical) + pgvector (semantic) fused with
 * Reciprocal Rank Fusion (RRF). Single-call entry points return ranked rows
 * with stable shapes the AiSearchService can hand straight to Claude as
 * tool output.
 *
 * RRF formula: score = Σ 1 / (k + rank_in_candidate_list), k = 60.
 * Industry-standard fusion that needs no training and weights both signals
 * roughly equally.
 */

export interface ShopHit {
  shopId: string;
  shopName: string;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  buildingId: string;
  buildingName: string;
  buildingSlug: string;
  floorName: string;
  unitCode: string;
  score: number;
  ftsRank?: number;
  vecRank?: number;
}

export interface ProductHit {
  productId: string;
  name: string;
  category: string | null;
  priceAmount: number | null;
  currency: string;
  stockCount: number;
  imageUrl: string | null;
  shopId: string;
  shopName: string;
  buildingId: string;
  buildingName: string;
  buildingSlug: string;
  floorName: string;
  unitCode: string;
  score: number;
  ftsRank?: number;
  vecRank?: number;
}

interface ShopSearchOptions {
  query: string;
  category?: string;
  buildingSlug?: string;
  limit?: number;
}

interface ProductSearchOptions {
  query: string;
  category?: string;
  maxPrice?: number;
  buildingSlug?: string;
  limit?: number;
}

const RRF_K = 60;
const CANDIDATES_PER_SIDE = 50;

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly embedder: EmbeddingService,
  ) {}

  // ─── Shops ──────────────────────────────────────────────────────────────

  async searchShops(opts: ShopSearchOptions): Promise<ShopHit[]> {
    const limit = opts.limit ?? 20;
    const queryEmbeddingPromise = this.safeEmbed(opts.query);

    // Run FTS and vector search in parallel.
    const [fts, vec] = await Promise.all([
      this.ftsShops(opts),
      queryEmbeddingPromise.then((v) => (v ? this.vectorShops(opts, v) : [])),
    ]);

    return this.fuseShops(fts, vec, limit);
  }

  private async ftsShops(opts: ShopSearchOptions) {
    const params: unknown[] = [opts.query];
    let categoryFilter = '';
    let buildingFilter = '';
    if (opts.category) {
      params.push(opts.category);
      categoryFilter = `AND s.category = $${params.length}`;
    }
    if (opts.buildingSlug) {
      params.push(opts.buildingSlug);
      buildingFilter = `AND b.slug = $${params.length}`;
    }
    params.push(CANDIDATES_PER_SIDE);
    const limitIdx = params.length;

    const sql = `
      SELECT s.id AS shop_id,
        ts_rank(
          to_tsvector('simple',
            coalesce(s.public_name, '') || ' ' ||
            coalesce(s.description, '') || ' ' ||
            coalesce(s.category, '') || ' ' ||
            coalesce(array_to_string(s.tags, ' '), '')
          ),
          plainto_tsquery('simple', $1)
        ) + similarity(s.public_name, $1) * 0.5 AS rank
      FROM shop_profiles s
      JOIN units u ON u.id = s.unit_id
      JOIN buildings b ON b.id = u.building_id
      WHERE s.is_published = true
        AND u.visibility = true
        ${categoryFilter}
        ${buildingFilter}
        AND (
          to_tsvector('simple',
            coalesce(s.public_name, '') || ' ' ||
            coalesce(s.description, '') || ' ' ||
            coalesce(s.category, '') || ' ' ||
            coalesce(array_to_string(s.tags, ' '), '')
          ) @@ plainto_tsquery('simple', $1)
          OR similarity(s.public_name, $1) > 0.2
        )
      ORDER BY rank DESC
      LIMIT $${limitIdx}`;
    const result = await this.db.rawPool.query<{ shop_id: string; rank: number }>(sql, params);
    return result.rows.map((r, i) => ({ id: r.shop_id, rank: i }));
  }

  private async vectorShops(opts: ShopSearchOptions, vec: number[]) {
    const params: unknown[] = [EmbeddingService.toPgvector(vec)];
    let categoryFilter = '';
    let buildingFilter = '';
    if (opts.category) {
      params.push(opts.category);
      categoryFilter = `AND s.category = $${params.length}`;
    }
    if (opts.buildingSlug) {
      params.push(opts.buildingSlug);
      buildingFilter = `AND b.slug = $${params.length}`;
    }
    params.push(CANDIDATES_PER_SIDE);
    const limitIdx = params.length;

    const sql = `
      SELECT s.id AS shop_id,
             1 - (s.search_embedding <=> $1::vector) AS similarity
      FROM shop_profiles s
      JOIN units u ON u.id = s.unit_id
      JOIN buildings b ON b.id = u.building_id
      WHERE s.is_published = true
        AND u.visibility = true
        AND s.search_embedding IS NOT NULL
        ${categoryFilter}
        ${buildingFilter}
      ORDER BY s.search_embedding <=> $1::vector
      LIMIT $${limitIdx}`;
    const result = await this.db.rawPool.query<{ shop_id: string; similarity: number }>(sql, params);
    return result.rows.map((r, i) => ({ id: r.shop_id, rank: i }));
  }

  private async fuseShops(
    fts: Array<{ id: string; rank: number }>,
    vec: Array<{ id: string; rank: number }>,
    limit: number,
  ): Promise<ShopHit[]> {
    const fused = rrfFuse(fts, vec);
    if (fused.length === 0) return [];
    const ids = fused.slice(0, limit).map((f) => f.id);

    // Pull display rows in one query.
    const params: unknown[] = [ids];
    const result = await this.db.rawPool.query<{
      shop_id: string; shop_name: string; category: string | null;
      description: string | null; logo_url: string | null;
      building_id: string; building_name: string; building_slug: string;
      floor_name: string; unit_code: string;
    }>(`
      SELECT s.id AS shop_id, s.public_name AS shop_name, s.category,
             s.description, s.logo_url,
             b.id AS building_id, b.name AS building_name, b.slug AS building_slug,
             f.name AS floor_name, u.unit_code
      FROM shop_profiles s
      JOIN units u ON u.id = s.unit_id
      JOIN floors f ON f.id = u.floor_id
      JOIN buildings b ON b.id = u.building_id
      WHERE s.id = ANY($1::uuid[])
    `, params);

    // Preserve fused order; attach diagnostic ranks for telemetry.
    const byId = new Map(result.rows.map((r) => [r.shop_id, r]));
    const ftsRankById = new Map(fts.map((r) => [r.id, r.rank]));
    const vecRankById = new Map(vec.map((r) => [r.id, r.rank]));

    return fused
      .slice(0, limit)
      .map((f) => {
        const row = byId.get(f.id);
        if (!row) return null;
        return {
          shopId: row.shop_id,
          shopName: row.shop_name,
          category: row.category,
          description: row.description,
          logoUrl: row.logo_url,
          buildingId: row.building_id,
          buildingName: row.building_name,
          buildingSlug: row.building_slug,
          floorName: row.floor_name,
          unitCode: row.unit_code,
          score: f.score,
          ftsRank: ftsRankById.get(f.id),
          vecRank: vecRankById.get(f.id),
        } as ShopHit;
      })
      .filter((x): x is ShopHit => x !== null);
  }

  // ─── Products ───────────────────────────────────────────────────────────

  async searchProducts(opts: ProductSearchOptions): Promise<ProductHit[]> {
    const limit = opts.limit ?? 20;
    const queryEmbeddingPromise = this.safeEmbed(opts.query);

    const [fts, vec] = await Promise.all([
      this.ftsProducts(opts),
      queryEmbeddingPromise.then((v) => (v ? this.vectorProducts(opts, v) : [])),
    ]);

    return this.fuseProducts(fts, vec, limit);
  }

  private async ftsProducts(opts: ProductSearchOptions) {
    const params: unknown[] = [opts.query];
    let categoryFilter = '';
    let buildingFilter = '';
    let priceFilter = '';
    if (opts.category) {
      params.push(opts.category);
      categoryFilter = `AND p.category = $${params.length}`;
    }
    if (opts.buildingSlug) {
      params.push(opts.buildingSlug);
      buildingFilter = `AND b.slug = $${params.length}`;
    }
    if (opts.maxPrice !== undefined) {
      params.push(opts.maxPrice);
      priceFilter = `AND p.price_amount IS NOT NULL AND p.price_amount <= $${params.length}`;
    }
    params.push(CANDIDATES_PER_SIDE);
    const limitIdx = params.length;

    const sql = `
      SELECT p.id AS product_id,
        ts_rank(
          to_tsvector('simple',
            coalesce(p.name, '') || ' ' ||
            coalesce(p.description, '') || ' ' ||
            coalesce(p.category, '')
          ),
          plainto_tsquery('simple', $1)
        ) + similarity(p.name, $1) * 0.5 AS rank
      FROM products p
      JOIN shop_profiles s ON s.id = p.shop_id
      JOIN units u ON u.id = s.unit_id
      JOIN buildings b ON b.id = u.building_id
      WHERE p.is_published = true
        ${categoryFilter}
        ${buildingFilter}
        ${priceFilter}
        AND (
          to_tsvector('simple',
            coalesce(p.name, '') || ' ' ||
            coalesce(p.description, '') || ' ' ||
            coalesce(p.category, '')
          ) @@ plainto_tsquery('simple', $1)
          OR similarity(p.name, $1) > 0.2
        )
      ORDER BY rank DESC
      LIMIT $${limitIdx}`;
    const result = await this.db.rawPool.query<{ product_id: string }>(sql, params);
    return result.rows.map((r, i) => ({ id: r.product_id, rank: i }));
  }

  private async vectorProducts(opts: ProductSearchOptions, vec: number[]) {
    const params: unknown[] = [EmbeddingService.toPgvector(vec)];
    let categoryFilter = '';
    let buildingFilter = '';
    let priceFilter = '';
    if (opts.category) {
      params.push(opts.category);
      categoryFilter = `AND p.category = $${params.length}`;
    }
    if (opts.buildingSlug) {
      params.push(opts.buildingSlug);
      buildingFilter = `AND b.slug = $${params.length}`;
    }
    if (opts.maxPrice !== undefined) {
      params.push(opts.maxPrice);
      priceFilter = `AND p.price_amount IS NOT NULL AND p.price_amount <= $${params.length}`;
    }
    params.push(CANDIDATES_PER_SIDE);
    const limitIdx = params.length;

    const sql = `
      SELECT p.id AS product_id
      FROM products p
      JOIN shop_profiles s ON s.id = p.shop_id
      JOIN units u ON u.id = s.unit_id
      JOIN buildings b ON b.id = u.building_id
      WHERE p.is_published = true
        AND p.search_embedding IS NOT NULL
        ${categoryFilter}
        ${buildingFilter}
        ${priceFilter}
      ORDER BY p.search_embedding <=> $1::vector
      LIMIT $${limitIdx}`;
    const result = await this.db.rawPool.query<{ product_id: string }>(sql, params);
    return result.rows.map((r, i) => ({ id: r.product_id, rank: i }));
  }

  private async fuseProducts(
    fts: Array<{ id: string; rank: number }>,
    vec: Array<{ id: string; rank: number }>,
    limit: number,
  ): Promise<ProductHit[]> {
    const fused = rrfFuse(fts, vec);
    if (fused.length === 0) return [];
    const ids = fused.slice(0, limit).map((f) => f.id);

    const result = await this.db.rawPool.query<{
      product_id: string; name: string; category: string | null;
      price_amount: string | null; currency: string | null; stock_count: number;
      image_url: string | null;
      shop_id: string; shop_name: string;
      building_id: string; building_name: string; building_slug: string;
      floor_name: string; unit_code: string;
    }>(`
      SELECT p.id AS product_id, p.name, p.category,
             p.price_amount, p.currency, p.stock_count, p.image_url,
             s.id AS shop_id, s.public_name AS shop_name,
             b.id AS building_id, b.name AS building_name, b.slug AS building_slug,
             f.name AS floor_name, u.unit_code
      FROM products p
      JOIN shop_profiles s ON s.id = p.shop_id
      JOIN units u ON u.id = s.unit_id
      JOIN floors f ON f.id = u.floor_id
      JOIN buildings b ON b.id = u.building_id
      WHERE p.id = ANY($1::uuid[])
    `, [ids]);

    const byId = new Map(result.rows.map((r) => [r.product_id, r]));
    const ftsRankById = new Map(fts.map((r) => [r.id, r.rank]));
    const vecRankById = new Map(vec.map((r) => [r.id, r.rank]));

    return fused
      .slice(0, limit)
      .map((f) => {
        const row = byId.get(f.id);
        if (!row) return null;
        return {
          productId: row.product_id,
          name: row.name,
          category: row.category,
          priceAmount: row.price_amount ? Number(row.price_amount) : null,
          currency: row.currency ?? 'RWF',
          stockCount: row.stock_count,
          imageUrl: row.image_url,
          shopId: row.shop_id,
          shopName: row.shop_name,
          buildingId: row.building_id,
          buildingName: row.building_name,
          buildingSlug: row.building_slug,
          floorName: row.floor_name,
          unitCode: row.unit_code,
          score: f.score,
          ftsRank: ftsRankById.get(f.id),
          vecRank: vecRankById.get(f.id),
        } as ProductHit;
      })
      .filter((x): x is ProductHit => x !== null);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  /** Embed but never throw — log and return null so FTS still runs. */
  private async safeEmbed(text: string): Promise<number[] | null> {
    try {
      return await this.embedder.embed(text);
    } catch (err) {
      this.logger.warn(`Embedding failed for "${text}" — falling back to FTS-only: ${(err as Error).message}`);
      return null;
    }
  }
}

/**
 * Reciprocal Rank Fusion. Higher rank position = lower contribution.
 * Returns rows sorted by total RRF score descending.
 */
function rrfFuse(
  lists: Array<{ id: string; rank: number }>,
  more?: Array<{ id: string; rank: number }>,
): Array<{ id: string; score: number }> {
  const score = new Map<string, number>();
  const addList = (l: Array<{ id: string; rank: number }>) => {
    for (const item of l) {
      const prev = score.get(item.id) ?? 0;
      score.set(item.id, prev + 1 / (RRF_K + item.rank));
    }
  };
  addList(lists);
  if (more) addList(more);

  return Array.from(score.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}
