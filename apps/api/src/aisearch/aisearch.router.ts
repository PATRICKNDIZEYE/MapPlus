import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure } from '../trpc/trpc.init';
import { AiSearchService } from './aisearch.service';

@Injectable()
export class AiSearchRouter {
  constructor(private readonly aisearch: AiSearchService) {}

  get trpcRouter() {
    return router({
      ask: publicProcedure
        .input(z.object({
          query: z.string().min(2).max(500),
          locale: z.enum(['en', 'rw']).optional(),
        }))
        .mutation(({ input }) => this.aisearch.ask(input.query, input.locale ?? 'en')),

      // Lightweight direct calls (no LLM) — handy for the storefront autocomplete.
      searchShops: publicProcedure
        .input(z.object({
          query: z.string().min(1).max(200),
          category: z.string().optional(),
          buildingSlug: z.string().optional(),
        }))
        .query(({ input }) => this.aisearch.searchShops(input)),

      searchProducts: publicProcedure
        .input(z.object({
          query: z.string().min(1).max(200),
          maxPrice: z.number().positive().optional(),
          category: z.string().optional(),
          buildingSlug: z.string().optional(),
        }))
        .query(({ input }) => this.aisearch.searchProducts(input)),

      /**
       * Click-tracking — fired when a shopper taps a result card. Feeds
       * the learning-to-rank pipeline and popularity boosts. Public so
       * anonymous QR sessions can also contribute signal.
       */
      trackClick: publicProcedure
        .input(z.object({
          query:      z.string().min(1).max(500),
          locale:     z.enum(['en', 'rw']).optional(),
          resultType: z.enum(['shop', 'product']),
          resultId:   z.string().uuid(),
          rank:       z.number().int().nonnegative(),
          shopperSessionId: z.string().max(80).optional(),
          buildingId: z.string().uuid().optional(),
        }))
        .mutation(({ ctx, input }) =>
          this.aisearch.trackClick({
            query:      input.query,
            locale:     input.locale,
            resultType: input.resultType,
            resultId:   input.resultId,
            rank:       input.rank,
            shopperSessionId: input.shopperSessionId,
            shopperUserId: ctx.user?.sub ?? null,
            buildingId: input.buildingId,
          }),
        ),
    });
  }
}
