import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { TenantsService } from './tenants.service';

const ADMIN_ROLES = ['super_admin', 'org_owner', 'building_manager', 'floor_manager'];

const assignSchema = z.object({
  unitId:    z.string().uuid(),
  legalName: z.string().min(1).max(200),
  tradeName: z.string().min(1).max(200),
  contactEmail:    z.string().email().nullable().optional(),
  contactPhone:    z.string().max(50).nullable().optional(),
  contactWhatsapp: z.string().max(50).nullable().optional(),
  monthlyRent:     z.number().nonnegative().nullable().optional(),
  leaseStart:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  leaseEnd:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  publicName:      z.string().min(1).max(200),
  description:     z.string().max(2000).nullable().optional(),
  category:        z.string().max(100).nullable().optional(),
});

const leaseUpdateSchema = z.object({
  tenantId: z.string().uuid(),
  legalName: z.string().min(1).max(200).optional(),
  tradeName: z.string().min(1).max(200).optional(),
  contactEmail:    z.string().email().nullable().optional(),
  contactPhone:    z.string().max(50).nullable().optional(),
  contactWhatsapp: z.string().max(50).nullable().optional(),
  monthlyRent:     z.number().nonnegative().nullable().optional(),
  leaseStart:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  leaseEnd:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

function requireAdmin(role: string) {
  if (!ADMIN_ROLES.includes(role)) {
    throw new ForbiddenException('You do not have permission to manage tenants.');
  }
}

@Injectable()
export class TenantsRouter {
  constructor(private tenants: TenantsService) {}

  get trpcRouter() {
    return router({
      list: protectedProcedure
        .input(z.object({
          buildingId: z.string().uuid().optional(),
          search:     z.string().max(200).optional(),
        }))
        .query(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.tenants.list(input);
        }),

      listVacantUnits: protectedProcedure
        .input(z.object({
          buildingId: z.string().uuid(),
          floorId:    z.string().uuid().optional(),
        }))
        .query(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.tenants.listVacantUnits(input.buildingId, input.floorId);
        }),

      summary: protectedProcedure
        .input(z.object({ buildingId: z.string().uuid() }))
        .query(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.tenants.summary(input.buildingId);
        }),

      detail: protectedProcedure
        .input(z.object({ tenantId: z.string().uuid() }))
        .query(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.tenants.detail(input.tenantId);
        }),

      trafficSeries: protectedProcedure
        .input(z.object({
          tenantId: z.string().uuid(),
          days:     z.number().int().min(7).max(90).default(30),
        }))
        .query(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.tenants.trafficSeries(input.tenantId, input.days);
        }),

      assignToUnit: protectedProcedure
        .input(assignSchema)
        .mutation(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          const orgId = ctx.user!.orgId;
          if (!orgId) throw new ForbiddenException('Caller has no organisation.');
          return this.tenants.assignToUnit(orgId, input);
        }),

      unassign: protectedProcedure
        .input(z.object({ tenantId: z.string().uuid() }))
        .mutation(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          return this.tenants.unassign(input.tenantId);
        }),

      updateLease: protectedProcedure
        .input(leaseUpdateSchema)
        .mutation(({ input, ctx }) => {
          requireAdmin(ctx.user!.role);
          const { tenantId, ...patch } = input;
          return this.tenants.updateLease(tenantId, patch);
        }),
    });
  }
}
