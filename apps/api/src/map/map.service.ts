import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { floors, units, shopProfiles, amenities, mapVersions, navNodes } from '@mapplus/shared';
import type { FloorMapGeoJSON } from '@mapplus/shared';

@Injectable()
export class MapService {
  constructor(private db: DatabaseService) {}

  /**
   * Generates a GeoJSON FeatureCollection for a floor.
   * Spatial columns (geometry) are selected via ST_AsGeoJSON.
   */
  async getFloorGeoJSON(floorId: string): Promise<FloorMapGeoJSON> {
    const [floor] = await this.db.db.select().from(floors).where(eq(floors.id, floorId)).limit(1);
    if (!floor) throw new NotFoundException(`Floor ${floorId} not found`);

    // Units with their geometry and linked shop info
    const unitRows = await this.db.rawPool.query<{
      id: string;
      unit_code: string;
      unit_name: string | null;
      status: string;
      floor_id: string;
      geojson: string;
      shop_id: string | null;
      shop_name: string | null;
      category: string | null;
      is_published: boolean;
    }>(
      `SELECT
        u.id, u.unit_code, u.unit_name, u.status, u.floor_id,
        ST_AsGeoJSON(u.geometry)::json as geojson,
        s.id as shop_id, s.public_name as shop_name,
        s.category, s.is_published
       FROM units u
       LEFT JOIN shop_profiles s ON s.unit_id = u.id AND s.is_published = true
       WHERE u.floor_id = $1 AND u.visibility = true`,
      [floorId],
    );

    // Amenities with geometry
    const amenityRows = await this.db.rawPool.query<{
      id: string;
      type: string;
      label: string | null;
      geojson: string;
    }>(
      `SELECT a.id, a.type, a.label, ST_AsGeoJSON(n.geometry)::json as geojson
       FROM amenities a
       JOIN nav_nodes n ON n.id = a.nav_node_id
       WHERE a.floor_id = $1 AND a.is_active = 'true'`,
      [floorId],
    );

    // Navigation nodes (for routing overlay — dev/admin use)
    const navNodeRows = await this.db.rawPool.query<{
      id: string;
      type: string;
      label: string | null;
      geojson: string;
    }>(
      `SELECT id, type, label, ST_AsGeoJSON(geometry)::json as geojson
       FROM nav_nodes
       WHERE floor_id = $1 AND is_active = true`,
      [floorId],
    );

    // Get current published version for this floor
    const [version] = await this.db.db
      .select({ versionString: mapVersions.versionString })
      .from(mapVersions)
      .where(and(eq(mapVersions.floorId, floorId), eq(mapVersions.status, 'published')))
      .limit(1);

    return {
      floorId,
      floorNumber: floor.floorNumber,
      floorName: floor.name,
      version: version?.versionString ?? 'draft',
      units: {
        type: 'FeatureCollection',
        features: unitRows.rows.map((row) => ({
          type: 'Feature',
          geometry: row.geojson as any,
          properties: {
            id: row.id,
            unitCode: row.unit_code,
            unitName: row.unit_name,
            status: row.status,
            floorId: row.floor_id,
            shopId: row.shop_id,
            shopName: row.shop_name,
            category: row.category,
            isPublished: row.is_published ?? false,
          },
        })),
      },
      amenities: {
        type: 'FeatureCollection',
        features: amenityRows.rows.map((row) => ({
          type: 'Feature',
          geometry: row.geojson as any,
          properties: { id: row.id, type: row.type, label: row.label },
        })),
      },
      navNodes: {
        type: 'FeatureCollection',
        features: navNodeRows.rows.map((row) => ({
          type: 'Feature',
          geometry: row.geojson as any,
          properties: { id: row.id, type: row.type, label: row.label },
        })),
      },
    };
  }

  async publishMapVersion(floorId: string, publishedBy: string, changeSummary?: string) {
    // Archive previous published versions
    await this.db.db
      .update(mapVersions)
      .set({ status: 'archived' })
      .where(and(eq(mapVersions.floorId, floorId), eq(mapVersions.status, 'published')));

    // Determine next version number
    const existing = await this.db.db
      .select({ versionString: mapVersions.versionString })
      .from(mapVersions)
      .where(eq(mapVersions.floorId, floorId))
      .orderBy(sql`created_at DESC`)
      .limit(1);

    const nextVersion = existing[0]
      ? incrementVersion(existing[0].versionString)
      : '1.0';

    const [mv] = await this.db.db
      .insert(mapVersions)
      .values({
        floorId,
        buildingId: (
          await this.db.db.select({ buildingId: floors.buildingId }).from(floors).where(eq(floors.id, floorId)).limit(1)
        )[0]!.buildingId,
        versionString: nextVersion,
        status: 'published',
        publishedAt: new Date(),
        publishedBy,
        changeSummary,
      })
      .returning();

    return mv!;
  }
}

function incrementVersion(v: string): string {
  const parts = v.split('.').map(Number);
  if (!parts[0]) return '1.0';
  parts[1] = (parts[1] ?? 0) + 1;
  return parts.join('.');
}
