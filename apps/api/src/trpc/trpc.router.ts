import { Injectable } from '@nestjs/common';
import { router } from './trpc.init';
import { AuthRouter } from '../auth/auth.router';
import { BuildingsRouter } from '../buildings/buildings.router';
import { MapRouter } from '../map/map.router';
import { SearchRouter } from '../search/search.router';
import { ShopsRouter } from '../shops/shops.router';
import { MediaRouter } from '../media/media.router';

@Injectable()
export class TrpcRouter {
  constructor(
    private auth: AuthRouter,
    private buildings: BuildingsRouter,
    private map: MapRouter,
    private search: SearchRouter,
    private shops: ShopsRouter,
    private media: MediaRouter,
  ) {}

  get appRouter() {
    return router({
      auth:      this.auth.trpcRouter,
      buildings: this.buildings.trpcRouter,
      map:       this.map.trpcRouter,
      search:    this.search.trpcRouter,
      shops:     this.shops.trpcRouter,
      media:     this.media.trpcRouter,
    });
  }
}

export type AppRouter = InstanceType<typeof TrpcRouter>['appRouter'];
