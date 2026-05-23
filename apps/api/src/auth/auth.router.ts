import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc.init';
import { AuthService } from './auth.service';

@Injectable()
export class AuthRouter {
  constructor(private auth: AuthService) {}

  get trpcRouter() {
    return router({
      login: publicProcedure
        .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
        .mutation(({ input }) => this.auth.login(input.email, input.password)),

      loginWithGoogle: publicProcedure
        .input(z.object({ idToken: z.string().min(20) }))
        .mutation(({ input }) => this.auth.loginWithGoogle(input.idToken)),

      register: publicProcedure
        .input(
          z.object({
            email: z.string().email(),
            password: z.string().min(8),
            firstName: z.string().min(1).optional(),
            lastName: z.string().min(1).optional(),
          }),
        )
        .mutation(({ input }) => this.auth.register(input)),

      refresh: publicProcedure
        .input(z.object({ refreshToken: z.string() }))
        .mutation(({ input }) => this.auth.refreshToken(input.refreshToken)),

      requestPasswordReset: publicProcedure
        .input(
          z.object({
            email: z.string().email(),
            origin: z.string().url().nullable().optional(),
          }),
        )
        .mutation(({ input }) =>
          this.auth.requestPasswordReset(input.email, input.origin ?? null),
        ),

      resetPassword: publicProcedure
        .input(
          z.object({
            token: z.string().min(20),
            newPassword: z.string().min(8).max(200),
          }),
        )
        .mutation(({ input }) =>
          this.auth.resetPasswordWithToken(input.token, input.newPassword),
        ),

      me: protectedProcedure.query(({ ctx }) => this.auth.getProfile(ctx.user.sub)),

      updateProfile: protectedProcedure
        .input(
          z.object({
            firstName: z.string().max(100).nullable().optional(),
            lastName: z.string().max(100).nullable().optional(),
          }),
        )
        .mutation(({ ctx, input }) =>
          this.auth.updateProfile(ctx.user.sub, {
            firstName: input.firstName ?? null,
            lastName: input.lastName ?? null,
          }),
        ),

      changePassword: protectedProcedure
        .input(
          z.object({
            currentPassword: z.string().min(8),
            newPassword: z.string().min(8).max(200),
          }),
        )
        .mutation(({ ctx, input }) =>
          this.auth.changePassword(ctx.user.sub, input.currentPassword, input.newPassword),
        ),
    });
  }
}
