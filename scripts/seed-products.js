#!/usr/bin/env node
/**
 * Seed sample products for every published shop so the Catalog tab on
 * /admin/tenants/[id] looks populated. Deterministic by category — same
 * category always gets the same product list.
 */

const { Client } = require('pg');
const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ndizeye@localhost:5434/mapplus';

const TEMPLATES = {
  'Food & Beverages': [
    { name: 'Drip coffee',         price: 'from $3.50',   description: 'Single-origin filter, brewed to order.' },
    { name: 'Espresso',            price: '$2.50',        description: 'Double shot, full-bodied.' },
    { name: 'Avocado toast',       price: '$7.50',        description: 'Sourdough, smashed avocado, chili crisp.' },
    { name: 'Almond croissant',    price: '$4.00',        description: 'Hand-laminated, baked in-house every morning.' },
  ],
  'Fashion & Apparel': [
    { name: 'Cotton tee',          price: '$24',          description: 'Heavyweight 6 oz cotton. Six colours.' },
    { name: 'Selvedge denim',      price: '$120',         description: 'Japanese 14 oz selvedge. Slim, straight, relaxed cuts.' },
    { name: 'Wool overshirt',      price: '$190',         description: 'Italian wool, brass button placket.' },
    { name: 'Canvas tote',         price: '$28',          description: '12 oz duck canvas. Reinforced base.' },
  ],
  'Electronics': [
    { name: 'Wireless earbuds',    price: '$129',         description: 'Active noise cancellation. 28-hour battery.' },
    { name: 'Smartphone case',     price: '$35',          description: 'Drop-tested polycarbonate. MagSafe compatible.' },
    { name: 'USB-C hub',           price: '$59',          description: '7-in-1 dock, HDMI 4K, 100W passthrough.' },
    { name: 'Mechanical keyboard', price: '$179',         description: 'Hot-swappable, 75% layout, RGB.' },
  ],
  'Health & Pharmacy': [
    { name: 'Multivitamin',        price: '$22',          description: '30-day supply. Methylated B-complex.' },
    { name: 'Electrolyte tabs',    price: '$15',          description: 'Sugar-free, 10 tablets per tube.' },
    { name: 'SPF 50 sunscreen',    price: '$28',          description: 'Mineral, reef-safe, 50 ml.' },
    { name: 'Cough lozenges',      price: '$8',           description: 'Honey + eucalyptus, 24 pieces.' },
  ],
  'Banking & Finance': [
    { name: 'Personal savings',    price: '4.2% APY',     description: 'No monthly fee. FDIC insured to $250k.' },
    { name: 'Business checking',   price: 'Free',         description: 'Unlimited transactions, instant payouts.' },
    { name: 'Forex exchange',      price: 'Live rate',    description: 'Cash and wire. Major currencies + crypto.' },
    { name: 'Money transfer',      price: 'from $4.99',   description: 'Same-day delivery to 180 countries.' },
  ],
  'Beauty & Cosmetics': [
    { name: 'Vitamin C serum',     price: '$48',          description: '15% L-ascorbic acid + ferulic acid, 30 ml.' },
    { name: 'Lip balm',            price: '$12',          description: 'Beeswax + shea, three shades.' },
    { name: 'Cream blush',         price: '$32',          description: 'Buildable, dewy finish, six shades.' },
    { name: 'Hair oil',            price: '$38',          description: 'Argan + jojoba, weightless finish.' },
  ],
  'Sports & Fitness': [
    { name: 'Running shoe',        price: '$135',         description: 'Plated foam midsole, breathable mesh upper.' },
    { name: 'Yoga mat',            price: '$78',          description: '6 mm cork + natural rubber.' },
    { name: 'Resistance bands',    price: '$22',          description: 'Set of five, 5-50 lbs.' },
    { name: 'Foam roller',         price: '$36',          description: '36" high-density. Travel case included.' },
  ],
  'Entertainment': [
    { name: 'Cinema ticket',       price: '$13',          description: 'Standard 2D. IMAX +$5.' },
    { name: 'Arcade card',         price: '$25',          description: '50 credits. Top up at the booth.' },
    { name: 'Escape-room session', price: '$32 / person', description: '60 minutes. Teams of 4–8.' },
    { name: 'Bowling lane',        price: '$45 / hour',   description: 'Per lane, up to 6 players.' },
  ],
};

const DEFAULT = [
  { name: 'Item A', price: 'from $20', description: 'Best seller, year-round.' },
  { name: 'Item B', price: 'from $35', description: 'New arrival this season.' },
  { name: 'Item C', price: 'from $50', description: 'Premium pick.' },
];

(async () => {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  try {
    const { rows: shops } = await c.query(
      `SELECT id, category FROM shop_profiles WHERE is_published = true`,
    );
    console.log(`Found ${shops.length} shops`);

    let inserted = 0;
    for (const shop of shops) {
      // Skip if it already has products
      const { rows: existing } = await c.query(
        `SELECT count(*)::int as n FROM products WHERE shop_id = $1`,
        [shop.id],
      );
      if (existing[0].n > 0) continue;

      const tmpl = TEMPLATES[shop.category] || DEFAULT;
      for (let i = 0; i < tmpl.length; i++) {
        const p = tmpl[i];
        await c.query(
          `INSERT INTO products (shop_id, name, description, price, currency, is_available, sort_order)
           VALUES ($1, $2, $3, $4, $5, true, $6)`,
          [shop.id, p.name, p.description, p.price, 'USD', i],
        );
        inserted++;
      }
    }
    console.log(`✓ Inserted ${inserted} products`);
  } finally {
    await c.end();
  }
})();
