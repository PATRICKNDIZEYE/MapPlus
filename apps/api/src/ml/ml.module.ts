import { Global, Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { HybridSearchService } from './hybrid-search.service';
import { LlmRerankerService } from './llm-reranker.service';
import { DemandIntelligenceService } from './demand-intelligence.service';

/**
 * ML infrastructure shared across services. Global so AiSearchService,
 * DemandIntelligenceService, and seed scripts can all use the same model
 * instance.
 */
@Global()
@Module({
  providers: [EmbeddingService, HybridSearchService, LlmRerankerService, DemandIntelligenceService],
  exports:   [EmbeddingService, HybridSearchService, LlmRerankerService, DemandIntelligenceService],
})
export class MlModule {}
