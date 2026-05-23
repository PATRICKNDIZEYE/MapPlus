import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { TrpcRouter } from './trpc.router';
import { createTrpcContext } from './trpc.context';

@Injectable()
export class TrpcMiddleware implements NestMiddleware {
  constructor(private trpcRouter: TrpcRouter) {}

  use(req: Request, res: Response, next: NextFunction) {
    return createExpressMiddleware({
      router: this.trpcRouter.appRouter,
      createContext: ({ req, res }) => createTrpcContext({ req, res }),
      onError:
        process.env['NODE_ENV'] !== 'production'
          ? ({ path, error }) => {
              console.error(`tRPC error on /${path ?? ''}:`, error.message);
            }
          : undefined,
    })(req, res, next);
  }
}
