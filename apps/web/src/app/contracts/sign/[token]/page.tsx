'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { LogoMark } from '@/components/brand/Logo';

export default function TenantSignPage() {
  const { token } = useParams<{ token: string }>();
  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [done, setDone]     = useState(false);

  const sign = trpc.contracts.signByTenant.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (signerName.trim().length < 2) { setError('Type your full legal name.'); return; }
    if (!agreed) { setError('Confirm you agree to the contract terms.'); return; }
    sign.mutate({ token, signerName: signerName.trim() });
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4 py-12 font-jakarta">
      <div className="w-full max-w-md">

        <Link href="/" className="flex items-center gap-3 mb-8 group">
          <LogoMark className="w-10 h-10" />
          <div>
            <p className="text-base font-bold text-ink-900 leading-none tracking-tight">
              mallGuide
            </p>
            <p className="text-[11px] text-ink-400 mt-1">Tenant signature</p>
          </div>
        </Link>

        <div className="bg-white border border-ink-200 rounded-2xl p-8 shadow-xs">

          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-success-50 border border-success-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-success-700" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900">Signed.</h1>
              <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                Thank you, <span className="font-semibold text-ink-700">{signerName}</span>.
                The lease is now active and a signed copy has been sent to the building manager.
              </p>
              <p className="text-xs text-ink-400 mt-5">You can close this tab.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <div>
                  <h1 className="text-base font-bold tracking-tight text-ink-900">Sign your lease</h1>
                  <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
                    A copy of the contract was sent to you separately. By signing here, you confirm you have
                    read and agree to the terms.
                  </p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1.5">Full legal name</label>
                  <input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="As shown on official ID"
                    className="input-base"
                    required
                    minLength={2}
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-ink-700">
                  <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span>
                    I have read the lease agreement, and by typing my name above I am affixing my electronic
                    signature with the same legal effect as a hand-written one.
                  </span>
                </label>

                {error && (
                  <div className="flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3 py-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <button type="submit" disabled={sign.isPending}
                  className="btn-primary w-full justify-center text-sm py-2.5 disabled:opacity-60">
                  {sign.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : (<><ShieldCheck className="w-4 h-4" /> Sign contract</>)}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-ink-400 mt-6">
          <Link href="/" className="inline-flex items-center gap-1 text-ink-500 hover:text-ink-900">
            <ArrowLeft className="w-3 h-3" strokeWidth={2.5} /> Back to mallGuide
          </Link>
        </p>
      </div>
    </div>
  );
}
