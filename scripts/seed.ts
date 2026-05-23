/**
 * Seed script — CHIC Kigali demo data
 * Run: npx ts-node --project apps/api/tsconfig.json scripts/seed.ts
 * Or:  node -e "require('./scripts/seed.js')"
 *
 * Uses pg driver directly (no NestJS) for simplicity.
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const DB_URL = process.env['DATABASE_URL'] ?? 'postgresql://ndizeye@localhost:5434/mapplus';

// ── CHIC Kigali approximate coordinates ────────────────────────────────────
// Real location: Nyarugenge, downtown Kigali, Rwanda
const BUILDING_CENTER = { lat: -1.944218, lng: 30.059888 };

// Helper: create a rectangle polygon offsetting from a center point
// dx, dy in degrees (roughly: 0.000009° ≈ 1 metre)
const M = 0.000009; // 1 metre in degrees
function rect(
  centerLat: number,
  centerLng: number,
  widthM: number,
  heightM: number,
): string {
  const w = (widthM / 2) * M;
  const h = (heightM / 2) * M;
  const minLng = centerLng - w;
  const maxLng = centerLng + w;
  const minLat = centerLat - h;
  const maxLat = centerLat + h;
  return `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
}

// ── Sample shops ────────────────────────────────────────────────────────────
interface ShopDef {
  name: string;
  category: string;
  description: string;
  phone: string;
  whatsapp: string;
  tags: string[];
}

const GROUND_SHOPS: ShopDef[] = [
  { name: 'MTN MoMo Corner', category: 'Banking & Finance', description: 'Mobile money transfers, airtime, and financial services.', phone: '+250788123001', whatsapp: '+250788123001', tags: ['mtn', 'momo', 'mobile money', 'airtime'] },
  { name: 'Simba Sports', category: 'Sports & Fitness', description: 'Sportswear, trainers, and sports equipment for all ages.', phone: '+250788123002', whatsapp: '+250788123002', tags: ['sports', 'shoes', 'trainers', 'nike', 'adidas'] },
  { name: 'Royal Pharmacy', category: 'Health & Pharmacy', description: 'Medicines, supplements, and health products.', phone: '+250788123003', whatsapp: '+250788123003', tags: ['pharmacy', 'medicine', 'health', 'drugs'] },
  { name: 'KFC CHIC', category: 'Food & Beverages', description: 'Fried chicken, burgers, and fast food.', phone: '+250788123004', whatsapp: '+250788123004', tags: ['kfc', 'chicken', 'fast food', 'burgers'] },
  { name: 'Airtel Money', category: 'Banking & Finance', description: 'Airtel mobile money services and recharge.', phone: '+250788123005', whatsapp: '+250788123005', tags: ['airtel', 'mobile money', 'airtime'] },
];

const LEVEL1_SHOPS: ShopDef[] = [
  { name: 'iStore Rwanda', category: 'Electronics', description: 'Apple products, accessories, and repairs.', phone: '+250788123010', whatsapp: '+250788123010', tags: ['apple', 'iphone', 'macbook', 'electronics', 'istore'] },
  { name: 'Nakumatt Fashion', category: 'Fashion & Apparel', description: 'Trendy clothing for men, women, and kids.', phone: '+250788123011', whatsapp: '+250788123011', tags: ['fashion', 'clothes', 'clothing', 'nakumatt'] },
  { name: 'Dove Beauty', category: 'Beauty & Cosmetics', description: 'Cosmetics, skincare, hair products, and fragrances.', phone: '+250788123012', whatsapp: '+250788123012', tags: ['beauty', 'cosmetics', 'skincare', 'perfume', 'hair'] },
  { name: 'The Book Cafe', category: 'Food & Beverages', description: 'Coffee, tea, pastries, and books in a relaxed setting.', phone: '+250788123013', whatsapp: '+250788123013', tags: ['coffee', 'cafe', 'books', 'pastries', 'tea'] },
  { name: 'Samsung Experience', category: 'Electronics', description: 'Samsung phones, tablets, TVs, and accessories.', phone: '+250788123014', whatsapp: '+250788123014', tags: ['samsung', 'phones', 'tablets', 'electronics'] },
];

const LEVEL2_SHOPS: ShopDef[] = [
  { name: 'Cinemax Cinema', category: 'Entertainment', description: 'Latest movies in comfortable modern screening rooms.', phone: '+250788123020', whatsapp: '+250788123020', tags: ['cinema', 'movies', 'entertainment', 'films'] },
  { name: 'Planet Fitness', category: 'Sports & Fitness', description: 'Modern gym equipment, fitness classes, and trainers.', phone: '+250788123021', whatsapp: '+250788123021', tags: ['gym', 'fitness', 'workout', 'exercise'] },
  { name: 'Jollof House', category: 'Food & Beverages', description: 'West African and Rwandan cuisine in a vibrant setting.', phone: '+250788123022', whatsapp: '+250788123022', tags: ['jollof', 'african food', 'restaurant', 'rwandan'] },
  { name: 'Kids Zone', category: 'Entertainment', description: 'Indoor playground, games, and entertainment for children.', phone: '+250788123023', whatsapp: '+250788123023', tags: ['kids', 'children', 'playground', 'games'] },
];

// ── Unit layout per floor ────────────────────────────────────────────────────
// Grid origin: building center offset
const C = BUILDING_CENTER;

interface UnitLayout {
  code: string;
  lat: number;
  lng: number;
  w: number; // width metres
  h: number; // height metres
}

function floorGrid(offset: number): UnitLayout[] {
  const lat = C.lat + offset * M * 2;
  return [
    // Row A (south side)
    { code: 'A01', lat: lat - 40 * M, lng: C.lng - 35 * M, w: 12, h: 8 },
    { code: 'A02', lat: lat - 40 * M, lng: C.lng - 20 * M, w: 12, h: 8 },
    { code: 'A03', lat: lat - 40 * M, lng: C.lng - 5 * M,  w: 12, h: 8 },
    { code: 'A04', lat: lat - 40 * M, lng: C.lng + 10 * M, w: 12, h: 8 },
    { code: 'A05', lat: lat - 40 * M, lng: C.lng + 25 * M, w: 12, h: 8 },
    // Row B (middle)
    { code: 'B01', lat: lat - 20 * M, lng: C.lng - 35 * M, w: 12, h: 8 },
    { code: 'B02', lat: lat - 20 * M, lng: C.lng - 20 * M, w: 12, h: 8 },
    { code: 'B03', lat: lat - 20 * M, lng: C.lng - 5 * M,  w: 12, h: 8 },
    { code: 'B04', lat: lat - 20 * M, lng: C.lng + 10 * M, w: 12, h: 8 },
    { code: 'B05', lat: lat - 20 * M, lng: C.lng + 25 * M, w: 12, h: 8 },
    // Row C (north side)
    { code: 'C01', lat: lat + 5 * M, lng: C.lng - 35 * M, w: 12, h: 8 },
    { code: 'C02', lat: lat + 5 * M, lng: C.lng - 20 * M, w: 12, h: 8 },
    { code: 'C03', lat: lat + 5 * M, lng: C.lng - 5 * M,  w: 12, h: 8 },
    { code: 'C04', lat: lat + 5 * M, lng: C.lng + 10 * M, w: 12, h: 8 },
    { code: 'C05', lat: lat + 5 * M, lng: C.lng + 25 * M, w: 12, h: 8 },
  ];
}

async function seed() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log('🌱 Seeding CHIC Kigali demo data...\n');

  try {
    await client.query('BEGIN');

    // ── Check if already seeded ──────────────────────────────────────────────
    const { rows: existing } = await client.query(
      "SELECT id FROM buildings WHERE slug = 'chic-kigali' LIMIT 1",
    );
    if (existing.length > 0) {
      console.log('⚠️  CHIC Kigali already seeded. Run with --force to re-seed.');
      await client.query('ROLLBACK');
      return;
    }

    // ── Organization ─────────────────────────────────────────────────────────
    const { rows: [org] } = await client.query<{ id: string }>(
      `INSERT INTO organizations (name, type, contact_email)
       VALUES ('CHIC Management Ltd', 'management_company', 'info@chic.rw')
       RETURNING id`,
    );
    console.log(`✓ Organization: ${org!.id}`);

    // ── Building ─────────────────────────────────────────────────────────────
    const { rows: [building] } = await client.query<{ id: string }>(
      `INSERT INTO buildings (org_id, name, slug, address, city, country, lat, lng, floors_count, status, is_public, description, timezone)
       VALUES ($1, 'CHIC Kigali', 'chic-kigali',
               'Nyarugenge, downtown Kigali', 'Kigali', 'Rwanda',
               -1.944218, 30.059888, 3,
               'active', true,
               'Kigali''s premier commercial complex. 3 floors of retail, food, entertainment and services.',
               'Africa/Kigali')
       RETURNING id`,
      [org!.id],
    );
    console.log(`✓ Building: ${building!.id}`);

    // ── Floors ───────────────────────────────────────────────────────────────
    const floorDefs = [
      { number: 0, name: 'Ground Floor', short: 'G' },
      { number: 1, name: 'Level 1',      short: 'L1' },
      { number: 2, name: 'Level 2',      short: 'L2' },
    ];

    const floorIds: string[] = [];
    for (const f of floorDefs) {
      const { rows: [floor] } = await client.query<{ id: string }>(
        `INSERT INTO floors (building_id, floor_number, name, short_name)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [building!.id, f.number, f.name, f.short],
      );
      floorIds.push(floor!.id);
      console.log(`  ✓ Floor: ${f.name} (${floor!.id})`);
    }

    const allShopDefs = [GROUND_SHOPS, LEVEL1_SHOPS, LEVEL2_SHOPS];

    for (let fi = 0; fi < floorDefs.length; fi++) {
      const floorId = floorIds[fi]!;
      const shopDefs = allShopDefs[fi]!;
      const grid = floorGrid(fi * 5);

      // ── Units ──────────────────────────────────────────────────────────────
      const unitIds: string[] = [];
      for (let ui = 0; ui < grid.length; ui++) {
        const u = grid[ui]!;
        const { rows: [unit] } = await client.query<{ id: string }>(
          `INSERT INTO units (floor_id, building_id, unit_code, unit_name, status, visibility,
                             geometry)
           VALUES ($1, $2, $3, $4,
                   $5, true,
                   ST_GeomFromText($6, 4326))
           RETURNING id`,
          [
            floorId,
            building!.id,
            u.code,
            u.code,
            ui < shopDefs.length ? 'occupied' : 'vacant',
            rect(u.lat, u.lng, u.w, u.h),
          ],
        );
        unitIds.push(unit!.id);
      }
      console.log(`  ✓ Units: ${grid.length} units on ${floorDefs[fi]!.name}`);

      // ── Tenants + Shop Profiles ────────────────────────────────────────────
      for (let si = 0; si < shopDefs.length; si++) {
        const shop = shopDefs[si]!;
        const unitId = unitIds[si]!;

        const { rows: [tenant] } = await client.query<{ id: string }>(
          `INSERT INTO tenants (org_id, legal_name, trade_name, contact_phone, contact_whatsapp)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [org!.id, shop.name + ' Ltd', shop.name, shop.phone, shop.whatsapp],
        );

        await client.query(
          `UPDATE units SET tenant_id = $1 WHERE id = $2`,
          [tenant!.id, unitId],
        );

        await client.query(
          `INSERT INTO shop_profiles
             (tenant_id, unit_id, public_name, description, category, tags,
              phone, whatsapp, is_published, verification_status, last_verified_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'verified', NOW())`,
          [
            tenant!.id,
            unitId,
            shop.name,
            shop.description,
            shop.category,
            `{${shop.tags.map(t => `"${t}"`).join(',')}}`,
            shop.phone,
            shop.whatsapp,
          ],
        );
      }
      console.log(`  ✓ Shops: ${shopDefs.length} shops on ${floorDefs[fi]!.name}`);
    }

    // ── Amenities (nav nodes for a few) ──────────────────────────────────────
    const amenityDefs = [
      { type: 'entrance',         label: 'Main Entrance',     lat: C.lat - 55 * M, lng: C.lng - 5 * M },
      { type: 'elevator',         label: 'Central Elevator',  lat: C.lat,          lng: C.lng },
      { type: 'restroom_male',    label: "Men's Restroom",    lat: C.lat + 25 * M, lng: C.lng + 35 * M },
      { type: 'restroom_female',  label: "Women's Restroom",  lat: C.lat + 25 * M, lng: C.lng + 45 * M },
      { type: 'atm',              label: 'KCB ATM',           lat: C.lat - 40 * M, lng: C.lng + 40 * M },
      { type: 'info_desk',        label: 'Information Desk',  lat: C.lat - 50 * M, lng: C.lng },
    ];

    for (const fl of floorIds) {
      for (const a of amenityDefs) {
        const { rows: [node] } = await client.query<{ id: string }>(
          `INSERT INTO nav_nodes (building_id, floor_id, type, label, accessible,
                                  geometry)
           VALUES ($1, $2, $3, $4, true,
                   ST_GeomFromText($5, 4326))
           RETURNING id`,
          [
            building!.id,
            fl,
            a.type,
            a.label,
            `POINT(${a.lng} ${a.lat})`,
          ],
        );
        await client.query(
          `INSERT INTO amenities (building_id, floor_id, type, label, nav_node_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [building!.id, fl, a.type, a.label, node!.id],
        );
      }
    }
    console.log(`✓ Amenities: ${amenityDefs.length} per floor`);

    // ── QR Anchors ─────────────────────────────────────────────────────────
    const { rows: [entranceNode] } = await client.query<{ id: string }>(
      `SELECT n.id FROM nav_nodes n
       JOIN floors f ON f.id = n.floor_id
       WHERE n.building_id = $1 AND n.type = 'entrance' AND f.floor_number = 0
       LIMIT 1`,
      [building!.id],
    );

    if (entranceNode) {
      await client.query(
        `INSERT INTO qr_anchors (building_id, floor_id, nav_node_id, label, short_code, qr_url)
         SELECT $1, floor_id, $2, 'Main Entrance', 'CHIC-MAIN',
                'http://localhost:3000/q/CHIC-MAIN'
         FROM nav_nodes WHERE id = $2`,
        [building!.id, entranceNode.id],
      );
      console.log('✓ QR anchor: CHIC-MAIN at main entrance');
    }

    await client.query('COMMIT');
    console.log('\n✅ Seeding complete!');
    console.log(`\n  Building slug: chic-kigali`);
    console.log(`  URL: http://localhost:3000/map/chic-kigali\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
