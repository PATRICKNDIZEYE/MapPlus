import { customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { GeoJSONGeometry } from '../types';

// PostGIS geometry column — stored as WKB, returned as GeoJSON via ST_AsGeoJSON
export const geometry = (name: string, geometryType = 'Geometry', srid = 4326) =>
  customType<{ data: GeoJSONGeometry; driverData: string }>({
    dataType() {
      return `GEOMETRY(${geometryType}, ${srid})`;
    },
    toDriver(value: GeoJSONGeometry) {
      return sql`ST_GeomFromGeoJSON(${JSON.stringify(value)})`;
    },
    fromDriver(value: string) {
      return JSON.parse(value) as GeoJSONGeometry;
    },
  })(name);
