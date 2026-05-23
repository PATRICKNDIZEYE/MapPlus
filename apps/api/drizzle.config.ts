import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

export default {
  schema: '../../packages/shared/src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://mapplus:mapplus_dev@localhost:5432/mapplus',
  },
  verbose: true,
  strict: true,
} satisfies Config;
