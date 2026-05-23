-- ============================================================
-- CHIC Kigali demo seed  (run: psql -p 5434 -d mapplus -f scripts/seed.sql)
-- Uses fixed UUIDs so the script is idempotent and readable.
-- ============================================================
BEGIN;

-- Guard
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM buildings WHERE slug = 'chic-kigali') THEN
    RAISE EXCEPTION 'already_seeded';
  END IF;
END $$;

-- ─── IDs ──────────────────────────────────────────────────────────────────────
-- org
\set ORG       'a0000000-0000-0000-0000-000000000001'
-- building
\set BLD       'b0000000-0000-0000-0000-000000000001'
-- floors
\set FL_G      'f0000000-0000-0000-0000-000000000000'
\set FL_L1     'f1000000-0000-0000-0000-000000000001'
\set FL_L2     'f2000000-0000-0000-0000-000000000002'
-- units G
\set UG1 'e1010000-0000-0000-0000-000000000001'
\set UG2 'e1010000-0000-0000-0000-000000000002'
\set UG3 'e1010000-0000-0000-0000-000000000003'
\set UG4 'e1010000-0000-0000-0000-000000000004'
\set UG5 'e1010000-0000-0000-0000-000000000005'
\set UG6 'e1010000-0000-0000-0000-000000000006'
-- units L1
\set UL1A 'e2010000-0000-0000-0000-000000000001'
\set UL1B 'e2010000-0000-0000-0000-000000000002'
\set UL1C 'e2010000-0000-0000-0000-000000000003'
\set UL1D 'e2010000-0000-0000-0000-000000000004'
\set UL1E 'e2010000-0000-0000-0000-000000000005'
-- units L2
\set UL2A 'e3010000-0000-0000-0000-000000000001'
\set UL2B 'e3010000-0000-0000-0000-000000000002'
\set UL2C 'e3010000-0000-0000-0000-000000000003'
-- tenants
\set TG1 'c1010000-0000-0000-0000-000000000001'
\set TG2 'c1010000-0000-0000-0000-000000000002'
\set TG3 'c1010000-0000-0000-0000-000000000003'
\set TG4 'c1010000-0000-0000-0000-000000000004'
\set TG5 'c1010000-0000-0000-0000-000000000005'
\set TL1A 'c2010000-0000-0000-0000-000000000001'
\set TL1B 'c2010000-0000-0000-0000-000000000002'
\set TL1C 'c2010000-0000-0000-0000-000000000003'
\set TL1D 'c2010000-0000-0000-0000-000000000004'
\set TL1E 'c2010000-0000-0000-0000-000000000005'
\set TL2A 'c3010000-0000-0000-0000-000000000001'
\set TL2B 'c3010000-0000-0000-0000-000000000002'
\set TL2C 'c3010000-0000-0000-0000-000000000003'
-- nav node (entrance ground)
\set NN_ENT 'd0000000-0000-0000-0000-000000000001'

-- ─── Constants ────────────────────────────────────────────────────────────────
-- CHIC Kigali centroid: -1.944218, 30.059888
-- M = 0.000009 deg ≈ 1 metre  → 7M ≈ 63m half-width

-- ─── Organisation ─────────────────────────────────────────────────────────────
INSERT INTO organizations (id, name, type, contact_email) VALUES
  (:'ORG', 'CHIC Management Ltd', 'management_company', 'info@chic.rw');

-- ─── Building ──────────────────────────────────────────────────────────────────
INSERT INTO buildings (id, org_id, name, slug, address, city, country, lat, lng,
                       floors_count, status, is_public, description, timezone)
VALUES (:'BLD', :'ORG', 'CHIC Kigali', 'chic-kigali',
        'KG 9 Ave, Kacyiru, Kigali', 'Kigali', 'Rwanda',
        -1.944218, 30.059888, 3, 'active', true,
        'Kigali''s premier commercial complex — 3 floors of retail, food & entertainment.',
        'Africa/Kigali');

-- ─── Floors ────────────────────────────────────────────────────────────────────
INSERT INTO floors (id, building_id, floor_number, name, short_name) VALUES
  (:'FL_G',  :'BLD', 0, 'Ground Floor', 'G'),
  (:'FL_L1', :'BLD', 1, 'Level 1',      'L1'),
  (:'FL_L2', :'BLD', 2, 'Level 2',      'L2');

-- ─── Units — Ground Floor ──────────────────────────────────────────────────────
-- Row A  (lat ≈ C_LAT - 40*M)  lng positions: C_LNG ± offsets
INSERT INTO units (id, floor_id, building_id, unit_code, status, visibility, geometry) VALUES
  (:'UG1', :'FL_G', :'BLD', 'G-A01', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059573 -1.944578, 30.059699 -1.944578, 30.059699 -1.944498, 30.059573 -1.944498, 30.059573 -1.944578))', 4326)),
  (:'UG2', :'FL_G', :'BLD', 'G-A02', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059735 -1.944578, 30.059861 -1.944578, 30.059861 -1.944498, 30.059735 -1.944498, 30.059735 -1.944578))', 4326)),
  (:'UG3', :'FL_G', :'BLD', 'G-A03', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059897 -1.944578, 30.060023 -1.944578, 30.060023 -1.944498, 30.059897 -1.944498, 30.059897 -1.944578))', 4326)),
  (:'UG4', :'FL_G', :'BLD', 'G-A04', 'occupied', true,
   ST_GeomFromText('POLYGON((30.060059 -1.944578, 30.060185 -1.944578, 30.060185 -1.944498, 30.060059 -1.944498, 30.060059 -1.944578))', 4326)),
  (:'UG5', :'FL_G', :'BLD', 'G-B01', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059573 -1.944398, 30.059699 -1.944398, 30.059699 -1.944318, 30.059573 -1.944318, 30.059573 -1.944398))', 4326)),
  (:'UG6', :'FL_G', :'BLD', 'G-B02', 'vacant',   true,
   ST_GeomFromText('POLYGON((30.059735 -1.944398, 30.059861 -1.944398, 30.059861 -1.944318, 30.059735 -1.944318, 30.059735 -1.944398))', 4326));

-- ─── Units — Level 1 ──────────────────────────────────────────────────────────
INSERT INTO units (id, floor_id, building_id, unit_code, status, visibility, geometry) VALUES
  (:'UL1A', :'FL_L1', :'BLD', 'L1-A01', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059573 -1.944578, 30.059699 -1.944578, 30.059699 -1.944498, 30.059573 -1.944498, 30.059573 -1.944578))', 4326)),
  (:'UL1B', :'FL_L1', :'BLD', 'L1-A02', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059735 -1.944578, 30.059861 -1.944578, 30.059861 -1.944498, 30.059735 -1.944498, 30.059735 -1.944578))', 4326)),
  (:'UL1C', :'FL_L1', :'BLD', 'L1-A03', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059897 -1.944578, 30.060023 -1.944578, 30.060023 -1.944498, 30.059897 -1.944498, 30.059897 -1.944578))', 4326)),
  (:'UL1D', :'FL_L1', :'BLD', 'L1-A04', 'occupied', true,
   ST_GeomFromText('POLYGON((30.060059 -1.944578, 30.060185 -1.944578, 30.060185 -1.944498, 30.060059 -1.944498, 30.060059 -1.944578))', 4326)),
  (:'UL1E', :'FL_L1', :'BLD', 'L1-A05', 'occupied', true,
   ST_GeomFromText('POLYGON((30.060221 -1.944578, 30.060347 -1.944578, 30.060347 -1.944498, 30.060221 -1.944498, 30.060221 -1.944578))', 4326));

-- ─── Units — Level 2 ──────────────────────────────────────────────────────────
INSERT INTO units (id, floor_id, building_id, unit_code, status, visibility, geometry) VALUES
  (:'UL2A', :'FL_L2', :'BLD', 'L2-A01', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059447 -1.944658, 30.059825 -1.944658, 30.059825 -1.944498, 30.059447 -1.944498, 30.059447 -1.944658))', 4326)),
  (:'UL2B', :'FL_L2', :'BLD', 'L2-A02', 'occupied', true,
   ST_GeomFromText('POLYGON((30.059861 -1.944658, 30.060239 -1.944658, 30.060239 -1.944498, 30.059861 -1.944498, 30.059861 -1.944658))', 4326)),
  (:'UL2C', :'FL_L2', :'BLD', 'L2-A03', 'occupied', true,
   ST_GeomFromText('POLYGON((30.060275 -1.944578, 30.060401 -1.944578, 30.060401 -1.944498, 30.060275 -1.944498, 30.060275 -1.944578))', 4326));

-- ─── Tenants ───────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, org_id, legal_name, trade_name, contact_phone, contact_whatsapp) VALUES
  (:'TG1',  :'ORG', 'MTN MoMo Ltd',           'MTN MoMo Corner',    '+250788123001', '+250788123001'),
  (:'TG2',  :'ORG', 'Simba Sports Ltd',        'Simba Sports',       '+250788123002', '+250788123002'),
  (:'TG3',  :'ORG', 'Royal Pharmacy Ltd',      'Royal Pharmacy',     '+250788123003', '+250788123003'),
  (:'TG4',  :'ORG', 'KFC Rwanda Ltd',          'KFC CHIC',           '+250788123004', '+250788123004'),
  (:'TG5',  :'ORG', 'Airtel Money Ltd',        'Airtel Money',       '+250788123005', '+250788123005'),
  (:'TL1A', :'ORG', 'iStore Rwanda Ltd',       'iStore Rwanda',      '+250788123010', '+250788123010'),
  (:'TL1B', :'ORG', 'Nakumatt Fashion Ltd',    'Nakumatt Fashion',   '+250788123011', '+250788123011'),
  (:'TL1C', :'ORG', 'Dove Beauty Ltd',         'Dove Beauty',        '+250788123012', '+250788123012'),
  (:'TL1D', :'ORG', 'The Book Cafe Ltd',       'The Book Cafe',      '+250788123013', '+250788123013'),
  (:'TL1E', :'ORG', 'Samsung Rwanda Ltd',      'Samsung Experience', '+250788123014', '+250788123014'),
  (:'TL2A', :'ORG', 'Cinemax Rwanda Ltd',      'Cinemax Cinema',     '+250788123020', '+250788123020'),
  (:'TL2B', :'ORG', 'Planet Fitness Ltd',      'Planet Fitness',     '+250788123021', '+250788123021'),
  (:'TL2C', :'ORG', 'Jollof House Ltd',        'Jollof House',       '+250788123022', '+250788123022');

-- Assign tenants to units
UPDATE units SET tenant_id = :'TG1'  WHERE id = :'UG1';
UPDATE units SET tenant_id = :'TG2'  WHERE id = :'UG2';
UPDATE units SET tenant_id = :'TG3'  WHERE id = :'UG3';
UPDATE units SET tenant_id = :'TG4'  WHERE id = :'UG4';
UPDATE units SET tenant_id = :'TG5'  WHERE id = :'UG5';
UPDATE units SET tenant_id = :'TL1A' WHERE id = :'UL1A';
UPDATE units SET tenant_id = :'TL1B' WHERE id = :'UL1B';
UPDATE units SET tenant_id = :'TL1C' WHERE id = :'UL1C';
UPDATE units SET tenant_id = :'TL1D' WHERE id = :'UL1D';
UPDATE units SET tenant_id = :'TL1E' WHERE id = :'UL1E';
UPDATE units SET tenant_id = :'TL2A' WHERE id = :'UL2A';
UPDATE units SET tenant_id = :'TL2B' WHERE id = :'UL2B';
UPDATE units SET tenant_id = :'TL2C' WHERE id = :'UL2C';

-- ─── Shop Profiles ─────────────────────────────────────────────────────────────
INSERT INTO shop_profiles (id, tenant_id, unit_id, public_name, description, category, tags, phone, whatsapp, is_published, verification_status, last_verified_at) VALUES
  (gen_random_uuid(), :'TG1',  :'UG1',  'MTN MoMo Corner',    'Mobile money transfers, airtime, and financial services.',    'Banking & Finance',  '{"mtn","momo","mobile money","airtime"}',                      '+250788123001', '+250788123001', true, 'verified', NOW()),
  (gen_random_uuid(), :'TG2',  :'UG2',  'Simba Sports',       'Sportswear, trainers, and sports equipment for all ages.',    'Sports & Fitness',   '{"sports","shoes","trainers","nike","adidas"}',                '+250788123002', '+250788123002', true, 'verified', NOW()),
  (gen_random_uuid(), :'TG3',  :'UG3',  'Royal Pharmacy',     'Medicines, supplements, and health products.',                'Health & Pharmacy',  '{"pharmacy","medicine","health","drugs"}',                     '+250788123003', '+250788123003', true, 'verified', NOW()),
  (gen_random_uuid(), :'TG4',  :'UG4',  'KFC CHIC',           'Fried chicken, burgers, and fast food.',                     'Food & Beverages',   '{"kfc","chicken","fast food","burgers"}',                      '+250788123004', '+250788123004', true, 'verified', NOW()),
  (gen_random_uuid(), :'TG5',  :'UG5',  'Airtel Money',       'Airtel mobile money services and recharge.',                 'Banking & Finance',  '{"airtel","mobile money","airtime"}',                          '+250788123005', '+250788123005', true, 'verified', NOW()),
  (gen_random_uuid(), :'TL1A', :'UL1A', 'iStore Rwanda',      'Apple products, accessories, and repairs.',                  'Electronics',        '{"apple","iphone","macbook","electronics","istore"}',          '+250788123010', '+250788123010', true, 'verified', NOW()),
  (gen_random_uuid(), :'TL1B', :'UL1B', 'Nakumatt Fashion',   'Trendy clothing for men, women, and kids.',                  'Fashion & Apparel',  '{"fashion","clothes","clothing","nakumatt"}',                  '+250788123011', '+250788123011', true, 'verified', NOW()),
  (gen_random_uuid(), :'TL1C', :'UL1C', 'Dove Beauty',        'Cosmetics, skincare, hair products, and fragrances.',        'Beauty & Cosmetics', '{"beauty","cosmetics","skincare","perfume","hair"}',            '+250788123012', '+250788123012', true, 'verified', NOW()),
  (gen_random_uuid(), :'TL1D', :'UL1D', 'The Book Cafe',      'Coffee, tea, pastries, and books in a relaxed setting.',     'Food & Beverages',   '{"coffee","cafe","books","pastries","tea"}',                   '+250788123013', '+250788123013', true, 'verified', NOW()),
  (gen_random_uuid(), :'TL1E', :'UL1E', 'Samsung Experience', 'Samsung phones, tablets, TVs, and accessories.',             'Electronics',        '{"samsung","phones","tablets","electronics"}',                 '+250788123014', '+250788123014', true, 'verified', NOW()),
  (gen_random_uuid(), :'TL2A', :'UL2A', 'Cinemax Cinema',     'Latest movies in comfortable modern screening rooms.',       'Entertainment',      '{"cinema","movies","entertainment","films"}',                  '+250788123020', '+250788123020', true, 'verified', NOW()),
  (gen_random_uuid(), :'TL2B', :'UL2B', 'Planet Fitness',     'Modern gym equipment, fitness classes, and trainers.',      'Sports & Fitness',   '{"gym","fitness","workout","exercise"}',                       '+250788123021', '+250788123021', true, 'verified', NOW()),
  (gen_random_uuid(), :'TL2C', :'UL2C', 'Jollof House',       'West African and Rwandan cuisine in a vibrant setting.',    'Food & Beverages',   '{"jollof","african food","restaurant","rwandan"}',             '+250788123022', '+250788123022', true, 'verified', NOW());

-- ─── Amenities & nav nodes (ground floor) ─────────────────────────────────────
INSERT INTO nav_nodes (id, building_id, floor_id, type, label, accessible, geometry) VALUES
  (:'NN_ENT',                                             :'BLD', :'FL_G', 'entrance',        'Main Entrance',    true, ST_GeomFromText('POINT(30.059888 -1.944714)', 4326)),
  ('d0000000-0000-0000-0000-000000000002', :'BLD', :'FL_G', 'elevator',        'Central Elevator', true, ST_GeomFromText('POINT(30.059888 -1.944218)', 4326)),
  ('d0000000-0000-0000-0000-000000000003', :'BLD', :'FL_G', 'restroom_male',   'Men''s Restroom',  true, ST_GeomFromText('POINT(30.060230 -1.943993)', 4326)),
  ('d0000000-0000-0000-0000-000000000004', :'BLD', :'FL_G', 'restroom_female', 'Women''s Restroom',true, ST_GeomFromText('POINT(30.060311 -1.943993)', 4326)),
  ('d0000000-0000-0000-0000-000000000005', :'BLD', :'FL_G', 'atm',             'KCB ATM',          true, ST_GeomFromText('POINT(30.060266 -1.944560)', 4326)),
  ('d0000000-0000-0000-0000-000000000006', :'BLD', :'FL_G', 'info_desk',       'Information Desk', true, ST_GeomFromText('POINT(30.059888 -1.944651)', 4326));

INSERT INTO amenities (id, building_id, floor_id, type, label, nav_node_id, is_active)
SELECT gen_random_uuid(), building_id, floor_id, type::amenity_type, label, id, 'true'
FROM nav_nodes WHERE building_id = :'BLD' AND floor_id = :'FL_G';

-- Level 1 & 2 get same amenity layout (copy nodes)
INSERT INTO nav_nodes (id, building_id, floor_id, type, label, accessible, geometry)
SELECT gen_random_uuid(), :'BLD', :'FL_L1', type, label, accessible, geometry
FROM nav_nodes WHERE building_id = :'BLD' AND floor_id = :'FL_G';

INSERT INTO amenities (id, building_id, floor_id, type, label, nav_node_id, is_active)
SELECT gen_random_uuid(), :'BLD', n.floor_id, n.type::amenity_type, n.label, n.id, 'true'
FROM nav_nodes n WHERE n.building_id = :'BLD' AND n.floor_id = :'FL_L1';

INSERT INTO nav_nodes (id, building_id, floor_id, type, label, accessible, geometry)
SELECT gen_random_uuid(), :'BLD', :'FL_L2', type, label, accessible, geometry
FROM nav_nodes WHERE building_id = :'BLD' AND floor_id = :'FL_G';

INSERT INTO amenities (id, building_id, floor_id, type, label, nav_node_id, is_active)
SELECT gen_random_uuid(), :'BLD', n.floor_id, n.type::amenity_type, n.label, n.id, 'true'
FROM nav_nodes n WHERE n.building_id = :'BLD' AND n.floor_id = :'FL_L2';

-- ─── QR Anchor ─────────────────────────────────────────────────────────────────
INSERT INTO qr_anchors (id, building_id, floor_id, nav_node_id, label, short_code, qr_url)
VALUES (gen_random_uuid(), :'BLD', :'FL_G', :'NN_ENT',
        'Main Entrance', 'CHIC-MAIN', 'http://localhost:3000/q/CHIC-MAIN');

COMMIT;
SELECT 'CHIC Kigali seeded. Open: http://localhost:3000/map/chic-kigali' AS result;
