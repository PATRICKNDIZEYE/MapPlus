import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { PlatformService } from './platform.service';

@Injectable()
export class PlatformRouter {
  constructor(private readonly platform: PlatformService) {}

  get trpcRouter() {
    return router({
      overview: protectedProcedure.query(({ ctx }) => this.platform.overview(ctx.user!)),

      listOrgs: protectedProcedure.query(({ ctx }) => this.platform.listOrgs(ctx.user!)),

      createOrg: protectedProcedure
        .input(z.object({
          name: z.string().min(2).max(200),
          type: z.enum(['building_owner', 'management_company', 'property_manager']).optional(),
          contactEmail: z.string().email().optional(),
          contactPhone: z.string().max(50).optional(),
        }))
        .mutation(({ ctx, input }) => this.platform.createOrg(input, ctx.user!)),

      listBuildings: protectedProcedure.query(({ ctx }) => this.platform.listBuildings(ctx.user!)),

      createBuilding: protectedProcedure
        .input(z.object({
          orgId: z.string().uuid(),
          name:  z.string().min(2).max(200),
          slug:  z.string().min(2).max(100).regex(/^[a-z0-9-]+$/i, 'Slug may only contain letters, numbers, and dashes'),
          address: z.string().max(1000).optional(),
          city:    z.string().max(100).optional(),
          country: z.string().max(100).optional(),
          floorsCount: z.number().int().min(1).max(50).optional(),
        }))
        .mutation(({ ctx, input }) => this.platform.createBuilding(input, ctx.user!)),

      suspendBuilding: protectedProcedure
        .input(z.object({ buildingId: z.string().uuid() }))
        .mutation(({ ctx, input }) => this.platform.suspendBuilding(input.buildingId, ctx.user!)),

      activateBuilding: protectedProcedure
        .input(z.object({ buildingId: z.string().uuid() }))
        .mutation(({ ctx, input }) => this.platform.activateBuilding(input.buildingId, ctx.user!)),

      settlement: protectedProcedure.query(({ ctx }) => this.platform.settlement(ctx.user!)),

      listConfig: protectedProcedure.query(({ ctx }) => this.platform.listConfig(ctx.user!)),

      upsertConfig: protectedProcedure
        .input(z.object({
          key:        z.string().min(2).max(100),
          valueText:  z.string().max(8000).nullable().optional(),
          valueJson:  z.unknown().optional(),
          isSecret:   z.boolean().optional(),
          description: z.string().max(2000).optional(),
        }))
        .mutation(({ ctx, input }) => this.platform.upsertConfig(input, ctx.user!)),
    });
  }
}
