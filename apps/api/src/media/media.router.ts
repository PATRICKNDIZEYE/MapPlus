import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { MediaService } from './media.service';
import { DatabaseService } from '../database/database.service';
import { shopProfiles, products } from '@mallguide/shared';

@Injectable()
export class MediaRouter {
  constructor(
    private media: MediaService,
    private db: DatabaseService,
  ) {}

  get trpcRouter() {
    return router({
      /**
       * Upload a shop cover photo or logo.
       * Accepts base64-encoded image (after client-side compression).
       * Returns the public URL and updates the shop_profiles record.
       */
      uploadShopPhoto: protectedProcedure
        .input(z.object({
          shopId:     z.string().uuid(),
          type:       z.enum(['cover', 'logo']),
          fileBase64: z.string().min(100),  // base64 data (without data: prefix)
          mimeType:   z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
        }))
        .mutation(async ({ input, ctx }) => {
          // Verify the caller owns this shop or is an admin
          const [shop] = await this.db.db
            .select({ id: shopProfiles.id, tenantId: shopProfiles.tenantId, coverPhotoUrl: shopProfiles.coverPhotoUrl, logoUrl: shopProfiles.logoUrl })
            .from(shopProfiles)
            .where(eq(shopProfiles.id, input.shopId))
            .limit(1);

          if (!shop) throw new ForbiddenException('Shop not found');

          const adminRoles = ['super_admin', 'org_owner', 'building_manager'];
          if (!adminRoles.includes(ctx.user!.role) && ctx.user!.tenantId !== shop.tenantId) {
            throw new ForbiddenException('You do not own this shop');
          }

          const prefix = input.type === 'cover' ? 'cover' : 'logo';
          const oldUrl  = input.type === 'cover' ? shop.coverPhotoUrl : shop.logoUrl;

          // Save the new file
          const url = await this.media.saveFile(input.fileBase64, input.mimeType, prefix);

          // Update the shop record
          const updateField = input.type === 'cover'
            ? { coverPhotoUrl: url, updatedAt: new Date() }
            : { logoUrl: url, updatedAt: new Date() };

          await this.db.db
            .update(shopProfiles)
            .set(updateField)
            .where(eq(shopProfiles.id, input.shopId));

          // Delete the old file asynchronously (don't block the response)
          void this.media.deleteFile(oldUrl ?? null);

          return { url };
        }),

      /**
       * Upload a product image. Returns the public URL — caller is responsible
       * for attaching it to the product (via products.update with the new images
       * array) so the tenant UI can preview before committing.
       */
      uploadProductImage: protectedProcedure
        .input(z.object({
          productId:  z.string().uuid(),
          fileBase64: z.string().min(100),
          mimeType:   z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
        }))
        .mutation(async ({ input, ctx }) => {
          const [product] = await this.db.db
            .select({ id: products.id, tenantId: products.tenantId, shopId: products.shopId })
            .from(products)
            .where(eq(products.id, input.productId))
            .limit(1);

          if (!product) throw new NotFoundException('Product not found');

          const adminRoles = ['super_admin', 'org_owner', 'building_manager'];
          if (!adminRoles.includes(ctx.user!.role) && ctx.user!.tenantId !== product.tenantId) {
            throw new ForbiddenException('You do not own this product');
          }

          const url = await this.media.saveFile(input.fileBase64, input.mimeType, 'product');
          return { url };
        }),
    });
  }
}
