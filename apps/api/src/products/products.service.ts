import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, asc, sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { products, shopProfiles } from '@mallguide/shared';
import type { JwtPayload } from '@mallguide/shared';

const ADMIN_ROLES = ['super_admin', 'org_owner', 'building_manager'];

interface ListFilters {
  tenantId?: string;
  shopId?: string;
  category?: string;
  publishedOnly?: boolean;
}

interface CreateInput {
  shopId: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  priceAmount: number;
  currency?: string;
  stockCount?: number;
  imageUrl?: string | null;
  images?: Array<{ url: string; isPrimary?: boolean }>;
  isPublished?: boolean;
  isBuyAndTryEligible?: boolean;
}

interface UpdateInput {
  name?: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  priceAmount?: number;
  currency?: string;
  stockCount?: number;
  imageUrl?: string | null;
  images?: Array<{ url: string; isPrimary?: boolean }>;
  isPublished?: boolean;
  isBuyAndTryEligible?: boolean;
  isAvailable?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Resolve a shop and confirm the caller is allowed to mutate its products.
   * Returns the shop's tenantId so callers can stamp it onto new rows.
   */
  private async assertOwnership(shopId: string, caller: JwtPayload) {
    const [shop] = await this.db.db
      .select({ id: shopProfiles.id, tenantId: shopProfiles.tenantId })
      .from(shopProfiles)
      .where(eq(shopProfiles.id, shopId))
      .limit(1);
    if (!shop) throw new NotFoundException('Shop not found');
    if (!ADMIN_ROLES.includes(caller.role) && caller.tenantId !== shop.tenantId) {
      throw new ForbiddenException('You do not own this shop');
    }
    return shop;
  }

  async list(filters: ListFilters = {}) {
    const conds: SQL[] = [];
    if (filters.tenantId)      conds.push(eq(products.tenantId, filters.tenantId));
    if (filters.shopId)        conds.push(eq(products.shopId, filters.shopId));
    if (filters.category)      conds.push(eq(products.category, filters.category));
    if (filters.publishedOnly) conds.push(eq(products.isPublished, true));

    return this.db.db
      .select()
      .from(products)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(products.sortOrder), desc(products.createdAt));
  }

  async byId(id: string) {
    const [row] = await this.db.db.select().from(products).where(eq(products.id, id));
    if (!row) throw new NotFoundException('Product not found');
    return row;
  }

  async create(input: CreateInput, caller: JwtPayload) {
    const shop = await this.assertOwnership(input.shopId, caller);

    // Determine next sortOrder for this shop
    const existing = await this.db.db
      .select({ max: sql<number>`COALESCE(MAX(${products.sortOrder}), -1)::int` })
      .from(products)
      .where(eq(products.shopId, input.shopId));
    const nextOrder = (existing[0]?.max ?? -1) + 1;

    const [row] = await this.db.db.insert(products).values({
      shopId: input.shopId,
      tenantId: shop.tenantId,
      name: input.name,
      description: input.description ?? null,
      sku: input.sku ?? null,
      category: input.category ?? null,
      priceAmount: input.priceAmount.toFixed(2),
      currency: input.currency ?? 'RWF',
      stockCount: input.stockCount ?? 0,
      imageUrl: input.imageUrl ?? null,
      images: input.images ?? [],
      isPublished: input.isPublished ?? false,
      isBuyAndTryEligible: input.isBuyAndTryEligible ?? true,
      sortOrder: nextOrder,
    }).returning();
    if (!row) throw new BadRequestException('Failed to create product');
    return row;
  }

  async update(id: string, input: UpdateInput, caller: JwtPayload) {
    const [existing] = await this.db.db
      .select({ id: products.id, shopId: products.shopId })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Product not found');

    await this.assertOwnership(existing.shopId, caller);

    const patch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
    if (input.name !== undefined)        patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.sku !== undefined)         patch.sku = input.sku;
    if (input.category !== undefined)    patch.category = input.category;
    if (input.priceAmount !== undefined) patch.priceAmount = input.priceAmount.toFixed(2);
    if (input.currency !== undefined)    patch.currency = input.currency;
    if (input.stockCount !== undefined)  patch.stockCount = input.stockCount;
    if (input.imageUrl !== undefined)    patch.imageUrl = input.imageUrl;
    if (input.images !== undefined)      patch.images = input.images;
    if (input.isPublished !== undefined) patch.isPublished = input.isPublished;
    if (input.isBuyAndTryEligible !== undefined) patch.isBuyAndTryEligible = input.isBuyAndTryEligible;
    if (input.isAvailable !== undefined) patch.isAvailable = input.isAvailable;

    const [row] = await this.db.db
      .update(products)
      .set(patch)
      .where(eq(products.id, id))
      .returning();
    return row!;
  }

  async delete(id: string, caller: JwtPayload) {
    const [existing] = await this.db.db
      .select({ id: products.id, shopId: products.shopId })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Product not found');

    await this.assertOwnership(existing.shopId, caller);

    await this.db.db.delete(products).where(eq(products.id, id));
    return { id };
  }

  /**
   * Reorder products within a shop. Caller passes an array of product ids in
   * the desired display order; each gets its sortOrder set to its index.
   */
  async reorder(shopId: string, orderedIds: string[], caller: JwtPayload) {
    await this.assertOwnership(shopId, caller);

    // Confirm every id belongs to this shop before mutating any row.
    const rows = await this.db.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.shopId, shopId));
    const allowed = new Set(rows.map((r) => r.id));
    for (const id of orderedIds) {
      if (!allowed.has(id)) {
        throw new BadRequestException(`Product ${id} does not belong to shop ${shopId}`);
      }
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await this.db.db
        .update(products)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(products.id, orderedIds[i]!));
    }

    return { reordered: orderedIds.length };
  }
}
