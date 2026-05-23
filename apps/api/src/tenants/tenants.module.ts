import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsRouter } from './tenants.router';

@Module({
  providers: [TenantsService, TenantsRouter],
  exports:   [TenantsService, TenantsRouter],
})
export class TenantsModule {}
