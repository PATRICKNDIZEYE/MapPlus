#!/usr/bin/env node
/**
 * Seed script — CHIC Kigali demo data
 * Run from monorepo root: node scripts/seed.js
 */
const { Client } = require('./node_modules/.pnpm/pg@8.21.0/node_modules/pg');
const { config: loadEnv } = require('./node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv');
const path = require('path');

loadEnv({ path: path.resolve(__dirname, '../.env') });

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://ndizeye@localhost:5434/mapplus';

const BUILDING_CENTER = { lat: -1.944218, lng: 30.059888 };
const M = 0.000009;

function rect(centerLat, centerLng, widthM, heightM) {
  const w = (widthM / 2) * M;
  const h = (heightM / 2) * M;
  const C = BUILDING_CENTER;
  const minLng = centerLng - w;
  const maxLng = centerLng + w;
  const minLat = centerLat - h;
  const maxLat = centerLat + h;
  return `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
}

const GROUND_SHOPS = [
  { name: 'MTN MoMo Corner',   category: 'Banking & Finance',  description: 'Mobile money transfers, airtime, and financial services.',   phone: '+250788123001', tags: ['mtn','momo','mobile money','airtime'] },
  { name: 'Simba Sports',       category: 'Sports & Fitness',   description: 'Sportswear, trainers, and sports equipment for all ages.',    phone: '+250788123002', tags: ['sports','shoes','trainers','nike','adidas'] },
  { name: 'Royal Pharmacy',     category: 'Health & Pharmacy',  description: 'Medicines, supplements, and health products.',               phone: '+250788123003', tags: ['pharmacy','medicine','health','drugs'] },
  { name: 'KFC CHIC',           category: 'Food & Beverages',   description: 'Fried chicken, burgers, and fast food.',                    phone: '+250788123004', tags: ['kfc','chicken','fast food','burgers'] },
  { name: 'Airtel Money',       category: 'Banking & Finance',  description: 'Airtel mobile money services and recharge.',                 phone: '+250788123005', tags: ['airtel','mobile money','airtime'] },
];

const LEVEL1_SHOPS = [
  { name: 'iStore Rwanda',      category: 'Electronics',        description: 'Apple products, accessories, and repairs.',                  phone: '+250788123010', tags: ['apple','iphone','macbook','electronics'] },
  { name: 'Nakumatt Fashion',   category: 'Fashion & Apparel',  description: 'Trendy clothing for men, women, and kids.',                  phone: '+250788123011', tags: ['fashion','clothes','clothing'] },
  { name: 'Dove Beauty',        category: 'Beauty & Cosmetics', description: 'Cosmetics, skincare, hair products, and fragrances.',       phone: '+250788123012', tags: ['beauty','cosmetics','skincare','perfume'] },
  { name: 'The Book Cafe',      category: 'Food & Beverages',   description: 'Coffee, tea, pastries, and books in a relaxed setting.',    phone: '+250788123013', tags: ['coffee','cafe','books','pastries'] },
  { name: 'Samsung Experience', category: 'Electronics',        description: 'Samsung phones, tablets, TVs, and accessories.',            phone: '+250788123014', tags: ['samsung','phones','tablets','electronics'] },
];

const LEVEL2_SHOPS = [
  { name: 'Cinemax Cinema',     category: 'Entertainment',      description: 'Latest movies in comfortable modern screening rooms.',      phone: '+250788123020', tags: ['cinema','movies','entertainment'] },
  { name: 'Planet Fitness',     category: 'Sports & Fitness',   description: 'Modern gym equipment, fitness classes, and trainers.',     phone: '+250788123021', tags: ['gym','fitness','workout','exercise'] },
  { name: 'Jollof House',       category: 'Food & Beverages',   description: 'West African and Rwandan cuisine in a vibrant setting.',   phone: '+250788123022', tags: ['jollof','african food','restaurant','rwandan'] },
  { name: 'Kids Zone',          category: 'Entertainment',      description: 'Indoor playground, games, and entertainment for children.', phone: '+250788123023', tags: ['kids','children','playground','games'] },
];

const C = BUILDING_CENTER;

function floorUnits(floorOffset) {
  const lat = C.lat + floorOffset * 0;
  return [
    { code: 'A01', lat: lat - 40*M, lng: C.lng - 35*M, w:14, h:9 },
    { code: 'A02', lat: lat - 40*M, lng: C.lng - 18*M, w:14, h:9 },
    { code: 'A03', lat: lat - 40*M, lng: C.lng -  1*M, w:14, h:9 },
    { code: 'A04', lat: lat - 40*M, lng: C.lng + 16*M, w:14, h:9 },
    { code: 'A05', lat: lat - 40*M, lng: C.lng + 33*M, w:14, h:9 },
    { code: 'B01', lat: lat - 22*M, lng: C.lng - 35*M, w:14, h:9 },
    { code: 'B02', lat: lat - 22*M, lng: C.lng - 18*M, w:14, h:9 },
    { code: 'B03', lat: lat - 22*M, lng: C.lng -  1*M, w:14, h:9 },
    { code: 'B04', lat: lat - 22*M, lng: C.lng + 16*M, w:14, h:9 },
    { code: 'B05', lat: lat - 22*M, lng: C.lng + 33*M, w:14, h:9 },
    { code: 'C01', lat: lat -  4*M, lng: C.lng - 35*M, w:14, h:9 },
    { code: 'C02', lat: lat -  4*M, lng: C.lng - 18*M, w:14, h:9 },
    { code: 'C03', lat: lat -  4*M, lng: C.lng -  1*M, w:14, h:9 },
    { code: 'C04', lat: lat -  4*M, lng: C.lng + 16*M, w:14, h:9 },
    { code: 'C05', lat: lat -  4*M, lng: C.lng + 33*M, w:14, h:9 },
  ];
}

async function seed() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('🌱 Seeding CHIC Kigali...\n');

  try {
    await client.query('BEGIN');

    // Check if already seeded
    const { rows: existing } = await client.query(
      "SELECT id FROM buildings WHERE slug = 'chic-kigali' LIMIT 1"
    );
    if (existing.length > 0) {
      console.log('⚠️  CHIC Kigali already seeded. Drop and re-run to re-seed.');
      await client.query('ROLLBACK');
      return;
    }

    // Organization
    const { rows: [org] } = await client.query(
      `INSERT INTO organizations (name, type, contact_email)
       VALUES ('CHIC Management Ltd', 'management_company', 'info@chic.rw')
       RETURNING id`
    );
    console.log(`✓ Organization created`);

    // Building
    const { rows: [building] } = await client.query(
      `INSERT INTO buildings (org_id, name, slug, address, city, country, lat, lng,
                              floors_count, status, is_public, description, timezone)
       VALUES ($1, 'CHIC Kigali', 'chic-kigali',
               'Nyarugenge, downtown Kigali', 'Kigali', 'Rwanda',
               -1.944218, 30.059888, 3, 'active', true,
               'Kigali''s premier commercial complex. 3 floors of retail, food, entertainment and services.',
               'Africa/Kigali')
       RETURNING id`,
      [org.id]
    );
    console.log(`✓ Building: CHIC Kigali (${building.id})`);

    const floorDefs = [
      { number: 0, name: 'Ground Floor', short: 'G',  shops: GROUND_SHOPS },
      { number: 1, name: 'Level 1',      short: 'L1', shops: LEVEL1_SHOPS },
      { number: 2, name: 'Level 2',      short: 'L2', shops: LEVEL2_SHOPS },
    ];

    const floorIds = [];

    for (let fi = 0; fi < floorDefs.length; fi++) {
      const f = floorDefs[fi];
      const { rows: [floor] } = await client.query(
        `INSERT INTO floors (building_id, floor_number, name, short_name)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [building.id, f.number, f.name, f.short]
      );
      floorIds.push(floor.id);

      const unitGrid = floorUnits(fi);
      const unitIds = [];

      for (let ui = 0; ui < unitGrid.length; ui++) {
        const u = unitGrid[ui];
        const status = ui < f.shops.length ? 'occupied' : 'vacant';
        const { rows: [unit] } = await client.query(
          `INSERT INTO units (floor_id, building_id, unit_code, status, visibility, geometry)
           VALUES ($1, $2, $3, $4, true, ST_GeomFromText($5, 4326))
           RETURNING id`,
          [floor.id, building.id, u.code, status, rect(u.lat, u.lng, u.w, u.h)]
        );
        unitIds.push(unit.id);
      }

      for (let si = 0; si < f.shops.length; si++) {
        const shop = f.shops[si];
        const unitId = unitIds[si];
        const { rows: [tenant] } = await client.query(
          `INSERT INTO tenants (org_id, legal_name, trade_name, contact_phone, contact_whatsapp)
           VALUES ($1, $2, $3, $4, $4) RETURNING id`,
          [org.id, shop.name + ' Ltd', shop.name, shop.phone]
        );
        await client.query(
          `UPDATE units SET tenant_id = $1 WHERE id = $2`,
          [tenant.id, unitId]
        );
        await client.query(
          `INSERT INTO shop_profiles
             (tenant_id, unit_id, public_name, description, category, tags,
              phone, whatsapp, is_published, verification_status, last_verified_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$7,true,'verified',NOW())`,
          [tenant.id, unitId, shop.name, shop.description, shop.category,
           '{' + shop.tags.map(t => '"'+t+'"').join(',') + '}', shop.phone]
        );
      }
      console.log(`✓ ${f.name}: ${unitGrid.length} units, ${f.shops.length} shops`);
    }

    // Amenities + nav nodes on each floor
    const amenities = [
      { type: 'entrance',        label: 'Main Entrance',    lat: C.lat - 55*M, lng: C.lng - 5*M  },
      { type: 'elevator',        label: 'Central Elevator', lat: C.lat,         lng: C.lng        },
      { type: 'restroom_male',   label: "Men's Restroom",   lat: C.lat + 25*M, lng: C.lng + 38*M },
      { type: 'restroom_female', label: "Women's Restroom", lat: C.lat + 25*M, lng: C.lng + 47*M },
      { type: 'atm',             label: 'KCB ATM',          lat: C.lat - 38*M, lng: C.lng + 42*M },
      { type: 'info_desk',       label: 'Info Desk',        lat: C.lat - 48*M, lng: C.lng        },
    ];

    for (const floorId of floorIds) {
      for (const a of amenities) {
        const { rows: [node] } = await client.query(
          `INSERT INTO nav_nodes (building_id, floor_id, type, label, accessible, geometry)
           VALUES ($1,$2,$3,$4,true,ST_GeomFromText($5,4326)) RETURNING id`,
          [building.id, floorId, a.type, a.label, `POINT(${a.lng} ${a.lat})`]
        );
        await client.query(
          `INSERT INTO amenities (building_id, floor_id, type, label, nav_node_id)
           VALUES ($1,$2,$3,$4,$5)`,
          [building.id, floorId, a.type, a.label, node.id]
        );
      }
    }
    console.log(`✓ Amenities: ${amenities.length} per floor`);

    // QR anchor at main entrance (ground floor)
    const { rows: [entrance] } = await client.query(
      `SELECT n.id, n.floor_id FROM nav_nodes n
       JOIN floors f ON f.id = n.floor_id
       WHERE n.building_id = $1 AND n.type = 'entrance' AND f.floor_number = 0 LIMIT 1`,
      [building.id]
    );
    if (entrance) {
      await client.query(
        `INSERT INTO qr_anchors (building_id, floor_id, nav_node_id, label, short_code, qr_url)
         VALUES ($1,$2,$3,'Main Entrance','CHIC-MAIN','http://localhost:3000/q/CHIC-MAIN')`,
        [building.id, entrance.floor_id, entrance.id]
      );
      console.log('✓ QR anchor: CHIC-MAIN');
    }

    await client.query('COMMIT');
    console.log('\n✅ Done! Open: http://localhost:3000/map/chic-kigali\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
