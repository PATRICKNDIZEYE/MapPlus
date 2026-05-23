#!/usr/bin/env node
/**
 * One-off backfill: generate vector embeddings for every shop_profile and
 * product, then write them to the new pgvector columns added by migration
 * 0008_pgvector_embeddings.sql.
 *
 * Idempotent — only touches rows where `search_embedding IS NULL`. Re-run
 * safely any time. First run downloads ~127 MB of model weights to the
 * local Transformers.js cache.
 *
 * Usage:
 *   node scripts/seed-embeddings.js
 *   node scripts/seed-embeddings.js --force   # recompute for ALL rows
 */

const { Client } = require('pg');
const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ndizeye@localhost:5434/mapplus';
const BATCH_SIZE = 32;
const force = process.argv.includes('--force');

function pgvec(arr) { return `[${arr.join(',')}]`; }

function shopText(row) {
  return [
    row.public_name,
    row.category,
    row.subcategory,
    row.description,
    Array.isArray(row.tags) ? row.tags.join(' ') : null,
  ].filter(Boolean).join(' · ');
}

function productText(row) {
  return [
    row.name,
    row.category,
    row.description,
  ].filter(Boolean).join(' · ');
}

async function main() {
  console.log('Loading embedding model (first run downloads ~127 MB)…');
  // Use dynamic import so this CommonJS file can pull in the ESM Transformers.js package.
  const { pipeline } = await import('@huggingface/transformers');
  const started = Date.now();
  const embed = await pipeline(
    'feature-extraction',
    'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  );
  console.log(`Model ready in ${Date.now() - started}ms\n`);

  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  try {
    await embedTable({
      db, embed,
      table: 'shop_profiles',
      label: 'shop',
      selectCols: 'id, public_name, category, subcategory, description, tags',
      toText: shopText,
    });
    await embedTable({
      db, embed,
      table: 'products',
      label: 'product',
      selectCols: 'id, name, category, description',
      toText: productText,
    });

    // Refresh ANN index statistics after the bulk write.
    console.log('\nReindexing ivfflat indexes…');
    await db.query('REINDEX INDEX shop_profiles_embedding_idx');
    await db.query('REINDEX INDEX products_embedding_idx');
    console.log('Done.');
  } finally {
    await db.end();
  }
}

async function embedTable({ db, embed, table, label, selectCols, toText }) {
  const where = force ? '' : 'WHERE search_embedding IS NULL';
  const rows = (await db.query(`SELECT ${selectCols} FROM ${table} ${where}`)).rows;
  if (rows.length === 0) {
    console.log(`${label}s: nothing to embed`);
    return;
  }

  console.log(`Embedding ${rows.length} ${label}${rows.length === 1 ? '' : 's'}…`);

  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map(toText);

    const output = await embed(texts, { pooling: 'mean', normalize: true });
    const dim = output.dims[output.dims.length - 1];
    const flat = Array.from(output.data);

    for (let j = 0; j < batch.length; j++) {
      const vec = flat.slice(j * dim, (j + 1) * dim);
      await db.query(
        `UPDATE ${table} SET search_embedding = $1::vector WHERE id = $2`,
        [pgvec(vec), batch[j].id],
      );
    }

    done += batch.length;
    process.stdout.write(`\r  ${done} / ${rows.length}`);
  }
  process.stdout.write('\n');
}

main().catch((err) => {
  console.error('\nSeeding failed:', err);
  process.exit(1);
});
