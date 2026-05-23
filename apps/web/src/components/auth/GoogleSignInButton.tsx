'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth.store';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: GsiInitConfig) => void;
          renderButton: (parent: HTMLElement, opts: GsiButtonOptions) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GsiInitConfig {
  client_id: string;
  callback: (resp: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}
interface GsiButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
}

interface Props {
  onSuccess: () => void;
  /** Text variant — 'signin_with' or 'continue_with'. */
  text?: GsiButtonOptions['text'];
  /** Visual width — Google requires a fixed number. Auto-measured from parent on first paint. */
}

export function GoogleSignInButton({ onSuccess, text = 'continue_with' }: Props) {
  const clientId = process.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] ?? '';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady]   = useState(false);
  const [busy,  setBusy]    = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const loginWithGoogle = trpc.auth.loginWithGoogle.useMutation();
  const setSession      = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.google) return;
    if (!clientId) {
      setError('Google sign-in is not configured.');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp) => {
        if (!resp.credential) {
          setError('Google did not return a credential.');
          return;
        }
        setBusy(true);
        setError(null);
        try {
          const res = await loginWithGoogle.mutateAsync({ idToken: resp.credential });
          setSession({
            accessToken:  res.accessToken,
            refreshToken: res.refreshToken,
            user: {
              id: res.user.sub,
              email: res.user.email,
              firstName: null,
              lastName: null,
              role: res.user.role,
              orgId: res.user.orgId,
              tenantId: res.user.tenantId,
            },
          });
          onSuccess();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
          setError(msg);
        } finally {
          setBusy(false);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    const width = containerRef.current.offsetWidth || 320;
    window.google.accounts.id.renderButton(containerRef.current, {
      type:  'standard',
      theme: 'outline',
      size:  'large',
      text,
      shape: 'rectangular',
      logo_alignment: 'left',
      width,
    });
  }, [ready, clientId, loginWithGoogle, setSession, onSuccess, text]);

  if (!clientId) {
    return (
      <div className="flex items-start gap-2 text-[11px] text-warning-700 bg-warning-50 border border-warning-100 px-3 py-2 rounded-lg">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
        Google sign-in is not configured — set <code className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onError={() => setError('Could not load Google sign-in.')}
      />

      <div className="relative">
        <div ref={containerRef} className="flex items-center justify-center min-h-[44px]" />
        {(!ready || busy) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
            <Loader2 className="w-4 h-4 text-ink-400 animate-spin" strokeWidth={2} />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  );
}
