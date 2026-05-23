import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc.init';
import { ShopsService } from './shops.service';

const updateProfileSchema = z.object({
  id:             z.string().uuid(),
  publicName:     z.string().min(1).max(200).optional(),
  description:    z.string().max(2000).optional(),
  phone:          z.string().max(50).optional(),
  whatsapp:       z.string().max(50).optional(),
  email:          z.string().email().optional().or(z.literal('')),
  website:        z.string().url().optional().or(z.literal('')),
  operatingHours: z.record(z.unknown()).optional(),
});

@Injectable()
export class ShopsRouter {
  constructor(private shops: ShopsService) {}

  get trpcRouter() {
    return router({
      byId: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ input }) => this.shops.findById(input.id)),

      listByBuilding: publicProcedure
        .input(z.object({ buildingId: z.string().uuid(), floorId: z.string().uuid().optional() }))
        .query(({ input }) => this.shops.listByBuilding(input.buildingId, input.floorId)),

      updateProfile: protectedProcedure
        .input(updateProfileSchema)
        .mutation(({ input, ctx }) => this.shops.updateProfile(input.id, input, ctx.user!)),
    });
  }
}
