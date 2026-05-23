import { Module } from '@nestjs/common';
import { MapService } from './map.service';
import { MapRouter } from './map.router';

@Module({
  providers: [MapService, MapRouter],
  exports: [MapService, MapRouter],
})
export class MapModule {}
