#!/usr/bin/env node
/**
 * Photo seeder — populates shop_profiles.cover_photo_url
 *
 * Strategy (in order):
 *   1. Curated Unsplash photo ID  — specific, handpicked, professional
 *   2. Google Places API          — real local photos (if GOOGLE_PLACES_API_KEY is set)
 *   3. Unsplash category search   — last resort fallback
 *
 * Run: node scripts/seed-photos.js
 * Re-seed: node scripts/seed-photos.js --force
 */

const path         = require('path');
const https        = require('https');
const http         = require('http');
const fs           = require('fs');
const { randomUUID } = require('crypto');
const { Client }   = require(path.resolve(__dirname, '../node_modules/.pnpm/pg@8.21.0/node_modules/pg'));
const { config: loadEnv } = require(path.resolve(__dirname, '../node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv'));

loadEnv({ path: path.resolve(__dirname, '../.env') });

const DB_URL         = process.env.DATABASE_URL ?? 'postgresql://ndizeye@localhost:5434/mapplus';
const GOOGLE_KEY     = process.env.GOOGLE_PLACES_API_KEY ?? '';
const UPLOADS_DIR    = path.resolve(__dirname, '../apps/api/uploads');
const API_BASE       = 'http://localhost:3001';
const FORCE          = process.argv.includes('--force');

// ── Curated Unsplash photo IDs ────────────────────────────────────────────────
// Each ID points to a specific professional photo that accurately represents
// the business type. Use: https://images.unsplash.com/photo-{id}?w=900&q=85&fit=crop
//
// Browse replacements at: https://unsplash.com/search/photos/{term}

const CURATED = {
  // MTN MoMo Corner — mobile money agent counter with phone
  'MTN MoMo Corner':    'J1nBxYiRRsc',   // mobile payment / fintech

  // Simba Sports — sportwear retail store
  'Simba Sports':       '1FI2H8gGCkQ',   // athletic shoe store interior

  // Royal Pharmacy — bright pharmacy interior with shelves
  'Royal Pharmacy':     'OXGhu60NwxU',   // pharmacy counter + shelves

  // KFC CHIC — fried chicken, food court interior
  'KFC CHIC':           'rvpMYBJkdlQ',   // fried chicken platter

  // Airtel Money — mobile money
  'Airtel Money':       'npxXWgQ33ZQ',   // mobile banking

  // iStore Rwanda — Apple retail-style store with devices
  'iStore Rwanda':      '9uX5cX1l3bw',   // Apple-style electronics retail

  // Nakumatt Fashion — clothing retail floor
  'Nakumatt Fashion':   'bzdhc5b3Bxs',   // fashion clothing store interior

  // Dove Beauty — cosmetics counter
  'Dove Beauty':        'omivEcTJRKw',   // cosmetics / beauty products shelf

  // The Book Cafe — cozy cafe with books
  'The Book Cafe':      'TD4SCZkMxvo',   // cafe interior with warm lighting

  // Samsung Experience — Samsung retail display wall
  'Samsung Experience': 'yRpe8RcIBT4',   // electronics / phone display

  // Cinemax Cinema — cinema screening hall
  'Cinemax Cinema':     'pGcqw1ARGyg',   // cinema seats & screen

  // Planet Fitness — modern gym floor
  'Planet Fitness':     'jqEB4OsJCeI',   // gym equipment floor

  // Jollof House — African restaurant interior
  'Jollof House':       '26T6EAsQCkc',   // African restaurant / food
};

// Unsplash CDN URL for a given photo ID
function unsplashUrl(id) {
  return `https://images.unsplash.com/photo-${id}?w=900&h=500&fit=crop&q=85&auto=format`;
}

// ── Shops list ────────────────────────────────────────────────────────────────
const SHOPS = [
  { name: 'MTN MoMo Corner',   query: 'MTN Mobile Money Kigali Rwanda'     },
  { name: 'Simba Sports',       query: 'Simba Sports store Kigali'          },
  { name: 'Royal Pharmacy',     query: 'Royal Pharmacy Kigali'              },
  { name: 'KFC CHIC',           query: 'KFC Kigali CHIC Mall'               },
  { name: 'Airtel Money',       query: 'Airtel Money Kigali Rwanda'         },
  { name: 'iStore Rwanda',      query: 'iStore Rwanda Apple Kigali'         },
  { name: 'Nakumatt Fashion',   query: 'Nakumatt Fashion Kigali Rwanda'     },
  { name: 'Dove Beauty',        query: 'Dove Beauty Cosmetics Kigali'       },
  { name: 'The Book Cafe',      query: 'The Book Cafe Kigali Rwanda'        },
  { name: 'Samsung Experience', query: 'Samsung Experience store Kigali'   },
  { name: 'Cinemax Cinema',     query: 'Cinemax Cinema Kigali Rwanda'       },
  { name: 'Planet Fitness',     query: 'Planet Fitness gym Kigali'          },
  { name: 'Jollof House',       query: 'Jollof House restaurant Kigali'     },
];

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function get(url, followRedirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'MapPlus-Seeder/1.0' } }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && followRedirects > 0) {
        return resolve(get(res.headers.location, followRedirects - 1));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end',  () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

async function getJson(url) {
  const res = await get(url);
  return JSON.parse(res.body.toString());
}

// ── Download image and save locally ──────────────────────────────────────────

async function downloadAndSave(url, prefix = 'cover') {
  const res = await get(url);
  if (res.status < 200 || res.status >= 400) throw new Error(`HTTP ${res.status}`);
  const ext      = (res.headers['content-type'] ?? 'image/jpeg').includes('png') ? 'png' : 'jpg';
  const filename = `${prefix}-${randomUUID()}.${ext}`;
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), res.body);
  return `${API_BASE}/uploads/${filename}`;
}

// ── Google Places ─────────────────────────────────────────────────────────────

async function getGooglePlacesPhoto(query) {
  if (!GOOGLE_KEY) return null;
  try {
    const search = await getJson(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`
    );
    if (search.status !== 'OK' || !search.results?.length) return null;

    const placeId = search.results[0].place_id;
    const detail  = await getJson(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_KEY}`
    );
    const ref = detail.result?.photos?.[0]?.photo_reference;
    if (!ref) return null;

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=900&photoreference=${ref}&key=${GOOGLE_KEY}`;
    return await downloadAndSave(photoUrl, 'cover-google');
  } catch (err) {
    console.warn(`    [Google] ${err.message}`);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedPhotos() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log(`\n📸  Photo seeder — curated Unsplash${GOOGLE_KEY ? ' + Google Places' : ''}\n`);

  let counts = { curated: 0, google: 0, skipped: 0 };

  for (const shop of SHOPS) {
    const { rows } = await client.query(
      `SELECT id, cover_photo_url FROM shop_profiles WHERE public_name = $1 LIMIT 1`,
      [shop.name],
    );
    if (!rows.length) { console.log(`  – ${shop.name}: not in DB`); continue; }

    const row = rows[0];
    if (row.cover_photo_url && !FORCE) {
      console.log(`  ✓ ${shop.name}: already has photo (use --force to replace)`);
      counts.skipped++;
      continue;
    }

    process.stdout.write(`  → ${shop.name}... `);

    let photoUrl = null;
    let source   = '';

    // 1. Curated Unsplash (best quality, always works)
    const curatedId = CURATED[shop.name];
    if (curatedId) {
      try {
        photoUrl = await downloadAndSave(unsplashUrl(curatedId), 'cover-curated');
        source   = 'curated Unsplash';
        counts.curated++;
      } catch (err) {
        console.warn(`\n    Curated download failed: ${err.message}`);
      }
    }

    // 2. Google Places fallback
    if (!photoUrl && GOOGLE_KEY) {
      photoUrl = await getGooglePlacesPhoto(shop.query);
      if (photoUrl) { source = 'Google Places'; counts.google++; }
    }

    // 3. Final fallback — Unsplash category search URL (not downloaded, served from CDN)
    if (!photoUrl) {
      const terms = {
        'Banking & Finance': 'mobile-banking,fintech',
        'Sports & Fitness':  'gym,fitness,athletic',
        'Health & Pharmacy': 'pharmacy,medicine',
        'Food & Beverages':  'restaurant,food,cafe',
        'Electronics':       'technology,electronics',
        'Fashion & Apparel': 'fashion,clothing',
        'Beauty & Cosmetics':'beauty,cosmetics',
        'Entertainment':     'cinema,movies',
      };
      const t = terms[shop.category] ?? 'retail,shop';
      photoUrl = `https://source.unsplash.com/900x500/?${t}`;
      source   = 'Unsplash search';
    }

    await client.query(
      `UPDATE shop_profiles SET cover_photo_url = $1, updated_at = NOW() WHERE id = $2`,
      [photoUrl, row.id],
    );

    console.log(`✓ (${source})`);
  }

  await client.end();

  console.log(`
✅  Done
   Curated Unsplash: ${counts.curated}
   Google Places:    ${counts.google}
   Skipped:          ${counts.skipped}

→ http://localhost:3000/map/chic-kigali
`);
}

seedPhotos().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
