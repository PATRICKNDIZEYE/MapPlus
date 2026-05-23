import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, desc, sql } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { DatabaseService } from '../database/database.service';
import { PlatformConfigService } from '../platform/platform-config.service';
import {
  socialPosts, tenantSocialAccounts, tenants, products, shopProfiles,
} from '@mallguide/shared';
import type { JwtPayload } from '@mallguide/shared';

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'twitter';
type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

interface GenerateOptions {
  productId: string;
  tone?: 'friendly' | 'professional' | 'playful' | 'urgent';
  platforms?: Platform[];
  extraInstructions?: string;
}

interface GenerateResult {
  caption: string;
  hashtags: string[];
}

interface CreateDraftInput {
  tenantId: string;
  productId?: string | null;
  caption: string;
  hashtags: string[];
  platforms: Platform[];
  mediaUrls?: string[];
  scheduledAt?: Date | null;
}

@Injectable()
export class GoSocialService {
  private readonly logger = new Logger(GoSocialService.name);
  private client: Anthropic | null = null;
  private readonly fallbackModel: string;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly platformConfig: PlatformConfigService,
  ) {
    this.fallbackModel = config.get<string>('anthropic.model') ?? 'claude-sonnet-4-6';
    const apiKey = config.get<string>('anthropic.apiKey');
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  /**
   * Pull a stable brand brief for the tenant — used as the cacheable prefix on
   * every Claude call so a tenant's repeat generations share cache hits.
   */
  private async buildBrandBrief(tenantId: string) {
    const [tenant] = await this.db.db
      .select({
        legalName: tenants.legalName,
        tradeName: tenants.tradeName,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const shops = await this.db.db
      .select({
        publicName:  shopProfiles.publicName,
        description: shopProfiles.description,
        category:    shopProfiles.category,
        tags:        shopProfiles.tags,
      })
      .from(shopProfiles)
      .where(eq(shopProfiles.tenantId, tenantId));

    return [
      `Tenant: ${tenant.tradeName ?? tenant.legalName}`,
      ...shops.map((s) => [
        `Shop: ${s.publicName}`,
        s.category && `Category: ${s.category}`,
        s.tags?.length && `Tags: ${s.tags.join(', ')}`,
        s.description && `Description: ${s.description}`,
      ].filter(Boolean).join('\n')),
    ].join('\n\n');
  }

  /**
   * Generate a caption + hashtags for a specific product. Uses prompt caching
   * on the per-tenant brand brief so repeat generations within an hour share
   * an input token cache.
   */
  async generate(
    tenantId: string,
    opts: GenerateOptions,
  ): Promise<GenerateResult> {
    if (!this.client) {
      // Dev fallback so the UI flow works without an API key.
      const [p] = await this.db.db
        .select({ name: products.name, category: products.category })
        .from(products)
        .where(eq(products.id, opts.productId))
        .limit(1);
      this.logger.warn('ANTHROPIC_API_KEY not set — returning placeholder caption');
      return {
        caption: `Check out our ${p?.name ?? 'latest product'} ✨ Available now at mallGuide.`,
        hashtags: ['mallGuide', 'CHICKigali', p?.category ?? 'Shop'].map((t) => `#${t.replace(/\s+/g, '')}`),
      };
    }

    const [product] = await this.db.db
      .select({
        name:        products.name,
        description: products.description,
        category:    products.category,
        priceAmount: products.priceAmount,
        currency:    products.currency,
      })
      .from(products)
      .where(and(eq(products.id, opts.productId), eq(products.tenantId, tenantId)))
      .limit(1);
    if (!product) throw new NotFoundException('Product not found for this tenant');

    const brandBrief = await this.buildBrandBrief(tenantId);

    const tone = opts.tone ?? 'friendly';
    const platforms = opts.platforms?.length ? opts.platforms : ['instagram'];

    const model = await this.platformConfig.getString('anthropic_model', this.fallbackModel);
    const response = await this.client.messages.create({
      model,
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: [
            'You are a social-media copywriter for tenants at CHIC Kigali, a Rwandan retail mall using mallGuide.',
            'Write short, punchy posts that drive in-mall foot traffic and Buy & Try orders.',
            'Return ONLY a JSON object with shape {"caption": string, "hashtags": string[]}.',
            'Do not include markdown fences. Keep captions under 280 characters. Hashtags must be 3–8 entries, no "#" prefix.',
          ].join(' '),
        },
        {
          type: 'text',
          text: `Brand brief (cached):\n\n${brandBrief}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            `Product: ${product.name}`,
            product.description && `Details: ${product.description}`,
            product.category    && `Category: ${product.category}`,
            product.priceAmount && `Price: ${product.priceAmount} ${product.currency ?? 'RWF'}`,
            `Tone: ${tone}`,
            `Target platforms: ${platforms.join(', ')}`,
            opts.extraInstructions && `Extra direction: ${opts.extraInstructions}`,
          ].filter(Boolean).join('\n'),
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    try {
      const parsed = JSON.parse(text) as { caption?: string; hashtags?: string[] };
      const caption = (parsed.caption ?? '').trim();
      const hashtags = (parsed.hashtags ?? [])
        .filter((t) => typeof t === 'string')
        .map((t) => t.replace(/^#/, '').trim())
        .filter(Boolean)
        .slice(0, 8);
      if (!caption) throw new Error('Empty caption');
      return { caption, hashtags };
    } catch (err) {
      this.logger.error(`Claude returned unparseable JSON: ${text}`);
      throw new BadRequestException('AI returned unparseable output — please regenerate');
    }
  }

  async listPosts(tenantId: string, status?: PostStatus) {
    const conds = [eq(socialPosts.tenantId, tenantId)];
    if (status) conds.push(eq(socialPosts.status, status));
    return this.db.db
      .select()
      .from(socialPosts)
      .where(and(...conds))
      .orderBy(desc(socialPosts.scheduledAt), desc(socialPosts.createdAt));
  }

  async createDraft(input: CreateDraftInput, caller: JwtPayload) {
    const status: PostStatus = input.scheduledAt ? 'scheduled' : 'draft';
    const [row] = await this.db.db.insert(socialPosts).values({
      tenantId:  input.tenantId,
      productId: input.productId ?? null,
      platforms: input.platforms,
      caption:   input.caption,
      hashtags:  input.hashtags,
      mediaUrls: input.mediaUrls ?? [],
      status,
      scheduledAt: input.scheduledAt ?? null,
      createdBy: caller.sub,
    }).returning();
    if (!row) throw new Error('Failed to create post');
    return row;
  }

  async cancel(postId: string, tenantId: string) {
    const [row] = await this.db.db
      .update(socialPosts)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.tenantId, tenantId)))
      .returning();
    if (!row) throw new NotFoundException('Post not found');
    return row;
  }

  /**
   * Manually trigger a publish. Real platform API calls are stubbed in dev —
   * each connected account gets a synthetic platform_result. Production wires
   * BullMQ + the platform SDKs in a polish PR.
   */
  async publishNow(postId: string, tenantId: string) {
    const [post] = await this.db.db
      .select()
      .from(socialPosts)
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.tenantId, tenantId)))
      .limit(1);
    if (!post) throw new NotFoundException('Post not found');
    if (post.status === 'published') {
      throw new BadRequestException('Post already published');
    }

    const accounts = await this.db.db
      .select()
      .from(tenantSocialAccounts)
      .where(and(
        eq(tenantSocialAccounts.tenantId, tenantId),
        eq(tenantSocialAccounts.isActive, true),
      ));

    const targetPlatforms = (post.platforms as Platform[]).filter((p) =>
      accounts.some((a) => a.platform === p),
    );

    const results = targetPlatforms.map((platform) => ({
      platform,
      postId: `dev-${platform}-${Date.now()}`,
      postUrl: `https://${platform}.com/p/dev`,
      publishedAt: new Date().toISOString(),
    }));

    const [updated] = await this.db.db
      .update(socialPosts)
      .set({
        status:          results.length ? 'published' : 'failed',
        publishedAt:     new Date(),
        platformResults: results,
        publishError:    results.length ? null : 'No connected accounts for selected platforms',
        updatedAt:       new Date(),
      })
      .where(eq(socialPosts.id, postId))
      .returning();

    this.logger.log(`[gosocial] published ${postId} to ${targetPlatforms.join(', ') || '(no platforms)'}`);
    return updated!;
  }

  // ─── Social accounts ─────────────────────────────────────────────────────

  async listAccounts(tenantId: string) {
    return this.db.db
      .select({
        id:           tenantSocialAccounts.id,
        platform:     tenantSocialAccounts.platform,
        accountId:    tenantSocialAccounts.accountId,
        accountLabel: tenantSocialAccounts.accountLabel,
        isActive:     tenantSocialAccounts.isActive,
        expiresAt:    tenantSocialAccounts.expiresAt,
        createdAt:    tenantSocialAccounts.createdAt,
      })
      .from(tenantSocialAccounts)
      .where(eq(tenantSocialAccounts.tenantId, tenantId));
  }

  /**
   * Link a social account. Real OAuth handshakes are platform-specific; this
   * endpoint accepts the post-callback token so the OAuth dance can live in a
   * thin web route. In dev you can paste a synthetic token to exercise flows.
   */
  async linkAccount(input: {
    tenantId: string;
    platform: Platform;
    accountId: string;
    accountLabel?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }) {
    const [row] = await this.db.db.insert(tenantSocialAccounts).values({
      tenantId:     input.tenantId,
      platform:     input.platform,
      accountId:    input.accountId,
      accountLabel: input.accountLabel,
      accessToken:  input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt:    input.expiresAt,
      isActive:     true,
    }).returning();
    return row!;
  }

  async unlinkAccount(accountId: string, tenantId: string) {
    const [row] = await this.db.db
      .update(tenantSocialAccounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(tenantSocialAccounts.id, accountId),
        eq(tenantSocialAccounts.tenantId, tenantId),
      ))
      .returning();
    if (!row) throw new NotFoundException('Account not found');
    return row;
  }
}
