#!/usr/bin/env node
/**
 * Seed one demo user per role for handing out demo credentials.
 *
 * - Idempotent: ON CONFLICT (email) updates the password hash + role so
 *   you can rerun any time to reset creds.
 * - Auto-links org-scoped roles (org_owner, building_manager, accounts,
 *   security, maintenance) to the org created by seed.js.
 * - Auto-links tenant roles (tenant_admin, tenant_staff) to the first
 *   tenant in the DB, if one exists.
 *
 * Usage:
 *   pnpm seed:users                                          (.env)
 *   DATABASE_URL=... node scripts/seed-users.js              (override)
 */
const path = require('path');
const { createRequire } = require('module');

const apiRequire = createRequire(path.resolve(__dirname, '..', 'apps', 'api', 'package.json'));
const { Client } = apiRequire('pg');
const bcrypt     = apiRequire('bcryptjs');
const { config: loadEnv } = apiRequire('dotenv');

loadEnv({ path: path.resolve(__dirname, '..', '.env') });

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://ndizeye@localhost:5434/mapplus';
const NEEDS_SSL = /neon\.tech|sslmode=require/.test(DB_URL);
const PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

const USERS = [
  // Platform tier
  { email: 'super@demo.mallguide.rw',       role: 'super_admin',        firstName: 'Super',       lastName: 'Admin'   },

  // Mall management tier (org-scoped)
  { email: 'owner@demo.mallguide.rw',       role: 'org_owner',          firstName: 'Mall',        lastName: 'Owner',   linkOrg: true },
  { email: 'manager@demo.mallguide.rw',     role: 'building_manager',   firstName: 'Building',    lastName: 'Manager', linkOrg: true },
  { email: 'accounts@demo.mallguide.rw',    role: 'accounts',           firstName: 'Accounts',    lastName: 'Team',    linkOrg: true },
  { email: 'security@demo.mallguide.rw',    role: 'security',           firstName: 'Security',    lastName: 'Team',    linkOrg: true },
  { email: 'maintenance@demo.mallguide.rw', role: 'maintenance',        firstName: 'Maintenance', lastName: 'Team',    linkOrg: true },

  // Tenant tier (tenant-scoped — linked to first tenant if any)
  { email: 'tenant@demo.mallguide.rw',      role: 'tenant_admin',       firstName: 'Tenant',      lastName: 'Owner',   linkTenant: true },
  { email: 'staff@demo.mallguide.rw',       role: 'tenant_staff',       firstName: 'Tenant',      lastName: 'Staff',   linkTenant: true },

  // Delivery tier
  { email: 'delivery@demo.mallguide.rw',    role: 'delivery_personnel', firstName: 'Delivery',    lastName: 'Person' },
];

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: NEEDS_SSL ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  // Find the first org + first tenant so we can link role-appropriate users.
  const { rows: [org] } = await client.query('SELECT id, name FROM organizations ORDER BY created_at LIMIT 1');
  if (!org) {
    console.error('No organizations in DB. Run `pnpm seed` first.');
    process.exit(1);
  }
  const { rows: [tenant] } = await client.query('SELECT id, trade_name FROM tenants ORDER BY created_at LIMIT 1');

  const hash = bcrypt.hashSync(PASSWORD, 10);

  console.log(`Seeding ${USERS.length} demo users into ${maskUrl(DB_URL)}`);
  console.log(`Linking org-scoped roles to: ${org.name}`);
  if (tenant) console.log(`Linking tenant-scoped roles to: ${tenant.trade_name}`);
  else        console.log('No tenant yet — tenant roles will land unlinked (assign via /mall/tenants).');
  console.log();

  for (const u of USERS) {
    const orgId    = u.linkOrg    ? org.id    : null;
    const tenantId = u.linkTenant ? (tenant ? tenant.id : null) : null;

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, org_id, tenant_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role          = EXCLUDED.role,
        org_id        = EXCLUDED.org_id,
        tenant_id     = EXCLUDED.tenant_id,
        is_active     = true,
        updated_at    = NOW();
    `, [u.email, hash, u.firstName, u.lastName, u.role, orgId, tenantId]);

    const tag = orgId ? ' [org]' : tenantId ? ' [tenant]' : '';
    console.log(`  ✓ ${u.email.padEnd(35)} ${u.role}${tag}`);
  }

  await client.end();

  console.log('\n📋 Demo credentials (share these for demos):\n');
  console.log(`  Password (all): ${PASSWORD}\n`);
  console.log('  super_admin         super@demo.mallguide.rw         → lands at /platform');
  console.log('  org_owner           owner@demo.mallguide.rw         → lands at /mall');
  console.log('  building_manager    manager@demo.mallguide.rw       → /mall');
  console.log('  accounts            accounts@demo.mallguide.rw      → /mall (rent / utilities / advances)');
  console.log('  security            security@demo.mallguide.rw      → /mall/incidents');
  console.log('  maintenance         maintenance@demo.mallguide.rw   → /mall/maintenance');
  console.log('  tenant_admin        tenant@demo.mallguide.rw        → /tenant');
  console.log('  tenant_staff        staff@demo.mallguide.rw         → /tenant');
  console.log('  delivery_personnel  delivery@demo.mallguide.rw      → /delivery (UI not built yet)');
  console.log();
}

function maskUrl(url) {
  return url.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1•••$2');
}

main().catch((err) => { console.error(err); process.exit(1); });
