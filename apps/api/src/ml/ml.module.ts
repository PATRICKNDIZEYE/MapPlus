import { Global, Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { HybridSearchService } from './hybrid-search.service';
import { LlmRerankerService } from './llm-reranker.service';

/**
 * ML infrastructure shared across services. Global so AiSearchService,
 * MallDemandService, and seed scripts can all use the same model instance.
 */
@Global()
@Module({
  providers: [EmbeddingService, HybridSearchService, LlmRerankerService],
  exports:   [EmbeddingService, HybridSearchService, LlmRerankerService],
})
export class MlModule {}
