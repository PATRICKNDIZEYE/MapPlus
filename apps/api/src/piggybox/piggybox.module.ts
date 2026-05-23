import { Module } from '@nestjs/common';
import { PiggyBoxService } from './piggybox.service';
import { PiggyboxRouter } from './piggybox.router';

@Module({
  providers: [PiggyBoxService, PiggyboxRouter],
  exports:   [PiggyBoxService, PiggyboxRouter],
})
export class PiggyboxModule {}
