#!/usr/bin/env node
/**
 * Transfer the polished floor-plan / nav-graph / shop directory from a
 * source Postgres DB to the production (Neon) DB.
 *
 * Use case: you've spent time hand-curating unit polygons, navigation
 * nodes + edges, QR anchors, and amenities on a local DB. Promote that
 * work to production without re-doing it.
 *
 * Tables transferred (full org → tenant → unit → shop → map chain):
 *   organizations, tenants, buildings, floors, units, shop_profiles,
 *   products, lease_contracts, nav_nodes, nav_edges, qr_anchors,
 *   amenities, map_versions
 *
 * Tables NOT touched on the target: users, analytics_events, orders,
 * piggybox_*, search_clicks, etc. Demo users will have their org_id /
 * tenant_id columns SET NULL via FK cascade — re-run `pnpm seed:users`
 * after the transfer to relink them to the freshly imported org+tenant.
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgresql://ndizeye@localhost:5434/mapplus" pnpm transfer-map
 *   SOURCE_DATABASE_URL="..." pnpm transfer-map -- --yes      # skip confirmation
 *
 * The destination is read from DATABASE_URL (your Neon URL in .env).
 */
const path = require('path');
const readline = require('readline');
const { createRequire } = require('module');

const apiRequire = createRequire(path.resolve(__dirname, '..', 'apps', 'api', 'package.json'));
const { Client } = apiRequire('pg');
const { config: loadEnv } = apiRequire('dotenv');

loadEnv({ path: path.resolve(__dirname, '..', '.env') });

const SOURCE_URL = process.env.SOURCE_DATABASE_URL ?? 'postgresql://ndizeye@localhost:5434/mapplus';
const TARGET_URL = process.env.DATABASE_URL;
if (!TARGET_URL) {
  console.error('DATABASE_URL is required (target Neon URL — usually loaded from .env).');
  process.exit(1);
}
if (SOURCE_URL === TARGET_URL) {
  console.error('SOURCE_DATABASE_URL and DATABASE_URL are the same. Refusing to operate on a single DB.');
  process.exit(1);
}

const SKIP_CONFIRM = process.argv.includes('--yes');

// Order matters — parent tables first for INSERT, reverse for TRUNCATE.
const TABLES = [
  'organizations',
  'tenants',
  'buildings',
  'floors',
  'units',
  'shop_profiles',
  'products',
  'lease_contracts',
  'nav_nodes',
  'nav_edges',
  'qr_anchors',
  'amenities',
  'map_versions',
];

function makeClient(url) {
  const needsSsl = /neon\.tech|sslmode=require/.test(url);
  return new Client({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

function maskUrl(url) {
  return url.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1•••$2');
}

async function getColumns(client, table) {
  const r = await client.query(
    `SELECT column_name, udt_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  );
  return r.rows.map((row) => ({ name: row.column_name, type: row.udt_name }));
}

async function countRows(client, table) {
  const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return r.rows[0].n;
}

async function transferTable(source, target, table) {
  const cols = await getColumns(source, table);
  if (cols.length === 0) {
    console.log(`  ▸ ${table.padEnd(22)} (table missing on source, skipping)`);
    return;
  }

  // SELECT — wrap geometry columns in ST_AsEWKT so we get a portable WKT string.
  const selectCols = cols.map((c) => c.type === 'geometry' ? `ST_AsEWKT("${c.name}") AS "${c.name}"` : `"${c.name}"`).join(', ');
  const { rows } = await source.query(`SELECT ${selectCols} FROM ${table}`);

  if (rows.length === 0) {
    console.log(`  ▸ ${table.padEnd(22)} (empty on source)`);
    return;
  }

  // INSERT — wrap geometry placeholders in ST_GeomFromEWKT.
  const placeholders = cols.map((c, i) => c.type === 'geometry' ? `ST_GeomFromEWKT($${i + 1})` : `$${i + 1}`).join(', ');
  const colNames = cols.map((c) => `"${c.name}"`).join(', ');
  const insertSql = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders})`;

  let inserted = 0;
  for (const row of rows) {
    const values = cols.map((c) => row[c.name] ?? null);
    await target.query(insertSql, values);
    inserted++;
  }

  console.log(`  ▸ ${table.padEnd(22)} ${inserted} row${inserted === 1 ? '' : 's'} transferred`);
}

async function confirm(question) {
  if (SKIP_CONFIRM) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function main() {
  console.log(`Source: ${maskUrl(SOURCE_URL)}`);
  console.log(`Target: ${maskUrl(TARGET_URL)}\n`);

  const source = makeClient(SOURCE_URL);
  const target = makeClient(TARGET_URL);
  await source.connect().catch((err) => {
    console.error(`Could not connect to source: ${err.message}`);
    console.error('Set SOURCE_DATABASE_URL to your local DB connection string.');
    process.exit(1);
  });
  await target.connect();

  // Preview: row counts on each side.
  console.log('Row counts (source → target):');
  for (const table of TABLES) {
    try {
      const s = await countRows(source, table);
      const t = await countRows(target, table);
      console.log(`  ${table.padEnd(22)} ${String(s).padStart(5)} → ${String(t).padStart(5)}`);
    } catch (err) {
      console.log(`  ${table.padEnd(22)} (source query failed: ${err.message})`);
    }
  }

  console.log();
  const ok = await confirm(
    `This will TRUNCATE the above tables on the target and replace with source data. Continue?`,
  );
  if (!ok) {
    console.log('Aborted.');
    await source.end();
    await target.end();
    return;
  }

  // TRUNCATE in reverse dependency order, CASCADE to clear any descendant
  // rows on the target (orders, search_clicks, etc. will lose their FKs).
  const truncateList = [...TABLES].reverse().map((t) => `"${t}"`).join(', ');
  console.log(`\nTruncating target tables…`);
  await target.query(`TRUNCATE ${truncateList} CASCADE`);
  console.log('  ✓ Target cleared\n');

  console.log('Transferring data:');
  for (const table of TABLES) {
    await transferTable(source, target, table);
  }

  await source.end();
  await target.end();

  console.log('\n✓ Transfer complete.');
  console.log('\nNext step: run `pnpm seed:users` to relink demo users to the new org/tenant.');
}

main().catch((err) => {
  console.error('\nTransfer failed:', err.message);
  process.exit(1);
});
