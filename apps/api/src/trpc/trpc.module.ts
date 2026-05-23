import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { MapModule } from '../map/map.module';
import { SearchModule } from '../search/search.module';
import { ShopsModule } from '../shops/shops.module';
import { MediaModule } from '../media/media.module';
import { TrpcRouter } from './trpc.router';
import { TrpcMiddleware } from './trpc.middleware';

@Module({
  imports: [AuthModule, BuildingsModule, MapModule, SearchModule, ShopsModule, MediaModule],
  providers: [TrpcRouter, TrpcMiddleware],
  exports: [TrpcRouter, TrpcMiddleware],
})
export class TrpcModule {}
