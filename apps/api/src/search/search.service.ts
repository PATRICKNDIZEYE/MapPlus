import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { analyticsEvents } from '@mallguide/shared';

export interface SearchResult {
  shopId: string;
  shopName: string;
  category: string | null;
  unitId: string;
  unitCode: string;
  floorId: string;
  floorNumber: number;
  floorName: string;
  rank: number;
}

@Injectable()
export class SearchService {
  constructor(private db: DatabaseService) {}

  async search(
    buildingId: string,
    query: string,
    options?: { floorId?: string; category?: string; limit?: number },
  ): Promise<SearchResult[]> {
    const limit = options?.limit ?? 20;

    // Phase 1: PostgreSQL FTS + trigram similarity
    // This query ranks by text-search rank first, then trigram similarity as fallback
    const results = await this.db.rawPool.query<{
      shop_id: string;
      shop_name: string;
      category: string | null;
      unit_id: string;
      unit_code: string;
      floor_id: string;
      floor_number: number;
      floor_name: string;
      rank: number;
    }>(
      `SELECT
        s.id as shop_id,
        s.public_name as shop_name,
        s.category,
        u.id as unit_id,
        u.unit_code,
        f.id as floor_id,
        f.floor_number,
        f.name as floor_name,
        ts_rank(
          to_tsvector('english',
            coalesce(s.public_name, '') || ' ' ||
            coalesce(s.description, '') || ' ' ||
            coalesce(s.category, '') || ' ' ||
            coalesce(array_to_string(s.tags, ' '), '')
          ),
          plainto_tsquery('english', $2)
        ) + similarity(s.public_name, $2) * 0.5 as rank
       FROM shop_profiles s
       JOIN units u ON u.id = s.unit_id
       JOIN floors f ON f.id = u.floor_id
       WHERE u.building_id = $1
         AND s.is_published = true
         AND u.visibility = true
         ${options?.floorId ? 'AND f.id = $4' : ''}
         ${options?.category ? `AND s.category = ${options?.floorId ? '$5' : '$4'}` : ''}
         AND (
           to_tsvector('english',
             coalesce(s.public_name, '') || ' ' ||
             coalesce(s.description, '') || ' ' ||
             coalesce(s.category, '') || ' ' ||
             coalesce(array_to_string(s.tags, ' '), '')
           ) @@ plainto_tsquery('english', $2)
           OR similarity(s.public_name, $2) > 0.2
         )
       ORDER BY rank DESC
       LIMIT $3`,
      [
        buildingId,
        query,
        limit,
        ...(options?.floorId ? [options.floorId] : []),
        ...(options?.category ? [options.category] : []),
      ],
    );

    // Log the search event (async, non-blocking)
    this.logSearchEvent(buildingId, query, results.rows.length).catch(() => null);

    return results.rows.map((row) => ({
      shopId: row.shop_id,
      shopName: row.shop_name,
      category: row.category,
      unitId: row.unit_id,
      unitCode: row.unit_code,
      floorId: row.floor_id,
      floorNumber: row.floor_number,
      floorName: row.floor_name,
      rank: row.rank,
    }));
  }

  // Failed searches (result_count = 0) are a critical business intelligence signal
  private async logSearchEvent(buildingId: string, query: string, resultCount: number) {
    await this.db.db.insert(analyticsEvents).values({
      eventType: 'search',
      buildingId,
      searchQuery: query,
      resultCount,
    });
  }

  async getFailedSearches(buildingId: string, limit = 50) {
    const rows = await this.db.rawPool.query<{ query: string; count: string }>(
      `SELECT search_query as query, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'search'
         AND result_count = 0
         AND building_id = $1
         AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY search_query
       ORDER BY count DESC
       LIMIT $2`,
      [buildingId, limit],
    );
    return rows.rows.map((r) => ({ query: r.query, count: parseInt(r.count, 10) }));
  }
}
