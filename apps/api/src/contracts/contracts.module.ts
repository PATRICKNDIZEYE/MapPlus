import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsRouter } from './contracts.router';

@Module({
  providers: [ContractsService, ContractsRouter],
  exports:   [ContractsService, ContractsRouter],
})
export class ContractsModule {}
