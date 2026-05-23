import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc.init';
import { ContractsService } from './contracts.service';

const ADMIN_ROLES = ['super_admin', 'org_owner', 'building_manager', 'floor_manager'];

const assignSchema = z.object({
  unitId:    z.string().uuid(),

  legalName:       z.string().min(1).max(200),
  tradeName:       z.string().min(1).max(200),
  publicName:      z.string().min(1).max(200),
  category:        z.string().max(100).nullable().optional(),
  description:     z.string().max(2000).nullable().optional(),
  contactEmail:    z.string().email().nullable().optional(),
  contactPhone:    z.string().max(50).nullable().optional(),
  contactWhatsapp: z.string().max(50).nullable().optional(),

  monthlyRent:     z.number().positive(),
  currency:        z.string().length(3).optional(),
  depositAmount:   z.number().nonnegative().nullable().optional(),
  leaseStart:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaseEnd:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  rentDueDay:      z.number().int().min(1).max(28).optional(),
  annualEscalationPct: z.number().min(0).max(100).nullable().optional(),
  permittedUse:    z.string().max(200).nullable().optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  extraClauses:    z.string().max(10_000).nullable().optional(),
});

function requireAdmin(role: string) {
  if (!ADMIN_ROLES.includes(role)) {
    throw new ForbiddenException('You do not have permission to manage contracts.');
  }
}

@Injectable()
export class ContractsRouter {
  constructor(private contracts: ContractsService) {}

  get trpcRouter() {
    return router({
      assignWithContract: protectedProcedure
        .input(assignSchema)
        .mutation(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.contracts.assignWithContract(ctx.user!, input);
        }),

      byId: protectedProcedure
        .input(z.object({ contractId: z.string().uuid() }))
        .query(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.contracts.byId(input.contractId);
        }),

      listByTenant: protectedProcedure
        .input(z.object({ tenantId: z.string().uuid() }))
        .query(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.contracts.listByTenant(input.tenantId);
        }),

      signByOwner: protectedProcedure
        .input(z.object({
          contractId: z.string().uuid(),
          fullName:   z.string().min(2).max(200),
        }))
        .mutation(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.contracts.signByOwner(ctx.user!, input.contractId, input.fullName);
        }),

      // Public: a tenant signs via a short-lived token sent to them
      signByTenant: publicProcedure
        .input(z.object({
          token:      z.string().min(20),
          signerName: z.string().min(2).max(200),
        }))
        .mutation(({ input }) =>
          this.contracts.signByTenant(input.token, input.signerName),
        ),

      terminate: protectedProcedure
        .input(z.object({ contractId: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.contracts.terminate(ctx.user!, input.contractId);
        }),
    });
  }
}
