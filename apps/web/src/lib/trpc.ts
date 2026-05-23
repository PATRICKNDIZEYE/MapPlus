import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@mallguide/api';
import { useAuthStore } from '@/store/auth.store';

export type { AppRouter };

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/trpc`,
        headers() {
          if (typeof window === 'undefined') return {};
          const token = useAuthStore.getState().accessToken;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
