import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmbeddingService } from './embedding.service';

/**
 * Demand intelligence: cluster failed shopper searches (result_count = 0)
 * via embedding similarity so building owners see *categories* of demand
 * they're not meeting, not raw query strings.
 *
 * Algorithm: greedy nearest-cluster with a cosine similarity threshold.
 * Cheap, deterministic, no scikit-learn dependency. With <1k queries per
 * mall per month it's plenty.
 */

interface FailedQuery {
  query: string;
  count: number;
}

interface QueryWithVector extends FailedQuery {
  vec: number[];
}

export interface DemandCluster {
  /** Auto-derived label — the highest-count query in the cluster. */
  label: string;
  /** All query strings in this cluster. */
  queries: FailedQuery[];
  /** Total search attempts across all queries in this cluster. */
  totalCount: number;
}

interface DemandOptions {
  buildingId?: string;
  windowDays?: number;
  /** Cosine similarity threshold — higher = tighter clusters. 0.65 is a sensible default for MiniLM-multilingual. */
  threshold?: number;
}

const DEFAULT_THRESHOLD = 0.65;
const DEFAULT_WINDOW_DAYS = 30;

@Injectable()
export class DemandIntelligenceService {
  private readonly logger = new Logger(DemandIntelligenceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly embedder: EmbeddingService,
  ) {}

  async clusters(opts: DemandOptions = {}): Promise<DemandCluster[]> {
    const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
    const threshold  = opts.threshold ?? DEFAULT_THRESHOLD;

    // Pull failed-search aggregates from analytics_events.
    const params: unknown[] = [windowDays];
    let buildingFilter = '';
    if (opts.buildingId) {
      params.push(opts.buildingId);
      buildingFilter = `AND building_id = $${params.length}`;
    }

    const result = await this.db.rawPool.query<{ query: string; count: string }>(
      `SELECT search_query AS query, COUNT(*)::text AS count
         FROM analytics_events
        WHERE event_type = 'search'
          AND result_count = 0
          AND search_query IS NOT NULL
          AND search_query <> ''
          AND created_at > NOW() - ($1 || ' days')::interval
          ${buildingFilter}
        GROUP BY search_query
        ORDER BY COUNT(*) DESC
        LIMIT 500`,
      params,
    );

    const rawQueries: FailedQuery[] = result.rows.map((r) => ({
      query: r.query,
      count: parseInt(r.count, 10),
    }));
    if (rawQueries.length === 0) return [];

    // Embed all queries in one batch — much faster than per-row.
    let vectors: number[][];
    try {
      vectors = await this.embedder.embedBatch(rawQueries.map((q) => q.query));
    } catch (err) {
      this.logger.warn(`Embedding batch failed (${(err as Error).message}); returning ungrouped queries.`);
      return rawQueries.map((q) => ({ label: q.query, queries: [q], totalCount: q.count }));
    }

    const withVec: QueryWithVector[] = rawQueries.map((q, i) => ({ ...q, vec: vectors[i]! }));

    // Greedy clustering — for each query, attach to the highest-count cluster
    // whose centroid is within `threshold`, else start a new cluster.
    interface InternalCluster {
      label: string;
      queries: QueryWithVector[];
      centroid: number[];
      totalCount: number;
    }
    const clusters: InternalCluster[] = [];

    // Sort by count desc so cluster labels are always the most-searched query.
    const sorted = [...withVec].sort((a, b) => b.count - a.count);

    for (const q of sorted) {
      let best: { cluster: InternalCluster; sim: number } | null = null;
      for (const c of clusters) {
        const sim = cosine(q.vec, c.centroid);
        if (sim >= threshold && (!best || sim > best.sim)) {
          best = { cluster: c, sim };
        }
      }
      if (best) {
        const c = best.cluster;
        c.queries.push(q);
        c.totalCount += q.count;
        // Update centroid as count-weighted mean.
        for (let i = 0; i < c.centroid.length; i++) {
          c.centroid[i] = (c.centroid[i]! * (c.totalCount - q.count) + q.vec[i]! * q.count) / c.totalCount;
        }
      } else {
        clusters.push({
          label: q.query,
          queries: [q],
          centroid: [...q.vec],
          totalCount: q.count,
        });
      }
    }

    return clusters
      .map((c) => ({
        label: c.label,
        queries: c.queries.map((q) => ({ query: q.query, count: q.count }))
          .sort((a, b) => b.count - a.count),
        totalCount: c.totalCount,
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  // Vectors from MiniLM normalize=true are unit vectors, so cosine = dot product.
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}
