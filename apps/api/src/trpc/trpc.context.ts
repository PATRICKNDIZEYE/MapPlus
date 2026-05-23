import type { Request, Response } from 'express';
import type { JwtPayload } from '@mallguide/shared';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface TrpcContext {
  req: Request;
  res: Response;
  user: JwtPayload | null;
}

interface ContextDeps {
  jwt: JwtService;
  config: ConfigService;
}

export function createTrpcContextFactory(deps: ContextDeps) {
  const secret = deps.config.get<string>('jwt.secret');

  return function createTrpcContext({
    req,
    res,
  }: {
    req: Request;
    res: Response;
  }): TrpcContext {
    let user: JwtPayload | null = null;

    const header = req.headers['authorization'] ?? req.headers['Authorization'];
    const token  = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : null;

    if (token) {
      try {
        user = deps.jwt.verify<JwtPayload>(token, { secret });
      } catch {
        // Invalid / expired tokens fall through as anonymous — protected
        // procedures will throw UNAUTHORIZED on their own.
        user = null;
      }
    }

    return { req, res, user };
  };
}
