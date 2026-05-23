import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { RentAvanceService } from './rentavance.service';

@Injectable()
export class RentavanceRouter {
  constructor(private readonly rentavance: RentAvanceService) {}

  get trpcRouter() {
    return router({
      checkEligibility: protectedProcedure
        .input(z.object({ tenantId: z.string().uuid().optional() }).optional())
        .query(({ ctx, input }) => {
          const tenantId = input?.tenantId ?? ctx.user!.tenantId;
          if (!tenantId) throw new ForbiddenException('Not linked to a tenant');
          return this.rentavance.checkEligibility(tenantId);
        }),

      requestAdvance: protectedProcedure
        .input(z.object({
          amount: z.number().positive(),
          tenantId: z.string().uuid().optional(),
        }))
        .mutation(({ ctx, input }) => {
          const tenantId = input.tenantId ?? ctx.user!.tenantId;
          if (!tenantId) throw new ForbiddenException('Not linked to a tenant');
          return this.rentavance.requestAdvance(tenantId, input.amount);
        }),

      approve: protectedProcedure
        .input(z.object({
          advanceId: z.string().uuid(),
          collateralNotes: z.string().min(2).max(2000),
        }))
        .mutation(({ ctx, input }) =>
          this.rentavance.approve(input.advanceId, input.collateralNotes, ctx.user!),
        ),

      reject: protectedProcedure
        .input(z.object({ advanceId: z.string().uuid() }))
        .mutation(({ ctx, input }) => this.rentavance.reject(input.advanceId, ctx.user!)),

      disburse: protectedProcedure
        .input(z.object({ advanceId: z.string().uuid() }))
        .mutation(({ ctx, input }) => this.rentavance.disburse(input.advanceId, ctx.user!)),

      repaymentSchedule: protectedProcedure
        .input(z.object({ advanceId: z.string().uuid() }))
        .query(({ input }) => this.rentavance.repaymentSchedule(input.advanceId)),

      listMine: protectedProcedure
        .input(z.object({ tenantId: z.string().uuid().optional() }).optional())
        .query(({ ctx, input }) => {
          const tenantId = input?.tenantId ?? ctx.user!.tenantId;
          if (!tenantId) return [];
          return this.rentavance.listByTenant(tenantId);
        }),

      listPending: protectedProcedure.query(({ ctx }) => {
        const accountsRoles = ['super_admin', 'org_owner', 'building_manager', 'accounts'];
        if (!accountsRoles.includes(ctx.user!.role)) {
          throw new ForbiddenException('Accounts team only');
        }
        return this.rentavance.listPending();
      }),
    });
  }
}
