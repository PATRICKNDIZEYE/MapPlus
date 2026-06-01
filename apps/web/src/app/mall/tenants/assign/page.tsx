'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Search,
  Building2, User, Calendar, FileText, Banknote, ShieldCheck,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

const BUILDING_SLUG = 'chic-kigali';

const CATEGORIES = [
  'Fashion & Apparel', 'Food & Beverages', 'Electronics', 'Health & Pharmacy',
  'Banking & Finance', 'Beauty & Cosmetics', 'Sports & Fitness', 'Entertainment',
];

type Step = 1 | 2 | 3 | 4;

const STEPS: Array<{ n: Step; label: string; sub: string; icon: React.ElementType }> = [
  { n: 1, label: 'Premises',   sub: 'Pick a vacant unit',    icon: Building2 },
  { n: 2, label: 'Tenant',     sub: 'Identity & contact',    icon: User       },
  { n: 3, label: 'Lease',      sub: 'Terms & financials',    icon: Banknote   },
  { n: 4, label: 'Contract',   sub: 'Review & sign',         icon: FileText   },
];

function fmtMoney(n: number | null | undefined, currency = 'USD') {
  if (n == null || Number.isNaN(n)) return '—';
  return `${currency} ${Math.round(n).toLocaleString()}`;
}

export default function AssignWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Premises — supports ?unitId=<uuid> deep link from the floor plan
  const initialUnit = (typeof window !== 'undefined')
    ? new URLSearchParams(window.location.search).get('unitId')
    : null;
  const [unitId, setUnitId] = useState<string | null>(initialUnit);
  const [unitQuery, setUnitQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState<string | 'all'>('all');
  const [focused, setFocused] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Tenant
  const [legalName,  setLegalName]  = useState('');
  const [tradeName,  setTradeName]  = useState('');
  const [publicName, setPublicName] = useState('');
  const [category,   setCategory]   = useState<string>('Food & Beverages');
  const [description,setDescription]= useState('');
  const [phone, setPhone]   = useState('');
  const [email, setEmail]   = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Lease
  const [monthlyRent, setMonthlyRent] = useState('');
  const [currency,    setCurrency]    = useState('USD');
  const [deposit,     setDeposit]     = useState('');
  const [leaseStart,  setLeaseStart]  = useState('');
  const [leaseEnd,    setLeaseEnd]    = useState('');
  const [rentDueDay,  setRentDueDay]  = useState('1');
  const [escalation,  setEscalation]  = useState('');
  const [noticeDays,  setNoticeDays]  = useState('60');
  const [permittedUse,setPermittedUse]= useState('');
  const [extraClauses,setExtraClauses]= useState('');

  // Sign
  const [signerName, setSignerName] = useState('');
  const [agreed,     setAgreed]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const { data: building } = trpc.buildings.bySlug.useQuery({ slug: BUILDING_SLUG });
  const { data: floors }   = trpc.buildings.floors.useQuery(
    { buildingId: building?.id ?? '' }, { enabled: !!building?.id },
  );
  const { data: vacant, isLoading: loadingUnits } = trpc.tenants.listVacantUnits.useQuery(
    { buildingId: building?.id ?? '', floorId: floorFilter === 'all' ? undefined : floorFilter },
    { enabled: !!building?.id },
  );
  const { data: me } = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60_000 });

  const selectedUnit = useMemo(
    () => vacant?.find((u) => u.unitId === unitId) ?? null,
    [vacant, unitId],
  );

  const matches = useMemo(() => {
    const q = unitQuery.trim().toLowerCase();
    if (!q) return vacant ?? [];
    return (vacant ?? []).filter((u) =>
      [u.unitCode, u.floorName].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [vacant, unitQuery]);

  useEffect(() => { setFocused(0); }, [unitQuery, floorFilter]);
  useEffect(() => { if (step === 1 && !unitId) inputRef.current?.focus(); }, [step, unitId]);

  // If pre-selected via ?unitId= and the unit is in our vacant list, jump to step 2
  useEffect(() => {
    if (step === 1 && unitId && vacant?.some((u) => u.unitId === unitId)) {
      setStep(2);
    }
  }, [vacant]); // eslint-disable-line

  // Auto-suggest rent + permitted use from the picked unit
  useEffect(() => {
    if (!selectedUnit) return;
    if (selectedUnit.areaSqm && selectedUnit.pricePerSqm && !monthlyRent) {
      setMonthlyRent(String(Math.round(selectedUnit.areaSqm * selectedUnit.pricePerSqm)));
    }
    if (selectedUnit.currency && currency === 'USD') setCurrency(selectedUnit.currency);
  }, [selectedUnit]); // eslint-disable-line

  // Default public name from trade name
  useEffect(() => { if (tradeName && !publicName) setPublicName(tradeName); }, [tradeName, publicName]);

  // Default permitted use from category
  useEffect(() => { if (category && !permittedUse) setPermittedUse(category); }, [category, permittedUse]);

  // Default signer name from logged-in admin
  useEffect(() => {
    if (me && !signerName) {
      const composed = [me.firstName, me.lastName].filter(Boolean).join(' ');
      if (composed) setSignerName(composed);
      else setSignerName(me.email);
    }
  }, [me]); // eslint-disable-line

  // Validation per step
  function validateStep(n: Step): string | null {
    if (n >= 1 && !unitId) return 'Pick a vacant unit to continue.';
    if (n >= 2) {
      if (!legalName.trim())  return 'Legal name is required.';
      if (!tradeName.trim())  return 'Trade name is required.';
      if (!publicName.trim()) return 'Public shop name is required.';
    }
    if (n >= 3) {
      if (!monthlyRent || Number(monthlyRent) <= 0) return 'Monthly rent must be greater than zero.';
      if (!leaseStart) return 'Lease start date is required.';
      if (leaseEnd && leaseEnd < leaseStart) return 'Lease end cannot be earlier than the start.';
    }
    if (n >= 4) {
      if (!signerName.trim()) return 'Type your full name as the building owner signatory.';
      if (!agreed) return 'Confirm you have authority to bind the landlord on this contract.';
    }
    return null;
  }

  function goTo(n: Step) {
    setError(null);
    if (n > step) {
      const err = validateStep(step);
      if (err) { setError(err); return; }
    }
    setStep(n);
  }

  const utils = trpc.useUtils();
  const submit = trpc.contracts.assignWithContract.useMutation({
    onSuccess: async (res) => {
      await Promise.all([
        utils.tenants.list.invalidate(),
        utils.tenants.summary.invalidate(),
        utils.tenants.listVacantUnits.invalidate(),
        utils.map.floorGeoJSON.invalidate(),
      ]);
      router.push(`/mall/contracts/${res.contract.id}?just_created=1`);
    },
    onError: (e) => setError(e.message),
  });

  function onSubmit() {
    setError(null);
    const stepErr = validateStep(4);
    if (stepErr) { setError(stepErr); return; }
    if (!unitId) return;
    submit.mutate({
      unitId,
      legalName:  legalName.trim(),
      tradeName:  tradeName.trim(),
      publicName: publicName.trim(),
      category:   category || null,
      description: description.trim() || null,
      contactEmail: email.trim() || null,
      contactPhone: phone.trim() || null,
      contactWhatsapp: whatsapp.trim() || phone.trim() || null,
      monthlyRent: Number(monthlyRent),
      currency,
      depositAmount: deposit ? Number(deposit) : null,
      leaseStart,
      leaseEnd: leaseEnd || null,
      rentDueDay: Number(rentDueDay) || 1,
      annualEscalationPct: escalation ? Number(escalation) : null,
      permittedUse: permittedUse.trim() || null,
      noticePeriodDays: Number(noticeDays) || 60,
      extraClauses: extraClauses.trim() || null,
    });
  }

  return (
    <div className="min-h-full bg-ink-50/40">

      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <Link href="/mall/tenants" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> Cancel & back
        </Link>
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400">
          New lease · {STEPS[step - 1]?.label}
        </span>
      </div>

      <div className="px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">

            {/* Header + Stepper */}
            <div className="px-7 pt-6 pb-5 border-b border-ink-100">
              <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Assign a tenant</h1>
              <p className="text-sm text-ink-500 mt-1">
                Walks you through leasing a vacant unit and drafts an e-contract for both parties to sign.
              </p>

              <ol className="mt-6 grid grid-cols-4 gap-2">
                {STEPS.map((s) => {
                  const Icon = s.icon;
                  const active = s.n === step;
                  const done   = s.n < step;
                  return (
                    <li key={s.n}
                      onClick={() => done && goTo(s.n)}
                      className={`relative px-3 py-3 rounded-xl border ${active ? 'border-primary-500 bg-primary-50/40' : done ? 'border-ink-200 bg-white cursor-pointer hover:bg-ink-50' : 'border-ink-100 bg-white'}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0
                          ${done ? 'bg-success-DEFAULT text-white' : active ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-400'}`}>
                          {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Icon className="w-3.5 h-3.5" strokeWidth={2} />}
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-primary-700' : 'text-ink-400'}`}>
                          0{s.n}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-ink-900 tracking-tight">{s.label}</p>
                      <p className="text-[11px] text-ink-400 mt-0.5">{s.sub}</p>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Step body */}
            <div className="px-7 py-6">

              {step === 1 && (
                <div className="max-w-2xl">

                  <div className="flex items-center bg-white border border-ink-200 rounded-lg p-1 gap-0.5 mb-3">
                    <button onClick={() => setFloorFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                        ${floorFilter === 'all' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'}`}>
                      All floors
                    </button>
                    {floors?.map((f) => (
                      <button key={f.id} onClick={() => setFloorFilter(f.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                          ${floorFilter === f.id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'}`}>
                        {f.shortName ?? (f.floorNumber === 0 ? 'G' : `L${f.floorNumber}`)}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" strokeWidth={2} />
                    <input
                      ref={inputRef}
                      value={unitQuery}
                      onChange={(e) => setUnitQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(Math.min(focused + 1, matches.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(Math.max(focused - 1, 0)); }
                        else if (e.key === 'Enter') { const u = matches[focused]; if (u) setUnitId(u.unitId); }
                      }}
                      placeholder="Type a unit code (e.g. L2-B07)…"
                      className="input-base pl-9 pr-16"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-ink-400 tabular-nums">
                      {matches.length} / {vacant?.length ?? 0}
                    </span>
                  </div>

                  <div className="mt-3 border border-ink-100 rounded-lg overflow-hidden">
                    {loadingUnits ? (
                      <div className="py-10 text-center"><Loader2 className="w-4 h-4 text-primary-500 animate-spin mx-auto" /></div>
                    ) : matches.length === 0 ? (
                      <div className="py-10 text-center text-xs text-ink-400">
                        {(vacant?.length ?? 0) === 0 ? 'No vacant units on this floor.' : `No matches for "${unitQuery}".`}
                      </div>
                    ) : (
                      <ul className="max-h-[44vh] overflow-y-auto divide-y divide-ink-50">
                        {matches.map((u, i) => {
                          const monthly = u.areaSqm && u.pricePerSqm ? Math.round(u.areaSqm * u.pricePerSqm) : null;
                          const isSelected = unitId === u.unitId;
                          const isFocused  = i === focused;
                          return (
                            <li key={u.unitId}>
                              <button
                                onMouseEnter={() => setFocused(i)}
                                onClick={() => setUnitId(u.unitId)}
                                className={`w-full text-left px-3 py-2.5 transition-colors
                                  ${isSelected ? 'bg-primary-50 ring-1 ring-primary-200'
                                  : isFocused ? 'bg-ink-50'
                                  : 'bg-white hover:bg-ink-50/60'}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-mono font-bold text-ink-900">{u.unitCode}</p>
                                    <p className="text-[11px] text-ink-400 mt-0.5 truncate">{u.floorName}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-semibold text-ink-700 tabular-nums">
                                      {u.areaSqm ? `${u.areaSqm.toFixed(0)} m²` : '—'}
                                    </p>
                                    <p className="text-[11px] text-ink-400 mt-0.5 tabular-nums">
                                      {monthly ? `~ ${fmtMoney(monthly, u.currency)}/mo` : '—'}
                                    </p>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-600" strokeWidth={2.5} />}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 max-w-3xl">
                  <Field label="Legal name" required hint="Goes on the contract">
                    <input className="input-base" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Brewmark Coffee, Inc." />
                  </Field>
                  <Field label="Trade name" required hint="Customer-facing brand">
                    <input className="input-base" value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="Brewmark Coffee" />
                  </Field>
                  <Field label="Public shop name" required>
                    <input className="input-base" value={publicName} onChange={(e) => setPublicName(e.target.value)} placeholder="Brewmark Coffee" />
                  </Field>
                  <Field label="Category">
                    <select className="input-base" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Description" full>
                    <textarea className="input-base min-h-[80px] resize-y" value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Espresso, drip, and pastries. Open seven days." />
                  </Field>
                  <Field label="Phone">
                    <input className="input-base" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 415 555 0123" />
                  </Field>
                  <Field label="WhatsApp" hint="Defaults to phone if empty">
                    <input className="input-base" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+1 415 555 0123" />
                  </Field>
                  <Field label="Email" full>
                    <input type="email" className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@brewmark.com" />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="max-w-3xl space-y-5">

                  {selectedUnit && (
                    <div className="bg-ink-50/70 border border-ink-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Premises</p>
                        <p className="text-sm font-mono font-bold text-ink-900 mt-0.5">{selectedUnit.unitCode}</p>
                        <p className="text-[11px] text-ink-500">{selectedUnit.floorName} · {selectedUnit.areaSqm?.toFixed(0) ?? '—'} m²</p>
                      </div>
                      {selectedUnit.pricePerSqm != null && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Floor rate</p>
                          <p className="text-sm font-bold text-ink-900 tabular-nums mt-0.5">{fmtMoney(selectedUnit.pricePerSqm, selectedUnit.currency)} / m²</p>
                          {selectedUnit.areaSqm && (
                            <p className="text-[11px] text-ink-500 tabular-nums">
                              ≈ {fmtMoney(Math.round(selectedUnit.pricePerSqm * selectedUnit.areaSqm), selectedUnit.currency)} / mo
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                    <Field label="Monthly rent" required>
                      <input type="number" min={0} step={50} className="input-base"
                        value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} />
                    </Field>
                    <Field label="Currency">
                      <select className="input-base" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {['USD','EUR','GBP','RWF','KES','UGX'].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Security deposit" hint="Refundable">
                      <input type="number" min={0} step={50} className="input-base"
                        value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" />
                    </Field>

                    <Field label="Lease start" required>
                      <input type="date" className="input-base" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
                    </Field>
                    <Field label="Lease end" hint="Leave empty for month-to-month">
                      <input type="date" className="input-base" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} />
                    </Field>
                    <Field label="Rent due day" hint="Day of the month (1–28)">
                      <input type="number" min={1} max={28} className="input-base"
                        value={rentDueDay} onChange={(e) => setRentDueDay(e.target.value)} />
                    </Field>

                    <Field label="Annual escalation" hint="Percent, optional">
                      <input type="number" min={0} max={100} step={0.5} className="input-base"
                        value={escalation} onChange={(e) => setEscalation(e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="Notice to vacate" hint="Days">
                      <input type="number" min={0} max={365} className="input-base"
                        value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} />
                    </Field>
                    <Field label="Permitted use">
                      <input className="input-base" value={permittedUse}
                        onChange={(e) => setPermittedUse(e.target.value)} placeholder={category} />
                    </Field>
                  </div>

                  <Field label="Additional clauses" hint="Optional — appended to the contract verbatim">
                    <textarea className="input-base min-h-[100px] resize-y" value={extraClauses}
                      onChange={(e) => setExtraClauses(e.target.value)}
                      placeholder="e.g. Tenant agrees to maintain the storefront signage in compliance with building standards." />
                  </Field>
                </div>
              )}

              {step === 4 && (
                <div className="max-w-3xl">
                  <ContractPreview
                    selectedUnit={selectedUnit}
                    legalName={legalName} tradeName={tradeName}
                    monthlyRent={monthlyRent} currency={currency} deposit={deposit}
                    leaseStart={leaseStart} leaseEnd={leaseEnd}
                    rentDueDay={rentDueDay} escalation={escalation}
                    noticeDays={noticeDays} permittedUse={permittedUse}
                    extraClauses={extraClauses}
                  />

                  <div className="mt-6 border border-ink-200 rounded-xl px-5 py-4 bg-ink-50/40">
                    <div className="flex items-start gap-3 mb-4">
                      <ShieldCheck className="w-5 h-5 text-success-DEFAULT mt-0.5 flex-shrink-0" strokeWidth={2} />
                      <div>
                        <p className="text-sm font-bold text-ink-900">Owner signature</p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          By signing now you create a binding draft. The tenant then signs from a one-time link.
                        </p>
                      </div>
                    </div>
                    <Field label="Full name of building-owner signatory" required>
                      <input className="input-base" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                    </Field>
                    <label className="flex items-start gap-2.5 mt-3 cursor-pointer text-xs text-ink-700">
                      <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                      <span>
                        I confirm I am authorised to bind <span className="font-semibold">{me?.orgId ? 'this organisation' : 'the landlord'}</span> on this contract, and that the terms above accurately reflect the agreement.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Error + footer */}
            {error && (
              <div className="mx-7 mb-3 flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3 py-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="px-7 py-4 border-t border-ink-100 bg-ink-50/40 flex items-center justify-between">
              <button
                onClick={() => step > 1 && goTo((step - 1) as Step)}
                disabled={step === 1 || submit.isPending}
                className="text-xs font-semibold text-ink-500 hover:text-ink-900 disabled:opacity-50">
                Back
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-400 mr-2">Step {step} of {STEPS.length}</span>
                {step < 4 ? (
                  <button
                    onClick={() => goTo((step + 1) as Step)}
                    className="btn-primary text-xs py-2">
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={onSubmit}
                    disabled={submit.isPending}
                    className="btn-primary text-xs py-2 disabled:opacity-60">
                    {submit.isPending
                      ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>)
                      : (<><FileText className="w-3.5 h-3.5" /> Sign &amp; issue contract</>)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────────

function Field({
  label, hint, required, full, children,
}: { label: string; hint?: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? 'md:col-span-2 lg:col-span-3' : ''}`}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-ink-600">
          {label}{required && <span className="text-danger-DEFAULT ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-ink-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function ContractPreview(props: {
  selectedUnit: { unitCode: string; floorName: string; areaSqm: number | null } | null;
  legalName: string; tradeName: string;
  monthlyRent: string; currency: string; deposit: string;
  leaseStart: string; leaseEnd: string;
  rentDueDay: string; escalation: string;
  noticeDays: string; permittedUse: string;
  extraClauses: string;
}) {
  const fmtRent = `${props.currency} ${Number(props.monthlyRent || 0).toLocaleString()}`;
  const fmtDeposit = props.deposit ? `${props.currency} ${Number(props.deposit).toLocaleString()}` : '—';

  return (
    <div className="border border-ink-200 rounded-xl bg-white shadow-xs overflow-hidden font-jakarta">
      <div className="px-6 py-4 border-b border-ink-100 bg-ink-50/40 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Lease Agreement · DRAFT</p>
          <p className="text-base font-bold text-ink-900 mt-0.5">{props.tradeName || '—'} · {props.selectedUnit?.unitCode ?? '—'}</p>
        </div>
        <span className="text-[11px] font-mono text-ink-400">Will be issued on sign</span>
      </div>

      <div className="px-6 py-5 space-y-5 text-sm text-ink-700 leading-relaxed">
        <Clause n="1." title="Parties">
          This Lease Agreement is entered into between the building owner (the &quot;Landlord&quot;)
          and <strong>{props.legalName || '—'}</strong> (the &quot;Tenant&quot;, doing business as <em>{props.tradeName || '—'}</em>).
        </Clause>

        <Clause n="2." title="Premises">
          The Landlord leases to the Tenant the unit identified as
          <strong> {props.selectedUnit?.unitCode ?? '—'}</strong> on the <strong>{props.selectedUnit?.floorName ?? '—'}</strong>,
          measuring approximately <strong>{props.selectedUnit?.areaSqm?.toFixed(1) ?? '—'} m²</strong> (the &quot;Premises&quot;).
        </Clause>

        <Clause n="3." title="Term">
          The lease begins on <strong>{props.leaseStart || '—'}</strong>
          {props.leaseEnd
            ? <> and ends on <strong>{props.leaseEnd}</strong>, unless extended in writing.</>
            : <> and continues month-to-month, terminable on <strong>{props.noticeDays || '60'} days</strong> written notice.</>}
        </Clause>

        <Clause n="4." title="Rent">
          The Tenant agrees to pay rent of <strong>{fmtRent}</strong> per calendar month, due on or before
          the <strong>{props.rentDueDay || '1'}</strong>{ordinal(Number(props.rentDueDay) || 1)} of each month.
          {props.escalation && Number(props.escalation) > 0 && (
            <> Rent shall escalate by <strong>{props.escalation}%</strong> on each anniversary of the lease start date.</>
          )}
        </Clause>

        <Clause n="5." title="Security deposit">
          A refundable security deposit of <strong>{fmtDeposit}</strong> shall be paid on or before the lease start
          and held by the Landlord as security for the Tenant&apos;s obligations.
        </Clause>

        <Clause n="6." title="Permitted use">
          The Premises shall be used solely for <strong>{props.permittedUse || '—'}</strong> and for no other purpose
          without the Landlord&apos;s prior written consent.
        </Clause>

        <Clause n="7." title="Maintenance and utilities">
          The Tenant shall maintain the interior of the Premises in good condition, comply with all
          building rules, and pay for its own utilities (water, electricity, internet) where separately
          metered. Common-area maintenance is included in rent.
        </Clause>

        <Clause n="8." title="Default and termination">
          If the Tenant fails to pay rent within ten (10) days of the due date, the Landlord may give
          written notice of default. Failure to cure within thirty (30) days entitles the Landlord
          to terminate this lease and recover possession of the Premises.
        </Clause>

        <Clause n="9." title="Mall directory consent">
          The Tenant consents to the publication of its shop name, category, contact details, hours,
          and photographs on the Landlord&apos;s mall platform (mallGuide). The Tenant may edit
          this information at any time through the tenant portal.
        </Clause>

        {props.extraClauses && (
          <Clause n="10." title="Additional terms">
            <span className="whitespace-pre-wrap">{props.extraClauses}</span>
          </Clause>
        )}
      </div>

      <div className="px-6 py-5 border-t border-ink-100 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Landlord</p>
          <div className="mt-2 border-b border-dashed border-ink-300 pb-1 text-xs text-ink-400 italic">Awaiting signature</div>
          <p className="text-[11px] text-ink-500 mt-1.5">Building owner · sign in next step</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Tenant</p>
          <div className="mt-2 border-b border-dashed border-ink-300 pb-1 text-xs text-ink-400 italic">Awaiting signature</div>
          <p className="text-[11px] text-ink-500 mt-1.5">Tenant signs after issuance via one-time link</p>
        </div>
      </div>
    </div>
  );
}

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-1">{n} {title}</p>
      <p className="text-sm text-ink-700 leading-relaxed">{children}</p>
    </div>
  );
}

function ordinal(n: number) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
