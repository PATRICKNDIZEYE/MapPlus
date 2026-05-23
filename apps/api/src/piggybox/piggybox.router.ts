import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { PiggyBoxService } from './piggybox.service';

const ADMIN_ROLES = ['super_admin', 'org_owner', 'building_manager', 'accounts'];

function resolveTenantId(ctxTenantId: string | null, inputTenantId: string | undefined, role: string) {
  // Tenant users always operate on their own wallet; admins can target any tenant.
  if (ADMIN_ROLES.includes(role)) {
    if (!inputTenantId) throw new ForbiddenException('tenantId is required for admin calls');
    return inputTenantId;
  }
  if (!ctxTenantId) throw new ForbiddenException('You are not linked to a tenant');
  return ctxTenantId;
}

@Injectable()
export class PiggyboxRouter {
  constructor(private readonly piggybox: PiggyBoxService) {}

  get trpcRouter() {
    return router({
      balance: protectedProcedure
        .input(z.object({ tenantId: z.string().uuid().optional() }).optional())
        .query(({ ctx, input }) => {
          const tenantId = resolveTenantId(ctx.user!.tenantId, input?.tenantId, ctx.user!.role);
          return this.piggybox.balance(tenantId);
        }),

      transactions: protectedProcedure
        .input(z.object({
          tenantId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(200).optional(),
        }).optional())
        .query(({ ctx, input }) => {
          const tenantId = resolveTenantId(ctx.user!.tenantId, input?.tenantId, ctx.user!.role);
          return this.piggybox.transactions(tenantId, input?.limit ?? 50);
        }),

      deposit: protectedProcedure
        .input(z.object({
          tenantId: z.string().uuid().optional(),
          amount:   z.number().positive(),
          note:     z.string().max(200).optional(),
        }))
        .mutation(({ ctx, input }) => {
          const tenantId = resolveTenantId(ctx.user!.tenantId, input.tenantId, ctx.user!.role);
          return this.piggybox.deposit({
            tenantId,
            amount: input.amount,
            source: 'manual',
            note: input.note,
          });
        }),

      forwardToLandlord: protectedProcedure
        .input(z.object({ tenantId: z.string().uuid() }))
        .mutation(({ ctx, input }) => {
          if (!ADMIN_ROLES.includes(ctx.user!.role)) {
            throw new ForbiddenException('Admins only');
          }
          return this.piggybox.forwardToLandlord(input.tenantId);
        }),

      forceUnlock: protectedProcedure
        .input(z.object({
          tenantId: z.string().uuid(),
          amount:   z.number().positive(),
        }))
        .mutation(({ ctx, input }) => {
          if (!ADMIN_ROLES.includes(ctx.user!.role)) {
            throw new ForbiddenException('Admins only');
          }
          return this.piggybox.forceUnlock(input.tenantId, input.amount, ctx.user!.sub);
        }),
    });
  }
}
