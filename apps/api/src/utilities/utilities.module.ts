import { Module } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { UtilitiesRouter } from './utilities.router';

@Module({
  providers: [UtilitiesService, UtilitiesRouter],
  exports:   [UtilitiesService, UtilitiesRouter],
})
export class UtilitiesModule {}
