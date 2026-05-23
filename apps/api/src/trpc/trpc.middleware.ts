import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TrpcRouter } from './trpc.router';
import { createTrpcContextFactory } from './trpc.context';

@Injectable()
export class TrpcMiddleware implements NestMiddleware {
  private readonly createContext: ReturnType<typeof createTrpcContextFactory>;

  constructor(
    private trpcRouter: TrpcRouter,
    jwt: JwtService,
    config: ConfigService,
  ) {
    this.createContext = createTrpcContextFactory({ jwt, config });
  }

  use(req: Request, res: Response, next: NextFunction) {
    return createExpressMiddleware({
      router: this.trpcRouter.appRouter,
      createContext: ({ req, res }) => this.createContext({ req, res }),
      onError:
        process.env['NODE_ENV'] !== 'production'
          ? ({ path, error }) => {
              console.error(`tRPC error on /${path ?? ''}:`, error.message);
            }
          : undefined,
    })(req, res, next);
  }
}
