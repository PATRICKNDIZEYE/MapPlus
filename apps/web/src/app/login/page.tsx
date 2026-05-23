'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth.store';
import { LogoMark } from '@/components/brand/Logo';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

function landingForRole(role: string): string {
  // Send each role to its primary surface after login.
  if (role === 'super_admin') return '/platform';
  if (role === 'tenant_admin' || role === 'tenant_staff') return '/tenant';
  if (role === 'delivery_personnel') return '/delivery';
  return '/mall';
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitRedirect = params.get('redirect');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);

  const { setSession, accessToken, user, hydrated } = useAuthStore();
  const login = trpc.auth.login.useMutation();

  useEffect(() => {
    if (hydrated && accessToken && user) {
      router.replace(explicitRedirect ?? landingForRole(user.role));
    }
  }, [hydrated, accessToken, user, explicitRedirect, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await login.mutateAsync({ email, password });
      setSession({
        accessToken: res.accessToken,
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
      router.replace(explicitRedirect ?? landingForRole(res.user.role));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      // Hide stack traces — show a clean message
      setError(message.includes('UNAUTHORIZED') || message.toLowerCase().includes('credentials')
        ? 'Email or password is incorrect.'
        : message);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4 py-12 font-jakarta">
      <div className="w-full max-w-md">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 mb-8 group">
          <LogoMark size={40} />
          <div>
            <p className="text-base font-bold text-ink-900 leading-none tracking-tight">
              mallGuide
            </p>
            <p className="text-[11px] text-ink-400 mt-1">The Mall Guide by yoGuide</p>
          </div>
        </Link>

        <div className="bg-white border border-ink-200 rounded-2xl p-8 shadow-xs">
          <h1 className="text-xl font-bold tracking-tight text-ink-900">Sign in</h1>
          <p className="text-sm text-ink-500 mt-1">Sign in to the mallGuide platform.</p>

          <div className="mt-6">
            <GoogleSignInButton
              onSuccess={() => {
                // Auth store will be hydrated by GoogleSignInButton; redirect uses role landing.
                const u = useAuthStore.getState().user;
                router.replace(explicitRedirect ?? (u ? landingForRole(u.role) : '/mall'));
              }}
              text="continue_with"
            />
          </div>

          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-ink-200" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">or with email</span>
            <span className="flex-1 h-px bg-ink-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={2} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-ink-600">Password</label>
                <Link href="/forgot-password" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={2} />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3 py-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="btn-primary w-full justify-center text-sm py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {login.isPending ? 'Signing in…' : (<>Sign in <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-400 mt-6">
          Need access? <a href="mailto:hello@impactmel.com" className="text-primary-600 hover:text-primary-700 font-semibold">Contact your administrator</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
