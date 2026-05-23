import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc/trpc.init';
import { MapService } from './map.service';

@Injectable()
export class MapRouter {
  constructor(private map: MapService) {}

  get trpcRouter() {
    return router({
      floorGeoJSON: publicProcedure
        .input(z.object({ floorId: z.string().uuid() }))
        .query(({ input }) => this.map.getFloorGeoJSON(input.floorId)),

      publishVersion: adminProcedure
        .input(
          z.object({
            floorId: z.string().uuid(),
            changeSummary: z.string().optional(),
          }),
        )
        .mutation(({ input, ctx }) =>
          this.map.publishMapVersion(input.floorId, ctx.user!.sub, input.changeSummary),
        ),
    });
  }
}
