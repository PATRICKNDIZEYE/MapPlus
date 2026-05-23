import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsRouter {
  constructor(private readonly notifications: NotificationsService) {}

  get trpcRouter() {
    return router({
      list: protectedProcedure
        .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
        .query(({ ctx, input }) =>
          this.notifications.listForUser(ctx.user!.sub, input?.limit ?? 50),
        ),

      unreadCount: protectedProcedure.query(({ ctx }) =>
        this.notifications.unreadCount(ctx.user!.sub),
      ),

      markRead: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.notifications.markRead(input.id, ctx.user!.sub),
        ),

      markAllRead: protectedProcedure.mutation(({ ctx }) =>
        this.notifications.markAllRead(ctx.user!.sub),
      ),
    });
  }
}
