import { Module } from '@nestjs/common';
import { DeliveryRouter } from './delivery.router';

@Module({
  providers: [DeliveryRouter],
  exports:   [DeliveryRouter],
})
export class DeliveryModule {}
