import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@mapplus/api';

export type { AppRouter };

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/trpc`,
        headers() {
          // Attach JWT from localStorage (client-side only)
          if (typeof window === 'undefined') return {};
          const token = localStorage.getItem('mapplus_token');
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
