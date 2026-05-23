import { Module } from '@nestjs/common';
import { RentAvanceService } from './rentavance.service';
import { RentavanceRouter } from './rentavance.router';

@Module({
  providers: [RentAvanceService, RentavanceRouter],
  exports:   [RentAvanceService, RentavanceRouter],
})
export class RentavanceModule {}
