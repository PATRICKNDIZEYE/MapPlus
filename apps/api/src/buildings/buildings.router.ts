import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc/trpc.init';
import { BuildingsService } from './buildings.service';

const createBuildingSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  address: z.string().optional(),
  city: z.string().default('Kigali'),
  country: z.string().default('Rwanda'),
  lat: z.string().optional(),
  lng: z.string().optional(),
  timezone: z.string().default('Africa/Kigali'),
  description: z.string().optional(),
});

@Injectable()
export class BuildingsRouter {
  constructor(private buildings: BuildingsService) {}

  get trpcRouter() {
    return router({
      // Public — list all public buildings
      list: publicProcedure.query(() => this.buildings.findAll()),

      // Public — get a building by slug
      bySlug: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(({ input }) => this.buildings.findBySlug(input.slug)),

      // Public — get building by id
      byId: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ input }) => this.buildings.findById(input.id)),

      // Public — get floors for a building
      floors: publicProcedure
        .input(z.object({ buildingId: z.string().uuid() }))
        .query(({ input }) => this.buildings.getFloors(input.buildingId)),

      // Public — get a floor with its units
      floorWithUnits: publicProcedure
        .input(z.object({ floorId: z.string().uuid() }))
        .query(({ input }) => this.buildings.getFloorWithUnits(input.floorId)),

      // Admin — create building
      create: adminProcedure
        .input(createBuildingSchema)
        .mutation(({ input }) => this.buildings.create(input)),

      // Admin — update building
      update: adminProcedure
        .input(z.object({ id: z.string().uuid(), data: createBuildingSchema.partial() }))
        .mutation(({ input }) => this.buildings.update(input.id, input.data)),

      // Admin — list org's buildings
      adminList: adminProcedure
        .input(z.object({ orgId: z.string().uuid() }))
        .query(({ input }) => this.buildings.findAll(input.orgId)),
    });
  }
}
