import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@mallguide/shared';

export type DrizzleDB = NodePgDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: Pool;
  private _db!: DrizzleDB;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('database.url')!;
    this.pool = new Pool({ connectionString: url });
    this._db = drizzle(this.pool, { schema, logger: this.config.get('nodeEnv') === 'development' });
    // Verify connection on startup
    await this.pool.query('SELECT 1');
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  get db(): DrizzleDB {
    return this._db;
  }

  // Expose pool for raw queries (spatial operations, etc.)
  get rawPool(): Pool {
    return this.pool;
  }
}
