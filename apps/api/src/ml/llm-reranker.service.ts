import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PlatformConfigService } from '../platform/platform-config.service';
import type { ShopHit, ProductHit } from './hybrid-search.service';

/**
 * Cross-encoder-style reranker using Claude Haiku.
 *
 * Hybrid retrieval gives us 20 plausible candidates ranked by RRF. The
 * model only sees compact one-line summaries (no images, no descriptions
 * longer than needed) and returns an ordered list of indices. We re-emit
 * the original objects in that order. If the model returns garbage or
 * times out we fall back to the original RRF order — never worse.
 *
 * Why Haiku: cheap (~$0.25/M input tokens), fast (~200ms), good enough
 * at "which of these 20 best matches the query" decisions.
 */
const RERANK_MODEL_FALLBACK = 'claude-haiku-4-5-20251001';
const MAX_CANDIDATES = 20;

@Injectable()
export class LlmRerankerService {
  private readonly logger = new Logger(LlmRerankerService.name);
  private client: Anthropic | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly platformConfig: PlatformConfigService,
  ) {
    const apiKey = config.get<string>('anthropic.apiKey');
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  /** Returns true when reranking is available (API key + at least 2 candidates). */
  canRerank(candidates: unknown[]): boolean {
    return !!this.client && candidates.length >= 2;
  }

  async rerankShops(query: string, hits: ShopHit[]): Promise<ShopHit[]> {
    if (!this.canRerank(hits)) return hits;
    const trimmed = hits.slice(0, MAX_CANDIDATES);
    const summaries = trimmed.map((h, i) =>
      `[${i}] "${h.shopName}" — ${h.category ?? 'no category'} · ${h.buildingName} ${h.floorName} ${h.unitCode}${h.description ? ` · ${truncate(h.description, 80)}` : ''}`,
    );
    const order = await this.askClaude(query, summaries, trimmed.length);
    if (!order) return hits;
    return reorder(hits, order, trimmed.length);
  }

  async rerankProducts(query: string, hits: ProductHit[]): Promise<ProductHit[]> {
    if (!this.canRerank(hits)) return hits;
    const trimmed = hits.slice(0, MAX_CANDIDATES);
    const summaries = trimmed.map((h, i) =>
      `[${i}] "${h.name}" — ${h.category ?? 'uncategorised'} · ${h.priceAmount ? `${h.priceAmount} ${h.currency}` : 'price n/a'} · ${h.shopName} (${h.buildingName} ${h.floorName})`,
    );
    const order = await this.askClaude(query, summaries, trimmed.length);
    if (!order) return hits;
    return reorder(hits, order, trimmed.length);
  }

  /**
   * Ask Haiku to reorder [0..n) by relevance to the query. Returns an
   * array of integer indices or null on failure.
   */
  private async askClaude(query: string, summaries: string[], n: number): Promise<number[] | null> {
    if (!this.client) return null;
    const model = await this.platformConfig.getString('rerank_model', RERANK_MODEL_FALLBACK);
    const started = Date.now();

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 256,
        system: [
          'You rerank shopping search results by relevance to a shopper query.',
          'Return ONLY a JSON array of integer indices in best-first order — no markdown, no prose.',
          'Indices must be a permutation of the input. You may drop irrelevant items, but never invent new ones.',
        ].join(' '),
        messages: [
          {
            role: 'user',
            content: [
              `Shopper query: ${query}`,
              '',
              'Candidates:',
              ...summaries,
              '',
              `Return JSON array of indices from 0..${n - 1} ordered by relevance.`,
            ].join('\n'),
          },
        ],
      });

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== 'number' || v < 0 || v >= n)) {
        this.logger.warn(`Rerank model returned invalid order: ${text.slice(0, 120)}`);
        return null;
      }
      this.logger.debug(`Rerank ${n} items in ${Date.now() - started}ms`);
      return parsed as number[];
    } catch (err) {
      this.logger.warn(`Rerank failed (${(err as Error).message}) — falling back to RRF order`);
      return null;
    }
  }
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

/**
 * Reorder original hits by the index list returned from Claude. Any index
 * not in the list keeps its relative position but slots in after the
 * reranked ones. This guards against Claude dropping items the shopper
 * might still want to see.
 */
function reorder<T>(hits: T[], order: number[], reranked: number): T[] {
  const taken = new Set<number>();
  const out: T[] = [];
  for (const idx of order) {
    if (idx < hits.length && !taken.has(idx)) {
      out.push(hits[idx]!);
      taken.add(idx);
    }
  }
  // Append any reranked-window candidates the model dropped, then the tail
  // beyond the rerank window untouched.
  for (let i = 0; i < hits.length; i++) {
    if (!taken.has(i)) out.push(hits[i]!);
  }
  return out;
}
