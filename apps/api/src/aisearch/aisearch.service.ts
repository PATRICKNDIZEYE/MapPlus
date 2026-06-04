import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { DatabaseService } from '../database/database.service';
import { PlatformConfigService } from '../platform/platform-config.service';
import { HybridSearchService, type ShopHit, type ProductHit } from '../ml/hybrid-search.service';
import { LlmRerankerService } from '../ml/llm-reranker.service';
import {
  shopProfiles, units, floors, buildings, analyticsEvents, searchClicks,
} from '@mallguide/shared';
import type { NewSearchClick } from '@mallguide/shared';

interface AskResult {
  reply: string;
  toolCalls: Array<{ tool: string; input: unknown; result: unknown }>;
}

/**
 * Quick keyword→category routing used by the no-Claude-key fallback path
 * AND as a category boost even when the LLM is on. Means typing
 * "shoes", "phone", "cake" returns useful shops even before any
 * product catalogue is seeded.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Fashion & Apparel':  ['shoe', 'dress', 'shirt', 'cloth', 'fashion', 'suit', 'tailor', 'fabric', 'jean', 'wear', 'wedding', 'bag'],
  'Electronics':        ['phone', 'laptop', 'computer', 'tv', 'television', 'electronic', 'gadget', 'repair', 'tablet', 'speaker', 'headphone', 'camera'],
  'Food & Beverages':   ['food', 'restaurant', 'coffee', 'juice', 'cake', 'pizza', 'eat', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'drink'],
  'Health & Pharmacy':  ['pharmacy', 'medicine', 'drug', 'health', 'clinic', 'doctor', 'paracetamol'],
  'Banking & Finance':  ['bank', 'atm', 'money', 'cash', 'finance', 'loan', 'mobile money', 'momo'],
  'Beauty & Cosmetics': ['beauty', 'cosmetic', 'makeup', 'salon', 'hair', 'nail', 'skincare', 'perfume', 'lotion'],
  'Sports & Fitness':   ['sport', 'gym', 'fitness', 'exercise', 'football', 'jersey', 'sneaker'],
  'Entertainment':      ['cinema', 'movie', 'play', 'game', 'entertain', 'arcade'],
};

function guessCategory(query: string): string | null {
  const q = query.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => q.includes(k))) return cat;
  }
  return null;
}

const SYSTEM_PROMPT = [
  "You are yoGuide — an in-mall shopping assistant for mallGuide, helping shoppers in Kigali find products and shops across every partner mall in the network.",
  "",
  "When a shopper asks where to find something:",
  "1. Use the search_products tool when they describe a thing to buy (e.g. 'laptop under 500k', 'red dress').",
  "2. Use the search_shops tool when they name a brand or category (e.g. 'KFC', 'pharmacy').",
  "3. After tool results come back, reply in plain prose — 2–4 sentences max. Mention the mall, floor, and unit code. List up to 3 options if available; never dump a full table.",
  "4. If results are empty, say so honestly and suggest a broader query. Never invent shops or products.",
  "5. Reply in the same language the shopper used (English or Kinyarwanda). Keep tone friendly and concise.",
].join('\n');

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description: 'Search products across every published shop in every mall on the network. Use when the shopper describes an item.',
    input_schema: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'Keywords from the shopper, e.g. "laptop" or "red dress"' },
        maxPrice: { type: 'number', description: 'Optional upper price bound in RWF' },
        category: { type: 'string', description: 'Optional category filter, e.g. "Electronics"' },
        buildingSlug: { type: 'string', description: 'Optional mall slug if the shopper wants to limit to one mall' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_shops',
    description: 'Search shops/brands across every mall. Use when the shopper names a brand or asks for a category of store.',
    input_schema: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'Brand name, category, or keyword' },
        category: { type: 'string', description: 'Optional category filter' },
        buildingSlug: { type: 'string', description: 'Optional mall slug' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_shop_details',
    description: 'Fetch contact info, hours, and floor location for a shop after you have selected it from a previous search.',
    input_schema: {
      type: 'object',
      properties: {
        shopId: { type: 'string', description: 'Shop UUID from a previous search result' },
      },
      required: ['shopId'],
    },
  },
];

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private client: Anthropic | null = null;
  private readonly fallbackModel: string;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly platformConfig: PlatformConfigService,
    private readonly hybrid: HybridSearchService,
    private readonly reranker: LlmRerankerService,
  ) {
    this.fallbackModel = config.get<string>('anthropic.model') ?? 'claude-sonnet-4-6';
    const apiKey = config.get<string>('anthropic.apiKey');
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  /**
   * Run a single Claude turn with tool use enabled. Loops on `tool_use` stop
   * reasons until the model returns a text answer — usually 1–2 round trips.
   */
  async ask(query: string, locale: 'en' | 'rw' = 'en'): Promise<AskResult> {
    if (!query.trim()) throw new BadRequestException('Empty query');

    if (!this.client) {
      // Dev fallback when no API key.
      //   - Always run BOTH shop + product search in parallel.
      //   - Then route the query through a keyword→category guess and
      //     pull more shops by category if the literal search was empty.
      //   - Sort products by price ascending so the cheapest concrete
      //     offers surface first — what the shopper actually needs to
      //     decide where to go.
      const calls: AskResult['toolCalls'] = [];

      const [productsRaw, shopsLiteral] = await Promise.all([
        this.searchProducts({ query }),
        this.searchShops({ query }),
      ]);

      // Sort products: priced items first (cheapest → most expensive),
      // unpriced items after. This is what the front-end reads, so the
      // tool-call record carries the sorted version.
      const productsSorted = [...productsRaw].sort((a, b) => {
        const ap = a.priceAmount; const bp = b.priceAmount;
        if (ap == null && bp == null) return 0;
        if (ap == null) return 1;
        if (bp == null) return -1;
        return ap - bp;
      });

      calls.push({ tool: 'search_products', input: { query }, result: productsSorted });
      calls.push({ tool: 'search_shops',    input: { query }, result: shopsLiteral });

      let shops = shopsLiteral;
      let categoryUsed: string | null = null;
      if (!shops.length) {
        const guessedCat = guessCategory(query);
        if (guessedCat) {
          categoryUsed = guessedCat;
          shops = await this.searchShops({ query: guessedCat, category: guessedCat });
          calls.push({ tool: 'search_shops', input: { query: guessedCat, category: guessedCat }, result: shops });
        }
      }

      const products = productsSorted;

      const reply = products.length
        ? `${products.length} item${products.length === 1 ? '' : 's'} match "${query}" — cheapest first.`
        : shops.length
          ? categoryUsed
            ? `No exact products, but ${shops.length} ${categoryUsed} shop${shops.length === 1 ? '' : 's'} are likely to have what you want.`
            : `${shops.length} matching shop${shops.length === 1 ? '' : 's'}.`
          : `I couldn't find a match for "${query}". Try a brand name, a category, or a more general word.`;
      return { reply, toolCalls: calls };
    }

    const model = await this.platformConfig.getString('anthropic_model', this.fallbackModel);

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: query },
    ];
    const toolCalls: AskResult['toolCalls'] = [];

    // Cap at 5 tool round-trips so a misbehaving model can't burn tokens.
    for (let i = 0; i < 5; i++) {
      const response = await this.client.messages.create({
        model,
        max_tokens: 1024,
        tools: TOOLS,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: `Shopper's preferred language: ${locale === 'rw' ? 'Kinyarwanda' : 'English'}.`,
          },
        ],
        messages,
      });

      if (response.stop_reason === 'tool_use') {
        const toolUses = response.content.filter((b) => b.type === 'tool_use');
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of toolUses) {
          if (block.type !== 'tool_use') continue;
          const result = await this.runTool(block.name, block.input as Record<string, unknown>);
          toolCalls.push({ tool: block.name, input: block.input, result });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
        // Append assistant message + user tool_result message and loop.
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      const reply = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('\n')
        .trim();

      this.logSearchEvent(query, toolCalls.length ? toolCalls[0]!.result : null).catch(() => null);
      return { reply, toolCalls };
    }

    throw new BadRequestException('AI search hit the tool-call limit. Try a simpler query.');
  }

  // ─── Tools ──────────────────────────────────────────────────────────────

  private async runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'search_products': {
        const args = input as Parameters<typeof this.searchProducts>[0];
        const hits = await this.searchProducts(args);
        // LLM rerank the top-N from hybrid retrieval; if rerank is unavailable
        // (no API key, single result, network failure) we return the RRF order.
        return this.reranker.rerankProducts(args.query, hits);
      }
      case 'search_shops': {
        const args = input as Parameters<typeof this.searchShops>[0];
        const hits = await this.searchShops(args);
        return this.reranker.rerankShops(args.query, hits);
      }
      case 'get_shop_details':  return this.getShopDetails(input as { shopId: string });
      default: return { error: `Unknown tool: ${name}` };
    }
  }

  /**
   * Delegate to HybridSearchService — Postgres FTS + pgvector cosine search
   * fused with Reciprocal Rank Fusion. Same input/output shape the Claude
   * tools expect.
   */
  async searchProducts(input: {
    query: string;
    maxPrice?: number;
    category?: string;
    buildingSlug?: string;
  }): Promise<ProductHit[]> {
    return this.hybrid.searchProducts(input);
  }

  async searchShops(input: {
    query: string;
    category?: string;
    buildingSlug?: string;
  }): Promise<ShopHit[]> {
    return this.hybrid.searchShops(input);
  }

  async getShopDetails(input: { shopId: string }) {
    const [row] = await this.db.db
      .select({
        id: shopProfiles.id,
        publicName: shopProfiles.publicName,
        description: shopProfiles.description,
        category: shopProfiles.category,
        phone: shopProfiles.phone,
        whatsapp: shopProfiles.whatsapp,
        operatingHours: shopProfiles.operatingHours,
        buildingId: units.buildingId,
        buildingName: buildings.name,
        buildingSlug: buildings.slug,
        floorName: floors.name,
        unitCode: units.unitCode,
      })
      .from(shopProfiles)
      .innerJoin(units, eq(units.id, shopProfiles.unitId))
      .innerJoin(floors, eq(floors.id, units.floorId))
      .innerJoin(buildings, eq(buildings.id, units.buildingId))
      .where(eq(shopProfiles.id, input.shopId))
      .limit(1);

    return row ?? { error: 'Shop not found' };
  }

  // ─── Analytics ──────────────────────────────────────────────────────────

  private async logSearchEvent(query: string, firstToolResult: unknown) {
    const resultCount = Array.isArray(firstToolResult) ? firstToolResult.length : 0;
    await this.db.db.insert(analyticsEvents).values({
      eventType: 'search',
      searchQuery: query,
      resultCount,
    });
  }

  /**
   * Record a click on a search result. Feeds the future learning-to-rank
   * reranker and surfaces popular shops for "Trending" UI.
   */
  async trackClick(input: NewSearchClick) {
    await this.db.db.insert(searchClicks).values(input);
  }
}
