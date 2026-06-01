#!/usr/bin/env node
/**
 * Pad the DB with realistic operational data so the mall-management
 * dashboards (rent roll, RentAvance approval, utilities, incidents,
 * maintenance) look populated when demoing.
 *
 * Idempotent — each table checks for existing rows tagged with a
 * `[demo]` marker before inserting.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm seed:demo-data
 */
const path = require('path');
const { createRequire } = require('module');

const apiRequire = createRequire(path.resolve(__dirname, '..', 'apps', 'api', 'package.json'));
const { Client } = apiRequire('pg');
const { config: loadEnv } = apiRequire('dotenv');

loadEnv({ path: path.resolve(__dirname, '..', '.env') });

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://ndizeye@localhost:5432/mapplus';
const NEEDS_SSL = /neon\.tech|sslmode=require/.test(DB_URL);

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function r(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function pad(n, w) { return String(n).padStart(w, '0'); }
function isoDate(d) { return d.toISOString().slice(0, 10); }

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: NEEDS_SSL ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  // Anchor data — we need a building + some tenants + the demo tenant's contract.
  const { rows: [bldRow] } = await client.query(
    `SELECT id FROM buildings ORDER BY created_at LIMIT 1`,
  );
  if (!bldRow) { console.error('No building found — run pnpm build-mall first.'); process.exit(1); }
  const BUILDING_ID = bldRow.id;

  const { rows: occupiedTenants } = await client.query(`
    SELECT t.id AS tenant_id, t.trade_name, t.monthly_rent, t.currency, t.org_id,
           u.id AS unit_id, sp.id AS shop_id
      FROM tenants t
      JOIN units u ON u.tenant_id = t.id
      JOIN shop_profiles sp ON sp.tenant_id = t.id
     WHERE u.building_id = $1
     LIMIT 60
  `, [BUILDING_ID]);
  console.log(`Found ${occupiedTenants.length} occupied tenants to pad.`);

  // ────────────────────────────────────────────────────────────────────────
  // 1. LEASE CONTRACTS for the first 40 tenants (so rent_payments can ref them)
  // ────────────────────────────────────────────────────────────────────────
  let contractsCreated = 0;
  const tenantsWithContracts = [];
  for (const t of occupiedTenants.slice(0, 40)) {
    const rent = Number(t.monthly_rent) || r(150_000, 800_000);
    const contractNo = `CHIC-${pad(contractsCreated + 100, 4)}-${t.tenant_id.slice(0, 6)}`;
    const { rows } = await client.query(`
      INSERT INTO lease_contracts (
        org_id, tenant_id, unit_id, contract_number, monthly_rent, currency,
        lease_start, lease_end, rent_due_day, terms,
        owner_signed_at, tenant_signed_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6,
               CURRENT_DATE - INTERVAL '8 months', CURRENT_DATE + INTERVAL '16 months', 1,
               '{}'::jsonb, NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months', 'active')
      ON CONFLICT (contract_number) DO NOTHING
      RETURNING id
    `, [t.org_id, t.tenant_id, t.unit_id, contractNo, rent, t.currency || 'RWF']);
    // Update tenant's monthly_rent so dashboards align
    if (!t.monthly_rent) {
      await client.query(`UPDATE tenants SET monthly_rent = $1, currency = 'RWF' WHERE id = $2`, [rent, t.tenant_id]);
    }
    const contractId = rows[0]?.id ?? (await client.query(
      `SELECT id FROM lease_contracts WHERE contract_number = $1`, [contractNo],
    )).rows[0]?.id;
    if (contractId) { tenantsWithContracts.push({ ...t, contractId, rent }); contractsCreated++; }
  }
  console.log(`✓ lease_contracts: ${tenantsWithContracts.length} active`);

  // ────────────────────────────────────────────────────────────────────────
  // 2. RENT PAYMENTS — 3 months of history per contract, mixed statuses
  // ────────────────────────────────────────────────────────────────────────
  let rentRows = 0;
  for (const t of tenantsWithContracts) {
    for (let monthsAgo = 3; monthsAgo >= 0; monthsAgo--) {
      const periodStart = new Date(); periodStart.setMonth(periodStart.getMonth() - monthsAgo, 1);
      const periodEnd = new Date(periodStart); periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
      const dueDate   = new Date(periodStart); dueDate.setDate(5);

      // Realistic status distribution:
      //  - past months mostly paid (with a few overdue)
      //  - current month half paid / half pending
      let status = 'paid';
      let amountPaid = t.rent;
      let method = pick(['mtn_momo', 'bank_transfer', 'piggybox_forward', 'cash']);
      if (monthsAgo === 0) {
        const roll = Math.random();
        if (roll < 0.5)      { status = 'pending'; amountPaid = 0; method = null; }
        else if (roll < 0.7) { status = 'partial'; amountPaid = Math.floor(t.rent * 0.6); method = 'piggybox_forward'; }
      } else if (monthsAgo === 1 && Math.random() < 0.15) {
        status = 'overdue'; amountPaid = Math.floor(t.rent * 0.4); method = 'cash';
      }

      try {
        await client.query(`
          INSERT INTO rent_payments (
            tenant_id, contract_id, period_start, period_end, due_date,
            amount_due, amount_paid, currency, method, status, paid_at, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'RWF', $8::rent_payment_method, $9::rent_payment_status, $10, '[demo]')
        `, [
          t.tenant_id, t.contractId, isoDate(periodStart), isoDate(periodEnd), isoDate(dueDate),
          t.rent, amountPaid, method,
          status,
          status === 'paid' || status === 'partial' ? new Date(dueDate.getTime() + r(1, 5) * 86400_000).toISOString() : null,
        ]);
        rentRows++;
      } catch (err) { /* duplicates from rerun — skip */ }
    }
  }
  console.log(`✓ rent_payments: ${rentRows} rows`);

  // ────────────────────────────────────────────────────────────────────────
  // 3. RENT-AVANCE ADVANCES — mix of statuses to populate the approval queue
  // ────────────────────────────────────────────────────────────────────────
  let advancesCreated = 0;
  const advanceStatuses = ['requested', 'requested', 'requested', 'approved', 'approved', 'disbursed', 'repaying', 'repaid', 'rejected'];
  for (let i = 0; i < Math.min(9, tenantsWithContracts.length); i++) {
    const t = tenantsWithContracts[i];
    const principal = Math.floor(t.rent * (0.20 + Math.random() * 0.20)); // up to 40%
    const interest = principal * 0.03;
    const total = principal + interest;
    const status = advanceStatuses[i];
    const approvedAt  = ['approved','disbursed','repaying','repaid'].includes(status) ? `NOW() - INTERVAL '${r(1,20)} days'` : 'NULL';
    const disbursedAt = ['disbursed','repaying','repaid'].includes(status) ? `NOW() - INTERVAL '${r(1,18)} days'` : 'NULL';
    const repaidAt    = status === 'repaid' ? `NOW() - INTERVAL '${r(1,5)} days'` : 'NULL';
    const dueBy       = ['disbursed','repaying','repaid','defaulted'].includes(status)
      ? `(NOW() + INTERVAL '${r(5,28)} days')::date` : 'NULL';

    await client.query(`
      INSERT INTO rentavance_advances (
        tenant_id, contract_id, amount_advanced, interest_rate, interest_amount,
        total_due, currency, status, approved_at, disbursed_at, repaid_at, due_by, collateral_notes
      ) VALUES ($1, $2, $3, 0.0300, $4, $5, 'RWF', $6::rentavance_status,
        ${approvedAt}, ${disbursedAt}, ${repaidAt}, ${dueBy}, $7)
    `, [t.tenant_id, t.contractId, principal, interest, total, status,
        `[demo] Shop stock value est. ${(principal*3).toLocaleString('en-RW')} RWF`,
       ]);
    advancesCreated++;
  }
  console.log(`✓ rentavance_advances: ${advancesCreated} rows across statuses`);

  // ────────────────────────────────────────────────────────────────────────
  // 4. INCIDENTS — across types so the security/maintenance queues look real
  // ────────────────────────────────────────────────────────────────────────
  const incidents = [
    { type: 'security',    title: 'Suspicious activity near elevator',  description: 'Group of three loitering by L2 elevator since 14:00. Security on scene.', status: 'in_progress', location: 'L2 main elevator' },
    { type: 'security',    title: 'Lost child reported',                description: 'Mother reports 5-year-old missing near Hong Kong Mart. Announcement made.', status: 'resolved', location: 'Ground floor concourse' },
    { type: 'maintenance', title: 'Leaking AC drain in food court',     description: 'Water pooling under HVAC unit above Floor L1 food court table 14.', status: 'open', location: 'L1 food court' },
    { type: 'maintenance', title: 'Broken escalator handrail',          description: 'Right-side handrail of L1→L2 escalator has detached at base.', status: 'assigned', location: 'L1→L2 escalator (north)' },
    { type: 'cleaning',    title: 'Spill on G floor near Beauty zone',  description: 'Cleaning crew dispatched. Hazard cones in place.', status: 'in_progress', location: 'G floor zone B' },
    { type: 'cleaning',    title: 'Restroom restock request',           description: 'L3 male restroom needs paper towels + soap dispenser refill.', status: 'open', location: 'L3 restroom (male)' },
    { type: 'safety',      title: 'Blocked emergency exit',             description: 'Cardboard boxes stacked in front of L2 east emergency exit.', status: 'resolved', location: 'L2 east emergency exit' },
    { type: 'maintenance', title: 'Flickering LED in corridor',         description: 'L3 corridor B-row LED panel needs replacement.', status: 'open', location: 'L3 corridor B' },
    { type: 'security',    title: 'Card skimmer alert at ATM',          description: 'Tenant reported anomaly on ATM card reader. Bank notified.', status: 'in_progress', location: 'G floor ATM bank' },
    { type: 'cleaning',    title: 'Trash bin overflow',                 description: 'Three bins on L4 need emptying. Crowd peaked at lunch.', status: 'resolved', location: 'L4 food court' },
    { type: 'maintenance', title: 'Slow water pressure in restroom',    description: 'L1 male restroom — taps trickling. Plumber dispatched.', status: 'in_progress', location: 'L1 restroom (male)' },
    { type: 'other',       title: 'Lost umbrella found',                description: 'Black umbrella found near main entrance, handed to info desk.', status: 'closed', location: 'Main entrance' },
  ];
  // Wipe previous demo incidents so reseeding doesn't pile them up.
  await client.query(`DELETE FROM incidents WHERE description LIKE '%[demo]%' OR description LIKE 'Group of three loitering%'`);
  for (const i of incidents) {
    await client.query(`
      INSERT INTO incidents (building_id, type, status, title, description, location, reported_at, resolved_at, resolution_note)
      VALUES ($1, $2::incident_type, $3::incident_status, $4, $5, $6,
              NOW() - INTERVAL '${r(1, 14)} days',
              $7, $8)
    `, [
      BUILDING_ID, i.type, i.status, i.title, i.description, i.location,
      ['resolved','closed'].includes(i.status) ? new Date(Date.now() - r(1, 5) * 86400_000).toISOString() : null,
      ['resolved','closed'].includes(i.status) ? 'Handled by on-duty team.' : null,
    ]);
  }
  console.log(`✓ incidents: ${incidents.length} rows (mix of types + statuses)`);

  // ────────────────────────────────────────────────────────────────────────
  // 5. UTILITY BILLS — 2 periods × first 25 tenants
  // ────────────────────────────────────────────────────────────────────────
  await client.query(`DELETE FROM utility_bills WHERE notes = '[demo]'`);
  let billsCreated = 0;
  const utilityMix = ['electricity', 'water', 'common_area', 'internet'];
  for (const t of tenantsWithContracts.slice(0, 25)) {
    for (let monthsAgo = 1; monthsAgo >= 0; monthsAgo--) {
      const periodStart = new Date(); periodStart.setMonth(periodStart.getMonth() - monthsAgo, 1);
      const periodEnd = new Date(periodStart); periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
      const dueDate   = new Date(periodStart); dueDate.setDate(15);
      const utility = pick(utilityMix);
      const amount = utility === 'electricity' ? r(40_000, 180_000)
                   : utility === 'water'       ? r(12_000, 40_000)
                   : utility === 'internet'    ? r(30_000, 80_000)
                   : r(20_000, 60_000);
      const status = monthsAgo === 0 ? pick(['draft','sent','sent']) : pick(['paid','paid','overdue']);
      await client.query(`
        INSERT INTO utility_bills (
          building_id, tenant_id, utility_type, status, period_start, period_end,
          amount, currency, due_date, paid_at, notes
        ) VALUES ($1, $2, $3::utility_type, $4::utility_bill_status, $5, $6, $7, 'RWF', $8, $9, '[demo]')
      `, [
        BUILDING_ID, t.tenant_id, utility, status,
        isoDate(periodStart), isoDate(periodEnd), amount, isoDate(dueDate),
        status === 'paid' ? new Date(dueDate.getTime() + r(1, 5) * 86400_000).toISOString() : null,
      ]);
      billsCreated++;
    }
  }
  console.log(`✓ utility_bills: ${billsCreated} rows`);

  // ────────────────────────────────────────────────────────────────────────
  // 6. PIGGYBOX wallet + transactions for the demo tenant
  // ────────────────────────────────────────────────────────────────────────
  const { rows: [demoUserRow] } = await client.query(
    `SELECT tenant_id FROM users WHERE email = 'tenant@demo.mallguide.rw'`,
  );
  const demoTenant = demoUserRow
    ? tenantsWithContracts.find((t) => t.tenant_id === demoUserRow.tenant_id)
    : null;
  if (demoTenant) {
    await client.query(`
      INSERT INTO piggybox_wallets (tenant_id, currency, balance, locked_balance, rent_due_day, locked_until)
      VALUES ($1, 'RWF', 220000, 220000, 1, (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::date)
      ON CONFLICT (tenant_id) DO UPDATE SET balance = EXCLUDED.balance, locked_balance = EXCLUDED.locked_balance
    `, [demoTenant.tenant_id]);

    // 14 days of deposits — daily-savings habit narrative
    const { rows: [wallet] } = await client.query(`SELECT id FROM piggybox_wallets WHERE tenant_id = $1`, [demoTenant.tenant_id]);
    await client.query(`DELETE FROM piggybox_transactions WHERE wallet_id = $1 AND note = '[demo]'`, [wallet.id]);
    for (let d = 14; d >= 0; d--) {
      const amount = r(10_000, 25_000);
      await client.query(`
        INSERT INTO piggybox_transactions (wallet_id, type, source, amount, currency, occurred_at, note)
        VALUES ($1, 'deposit'::piggybox_tx_type, 'sale'::piggybox_tx_source, $2, 'RWF',
                NOW() - INTERVAL '${d} days', '[demo]')
      `, [wallet.id, amount]);
    }
    console.log(`✓ piggybox: 220k balance + 15 deposits for tenant@demo`);
  }

  await client.end();

  console.log('\n✅ Demo data complete.\n');
  console.log('  /mall/rent           → ~160 rent_payments across 4 months');
  console.log('  /mall/advances       → 9 RentAvance requests in various states (3 pending review)');
  console.log('  /mall/incidents      → 12 incidents (open / assigned / in_progress / resolved)');
  console.log('  /mall/utilities      → 50 utility bills across 2 periods');
  console.log('  /tenant/wallet (as tenant@demo) → PiggyBox balance 220k RWF with daily deposit history');
}

main().catch((err) => { console.error(err); process.exit(1); });
