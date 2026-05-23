import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsRouter } from './incidents.router';

@Module({
  providers: [IncidentsService, IncidentsRouter],
  exports:   [IncidentsService, IncidentsRouter],
})
export class IncidentsModule {}
