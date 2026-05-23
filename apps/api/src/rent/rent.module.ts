import { Module } from '@nestjs/common';
import { RentService } from './rent.service';
import { RentRouter } from './rent.router';

@Module({
  providers: [RentService, RentRouter],
  exports:   [RentService, RentRouter],
})
export class RentModule {}
