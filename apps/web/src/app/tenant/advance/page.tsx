'use client';

import { useState } from 'react';
import {
  TrendingUp, ShieldCheck, AlertCircle, Loader2, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

const STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  requested: { label: 'Awaiting review', variant: 'amber' },
  approved:  { label: 'Approved',        variant: 'blue'  },
  rejected:  { label: 'Rejected',        variant: 'red'   },
  disbursed: { label: 'Disbursed',       variant: 'blue'  },
  repaying:  { label: 'Repaying',        variant: 'amber' },
  repaid:    { label: 'Repaid',          variant: 'green' },
  defaulted: { label: 'Defaulted',       variant: 'red'   },
};

export default function TenantAdvancePage() {
  const eligibility = trpc.rentavance.checkEligibility.useQuery();
  const myAdvances  = trpc.rentavance.listMine.useQuery();
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const request = trpc.rentavance.requestAdvance.useMutation({
    onSuccess: () => {
      setAmount('');
      setErr(null);
      eligibility.refetch();
      myAdvances.refetch();
    },
    onError: (e) => setErr(e.message),
  });

  function submit() {
    const value = Number(amount);
    if (!value || value <= 0) { setErr('Enter a positive amount.'); return; }
    request.mutate({ amount: value });
  }

  if (eligibility.isLoading) {
    return <div className="px-8 py-7 min-h-[60vh] flex items-center justify-center"><BrandedLoader size="lg" label="Loading…" /></div>;
  }

  const e = eligibility.data;

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Tenant Hub</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">RentAvance</h1>
        <p className="text-sm text-ink-500 mt-1">A short-term top-up that pays the remaining rent on your behalf, repaid from your future PiggyBox deposits.</p>
      </header>

      {/* Eligibility card */}
      <div className="card p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          {e?.eligible
            ? <ShieldCheck className="w-5 h-5 text-success-700 flex-shrink-0" strokeWidth={2} />
            : <AlertCircle className="w-5 h-5 text-warning-700 flex-shrink-0" strokeWidth={2} />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">
              {e?.eligible ? 'You qualify for an advance' : 'Not eligible yet'}
            </p>
            {!e?.eligible && e?.reason && (
              <p className="text-xs text-ink-600 mt-0.5">{e.reason}</p>
            )}
          </div>
        </div>

        {e?.monthlyRent && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-px bg-ink-200 border border-ink-200 rounded-xl overflow-hidden">
            <Stat label="Monthly rent"    value={`${e.monthlyRent.toLocaleString('en-RW')} ${e.currency}`} />
            <Stat label="Current savings" value={`${e.currentSavings?.toLocaleString('en-RW') ?? 0} ${e.currency}`} />
            <Stat label="Required (60%)"  value={`${e.requiredSavings?.toLocaleString('en-RW') ?? 0} ${e.currency}`} />
            <Stat label="Max advance"     value={`${e.maxAdvanceAmount?.toLocaleString('en-RW') ?? 0} ${e.currency}`} tone="primary" />
          </div>
        )}

        {e?.eligible && (
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1">Amount to request</span>
              <input
                type="number"
                value={amount}
                onChange={(e2) => setAmount(e2.target.value)}
                className="input-base text-sm w-40"
                min={0}
                max={e.maxAdvanceAmount}
                placeholder="0"
              />
            </label>
            <button
              onClick={submit}
              disabled={request.isPending}
              className="btn-primary text-sm py-2"
            >
              {request.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
              Request advance
            </button>
            {err && <p className="text-xs text-danger-700 w-full">{err}</p>}
            <p className="text-[11px] text-ink-500 w-full">
              Flat 3% interest. Total to repay: {amount ? (Number(amount) * 1.03).toLocaleString('en-RW') : '—'} {e.currency}.
              Auto-deducted from your next 30 days of PiggyBox deposits.
            </p>
          </div>
        )}
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="card-header py-3 px-5">
          <h2 className="text-sm font-semibold text-ink-900">Advance history</h2>
        </div>
        {myAdvances.isLoading ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center"><BrandedLoader size="md" label="Loading advances…" /></div>
        ) : !myAdvances.data?.length ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500">No advances yet.</div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {myAdvances.data.map((a) => <AdvanceRow key={a.id} advance={a} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

type Advance = {
  id: string;
  amountAdvanced: string;
  interestAmount: string;
  totalDue: string;
  currency: string;
  status: string;
  approvedAt: Date | string | null;
  disbursedAt: Date | string | null;
  dueBy: string | null;
  createdAt: Date | string;
  collateralNotes: string | null;
};

function AdvanceRow({ advance }: { advance: Advance }) {
  const meta = STATUS_BADGE[advance.status] ?? { label: advance.status, variant: 'gray' as const };
  const schedule = trpc.rentavance.repaymentSchedule.useQuery({ advanceId: advance.id });

  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            Advance of {Number(advance.amountAdvanced).toLocaleString('en-RW')} {advance.currency}
          </p>
          <p className="text-xs text-ink-500 mt-0.5">
            Requested {new Date(advance.createdAt).toLocaleDateString('en-RW')}
            {advance.dueBy && ` · Due by ${advance.dueBy}`}
          </p>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs mt-3">
        <div>
          <p className="text-ink-400 uppercase tracking-wider text-[10px]">Principal</p>
          <p className="font-semibold text-ink-900 tabular-nums">{Number(advance.amountAdvanced).toLocaleString('en-RW')}</p>
        </div>
        <div>
          <p className="text-ink-400 uppercase tracking-wider text-[10px]">Interest</p>
          <p className="font-semibold text-ink-900 tabular-nums">{Number(advance.interestAmount).toLocaleString('en-RW')}</p>
        </div>
        <div>
          <p className="text-ink-400 uppercase tracking-wider text-[10px]">Total due</p>
          <p className="font-semibold text-ink-900 tabular-nums">{Number(advance.totalDue).toLocaleString('en-RW')}</p>
        </div>
      </div>

      {schedule.data && (advance.status === 'disbursed' || advance.status === 'repaying' || advance.status === 'repaid') && (
        <div className="mt-3 px-3 py-2 bg-ink-50 rounded-lg text-xs text-ink-600">
          <div className="flex items-center justify-between">
            <span>Repaid so far: <strong className="text-ink-900 tabular-nums">{schedule.data.repaid.toLocaleString('en-RW')} {advance.currency}</strong></span>
            <span>Outstanding: <strong className="text-ink-900 tabular-nums">{schedule.data.outstanding.toLocaleString('en-RW')} {advance.currency}</strong></span>
          </div>
        </div>
      )}
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'primary' }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
      <p className={`text-sm font-bold tracking-tight mt-1 tabular-nums ${tone === 'primary' ? 'text-primary-700' : 'text-ink-900'}`}>{value}</p>
    </div>
  );
}
