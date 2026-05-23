import { Module } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { ShopsRouter } from './shops.router';

@Module({
  providers: [ShopsService, ShopsRouter],
  exports: [ShopsService, ShopsRouter],
})
export class ShopsModule {}
