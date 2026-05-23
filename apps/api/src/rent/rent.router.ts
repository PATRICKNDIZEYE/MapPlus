import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { RentService } from './rent.service';

const ACCOUNTS_ROLES = ['super_admin', 'org_owner', 'building_manager', 'accounts'];

const RENT_STATUSES = ['pending', 'paid', 'partial', 'overdue', 'cancelled'] as const;
const RENT_METHODS = [
  'mtn_momo', 'airtel_money', 'bank_transfer',
  'cash', 'piggybox_forward', 'rentavance', 'other',
] as const;

function requireAccounts(role: string) {
  if (!ACCOUNTS_ROLES.includes(role)) {
    throw new ForbiddenException('Only the accounts team can manage rent payments.');
  }
}

@Injectable()
export class RentRouter {
  constructor(private readonly rent: RentService) {}

  get trpcRouter() {
    return router({
      list: protectedProcedure
        .input(z.object({
          buildingId: z.string().uuid().optional(),
          tenantId:   z.string().uuid().optional(),
          status:     z.enum(RENT_STATUSES).optional(),
          dueBefore:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          dueAfter:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }).optional())
        .query(({ input }) => this.rent.list(input ?? {})),

      generatePeriod: protectedProcedure
        .input(z.object({
          contractId:  z.string().uuid(),
          periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          periodEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          dueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }))
        .mutation(({ ctx, input }) => {
          requireAccounts(ctx.user!.role);
          return this.rent.generatePeriod(
            input.contractId, input.periodStart, input.periodEnd, input.dueDate,
          );
        }),

      markPaid: protectedProcedure
        .input(z.object({
          id: z.string().uuid(),
          amount: z.number().positive(),
          method: z.enum(RENT_METHODS),
          externalRef: z.string().max(200).optional(),
          notes: z.string().max(2000).optional(),
        }))
        .mutation(({ ctx, input }) => {
          requireAccounts(ctx.user!.role);
          return this.rent.markPaid({ ...input, recordedBy: ctx.user!.sub });
        }),

      bulkRemind: protectedProcedure
        .input(z.object({
          buildingId: z.string().uuid(),
          dueBefore:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }))
        .mutation(({ ctx, input }) => {
          requireAccounts(ctx.user!.role);
          return this.rent.bulkRemind(input.buildingId, input.dueBefore);
        }),

      summary: protectedProcedure
        .input(z.object({ buildingId: z.string().uuid() }))
        .query(({ input }) => this.rent.summary(input.buildingId)),
    });
  }
}
