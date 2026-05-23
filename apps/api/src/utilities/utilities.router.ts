import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { UtilitiesService } from './utilities.service';

const UTILITY_TYPES = ['electricity', 'water', 'gas', 'internet', 'common_area', 'security', 'other'] as const;
const BILL_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;

// Accounts + admins can manage bills. Tenants can read their own (handled elsewhere).
const ACCOUNTS_ROLES = ['super_admin', 'org_owner', 'building_manager', 'accounts'];

function requireAccounts(role: string) {
  if (!ACCOUNTS_ROLES.includes(role)) {
    throw new ForbiddenException('Only the accounts team can manage utility bills.');
  }
}

@Injectable()
export class UtilitiesRouter {
  constructor(private readonly utilities: UtilitiesService) {}

  get trpcRouter() {
    return router({
      list: protectedProcedure
        .input(z.object({
          buildingId:  z.string().uuid().optional(),
          tenantId:    z.string().uuid().optional(),
          periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          periodEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          status:      z.enum(BILL_STATUSES).optional(),
        }).optional())
        .query(({ input }) => this.utilities.list(input ?? {})),

      createBill: protectedProcedure
        .input(z.object({
          buildingId: z.string().uuid(),
          tenantId:   z.string().uuid(),
          utilityType: z.enum(UTILITY_TYPES),
          periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          periodEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          amount:   z.number().positive(),
          currency: z.string().length(3).optional(),
          dueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          notes:    z.string().max(2000).optional(),
        }))
        .mutation(({ ctx, input }) => {
          requireAccounts(ctx.user!.role);
          return this.utilities.createBill({
            buildingId: input.buildingId,
            tenantId:   input.tenantId,
            utilityType: input.utilityType,
            periodStart: input.periodStart,
            periodEnd:   input.periodEnd,
            amount:   input.amount.toFixed(2),
            currency: input.currency ?? 'RWF',
            dueDate:  input.dueDate,
            notes:    input.notes,
            status:   'draft',
          });
        }),

      split: protectedProcedure
        .input(z.object({
          buildingId:  z.string().uuid(),
          utilityType: z.enum(UTILITY_TYPES),
          periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          periodEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          totalAmount: z.number().positive(),
          currency:    z.string().length(3).optional(),
          dueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          notes:       z.string().max(2000).optional(),
        }))
        .mutation(({ ctx, input }) => {
          requireAccounts(ctx.user!.role);
          return this.utilities.split(input);
        }),

      send: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => {
          requireAccounts(ctx.user!.role);
          return this.utilities.send(input.id);
        }),

      markPaid: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => {
          requireAccounts(ctx.user!.role);
          return this.utilities.markPaid(input.id);
        }),

      cancel: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => {
          requireAccounts(ctx.user!.role);
          return this.utilities.cancel(input.id);
        }),
    });
  }
}
