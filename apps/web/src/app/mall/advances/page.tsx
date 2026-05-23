'use client';

import { useState } from 'react';
import {
  TrendingUp, Loader2, CheckCircle2, XCircle, Send,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

const STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  requested: { label: 'Awaiting review', variant: 'amber' },
  approved:  { label: 'Approved',        variant: 'blue'  },
  rejected:  { label: 'Rejected',        variant: 'red'   },
  disbursed: { label: 'Disbursed',       variant: 'blue'  },
};

export default function AdminAdvancesPage() {
  const pending = trpc.rentavance.listPending.useQuery();

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">RentAvance</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Advance approval queue</h1>
        <p className="text-sm text-ink-500 mt-1">Review pending advance requests and disburse approved ones to landlords.</p>
      </header>

      <div className="card overflow-hidden">
        {pending.isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : !pending.data?.length ? (
          <div className="px-5 py-12 text-center text-sm text-ink-500">
            <TrendingUp className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
            No pending requests. New requests will appear here for review.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {pending.data.map((a) => <PendingRow key={a.id} advance={a} onChanged={() => pending.refetch()} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

type PendingAdvance = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  amountAdvanced: string;
  interestAmount: string;
  totalDue: string;
  currency: string;
  status: string;
  createdAt: Date | string;
};

function PendingRow({ advance, onChanged }: { advance: PendingAdvance; onChanged: () => void }) {
  const [notes, setNotes] = useState('');
  const [showApprove, setShowApprove] = useState(false);

  const approve = trpc.rentavance.approve.useMutation({
    onSuccess: () => { setShowApprove(false); setNotes(''); onChanged(); },
  });
  const reject = trpc.rentavance.reject.useMutation({ onSuccess: () => onChanged() });
  const disburse = trpc.rentavance.disburse.useMutation({ onSuccess: () => onChanged() });

  const meta = STATUS_BADGE[advance.status] ?? { label: advance.status, variant: 'gray' as const };

  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-ink-900">{advance.tenantName ?? '—'}</p>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="text-xs text-ink-500">
            Requested {new Date(advance.createdAt).toLocaleDateString('en-RW')}
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs mt-3 max-w-md">
            <div>
              <p className="text-ink-400 uppercase tracking-wider text-[10px]">Principal</p>
              <p className="font-semibold text-ink-900 tabular-nums">{Number(advance.amountAdvanced).toLocaleString('en-RW')} {advance.currency}</p>
            </div>
            <div>
              <p className="text-ink-400 uppercase tracking-wider text-[10px]">Interest (3%)</p>
              <p className="font-semibold text-ink-900 tabular-nums">{Number(advance.interestAmount).toLocaleString('en-RW')}</p>
            </div>
            <div>
              <p className="text-ink-400 uppercase tracking-wider text-[10px]">Total due</p>
              <p className="font-semibold text-ink-900 tabular-nums">{Number(advance.totalDue).toLocaleString('en-RW')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {advance.status === 'requested' && !showApprove && (
            <>
              <button
                onClick={() => setShowApprove(true)}
                className="text-xs font-semibold text-primary-700 hover:text-primary-800"
              >
                Approve
              </button>
              <button
                onClick={() => reject.mutate({ advanceId: advance.id })}
                disabled={reject.isPending}
                className="text-xs font-semibold text-danger-700 hover:text-danger-700/80"
              >
                Reject
              </button>
            </>
          )}
          {advance.status === 'approved' && (
            <button
              onClick={() => disburse.mutate({ advanceId: advance.id })}
              disabled={disburse.isPending}
              className="btn-primary text-xs py-1.5"
            >
              {disburse.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Disburse to landlord
            </button>
          )}
        </div>
      </div>

      {showApprove && (
        <div className="mt-3 px-4 py-3 bg-primary-50/40 rounded-lg">
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-600 mb-1">Collateral notes (required)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-base min-h-[60px]"
              placeholder="Estimated value of shop stock; any other collateral terms…"
            />
          </label>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button onClick={() => { setShowApprove(false); setNotes(''); }} className="text-xs text-ink-500 hover:text-ink-900">Cancel</button>
            <button
              onClick={() => approve.mutate({ advanceId: advance.id, collateralNotes: notes.trim() })}
              disabled={notes.trim().length < 2 || approve.isPending}
              className="btn-primary text-xs py-1.5"
            >
              {approve.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Confirm approval
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
