#!/usr/bin/env node
/**
 * Build a realistic large-scale mall floor plan for CHIC Kigali.
 *
 * Goals:
 *  - 5 floors (G, L1, L2, L3, L4)
 *  - ~150-200 units per floor → ~800-1000 units total
 *  - Multi-corridor network: main horizontal spine + 4 vertical cross corridors
 *  - Atriums at corridor junctions (open multi-floor courts)
 *  - Anchor stores at corners and mid-edges (department stores, supermarket, cinema)
 *  - Standard units (8-18 m wide × 18-26 m deep) along corridor edges
 *  - 10° clockwise rotation (consistent with FloorPlanViewer)
 *  - ~60% occupied with realistic brand mix, 40% vacant
 *
 * Run: node scripts/build-mall.js
 */

const path  = require('path');
const { Client } = require(path.resolve(__dirname, '../node_modules/.pnpm/pg@8.21.0/node_modules/pg'));
const { config: loadEnv } = require(path.resolve(__dirname, '../node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv'));

loadEnv({ path: path.resolve(__dirname, '../.env') });
const DB = process.env.DATABASE_URL ?? 'postgresql://ndizeye@localhost:5434/mapplus';

// ── Geographic constants (must match FloorPlanViewer) ─────────────────────────
const CX  = 30.059888;
const CY  = -1.944218;
const M   = 0.0000090;
const DEG = 10;
const RAD = DEG * Math.PI / 180;
const COS = Math.cos(RAD);
const SIN = Math.sin(RAD);

function geo(bx, by) {
  const rx = bx * COS + by * SIN;
  const ry = -bx * SIN + by * COS;
  return [CX + rx * M, CY + ry * M];
}

function poly(points) {
  const ring = [...points, points[0]].map(([x, y]) => geo(x, y));
  return `POLYGON((${ring.map(([lng, lat]) => `${lng.toFixed(9)} ${lat.toFixed(9)}`).join(',')}))`;
}

function rect(x1, y1, x2, y2) {
  return poly([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]);
}

// ── Building & corridor topology ──────────────────────────────────────────────
//
// Building footprint: 240m × 130m (rotated 10°). Coordinates run x=0→240,
// y=-65→+65 in building space. Origin at SW corner of the bounding rect.
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ NW  │ N1 │ N2 │atr1│ N3 │ N4 │atr2│ N5 │ N6 │atr3│ N7 │ N8 │   NE   │
//   │  A  │    │    │    │    │    │    │    │    │    │    │    │   A    │
//   │     │ X1 │    │ X2 │    │    │ X3 │    │    │ X4 │    │    │        │
//   ├═══════════════════ MAIN SPINE CORRIDOR ═════════════════════════════════┤
//   │     │    │    │    │    │    │    │    │    │    │    │    │        │
//   │ SW  │ S1 │ S2 │    │ S3 │ S4 │    │ S5 │ S6 │    │ S7 │ S8 │   SE   │
//   │  A  │                          CENTRE ANCHOR (food court)             │
//   └──────────────────────────────────────────────────────────────────────┘

const BUILD = { x1: 0, y1: -65, x2: 240, y2: 65 };

// Main spine corridor (horizontal, 6m wide centred on y=0)
const SPINE     = { y1: -3, y2: 3 };

// Cross corridors (vertical, 5m wide, run between spine and outer walls)
const CROSS_XS  = [60, 100, 140, 180];
const CROSS_W   = 2.5;  // half-width of cross corridor (5m total)

// Corner anchor stores (large department stores / cinema / supermarket)
const ANCHORS = [
  { x1:   0, y1:  30, x2:  35, y2:  65, name: 'NW-ANCHOR' },  // NW: cinema upstairs
  { x1: 205, y1:  30, x2: 240, y2:  65, name: 'NE-ANCHOR' },  // NE: supermarket
  { x1:   0, y1: -65, x2:  35, y2: -30, name: 'SW-ANCHOR' },  // SW: gym/fitness
  { x1: 205, y1: -65, x2: 240, y2: -30, name: 'SE-ANCHOR' },  // SE: department store
];

// Atria — open multi-floor courts at corridor junctions (no units here)
// Positioned at corridor crossings on the north side, slightly varied for character
const ATRIA = [
  { x1:  76, y1:  18, x2:  94, y2:  36 },   // between cross 1 and 2 (small atrium)
  { x1: 116, y1:  18, x2: 144, y2:  46 },   // central atrium (large — main mall court)
  { x1: 162, y1:  18, x2: 178, y2:  34 },   // between cross 3 and 4
];

// Centre south anchor (food court) — wider, anchors the south side
const CENTRE_S = { x1: 70, y1: -60, x2: 170, y2: -32 };

// ── Unit zone generation ──────────────────────────────────────────────────────
// A "zone" is a strip of space along one side of a corridor.
// We walk the zone and subdivide it into individual units of varied widths.

function generateStripUnits({ x1, x2, y1, y2, codePrefix, axis, sizeProfile = 'standard' }) {
  // Size profiles:
  //   'standard' — 5-9m wide (main retail row)
  //   'kiosk'    — 4-6m wide (small kiosks)
  //   'large'    — 8-14m wide (premium frontage)
  const sizes = {
    standard: { min: 5, max: 9 },
    kiosk:    { min: 4, max: 6 },
    large:    { min: 8, max: 14 },
  };
  const { min, max } = sizes[sizeProfile] ?? sizes.standard;
  const range = max - min;

  const units = [];
  if (axis === 'x') {
    let cursor = x1;
    let i = 1;
    while (cursor < x2 - 0.5) {
      const remaining = x2 - cursor;
      const w = remaining < max
        ? remaining
        : (min + (((i * 37) % 100) / 100) * range);   // deterministic varied widths
      const ux2 = Math.min(cursor + w, x2);
      units.push({
        code: `${codePrefix}${String(i).padStart(2, '0')}`,
        geom: rect(cursor, y1, ux2, y2),
        x1: cursor, x2: ux2, y1, y2,
      });
      cursor = ux2;
      i++;
    }
  } else {
    let cursor = y1;
    let i = 1;
    while (cursor < y2 - 0.5) {
      const remaining = y2 - cursor;
      const h = remaining < max
        ? remaining
        : (min + (((i * 53) % 100) / 100) * range);
      const uy2 = Math.min(cursor + h, y2);
      units.push({
        code: `${codePrefix}${String(i).padStart(2, '0')}`,
        geom: rect(x1, cursor, x2, uy2),
        x1, x2, y1: cursor, y2: uy2,
      });
      cursor = uy2;
      i++;
    }
  }
  return units;
}

// Given a zone and a list of "obstacles" (atria, anchors, cross corridors),
// split the zone into clean sub-strips that avoid the obstacles.
function splitZoneByObstacles(zone, obstacles, axis) {
  // For x-axis zones (horizontal strips along the spine), obstacles cut x-ranges.
  const segments = [];
  if (axis === 'x') {
    let blockers = obstacles
      .filter(o => o.y1 < zone.y2 && o.y2 > zone.y1)  // overlapping y
      .map(o => ({ s: o.x1, e: o.x2 }))
      .sort((a, b) => a.s - b.s);

    let cursor = zone.x1;
    for (const b of blockers) {
      if (b.s > cursor) {
        segments.push({ x1: cursor, y1: zone.y1, x2: Math.min(b.s, zone.x2), y2: zone.y2 });
      }
      cursor = Math.max(cursor, b.e);
      if (cursor >= zone.x2) break;
    }
    if (cursor < zone.x2) {
      segments.push({ x1: cursor, y1: zone.y1, x2: zone.x2, y2: zone.y2 });
    }
  } else {
    let blockers = obstacles
      .filter(o => o.x1 < zone.x2 && o.x2 > zone.x1)
      .map(o => ({ s: o.y1, e: o.y2 }))
      .sort((a, b) => a.s - b.s);

    let cursor = zone.y1;
    for (const b of blockers) {
      if (b.s > cursor) {
        segments.push({ x1: zone.x1, y1: cursor, x2: zone.x2, y2: Math.min(b.s, zone.y2) });
      }
      cursor = Math.max(cursor, b.e);
      if (cursor >= zone.y2) break;
    }
    if (cursor < zone.y2) {
      segments.push({ x1: zone.x1, y1: cursor, x2: zone.x2, y2: zone.y2 });
    }
  }
  return segments.filter(s => (axis === 'x' ? s.x2 - s.x1 : s.y2 - s.y1) > 5);
}

function buildFloor(floorIdx) {
  const prefix = floorIdx === 0 ? 'G' : `L${floorIdx}`;
  const units = [];

  // ── Two-row layout: each side of spine has FRONT row (facing corridor) and
  //    BACK row (facing outer wall). A thin service corridor separates them.
  //
  //  y =  55  ─────────────────────────── outer N wall
  //         │   BACK ROW NORTH (10 m)    │ ← units facing back service corridor
  //  y =  45  ───────── service corridor (3 m) ────────
  //         │   FRONT ROW NORTH (14 m)   │ ← units facing spine
  //  y =   3  ═══════════ MAIN SPINE ═══════════════
  //         │   FRONT ROW SOUTH (14 m)   │
  //  y = -45  ───────── service corridor (3 m) ────────
  //         │   BACK ROW SOUTH (10 m)    │
  //  y = -55  ─────────────────────────── outer S wall

  // Build obstacle list (for unit placement)
  const obstacles = [
    ...ANCHORS,
    ...ATRIA,
    CENTRE_S,
    ...CROSS_XS.map(x => ({ x1: x - CROSS_W, y1: -65, x2: x + CROSS_W, y2: 65 })),
  ];

  let nIdx = 1, sIdx = 1, bnIdx = 1, bsIdx = 1, xIdx = 1;

  // 1. FRONT ROW NORTH — between spine and service corridor, faces main spine
  const frontNorth = { x1: 0, y1: SPINE.y2, x2: 240, y2: 17 };
  for (const seg of splitZoneByObstacles(frontNorth, obstacles, 'x')) {
    const segUnits = generateStripUnits({ ...seg, codePrefix: `${prefix}-N`, axis: 'x', sizeProfile: 'standard' });
    for (const u of segUnits) { u.code = `${prefix}-N${String(nIdx).padStart(2, '0')}`; nIdx++; }
    units.push(...segUnits);
  }

  // 2. BACK ROW NORTH — between service corridor and outer wall (smaller units, kiosks)
  const backNorth = { x1: 0, y1: 20, x2: 240, y2: 30 };
  for (const seg of splitZoneByObstacles(backNorth, obstacles, 'x')) {
    const segUnits = generateStripUnits({ ...seg, codePrefix: `${prefix}-BN`, axis: 'x', sizeProfile: 'kiosk' });
    for (const u of segUnits) { u.code = `${prefix}-BN${String(bnIdx).padStart(2, '0')}`; bnIdx++; }
    units.push(...segUnits);
  }

  // 3. FRONT ROW SOUTH — south of spine, blocked by centre anchor
  const frontSouth = { x1: 0, y1: -17, x2: 240, y2: SPINE.y1 };
  for (const seg of splitZoneByObstacles(frontSouth, obstacles, 'x')) {
    const segUnits = generateStripUnits({ ...seg, codePrefix: `${prefix}-S`, axis: 'x', sizeProfile: 'standard' });
    for (const u of segUnits) { u.code = `${prefix}-S${String(sIdx).padStart(2, '0')}`; sIdx++; }
    units.push(...segUnits);
  }

  // 4. BACK ROW SOUTH — kiosk row along south outer wall (avoiding centre anchor)
  const backSouth = { x1: 0, y1: -30, x2: 240, y2: -20 };
  for (const seg of splitZoneByObstacles(backSouth, obstacles, 'x')) {
    const segUnits = generateStripUnits({ ...seg, codePrefix: `${prefix}-BS`, axis: 'x', sizeProfile: 'kiosk' });
    for (const u of segUnits) { u.code = `${prefix}-BS${String(bsIdx).padStart(2, '0')}`; bsIdx++; }
    units.push(...segUnits);
  }

  // 5. Cross corridor zones (all floors now — was previously skipping L3/L4)
  for (const cx of CROSS_XS) {
    // West side (units facing east into cross corridor)
    const wzN = { x1: cx - 14, y1: 3,   x2: cx - CROSS_W, y2: 17 };
    const wzS = { x1: cx - 14, y1: -17, x2: cx - CROSS_W, y2: -3 };
    // East side (units facing west)
    const ezN = { x1: cx + CROSS_W, y1: 3,   x2: cx + 14, y2: 17 };
    const ezS = { x1: cx + CROSS_W, y1: -17, x2: cx + 14, y2: -3 };

    for (const zone of [wzN, wzS, ezN, ezS]) {
      if (zone.x2 - zone.x1 < 5) continue;
      for (const seg of splitZoneByObstacles(zone, obstacles, 'y')) {
        const segUnits = generateStripUnits({ ...seg, codePrefix: `${prefix}-X`, axis: 'y', sizeProfile: 'standard' });
        for (const u of segUnits) { u.code = `${prefix}-X${String(xIdx).padStart(2, '0')}`; xIdx++; }
        units.push(...segUnits);
      }
    }
  }

  // 6. Anchor stores (4 corners + 1 centre south)
  let aIdx = 1;
  for (const anchor of [...ANCHORS, CENTRE_S]) {
    units.push({
      code: `${prefix}-A${aIdx}`,
      geom: rect(anchor.x1, anchor.y1, anchor.x2, anchor.y2),
      ...anchor,
      isAnchor: true,
    });
    aIdx++;
  }

  return units;
}

// ── Shop catalogue ────────────────────────────────────────────────────────────
// A realistic mix of Rwanda local brands, East African chains, and international
// brands. Mixed across all categories. ~60% occupancy target.

const SHOPS = {
  'Food & Beverages': [
    'KFC',           'Pizza Hut',          "Domino's Pizza",    'Subway',
    'Burger King',   'Java House',         'Bourbon Coffee',    'Inzozi Café',
    'The Hut',       'Repub Lounge',       'Heaven Restaurant', 'Jollof House',
    'Nyama Choma',   'Khana Khazana',      'Pili Pili',         'Soko Restaurant',
    'Brew Bistro',   'Question Coffee',    "Roy's Bistro",       'Magda Café',
    'Sole Luna',     'Khazana Indian',     'Volcana Lounge',     'Ten to Two Café',
    'Crystal Cafe',  'Akabanga BBQ',       'Coffeeoffice',       'Patisserie',
  ],
  'Fashion & Apparel': [
    'Nike',          'Adidas',             'Puma',               'Levi\'s',
    'H&M',           'Zara',               'Mango',              'Forever 21',
    'Bata',          'Crocs',              'Sketchers',          'Foot Locker',
    'Tommy Hilfiger','Calvin Klein',       'GAP',                'Old Navy',
    'Nakumatt Fashion','UniqStyle',        'Kigali Couture',     'African Threads',
    'Inkanyamanza',  'Maison de Mode',     'Rosario Boutique',   'Stylefit',
  ],
  'Electronics': [
    'iStore',        'Samsung',            'Sony Centre',        'LG Brand Shop',
    'Huawei',        'Oppo',               'Xiaomi',             'Tecno',
    'Infinix',       'JBL Audio',          'Phone Hub',          'Tech World',
    'Kigali Electronics','Smart Solutions','PowerLine',          'Digital Plus',
  ],
  'Health & Pharmacy': [
    'Royal Pharmacy','Hope Pharmacy',      'Sawa Pharmacy',      'Care Pharmacy',
    'Medplus',       'CityMed',            'Bramin Pharmacy',    'Goshen Pharmacy',
    'Wellness Clinic','Kivu Health',       'Optica',             'Vision Plus',
  ],
  'Banking & Finance': [
    'Bank of Kigali','Equity Bank',        'I&M Bank',           'KCB',
    'Cogebanque',    'NCBA',               'GT Bank',            'Access Bank',
    'BPR Atlas',     'Urwego Bank',        'MTN MoMo',           'Airtel Money',
    'Tigo Cash',     'Western Union',      'MoneyGram',          'BK Forex',
  ],
  'Beauty & Cosmetics': [
    'Dove Beauty',   'MAC Cosmetics',      'Sephora',            'Bath & Body Works',
    'The Body Shop', 'Inglot',             'Sleek MakeUp',       'Glow Beauty',
    'Aroma Spa',     'Kibo Beauty',        'Salon de Paris',     'Studio Glam',
    'Pure Skin',     'Beauty Avenue',
  ],
  'Sports & Fitness': [
    'Decathlon',     'Sports Direct',      'Adidas Sport',       'Nike Run',
    'Planet Fitness','Waka Fitness',       'Kigali Sports',      'Simba Sports',
    'Hike & Run',    'Camping World',
  ],
  'Entertainment': [
    'Cinemax',       'Century Cinemas',    'Game Zone',          'Kids Empire',
    'Bowling Lane',  'Escape Room Kigali', 'VR Arcade',          'Music Lab',
    'Toy Universe',  'Hobby Lobby',
  ],
};

const CATEGORY_WEIGHTS = {
  'Fashion & Apparel':  0.26,
  'Food & Beverages':   0.22,
  'Electronics':        0.10,
  'Beauty & Cosmetics': 0.11,
  'Health & Pharmacy':  0.07,
  'Banking & Finance':  0.06,
  'Sports & Fitness':   0.08,
  'Entertainment':      0.10,
};

// Pick a category given weights (deterministic by index)
function pickCategory(seed) {
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  let acc = 0;
  for (const [cat, w] of Object.entries(CATEGORY_WEIGHTS)) {
    acc += w;
    if (r <= acc) return cat;
  }
  return 'Fashion & Apparel';
}

function pickShopName(cat, seed) {
  const list = SHOPS[cat];
  return list[seed % list.length];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();

  try {
    await client.query('BEGIN');

    const BLD = 'b0000000-0000-0000-0000-000000000001';
    const ORG = 'a0000000-0000-0000-0000-000000000001';

    console.log('\n🏗️  Building large-scale mall (CHIC Kigali phase 2)\n');

    // 1. Wipe existing units, shop_profiles, tenants (for this org's units)
    await client.query(
      `DELETE FROM shop_profiles WHERE unit_id IN (SELECT id FROM units WHERE building_id = $1)`,
      [BLD],
    );
    await client.query(`DELETE FROM units WHERE building_id = $1`, [BLD]);
    await client.query(`DELETE FROM tenants WHERE org_id = $1`, [ORG]);
    console.log('  ✓ Cleared old units/tenants/shops');

    // 2. Ensure all 5 floors exist
    const { rows: existingFloors } = await client.query(
      'SELECT id, floor_number FROM floors WHERE building_id = $1 ORDER BY floor_number',
      [BLD],
    );
    const existingFloorMap = new Map(existingFloors.map(f => [f.floor_number, f.id]));

    const floorDefs = [
      { number: 0, name: 'Ground Floor', short: 'G'  },
      { number: 1, name: 'Level 1',      short: 'L1' },
      { number: 2, name: 'Level 2',      short: 'L2' },
      { number: 3, name: 'Level 3',      short: 'L3' },
      { number: 4, name: 'Level 4',      short: 'L4' },
    ];

    const floorIds = [];
    for (const fd of floorDefs) {
      let id = existingFloorMap.get(fd.number);
      if (!id) {
        const { rows: [row] } = await client.query(
          `INSERT INTO floors (building_id, floor_number, name, short_name)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [BLD, fd.number, fd.name, fd.short],
        );
        id = row.id;
        console.log(`  ✓ Created floor ${fd.short}`);
      }
      floorIds.push(id);
    }

    // 3. Update building floors_count + dimensions
    await client.query(
      `UPDATE buildings SET floors_count = 5, description = $1 WHERE id = $2`,
      ['Kigali\'s flagship commercial complex. 5 floors, 800+ retail units, anchored by international brands and local favourites.', BLD],
    );

    // 4. Generate units floor by floor
    let totalUnits   = 0;
    let totalShops   = 0;
    let unitSeq      = 1;

    for (let fi = 0; fi < floorDefs.length; fi++) {
      const floorId = floorIds[fi];
      const units   = buildFloor(fi);

      // Insert all units
      const unitIds = [];
      for (const u of units) {
        const status = 'vacant';  // we set occupied below for the ones we lease
        const { rows: [row] } = await client.query(
          `INSERT INTO units (floor_id, building_id, unit_code, status, visibility, geometry)
           VALUES ($1, $2, $3, $4, true, ST_GeomFromText($5, 4326))
           RETURNING id`,
          [floorId, BLD, u.code, status, u.geom],
        );
        unitIds.push({ id: row.id, code: u.code, unit: u });
      }

      // Lease ~60% of units → tenants + shop_profiles
      const targetOccupancy = 0.60;
      const numToLease = Math.floor(unitIds.length * targetOccupancy);

      // Pick which units to lease (deterministic — every Nth unit)
      const leaseInterval = unitIds.length / numToLease;
      const toLease = [];
      for (let i = 0; i < numToLease; i++) {
        toLease.push(unitIds[Math.floor(i * leaseInterval)]);
      }

      let shopsThisFloor = 0;
      for (let li = 0; li < toLease.length; li++) {
        const target = toLease[li];
        const seed   = unitSeq++;
        const category   = pickCategory(seed);
        const shopName   = pickShopName(category, seed);

        // Create tenant
        const phone = `+25078${String(1000000 + seed * 7).slice(-7)}`;
        const { rows: [tenant] } = await client.query(
          `INSERT INTO tenants (org_id, legal_name, trade_name, contact_phone, contact_whatsapp)
           VALUES ($1, $2, $3, $4, $4) RETURNING id`,
          [ORG, `${shopName} Ltd`, shopName, phone],
        );

        // Update unit → occupied + tenant
        await client.query(
          `UPDATE units SET status = 'occupied', tenant_id = $1 WHERE id = $2`,
          [tenant.id, target.id],
        );

        // Create shop profile
        await client.query(
          `INSERT INTO shop_profiles
             (tenant_id, unit_id, public_name, description, category, tags,
              phone, whatsapp, is_published, verification_status, last_verified_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7, true, 'verified', NOW())`,
          [
            tenant.id, target.id, shopName,
            `${shopName} — visit us at CHIC Kigali.`,
            category,
            `{"${category.toLowerCase()}"}`,
            phone,
          ],
        );
        shopsThisFloor++;
      }

      totalUnits += unitIds.length;
      totalShops += shopsThisFloor;
      console.log(`  ✓ Floor ${floorDefs[fi].short}: ${unitIds.length} units (${shopsThisFloor} occupied, ${unitIds.length - shopsThisFloor} vacant)`);
    }

    await client.query('COMMIT');

    console.log(`\n✅  Mall built successfully`);
    console.log(`   Floors:       ${floorDefs.length}`);
    console.log(`   Total units:  ${totalUnits}`);
    console.log(`   Occupied:     ${totalShops} (${Math.round(totalShops/totalUnits*100)}%)`);
    console.log(`   Vacant:       ${totalUnits - totalShops}`);
    console.log(`   Building:     240 m × 130 m, 10° rotation\n`);
    console.log(`→  http://localhost:3000/admin/units\n`);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error('\n❌', err); process.exit(1); });
