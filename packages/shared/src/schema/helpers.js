"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geometry = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const geometry = (name, geometryType = 'Geometry', srid = 4326) => (0, pg_core_1.customType)({
    dataType() {
        return `GEOMETRY(${geometryType}, ${srid})`;
    },
    toDriver(value) {
        return (0, drizzle_orm_1.sql) `ST_GeomFromGeoJSON(${JSON.stringify(value)})`;
    },
    fromDriver(value) {
        return JSON.parse(value);
    },
})(name);
exports.geometry = geometry;
