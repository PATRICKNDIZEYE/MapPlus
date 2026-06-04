'use client';

import { useState } from 'react';
import { Receipt, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

const STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  draft:     { label: 'Draft',     variant: 'gray'  },
  sent:      { label: 'Sent',      variant: 'blue'  },
  paid:      { label: 'Paid',      variant: 'green' },
  overdue:   { label: 'Overdue',   variant: 'red'   },
  cancelled: { label: 'Cancelled', variant: 'gray'  },
};

const TYPE_LABELS: Record<string, string> = {
  electricity: 'Electricity',
  water:       'Water',
  gas:         'Gas',
  internet:    'Internet',
  common_area: 'Common area',
  security:    'Security',
  other:       'Other',
};

export default function AdminUtilitiesPage() {
  const list = trpc.utilities.list.useQuery({});

  return (
    <div className="px-8 py-7 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Utilities</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Utility billing</h1>
          <p className="text-sm text-ink-500 mt-1">Per-tenant utility bills, allocations, and collection status.</p>
        </div>
      </header>

      <div className="card overflow-hidden">
        <div className="card-header py-3 px-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">All bills</h2>
        </div>
        {list.isLoading ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center"><BrandedLoader size="md" label="Loading utilities…" /></div>
        ) : !list.data?.length ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500">
            <Receipt className="w-6 h-6 mx-auto mb-2 text-ink-300" strokeWidth={1.5} />
            No utility bills yet. Use the split tool to allocate a building-wide cost across tenants.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 border-b border-ink-100">
                <th className="px-5 py-2.5 font-semibold">Tenant</th>
                <th className="px-3 py-2.5 font-semibold">Type</th>
                <th className="px-3 py-2.5 font-semibold">Period</th>
                <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                <th className="px-3 py-2.5 font-semibold">Due</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((b) => (
                <BillRow key={b.id} bill={b} onChanged={() => list.refetch()} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

type Bill = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  utilityType: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  amount: string;
  currency: string;
  dueDate: string | null;
};

function BillRow({ bill, onChanged }: { bill: Bill; onChanged: () => void }) {
  const send = trpc.utilities.send.useMutation({ onSuccess: () => onChanged() });
  const markPaid = trpc.utilities.markPaid.useMutation({ onSuccess: () => onChanged() });
  const meta = STATUS_BADGE[bill.status] ?? { label: bill.status, variant: 'gray' as const };

  return (
    <tr className="border-b border-ink-50 hover:bg-ink-50/60 transition-colors">
      <td className="px-5 py-3 font-semibold text-ink-900">{bill.tenantName ?? '—'}</td>
      <td className="px-3 py-3 text-ink-600">{TYPE_LABELS[bill.utilityType] ?? bill.utilityType}</td>
      <td className="px-3 py-3 text-ink-600 text-xs">{bill.periodStart} → {bill.periodEnd}</td>
      <td className="px-3 py-3 text-right tabular-nums font-medium text-ink-900">
        {Number(bill.amount).toLocaleString('en-RW')} {bill.currency}
      </td>
      <td className="px-3 py-3 text-ink-600 text-xs">{bill.dueDate ?? '—'}</td>
      <td className="px-3 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
      <td className="px-5 py-3 text-right">
        {bill.status === 'draft' && (
          <button
            onClick={() => send.mutate({ id: bill.id })}
            disabled={send.isPending}
            className="text-xs font-semibold text-primary-700 hover:text-primary-800 inline-flex items-center gap-1"
          >
            {send.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send
          </button>
        )}
        {bill.status === 'sent' && (
          <button
            onClick={() => markPaid.mutate({ id: bill.id })}
            disabled={markPaid.isPending}
            className="text-xs font-semibold text-success-700 hover:text-success-700/80 inline-flex items-center gap-1"
          >
            {markPaid.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Mark paid
          </button>
        )}
      </td>
    </tr>
  );
}
