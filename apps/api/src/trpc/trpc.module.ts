import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { MapModule } from '../map/map.module';
import { SearchModule } from '../search/search.module';
import { ShopsModule } from '../shops/shops.module';
import { MediaModule } from '../media/media.module';
import { TenantsModule } from '../tenants/tenants.module';
import { ContractsModule } from '../contracts/contracts.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { PiggyboxModule } from '../piggybox/piggybox.module';
import { RentavanceModule } from '../rentavance/rentavance.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { UtilitiesModule } from '../utilities/utilities.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RentModule } from '../rent/rent.module';
import { GoSocialModule } from '../gosocial/gosocial.module';
import { PlatformModule } from '../platform/platform.module';
import { AiSearchModule } from '../aisearch/aisearch.module';
import { TrpcRouter } from './trpc.router';
import { TrpcMiddleware } from './trpc.middleware';

@Module({
  imports: [
    AuthModule, BuildingsModule, MapModule, SearchModule, ShopsModule,
    MediaModule, TenantsModule, ContractsModule,
    ProductsModule, OrdersModule, PiggyboxModule, RentavanceModule,
    DeliveryModule, IncidentsModule, UtilitiesModule, NotificationsModule,
    RentModule, GoSocialModule, PlatformModule, AiSearchModule,
  ],
  providers: [TrpcRouter, TrpcMiddleware],
  exports: [TrpcRouter, TrpcMiddleware],
})
export class TrpcModule {}
