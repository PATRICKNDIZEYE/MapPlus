'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth.store';

/**
 * Refreshes the in-memory `user` from the server whenever there is a token
 * but no user yet, or to keep the cached user in sync with backend state.
 * Mounted once at the root.
 */
export function AuthHydrator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !!accessToken,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser({
        id: meQuery.data.id,
        email: meQuery.data.email,
        firstName: meQuery.data.firstName,
        lastName: meQuery.data.lastName,
        role: meQuery.data.role,
        orgId: meQuery.data.orgId,
        tenantId: meQuery.data.tenantId,
      });
    }
  }, [meQuery.data, setUser]);

  useEffect(() => {
    // If the server rejects our token, drop the session.
    if (meQuery.error) clear();
  }, [meQuery.error, clear]);

  return null;
}
