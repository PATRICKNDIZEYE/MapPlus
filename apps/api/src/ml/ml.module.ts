import { Global, Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

/**
 * ML infrastructure shared across services. Global so AiSearchService,
 * MallDemandService, and seed scripts can all use the same model instance.
 */
@Global()
@Module({
  providers: [EmbeddingService],
  exports:   [EmbeddingService],
})
export class MlModule {}
