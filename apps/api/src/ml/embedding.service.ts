import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

/**
 * Sentence-transformer embeddings for hybrid search.
 *
 * Uses `Xenova/paraphrase-multilingual-MiniLM-L12-v2` — 384-dim, supports
 * 50+ languages including Kinyarwanda. Loaded lazily on first use (~127 MB
 * downloaded to local cache); subsequent embeddings run in <50ms per text.
 *
 * Why MiniLM-multilingual: free, no API cost, no separate Python service,
 * good-enough quality for retrieval (we rerank with Claude in Phase 4).
 */
const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBEDDING_DIM = 384;

@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingService.name);
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  /** Lazy-load on first request so the API can boot without loading 127 MB. */
  private getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.logger.log(`Loading embedding model ${MODEL_ID} (first use only)…`);
      const started = Date.now();
      this.pipelinePromise = pipeline('feature-extraction', MODEL_ID).then(
        (p) => {
          this.logger.log(`Embedding model ready in ${Date.now() - started}ms`);
          return p as FeatureExtractionPipeline;
        },
        (err) => {
          this.pipelinePromise = null; // allow retry
          throw err;
        },
      );
    }
    return this.pipelinePromise;
  }

  /** Embed a single string. Returns a 384-dim Float32 unit vector. */
  async embed(text: string): Promise<number[]> {
    const [vec] = await this.embedBatch([text]);
    return vec!;
  }

  /**
   * Embed a batch in one model call. MiniLM handles batches efficiently;
   * keep batches around 32–96 for best throughput.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const pipe = await this.getPipeline();
    const output = await pipe(texts, { pooling: 'mean', normalize: true });
    // output.data is a flat Float32Array of length texts.length * dim;
    // reshape into [batchSize][dim].
    const dim = output.dims[output.dims.length - 1] ?? EMBEDDING_DIM;
    const flat = Array.from(output.data as Float32Array);
    const rows: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      rows.push(flat.slice(i * dim, (i + 1) * dim));
    }
    return rows;
  }

  /** Format a vector for pgvector's text input: '[0.1,0.2,...]' */
  static toPgvector(vec: number[]): string {
    return `[${vec.join(',')}]`;
  }

  onModuleDestroy() {
    this.pipelinePromise = null;
  }
}
