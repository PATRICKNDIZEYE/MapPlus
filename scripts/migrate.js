#!/usr/bin/env node
/**
 * Apply every drizzle/000N_*.sql in order against $DATABASE_URL.
 * Idempotent — all the migrations use IF NOT EXISTS / CREATE OR REPLACE
 * patterns, so re-running is safe.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/migrate.js
 *   # or, load from .env:
 *   node scripts/migrate.js
 */
const { Client } = require('pg');
const { readFileSync, readdirSync } = require('fs');
const { join, resolve } = require('path');
const { config } = require('dotenv');

config({ path: resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const MIGRATIONS_DIR = resolve(__dirname, '..', 'apps', 'api', 'drizzle');

async function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();

  if (!files.length) {
    console.log('No migrations found.');
    return;
  }

  // Neon connections require SSL.
  const needsSsl = /neon\.tech|sslmode=require/.test(DATABASE_URL);
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  console.log(`Applying ${files.length} migration${files.length === 1 ? '' : 's'} against ${maskUrl(DATABASE_URL)}\n`);

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    process.stdout.write(`  ▸ ${file} … `);
    try {
      await client.query(sql);
      console.log('ok');
    } catch (err) {
      // Migration 0008 needs pgvector — report but keep going.
      if (file.includes('pgvector') && /extension "vector" is not available/.test(err.message)) {
        console.log('skipped (pgvector not installed on this Postgres)');
        continue;
      }
      console.log('FAILED');
      console.error(`    ${err.message}`);
      process.exit(1);
    }
  }

  await client.end();
  console.log('\n✓ All migrations applied.');
}

function maskUrl(url) {
  return url.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1•••$2');
}

main().catch((err) => { console.error(err); process.exit(1); });
