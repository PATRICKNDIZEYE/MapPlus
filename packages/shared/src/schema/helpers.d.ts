import type { GeoJSONGeometry } from '../types';
export declare const geometry: (name: string, geometryType?: string, srid?: number) => import("node_modules/drizzle-orm/pg-core").PgCustomColumnBuilder<{
    name: string;
    dataType: "custom";
    columnType: "PgCustomColumn";
    data: GeoJSONGeometry;
    driverParam: string;
    enumValues: undefined;
}>;
