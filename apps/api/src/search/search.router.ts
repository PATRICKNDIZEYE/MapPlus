import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure } from '../trpc/trpc.init';
import { SearchService } from './search.service';

@Injectable()
export class SearchRouter {
  constructor(private search: SearchService) {}

  get trpcRouter() {
    return router({
      query: publicProcedure
        .input(
          z.object({
            buildingId: z.string().uuid(),
            q: z.string().min(1).max(200),
            floorId: z.string().uuid().optional(),
            category: z.string().optional(),
            limit: z.number().int().min(1).max(50).default(20),
          }),
        )
        .query(({ input }) =>
          this.search.search(input.buildingId, input.q, {
            floorId: input.floorId,
            category: input.category,
            limit: input.limit,
          }),
        ),

      failedSearches: publicProcedure
        .input(z.object({ buildingId: z.string().uuid() }))
        .query(({ input }) => this.search.getFailedSearches(input.buildingId)),
    });
  }
}
