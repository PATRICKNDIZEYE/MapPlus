import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { GoSocialService } from './gosocial.service';

const PLATFORM = z.enum(['instagram', 'facebook', 'tiktok', 'twitter']);
const TONE     = z.enum(['friendly', 'professional', 'playful', 'urgent']);
const STATUS   = z.enum(['draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled']);

function requireTenant(ctxTenantId: string | null): string {
  if (!ctxTenantId) throw new ForbiddenException('Not linked to a tenant');
  return ctxTenantId;
}

@Injectable()
export class GoSocialRouter {
  constructor(private readonly gosocial: GoSocialService) {}

  get trpcRouter() {
    return router({
      generate: protectedProcedure
        .input(z.object({
          productId: z.string().uuid(),
          tone:      TONE.optional(),
          platforms: z.array(PLATFORM).optional(),
          extraInstructions: z.string().max(500).optional(),
        }))
        .mutation(({ ctx, input }) => {
          const tenantId = requireTenant(ctx.user!.tenantId);
          return this.gosocial.generate(tenantId, input);
        }),

      createDraft: protectedProcedure
        .input(z.object({
          productId: z.string().uuid().optional(),
          caption:   z.string().min(1).max(2000),
          hashtags:  z.array(z.string().max(60)).max(20).optional(),
          platforms: z.array(PLATFORM).min(1),
          mediaUrls: z.array(z.string().url()).max(10).optional(),
          scheduledAt: z.string().datetime().optional(),
        }))
        .mutation(({ ctx, input }) => {
          const tenantId = requireTenant(ctx.user!.tenantId);
          return this.gosocial.createDraft({
            tenantId,
            productId: input.productId ?? null,
            caption:   input.caption,
            hashtags:  input.hashtags ?? [],
            platforms: input.platforms,
            mediaUrls: input.mediaUrls,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          }, ctx.user!);
        }),

      list: protectedProcedure
        .input(z.object({ status: STATUS.optional() }).optional())
        .query(({ ctx, input }) => {
          const tenantId = requireTenant(ctx.user!.tenantId);
          return this.gosocial.listPosts(tenantId, input?.status);
        }),

      cancel: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => {
          const tenantId = requireTenant(ctx.user!.tenantId);
          return this.gosocial.cancel(input.id, tenantId);
        }),

      publishNow: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => {
          const tenantId = requireTenant(ctx.user!.tenantId);
          return this.gosocial.publishNow(input.id, tenantId);
        }),

      listAccounts: protectedProcedure.query(({ ctx }) => {
        const tenantId = requireTenant(ctx.user!.tenantId);
        return this.gosocial.listAccounts(tenantId);
      }),

      linkAccount: protectedProcedure
        .input(z.object({
          platform:     PLATFORM,
          accountId:    z.string().min(1).max(200),
          accountLabel: z.string().max(200).optional(),
          accessToken:  z.string().min(1),
          refreshToken: z.string().optional(),
          expiresAt:    z.string().datetime().optional(),
        }))
        .mutation(({ ctx, input }) => {
          const tenantId = requireTenant(ctx.user!.tenantId);
          return this.gosocial.linkAccount({
            tenantId,
            platform: input.platform,
            accountId: input.accountId,
            accountLabel: input.accountLabel,
            accessToken: input.accessToken,
            refreshToken: input.refreshToken,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          });
        }),

      unlinkAccount: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => {
          const tenantId = requireTenant(ctx.user!.tenantId);
          return this.gosocial.unlinkAccount(input.id, tenantId);
        }),
    });
  }
}
