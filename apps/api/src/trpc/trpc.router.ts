import { Injectable } from '@nestjs/common';
import { router } from './trpc.init';
import { AuthRouter } from '../auth/auth.router';
import { BuildingsRouter } from '../buildings/buildings.router';
import { MapRouter } from '../map/map.router';
import { SearchRouter } from '../search/search.router';
import { ShopsRouter } from '../shops/shops.router';
import { MediaRouter } from '../media/media.router';
import { TenantsRouter } from '../tenants/tenants.router';
import { ContractsRouter } from '../contracts/contracts.router';
import { ProductsRouter } from '../products/products.router';
import { OrdersRouter } from '../orders/orders.router';
import { PiggyboxRouter } from '../piggybox/piggybox.router';
import { RentavanceRouter } from '../rentavance/rentavance.router';
import { DeliveryRouter } from '../delivery/delivery.router';
import { IncidentsRouter } from '../incidents/incidents.router';
import { UtilitiesRouter } from '../utilities/utilities.router';
import { NotificationsRouter } from '../notifications/notifications.router';
import { RentRouter } from '../rent/rent.router';
import { GoSocialRouter } from '../gosocial/gosocial.router';
import { PlatformRouter } from '../platform/platform.router';
import { AiSearchRouter } from '../aisearch/aisearch.router';

@Injectable()
export class TrpcRouter {
  constructor(
    private auth: AuthRouter,
    private buildings: BuildingsRouter,
    private map: MapRouter,
    private search: SearchRouter,
    private shops: ShopsRouter,
    private media: MediaRouter,
    private tenants: TenantsRouter,
    private contracts: ContractsRouter,
    private products: ProductsRouter,
    private orders: OrdersRouter,
    private piggybox: PiggyboxRouter,
    private rentavance: RentavanceRouter,
    private delivery: DeliveryRouter,
    private incidents: IncidentsRouter,
    private utilities: UtilitiesRouter,
    private notifications: NotificationsRouter,
    private rent: RentRouter,
    private gosocial: GoSocialRouter,
    private platform: PlatformRouter,
    private aisearch: AiSearchRouter,
  ) {}

  get appRouter() {
    return router({
      auth:          this.auth.trpcRouter,
      buildings:     this.buildings.trpcRouter,
      map:           this.map.trpcRouter,
      search:        this.search.trpcRouter,
      shops:         this.shops.trpcRouter,
      media:         this.media.trpcRouter,
      tenants:       this.tenants.trpcRouter,
      contracts:     this.contracts.trpcRouter,
      products:      this.products.trpcRouter,
      orders:        this.orders.trpcRouter,
      piggybox:      this.piggybox.trpcRouter,
      rentavance:    this.rentavance.trpcRouter,
      delivery:      this.delivery.trpcRouter,
      incidents:     this.incidents.trpcRouter,
      utilities:     this.utilities.trpcRouter,
      notifications: this.notifications.trpcRouter,
      rent:          this.rent.trpcRouter,
      gosocial:      this.gosocial.trpcRouter,
      platform:      this.platform.trpcRouter,
      aisearch:      this.aisearch.trpcRouter,
    });
  }
}

export type AppRouter = InstanceType<typeof TrpcRouter>['appRouter'];
