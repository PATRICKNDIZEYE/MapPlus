import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc.init';
import { ProductsService } from './products.service';

const productImageSchema = z.object({
  url: z.string().url(),
  isPrimary: z.boolean().optional(),
});

const createSchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  sku: z.string().max(80).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  priceAmount: z.number().nonnegative(),
  currency: z.string().length(3).optional(),
  stockCount: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().nullable().optional(),
  images: z.array(productImageSchema).optional(),
  isPublished: z.boolean().optional(),
  isBuyAndTryEligible: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  sku: z.string().max(80).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  priceAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  stockCount: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().nullable().optional(),
  images: z.array(productImageSchema).optional(),
  isPublished: z.boolean().optional(),
  isBuyAndTryEligible: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

@Injectable()
export class ProductsRouter {
  constructor(private readonly productsService: ProductsService) {}

  get trpcRouter() {
    return router({
      // Tenant-facing: list everything I own (published + drafts)
      listMine: protectedProcedure
        .input(z.object({
          shopId: z.string().uuid().optional(),
          category: z.string().optional(),
        }).optional())
        .query(({ ctx, input }) => {
          const tenantId = ctx.user!.tenantId;
          if (!tenantId) return [];
          return this.productsService.list({
            tenantId,
            shopId: input?.shopId,
            category: input?.category,
          });
        }),

      // Public: list published products for a shop (storefront grid)
      listByShop: publicProcedure
        .input(z.object({ shopId: z.string().uuid() }))
        .query(({ input }) =>
          this.productsService.list({ shopId: input.shopId, publishedOnly: true }),
        ),

      byId: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ input }) => this.productsService.byId(input.id)),

      create: protectedProcedure
        .input(createSchema)
        .mutation(({ ctx, input }) => this.productsService.create(input, ctx.user!)),

      update: protectedProcedure
        .input(updateSchema)
        .mutation(({ ctx, input }) => {
          const { id, ...patch } = input;
          return this.productsService.update(id, patch, ctx.user!);
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => this.productsService.delete(input.id, ctx.user!)),

      reorder: protectedProcedure
        .input(z.object({
          shopId: z.string().uuid(),
          orderedIds: z.array(z.string().uuid()).min(1),
        }))
        .mutation(({ ctx, input }) =>
          this.productsService.reorder(input.shopId, input.orderedIds, ctx.user!),
        ),
    });
  }
}
