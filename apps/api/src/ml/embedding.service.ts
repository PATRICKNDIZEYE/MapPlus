import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

/**
 * Sentence-transformer embeddings for hybrid search.
 *
 * Uses `Xenova/paraphrase-multilingual-MiniLM-L12-v2` — 384-dim, supports
 * 50+ languages including Kinyarwanda. Loaded lazily on first use (~127 MB
 * downloaded to local cache); subsequent embeddings run in <50ms per text.
 *
 * Why the dynamic import: @huggingface/transformers transitively requires
 * onnxruntime-node, which loads a native binding at *import time*. That
 * binding doesn't always exist (e.g. on Node 24 before the package
 * supports it). By keeping the import inside getPipeline(), the API
 * boots cleanly even when the binding fails — search just gracefully
 * falls back to FTS-only via HybridSearchService.safeEmbed().
 */
const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBEDDING_DIM = 384;

// Loosely typed because the actual type ships from a runtime-only import.
type Pipeline = (input: string | string[], opts: { pooling: 'mean'; normalize: boolean })
  => Promise<{ data: ArrayLike<number>; dims: number[] }>;

@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingService.name);
  private pipelinePromise: Promise<Pipeline> | null = null;

  /** Lazy-load the pipeline and the native runtime on first request. */
  private getPipeline(): Promise<Pipeline> {
    if (!this.pipelinePromise) {
      this.logger.log(`Loading embedding model ${MODEL_ID} (first use only)…`);
      const started = Date.now();
      this.pipelinePromise = (async () => {
        // Dynamic import: native onnxruntime binding only loads at first use.
        const { pipeline } = await import('@huggingface/transformers');
        const pipe = (await pipeline('feature-extraction', MODEL_ID)) as unknown as Pipeline;
        this.logger.log(`Embedding model ready in ${Date.now() - started}ms`);
        return pipe;
      })().catch((err: Error) => {
        this.pipelinePromise = null; // allow retry on next call
        throw err;
      });
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
    const dim = output.dims[output.dims.length - 1] ?? EMBEDDING_DIM;
    const flat = Array.from(output.data as ArrayLike<number>);
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
