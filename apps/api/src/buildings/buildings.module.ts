import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsRouter } from './buildings.router';

@Module({
  providers: [BuildingsService, BuildingsRouter],
  exports: [BuildingsService, BuildingsRouter],
})
export class BuildingsModule {}
