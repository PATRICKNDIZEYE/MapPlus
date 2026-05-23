import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc.init';
import { OrdersService } from './orders.service';

const STATUS = z.enum([
  'requested', 'accepted', 'picked_up', 'in_delivery',
  'delivered', 'paid', 'returned', 'cancelled',
]);

const STAFF_ROLES = ['super_admin', 'org_owner', 'building_manager', 'building_manager'];

@Injectable()
export class OrdersRouter {
  constructor(private readonly orders: OrdersService) {}

  get trpcRouter() {
    return router({
      // Anonymous + signed-in shoppers can place orders.
      create: publicProcedure
        .input(z.object({
          productId: z.string().uuid(),
          quantity:  z.number().int().min(1).max(20).optional(),
          shopperSessionId: z.string().max(80).optional(),
          shopperName:  z.string().min(2).max(200),
          shopperPhone: z.string().min(7).max(50),
          payerPhone:   z.string().min(7).max(50).optional(),
          deliveryAddress: z.string().min(5).max(1000),
          deliveryNotes:   z.string().max(2000).optional(),
        }))
        .mutation(({ ctx, input }) => this.orders.create(input, ctx.user)),

      byId: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ input }) => this.orders.byId(input.id)),

      // List orders for the current shopper. Reads session id from input
      // because anonymous shoppers don't have a tRPC user context.
      byShopper: publicProcedure
        .input(z.object({ sessionId: z.string().max(80).optional() }).optional())
        .query(({ ctx, input }) =>
          this.orders.byShopper(input?.sessionId ?? null, ctx.user?.sub ?? null),
        ),

      // Tenant-side queue
      byTenant: protectedProcedure
        .input(z.object({
          tenantId: z.string().uuid().optional(),
          status:   STATUS.optional(),
        }).optional())
        .query(({ ctx, input }) => {
          const tenantId = input?.tenantId ?? ctx.user!.tenantId;
          if (!tenantId) return [];
          return this.orders.byTenant(tenantId, input?.status);
        }),

      acceptByTenant: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => this.orders.acceptByTenant(input.id, ctx.user!)),

      markDelivered: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) => this.orders.markDelivered(input.id, ctx.user!)),

      // Public so the delivery person can take MoMo payment without auth.
      markPaid: publicProcedure
        .input(z.object({ id: z.string().uuid(), payerPhone: z.string().min(7).max(50) }))
        .mutation(({ input }) => this.orders.markPaid(input.id, input.payerPhone)),

      returnRequest: publicProcedure
        .input(z.object({ id: z.string().uuid(), reason: z.string().max(2000).optional() }))
        .mutation(({ input }) => this.orders.returnRequest(input.id, input.reason)),

      cancel: publicProcedure
        .input(z.object({ id: z.string().uuid(), sessionId: z.string().max(80).optional() }))
        .mutation(({ ctx, input }) => this.orders.cancel(input.id, ctx.user ?? null, input.sessionId)),
    });
  }
}
