import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import type { TrpcContext } from './trpc.context';

const t = initTRPC.context<TrpcContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// TS2742 suppression: tRPC middleware procedures infer complex express types.
// Safe to cast — the server app doesn't emit declaration files.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
}) as any;

export const adminProcedure = (protectedProcedure as typeof t.procedure).use(({ ctx, next }) => {
  const adminRoles = ['super_admin', 'org_owner', 'building_manager', 'floor_manager'];
  const user = (ctx as TrpcContext & { user: NonNullable<TrpcContext['user']> }).user;
  if (!adminRoles.includes(user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
}) as any;

export const superAdminProcedure = (protectedProcedure as typeof t.procedure).use(({ ctx, next }) => {
  const user = (ctx as TrpcContext & { user: NonNullable<TrpcContext['user']> }).user;
  if (user.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
}) as any;

/* eslint-enable @typescript-eslint/no-explicit-any */
