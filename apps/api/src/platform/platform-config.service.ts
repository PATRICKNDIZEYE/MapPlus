import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { platformConfig } from '@mallguide/shared';

/**
 * Read-only access to the platform_config key/value table for service-to-service use.
 * Caches values in memory for 60s so per-order calls don't hit the DB.
 *
 * Distinct from PlatformService — that one is the super_admin-gated CRUD API.
 * This service is open to any caller and only ever reads.
 */
@Injectable()
export class PlatformConfigService {
  private readonly logger = new Logger(PlatformConfigService.name);
  private readonly cache = new Map<string, { value: string | null; expiresAt: number }>();
  private readonly ttlMs = 60_000;

  constructor(private readonly db: DatabaseService) {}

  /** Read a raw text value. Returns null if the key isn't set. */
  async getRaw(key: string): Promise<string | null> {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.value;

    const [row] = await this.db.db
      .select({ valueText: platformConfig.valueText })
      .from(platformConfig)
      .where(eq(platformConfig.key, key))
      .limit(1);

    const value = row?.valueText ?? null;
    this.cache.set(key, { value, expiresAt: now + this.ttlMs });
    return value;
  }

  async getString(key: string, fallback: string): Promise<string> {
    const raw = await this.getRaw(key);
    return raw ?? fallback;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.getRaw(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      this.logger.warn(`platform_config[${key}] is not numeric ("${raw}") — using fallback ${fallback}`);
      return fallback;
    }
    return n;
  }

  async getBool(key: string, fallback: boolean): Promise<boolean> {
    const raw = await this.getRaw(key);
    if (raw == null) return fallback;
    return raw === 'true' || raw === '1' || raw === 'Y';
  }

  /** Invalidate a single key (or all keys) — call after admin writes. */
  invalidate(key?: string): void {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }
}
