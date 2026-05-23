import { Module } from '@nestjs/common';
import { AiSearchService } from './aisearch.service';
import { AiSearchRouter } from './aisearch.router';

@Module({
  providers: [AiSearchService, AiSearchRouter],
  exports:   [AiSearchService, AiSearchRouter],
})
export class AiSearchModule {}
