'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { LogoMark } from '@/components/brand/Logo';

function ResetForm() {
  const router = useRouter();
  const token  = useSearchParams().get('token') ?? '';

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done,  setDone]  = useState(false);

  const reset = trpc.auth.resetPassword.useMutation();

  if (!token) {
    return (
      <Card>
        <div className="flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
          <span className="leading-relaxed">
            This URL is missing a reset token.&nbsp;
            <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>.
          </span>
        </div>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      await reset.mutateAsync({ token, newPassword });
      setDone(true);
      setTimeout(() => router.replace('/login'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    }
  }

  if (done) {
    return (
      <Card>
        <div className="w-12 h-12 rounded-xl bg-success-50 border border-success-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-6 h-6 text-success-700" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-ink-900">Password updated</h1>
        <p className="text-sm text-ink-500 mt-1">Redirecting you to sign in…</p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-xl font-bold tracking-tight text-ink-900">Choose a new password</h1>
      <p className="text-sm text-ink-500 mt-1">At least 8 characters. Pick something only you would use.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-600 mb-1.5">New password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={2} />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="At least 8 characters"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-600 mb-1.5">Confirm new password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={2} />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Repeat the new password"
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
          disabled={reset.isPending}
          className="btn-primary w-full justify-center text-sm py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {reset.isPending ? 'Updating…' : (<>Update password <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </form>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4 py-12 font-jakarta">
      <div className="w-full max-w-md">

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
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
