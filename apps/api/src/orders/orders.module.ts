import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRouter } from './orders.router';
import { PiggyboxModule } from '../piggybox/piggybox.module';

@Module({
  imports:   [PiggyboxModule],
  providers: [OrdersService, OrdersRouter],
  exports:   [OrdersService, OrdersRouter],
})
export class OrdersModule {}
