'use client';

import { useState } from 'react';
import {
  Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2,
  PiggyBank, TrendingUp, Lock, Calendar,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

const TX_TYPE_LABEL: Record<string, string> = {
  deposit:           'Deposit',
  withdraw:          'Withdrawal',
  rent_forward:      'Rent forwarded',
  advance_repayment: 'Advance repayment',
};

const TX_SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual', sale: 'Per-sale auto', system: 'System',
};

export default function TenantWalletPage() {
  const balance      = trpc.piggybox.balance.useQuery();
  const transactions = trpc.piggybox.transactions.useQuery();

  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote,   setDepositNote]   = useState('');
  const [err, setErr] = useState<string | null>(null);

  const deposit = trpc.piggybox.deposit.useMutation({
    onSuccess: () => {
      setDepositAmount('');
      setDepositNote('');
      setErr(null);
      balance.refetch();
      transactions.refetch();
    },
    onError: (e) => setErr(e.message),
  });

  function submitDeposit() {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setErr('Enter a positive amount.');
      return;
    }
    deposit.mutate({ amount, note: depositNote.trim() || undefined });
  }

  if (balance.isLoading) {
    return <div className="px-8 py-7 min-h-[60vh] flex items-center justify-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>;
  }

  const d        = balance.data;
  const balVal   = d ? Number(d.wallet.balance) : 0;
  const lockVal  = d ? Number(d.wallet.lockedBalance) : 0;
  const rentVal  = d?.monthlyRent ?? 0;
  const pct      = d?.savedPct ? Math.round(d.savedPct * 100) : 0;
  const currency = d?.wallet.currency ?? 'RWF';

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Tenant Hub</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">PiggyBox wallet</h1>
        <p className="text-sm text-ink-500 mt-1">Save daily toward rent. Funds are locked until your rent-due day.</p>
      </header>

      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/70">Balance</p>
            <p className="text-3xl font-extrabold tracking-tighter tabular-nums mt-1">
              {balVal.toLocaleString('en-RW')} <span className="text-base font-semibold opacity-80">{currency}</span>
            </p>
            <p className="text-xs text-white/70 mt-1.5 inline-flex items-center gap-1">
              <Lock className="w-3 h-3" strokeWidth={2.5} />
              {lockVal.toLocaleString('en-RW')} locked
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <PiggyBank className="w-6 h-6" strokeWidth={2} />
          </div>
        </div>

        {rentVal > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-white/80 mb-1.5">
              <span>Toward monthly rent</span>
              <span className="font-mono">{pct}% · {rentVal.toLocaleString('en-RW')} {currency}</span>
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-2 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" strokeWidth={2.5} />
              Auto-forwards on day {d?.wallet.rentDueDay} of the month
            </p>
          </div>
        )}
      </div>

      {/* Active advance banner */}
      {d?.activeAdvance && (
        <div className="card border-amber-200 bg-amber-50/50 p-5 mb-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="text-sm font-semibold text-amber-900">RentAvance in repayment</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Deposits are being auto-applied to your active advance ({d.activeAdvance.totalDue} {currency} total).
                Due by {d.activeAdvance.dueBy ?? '—'}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Deposit form */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary-600" strokeWidth={2} />
              New deposit
            </h2>
            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-ink-500 mb-1 uppercase tracking-wider">Amount ({currency})</span>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0"
                className="input-base"
                min={0}
              />
            </label>
            <label className="block mb-4">
              <span className="block text-[11px] font-semibold text-ink-500 mb-1 uppercase tracking-wider">Note (optional)</span>
              <input
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                placeholder="Today's sales"
                className="input-base"
                maxLength={200}
              />
            </label>
            <button
              onClick={submitDeposit}
              disabled={deposit.isPending}
              className="btn-primary w-full justify-center text-sm py-2"
            >
              {deposit.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDownRight className="w-3 h-3" strokeWidth={2.5} />}
              Deposit
            </button>
            {err && <p className="text-xs text-danger-700 mt-2">{err}</p>}
          </div>
        </div>

        {/* Transactions */}
        <div className="lg:col-span-3">
          <div className="card overflow-hidden">
            <div className="card-header py-3 px-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">Recent activity</h2>
              <button
                onClick={() => { balance.refetch(); transactions.refetch(); }}
                className="text-ink-400 hover:text-ink-700"
                aria-label="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
            {transactions.isLoading ? (
              <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
            ) : !transactions.data?.length ? (
              <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500">
                <PiggyBank className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
                No activity yet. Your first deposit will appear here.
              </div>
            ) : (
              <ul className="divide-y divide-ink-50">
                {transactions.data.map((tx) => (
                  <TxRow key={tx.id} tx={tx} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Tx = {
  id: string;
  type: string;
  source: string;
  amount: string;
  currency: string;
  note: string | null;
  occurredAt: Date | string;
};

function TxRow({ tx }: { tx: Tx }) {
  const isInflow  = tx.type === 'deposit';
  const isOutflow = tx.type === 'rent_forward' || tx.type === 'advance_repayment' || tx.type === 'withdraw';
  const Icon      = isInflow ? ArrowDownRight : ArrowUpRight;
  const tone      = isInflow ? 'text-success-700 bg-success-50' : 'text-ink-700 bg-ink-100';

  return (
    <li className="px-5 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tone}`}>
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900 truncate">
          {TX_TYPE_LABEL[tx.type] ?? tx.type}
        </p>
        <p className="text-[11px] text-ink-500 truncate">
          {TX_SOURCE_LABEL[tx.source] ?? tx.source}
          {tx.note && ` · ${tx.note}`}
          {' · '}{new Date(tx.occurredAt).toLocaleDateString('en-RW')}
        </p>
      </div>
      <p className={`text-sm font-bold tabular-nums ${isOutflow ? 'text-ink-700' : 'text-success-700'}`}>
        {isOutflow ? '−' : '+'}{Number(tx.amount).toLocaleString('en-RW')} <span className="text-[11px] font-medium opacity-70">{tx.currency}</span>
      </p>
    </li>
  );
}
