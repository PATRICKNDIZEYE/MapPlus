#!/usr/bin/env node
/**
 * Rebuilds CHIC Kigali with a realistic mall floor plan.
 *
 * Key improvements over the previous version:
 *  1. Building rotated 10° counterclockwise — looks natural, not grid-aligned
 *  2. 18 units Ground / 16 units Level 1 / 8 units Level 2 (vs 6/5/3 before)
 *  3. Varied unit depths — outer wall is irregular, not a straight line
 *  4. Some units have non-rectangular shapes (trapezoids, entry notches)
 *  5. Anchor stores at both ends with full-height footprint
 *
 * Unit naming: G-N01…N08, G-S01…S08, G-WA (west anchor), G-EA (east anchor)
 * Shop assignments mirror existing shop_profiles records.
 */

const path = require('path');
const { Client } = require(path.resolve(__dirname, '../node_modules/.pnpm/pg@8.21.0/node_modules/pg'));
const { config: loadEnv } = require(path.resolve(__dirname, '../node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv'));

loadEnv({ path: path.resolve(__dirname, '../.env') });
const DB = process.env.DATABASE_URL ?? 'postgresql://ndizeye@localhost:5434/mapplus';

// ── Coordinate system ─────────────────────────────────────────────────────────
const CX  = 30.059888;   // building centre longitude
const CY  = -1.944218;   // building centre latitude
const M   = 0.0000090;   // 1 metre in degrees (at Kigali latitude)
const DEG = 10;          // rotation clockwise from E→W axis (degrees)
const RAD = DEG * Math.PI / 180;
const COS = Math.cos(RAD);
const SIN = Math.sin(RAD);

/** Convert building-space (x, y) in metres → geographic (lng, lat) */
function geo(bx, by) {
  // Rotation matrix (clockwise by DEG)
  const rx = bx * COS + by * SIN;
  const ry = -bx * SIN + by * COS;
  return [CX + rx * M, CY + ry * M];
}

/** WKT POLYGON from array of [bx, by] building-space points */
function poly(pts) {
  const ring = [...pts, pts[0]].map(([x, y]) => {
    const [lng, lat] = geo(x, y);
    return `${lng.toFixed(9)} ${lat.toFixed(9)}`;
  });
  return `POLYGON((${ring.join(',')}))`;
}

/**
 * Simple rectangular unit in building space.
 *   x1,x2: east edge range (along main axis)
 *   y1,y2: south/north edges (y=0 is centre; positive = north, negative = south)
 * Slight outer-wall taper can be added via taperN (shifts NW/SW outer corner
 * outward by this many metres on the west side).
 */
function rect(x1, x2, y1, y2, taperWest = 0) {
  const y1w = y1 + taperWest;
  const y2w = y2 + (y2 > 0 ? taperWest : -taperWest);
  return poly([[x1, y1w], [x2, y1], [x2, y2], [x1, y2w]]);
}

// ── Building layout constants ─────────────────────────────────────────────────
// Building runs from x=0 to x=132 (132 m long)
// Corridor: y=−4 to y=+4 (8 m wide, centre at y=0)
// North units: y=+4 to outer (varies 20–28 m deep → outer wall at y=24 to y=32)
// South units: y=−4 to outer (varies 20–28 m deep → outer wall at y=−24 to y=−32)
// West anchor: x=0→22,  full depth y=−30 to y=+30
// East anchor: x=110→132, full depth y=−30 to y=+30

const X_MID_W = 22;   // where middle section starts
const X_MID_E = 110;  // where middle section ends
const CORR_N  = 4;    // corridor north edge
const CORR_S  = -4;   // corridor south edge

// North row widths (x-positions for each unit, 8 units, total = 88 m)
const NW = [14, 10, 9, 11, 10, 9, 12, 13]; // widths in metres, sum = 88
// North row outer-wall depth from corridor (varied → irregular outer wall)
const ND = [24, 21.5, 23, 21.5, 24.5, 20.5, 23, 24]; // inner-to-outer depth

// South row widths (different rhythm from north, total = 88 m)
const SW = [11, 9, 12, 10, 9, 13, 11, 13];
// South row depth (positive number, wall goes to −depth)
const SD = [22, 24.5, 21.5, 23.5, 20.5, 24, 21.5, 24];

// Level 1 — different widths to look distinct from G
const N1W = [12, 11, 8, 10, 9, 11, 12, 15];  // sum 88
const N1D = [23, 22, 24, 21, 25, 21.5, 22.5, 24];
const S1W = [10, 12, 11, 9, 10, 11, 12, 13];  // sum 88
const S1D = [21.5, 23.5, 22, 24, 21, 23, 22.5, 23.5];

// Level 2 — fewer, larger units
const N2W = [30, 28, 30];   // 3 big north units
const N2D = [25, 26, 25];
const S2W = [32, 26, 30];
const S2D = [24, 25, 24];

// ── Unit geometry builder ─────────────────────────────────────────────────────

function buildRow(startX, widths, depths, isNorth, floorIdx) {
  const units = [];
  let x = startX;
  widths.forEach((w, i) => {
    const d = depths[i];
    const x1 = x, x2 = x + w;
    // Add slight taper variation on alternating units for realism
    const taper = (i % 3 === 1) ? 0.5 : (i % 3 === 2) ? -0.3 : 0;
    const geom = isNorth
      ? rect(x1, x2, CORR_N, CORR_N + d, taper)
      : rect(x1, x2, CORR_S - d, CORR_S, taper);
    const row  = isNorth ? 'N' : 'S';
    const prefix = floorIdx === 0 ? 'G' : floorIdx === 1 ? 'L1' : 'L2';
    units.push({ code: `${prefix}-${row}${String(i + 1).padStart(2, '0')}`, geom });
    x = x2;
  });
  return units;
}

// Anchor stores with slight chamfer on inner corners
function westAnchor(prefix) {
  // L-shaped: notch in NE and SE corners to avoid blocking corridor view
  return poly([
    [0,  -30], [22, -30],
    [22, -4 ], [25, -4 ],   // step out at corridor level (kiosk recess)
    [25,  4 ], [22,  4 ],
    [22,  30], [0,   30],
  ]);
}

function eastAnchor(prefix) {
  return poly([
    [110, -30], [132, -30],
    [132,  30], [110,  30],
    [110,   4], [107,   4],
    [107,  -4], [110,  -4],
  ]);
}

// Build full floor layout
function buildFloor(floorIdx) {
  const prefix = floorIdx === 0 ? 'G' : floorIdx === 1 ? 'L1' : 'L2';
  const nW = floorIdx === 0 ? NW : floorIdx === 1 ? N1W : N2W;
  const nD = floorIdx === 0 ? ND : floorIdx === 1 ? N1D : N2D;
  const sW = floorIdx === 0 ? SW : floorIdx === 1 ? S1W : S2W;
  const sD = floorIdx === 0 ? SD : floorIdx === 1 ? S1D : S2D;

  return [
    { code: `${prefix}-WA`, geom: westAnchor(prefix) },   // west anchor
    ...buildRow(X_MID_W, nW, nD, true,  floorIdx),        // north row
    ...buildRow(X_MID_W, sW, sD, false, floorIdx),        // south row
    { code: `${prefix}-EA`, geom: eastAnchor(prefix) },   // east anchor
  ];
}

// ── Shop assignments ──────────────────────────────────────────────────────────
// Maps shop public_name → unit_code in the new layout
const SHOP_TO_UNIT = {
  // Ground floor
  'KFC CHIC':          'G-WA',    // west anchor — large food tenant
  'MTN MoMo Corner':   'G-N01',
  'Simba Sports':      'G-N02',
  'Royal Pharmacy':    'G-N03',
  'Airtel Money':      'G-S01',
  // Level 1
  'iStore Rwanda':     'L1-N01',
  'Nakumatt Fashion':  'L1-N02',
  'Dove Beauty':       'L1-N03',
  'The Book Cafe':     'L1-S01',
  'Samsung Experience':'L1-S02',
  // Level 2
  'Cinemax Cinema':    'L2-EA',   // east anchor — large entertainment
  'Planet Fitness':    'L2-WA',   // west anchor — large fitness
  'Jollof House':      'L2-N01',
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();

  try {
    await client.query('BEGIN');

    const BLD = 'b0000000-0000-0000-0000-000000000001';
    const ORG = 'a0000000-0000-0000-0000-000000000001';

    // 1. Fetch floor IDs
    const { rows: floorRows } = await client.query(
      'SELECT id, floor_number FROM floors WHERE building_id = $1 ORDER BY floor_number',
      [BLD],
    );
    const floorIds = floorRows.map(r => r.id);
    console.log(`\n🏗  Rebuilding CHIC Kigali floor plan (${DEG}° rotation)\n`);
    console.log(`   Floors: ${floorRows.map(r => `L${r.floor_number}`).join(', ')}`);

    // 2. Collect existing shop→tenant mapping before we delete anything
    const { rows: shopRows } = await client.query(
      `SELECT sp.public_name, sp.description, sp.category, sp.tags,
              sp.phone, sp.whatsapp, sp.logo_url, sp.cover_photo_url,
              sp.verification_status, sp.last_verified_at,
              t.id as tenant_id
       FROM shop_profiles sp
       JOIN units u ON u.id = sp.unit_id
       JOIN tenants t ON t.id = sp.tenant_id
       WHERE u.building_id = $1`,
      [BLD],
    );
    console.log(`   Preserving ${shopRows.length} shop profiles`);

    // 3. Delete shop_profiles first, then units
    await client.query(
      `DELETE FROM shop_profiles WHERE unit_id IN (
         SELECT id FROM units WHERE building_id = $1
       )`, [BLD],
    );
    await client.query('DELETE FROM units WHERE building_id = $1', [BLD]);
    console.log('   ✓ Cleared old units');

    // 4. Insert new units for each floor
    let totalUnits = 0;
    const unitCodeToId = {}; // unit_code → unit UUID for shop re-assignment

    for (let fi = 0; fi < floorRows.length; fi++) {
      const floorId = floorIds[fi];
      const units   = buildFloor(fi);
      const { floor_number } = floorRows[fi];

      for (const u of units) {
        const { rows: [row] } = await client.query(
          `INSERT INTO units (floor_id, building_id, unit_code, status, visibility, geometry)
           VALUES ($1, $2, $3, 'vacant', true, ST_GeomFromText($4, 4326))
           RETURNING id`,
          [floorId, BLD, u.code, u.geom],
        );
        unitCodeToId[u.code] = row.id;
        totalUnits++;
      }
      console.log(`   ✓ Floor ${floor_number}: ${units.length} units (${units.map(u => u.code).join(', ')})`);
    }

    // 5. Re-create shop_profiles pointing to the new units
    let shopCount = 0;
    for (const shop of shopRows) {
      const targetCode = SHOP_TO_UNIT[shop.public_name];
      if (!targetCode) {
        console.log(`   ⚠ No unit mapping for "${shop.public_name}", skipping`);
        continue;
      }
      const unitId = unitCodeToId[targetCode];
      if (!unitId) {
        console.log(`   ⚠ Unit code "${targetCode}" not found, skipping`);
        continue;
      }

      // Mark unit as occupied
      await client.query('UPDATE units SET status = $1, tenant_id = $2 WHERE id = $3',
        ['occupied', shop.tenant_id, unitId]);

      // Recreate shop profile
      await client.query(
        `INSERT INTO shop_profiles
           (tenant_id, unit_id, public_name, description, category, tags,
            phone, whatsapp, logo_url, cover_photo_url,
            is_published, verification_status, last_verified_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12)`,
        [
          shop.tenant_id, unitId, shop.public_name, shop.description,
          shop.category, shop.tags, shop.phone, shop.whatsapp,
          shop.logo_url, shop.cover_photo_url,
          shop.verification_status, shop.last_verified_at,
        ],
      );
      shopCount++;
    }

    // 6. Update building floors_count
    await client.query('UPDATE buildings SET floors_count = $1 WHERE id = $2', [floorRows.length, BLD]);

    await client.query('COMMIT');

    console.log(`\n✅  Done`);
    console.log(`   Total units: ${totalUnits}`);
    console.log(`   Shops assigned: ${shopCount}`);
    console.log(`   Rotation: ${DEG}°`);
    console.log(`   Building: 132 m × 64 m (with 8 m central corridor)\n`);
    console.log('→  http://localhost:3000/admin/units\n');

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
