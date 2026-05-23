'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, AlertCircle, MailCheck, FlaskConical, ExternalLink } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { LogoMark } from '@/components/brand/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const requestReset = trpc.auth.requestPasswordReset.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : null;
      const res = await requestReset.mutateAsync({ email, origin });
      setDevUrl(res.devResetUrl ?? null);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

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

          {!submitted ? (
            <>
              <h1 className="text-xl font-bold tracking-tight text-ink-900">Forgot your password?</h1>
              <p className="text-sm text-ink-500 mt-1">
                Enter the email on your account and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
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

                {error && (
                  <div className="flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3 py-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={requestReset.isPending}
                  className="btn-primary w-full justify-center text-sm py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {requestReset.isPending ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-success-50 border border-success-100 flex items-center justify-center mb-4">
                <MailCheck className="w-6 h-6 text-success-700" strokeWidth={2} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900">Check your inbox</h1>
              <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                If an account exists for <span className="font-semibold text-ink-800">{email}</span>,
                you&apos;ll receive an email with a link to reset your password. The link is valid
                for 15 minutes.
              </p>

              {devUrl && (
                <div className="mt-6 rounded-lg border border-warning-200 bg-warning-50/60 p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <FlaskConical className="w-4 h-4 text-warning-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-warning-800 uppercase tracking-widest">Simulated email</p>
                      <p className="text-xs text-warning-700 mt-1 leading-relaxed">
                        SMTP is not configured for the pilot. In production this link is delivered
                        by email — here it&apos;s shown on screen so you can complete the flow.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 bg-white rounded-md border border-warning-100 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-1">Reset link</p>
                    <a
                      href={devUrl}
                      className="text-xs text-primary-600 hover:text-primary-700 font-mono break-all block"
                    >
                      {devUrl}
                    </a>
                  </div>
                  <Link
                    href={devUrl.replace(/^https?:\/\/[^/]+/, '')}
                    className="btn-primary text-xs py-2 mt-3 inline-flex"
                  >
                    Open reset page <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                  </Link>
                </div>
              )}

              <button
                onClick={() => { setSubmitted(false); setDevUrl(null); setEmail(''); }}
                className="text-xs text-ink-500 hover:text-ink-900 font-semibold mt-6"
              >
                Send to a different email
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-ink-400 mt-6">
          <Link href="/login" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold">
            <ArrowLeft className="w-3 h-3" strokeWidth={2.5} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
