'use client';

import { useMemo, useState } from 'react';
import {
  Wallet, AlertCircle, CheckCircle2, Clock, Send, Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

const STATUS_LABELS: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  pending:   { label: 'Pending',   variant: 'amber' },
  paid:      { label: 'Paid',      variant: 'green' },
  partial:   { label: 'Partial',   variant: 'blue'  },
  overdue:   { label: 'Overdue',   variant: 'red'   },
  cancelled: { label: 'Cancelled', variant: 'gray'  },
};

const METHODS = [
  { value: 'mtn_momo',         label: 'MTN MoMo' },
  { value: 'airtel_money',     label: 'Airtel Money' },
  { value: 'bank_transfer',    label: 'Bank transfer' },
  { value: 'cash',             label: 'Cash' },
  { value: 'piggybox_forward', label: 'PiggyBox auto-forward' },
  { value: 'rentavance',       label: 'RentAvance' },
  { value: 'other',            label: 'Other' },
] as const;

type MethodValue = (typeof METHODS)[number]['value'];

export default function AdminRentPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const list = trpc.rent.list.useQuery(
    statusFilter ? { status: statusFilter as 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' } : {},
  );

  const totals = useMemo(() => {
    const rows = list.data ?? [];
    let due = 0, paid = 0, count = rows.length, overdue = 0;
    for (const r of rows) {
      due  += Number(r.amountDue);
      paid += Number(r.amountPaid);
      if (r.status === 'overdue') overdue += 1;
    }
    return { due, paid, count, overdue, outstanding: due - paid };
  }, [list.data]);

  return (
    <div className="px-8 py-7 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Rent Roll</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Rent collection</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base text-sm py-1.5 px-3"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-ink-200 border border-ink-200 rounded-xl overflow-hidden mb-6">
        <KPI label="Periods" value={totals.count.toString()} icon={Wallet} />
        <KPI label="Total due" value={totals.due.toLocaleString('en-RW') + ' RWF'} />
        <KPI label="Collected" value={totals.paid.toLocaleString('en-RW') + ' RWF'} tone="success" />
        <KPI label="Outstanding" value={totals.outstanding.toLocaleString('en-RW') + ' RWF'} tone={totals.outstanding > 0 ? 'warning' : 'muted'} />
      </div>

      <div className="card overflow-hidden">
        <div className="card-header py-3 px-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Payment periods</h2>
        </div>
        {list.isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : !list.data?.length ? (
          <div className="px-6 py-12 text-center text-sm text-ink-500">No rent periods recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 border-b border-ink-100">
                <th className="px-5 py-2.5 font-semibold">Tenant</th>
                <th className="px-3 py-2.5 font-semibold">Period</th>
                <th className="px-3 py-2.5 font-semibold">Due</th>
                <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                <th className="px-3 py-2.5 font-semibold text-right">Paid</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((p) => (
                <PaymentRow key={p.id} payment={p} onChanged={() => list.refetch()} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, tone }: { label: string; value: string; icon?: typeof Wallet; tone?: 'success' | 'warning' | 'muted' }) {
  const toneColor = tone === 'success' ? 'text-success-700' : tone === 'warning' ? 'text-danger-700' : 'text-ink-900';
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-ink-400" strokeWidth={2} />}
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
      </div>
      <p className={`text-xl font-extrabold tracking-tight tabular-nums ${toneColor}`}>{value}</p>
    </div>
  );
}

type RentPayment = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amountDue: string;
  amountPaid: string;
  currency: string;
  status: string;
  method: string | null;
  externalRef: string | null;
};

function PaymentRow({ payment, onChanged }: { payment: RentPayment; onChanged: () => void }) {
  const [pendingAmount, setPendingAmount] = useState<string>('');
  const [method, setMethod] = useState<MethodValue>('mtn_momo');
  const [open, setOpen] = useState(false);

  const markPaid = trpc.rent.markPaid.useMutation({
    onSuccess: () => { setOpen(false); setPendingAmount(''); onChanged(); },
  });

  const meta = STATUS_LABELS[payment.status] ?? { label: payment.status, variant: 'gray' as const };

  function submit() {
    const amount = Number(pendingAmount);
    if (!amount || amount <= 0) return;
    markPaid.mutate({ id: payment.id, amount, method });
  }

  return (
    <>
      <tr className="border-b border-ink-50 hover:bg-ink-50/60 transition-colors">
        <td className="px-5 py-3 font-semibold text-ink-900">{payment.tenantName ?? '—'}</td>
        <td className="px-3 py-3 text-ink-600 text-xs">{payment.periodStart} → {payment.periodEnd}</td>
        <td className="px-3 py-3 text-ink-600 text-xs">{payment.dueDate}</td>
        <td className="px-3 py-3 text-right tabular-nums font-medium text-ink-900">
          {Number(payment.amountDue).toLocaleString('en-RW')} {payment.currency}
        </td>
        <td className="px-3 py-3 text-right tabular-nums text-ink-700">
          {Number(payment.amountPaid).toLocaleString('en-RW')}
        </td>
        <td className="px-3 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
        <td className="px-5 py-3 text-right">
          {payment.status !== 'paid' && payment.status !== 'cancelled' && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Record payment
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-ink-50 bg-primary-50/30">
          <td colSpan={7} className="px-5 py-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="block text-[11px] font-semibold text-ink-600 mb-1">Amount</span>
                <input
                  type="number"
                  className="input-base text-sm w-40 py-1.5"
                  value={pendingAmount}
                  onChange={(e) => setPendingAmount(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold text-ink-600 mb-1">Method</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as MethodValue)}
                  className="input-base text-sm py-1.5"
                >
                  {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>
              <button
                onClick={submit}
                disabled={markPaid.isPending}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {markPaid.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Record
              </button>
              <button onClick={() => setOpen(false)} className="text-xs text-ink-500 hover:text-ink-900">Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
