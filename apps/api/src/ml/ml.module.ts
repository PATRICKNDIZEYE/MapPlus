import { Global, Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { HybridSearchService } from './hybrid-search.service';

/**
 * ML infrastructure shared across services. Global so AiSearchService,
 * MallDemandService, and seed scripts can all use the same model instance.
 */
@Global()
@Module({
  providers: [EmbeddingService, HybridSearchService],
  exports:   [EmbeddingService, HybridSearchService],
})
export class MlModule {}
