import type { Request, Response } from 'express';
import type { JwtPayload } from '@mapplus/shared';

export interface TrpcContext {
  req: Request;
  res: Response;
  user: JwtPayload | null;
}

export function createTrpcContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): TrpcContext {
  // JWT validation happens in the middleware before tRPC — user is attached to req
  const user = (req as Request & { user?: JwtPayload }).user ?? null;
  return { req, res, user };
}
