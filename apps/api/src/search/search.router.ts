import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc.init';
import { SearchService } from './search.service';
import { DemandIntelligenceService } from '../ml/demand-intelligence.service';

const ADMIN_ROLES = ['super_admin', 'org_owner', 'building_manager', 'floor_manager'];

@Injectable()
export class SearchRouter {
  constructor(
    private search: SearchService,
    private demand: DemandIntelligenceService,
  ) {}

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

      /**
       * Demand intelligence — clusters of failed shopper queries that
       * represent unmet demand the building can lease into. Mall staff only.
       */
      demandClusters: protectedProcedure
        .input(z.object({
          buildingId: z.string().uuid().optional(),
          windowDays: z.number().int().min(1).max(365).optional(),
        }).optional())
        .query(({ ctx, input }) => {
          if (!ADMIN_ROLES.includes(ctx.user!.role)) {
            throw new ForbiddenException('Mall staff only');
          }
          return this.demand.clusters({
            buildingId: input?.buildingId,
            windowDays: input?.windowDays,
          });
        }),
    });
  }
}
