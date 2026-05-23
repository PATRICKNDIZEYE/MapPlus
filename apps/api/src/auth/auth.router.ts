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

      me: protectedProcedure.query(({ ctx }) => ctx.user),
    });
  }
}
