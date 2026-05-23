import { Module, Global } from '@nestjs/common';
import { MomoService } from './momo.service';

@Global()
@Module({
  providers: [MomoService],
  exports:   [MomoService],
})
export class PaymentsModule {}
