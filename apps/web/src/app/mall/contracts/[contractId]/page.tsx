'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Loader2, AlertCircle, Check, CheckCircle2,
  Printer, Copy, FileText, ShieldCheck, Clock, Sparkles,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

const STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'gray' | 'red' | 'blue'; label: string }> = {
  draft:          { variant: 'gray',  label: 'Draft'             },
  pending_tenant: { variant: 'amber', label: 'Awaiting tenant'   },
  active:         { variant: 'green', label: 'Active'            },
  terminated:     { variant: 'red',   label: 'Terminated'        },
  expired:        { variant: 'gray',  label: 'Expired'           },
};

function fmtMoney(n: number | null, currency = 'USD') {
  if (n == null) return '—';
  return `${currency} ${Math.round(n).toLocaleString()}`;
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function ordinal(n: number) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

export default function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const justCreated = useSearchParams().get('just_created') === '1';
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.contracts.byId.useQuery(
    { contractId }, { enabled: !!contractId },
  );

  const [signerName, setSignerName] = useState('');
  const [signError,  setSignError]  = useState<string | null>(null);
  const [copied,     setCopied]     = useState(false);

  const { data: me } = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60_000 });
  useEffect(() => {
    if (me && !signerName) {
      const composed = [me.firstName, me.lastName].filter(Boolean).join(' ');
      setSignerName(composed || me.email);
    }
  }, [me]); // eslint-disable-line

  const ownerSign = trpc.contracts.signByOwner.useMutation({
    onSuccess: async () => { await utils.contracts.byId.invalidate({ contractId }); },
    onError: (e) => setSignError(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-10 max-w-md mx-auto">
        <div className="card overflow-hidden">
          <div className="px-6 py-8 text-center">
            <AlertCircle className="w-7 h-7 text-danger-DEFAULT mx-auto mb-3" strokeWidth={2} />
            <p className="text-sm font-semibold text-ink-900">Contract not found</p>
            <p className="text-xs text-ink-500 mt-1">{error?.message ?? 'No record matches this ID.'}</p>
            <Link href="/mall/tenants" className="btn-secondary text-xs py-2 mt-5 inline-flex">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to tenants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[data.status] ?? STATUS_BADGE.draft;
  const ownerSigned = !!data.ownerSignedAt;
  const tenantSigned = !!data.tenantSignedAt;

  // Tenant signing URL (token-based, single-use)
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const tenantSignUrl = data.tenantSignToken
    ? `${origin}/contracts/sign/${data.tenantSignToken}`
    : null;

  function copyLink() {
    if (!tenantSignUrl) return;
    navigator.clipboard.writeText(tenantSignUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-full bg-ink-50/40 print:bg-white">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between print:hidden">
        <Link href={`/mall/tenants/${data.tenantId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> Back to tenant
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary text-xs py-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {justCreated && (
        <div className="px-6 mb-4 print:hidden">
          <div className="max-w-5xl mx-auto bg-success-50 border border-success-100 rounded-xl px-5 py-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-success-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-sm font-bold text-ink-900">Lease created and tenant assigned.</p>
              <p className="text-xs text-ink-600 mt-0.5">
                Sign below to issue the contract. The tenant can then sign via a one-time link.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pb-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* Contract document */}
          <article className="bg-white border border-ink-200 rounded-2xl overflow-hidden shadow-xs print:shadow-none print:border-0">

            <header className="px-8 py-6 border-b border-ink-100">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-400">Lease Agreement</p>
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 mt-1">
                    {data.tenantTradeName ?? data.tenantLegalName}
                  </h1>
                  <p className="text-sm text-ink-500 mt-1">
                    {data.unitCode} · {data.floorName} · {data.buildingName}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={badge.variant} dot>{badge.label}</Badge>
                  <p className="text-[11px] font-mono text-ink-400 mt-2">{data.contractNumber}</p>
                </div>
              </div>
            </header>

            <div className="px-8 py-7 space-y-6 text-sm text-ink-700 leading-relaxed">

              <Clause n="1." title="Parties">
                This Lease Agreement (the &quot;Agreement&quot;) is entered into between
                <strong> {data.orgName}</strong> (the &quot;Landlord&quot;) and
                <strong> {data.tenantLegalName}</strong> doing business as <em>{data.tenantTradeName}</em> (the &quot;Tenant&quot;).
              </Clause>

              <Clause n="2." title="Premises">
                The Landlord leases to the Tenant unit <strong>{data.unitCode}</strong> on the
                <strong> {data.floorName}</strong> of <strong>{data.buildingName}</strong>
                {data.terms && (data.terms as any).premises?.areaSqm != null && (
                  <>, measuring approximately <strong>{(data.terms as any).premises.areaSqm.toFixed(1)} m²</strong></>
                )}
                {' '}(the &quot;Premises&quot;).
              </Clause>

              <Clause n="3." title="Term">
                The lease begins on <strong>{fmtDate(data.leaseStart)}</strong>
                {data.leaseEnd
                  ? <> and ends on <strong>{fmtDate(data.leaseEnd)}</strong>, unless extended in writing.</>
                  : <> and continues month-to-month, terminable on <strong>{data.noticePeriodDays} days</strong> written notice by either party.</>}
              </Clause>

              <Clause n="4." title="Rent">
                The Tenant shall pay rent of <strong>{fmtMoney(data.monthlyRent, data.currency)}</strong> per calendar month,
                due on or before the <strong>{data.rentDueDay}</strong>{ordinal(data.rentDueDay)} of each month.
                {data.annualEscalationPct && data.annualEscalationPct > 0 && (
                  <> Rent escalates by <strong>{data.annualEscalationPct}%</strong> on each anniversary of the lease start.</>
                )}
              </Clause>

              <Clause n="5." title="Security deposit">
                A refundable security deposit of <strong>{fmtMoney(data.depositAmount, data.currency)}</strong> shall be
                paid on or before the lease start and held by the Landlord as security against the Tenant&apos;s obligations.
              </Clause>

              <Clause n="6." title="Permitted use">
                The Premises shall be used solely for <strong>{data.permittedUse ?? '—'}</strong> and for no other
                purpose without the Landlord&apos;s prior written consent.
              </Clause>

              <Clause n="7." title="Maintenance and utilities">
                The Tenant shall maintain the interior of the Premises in good condition, comply with all
                building rules, and pay for its own utilities where separately metered. Common-area
                maintenance is included in the rent.
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

              {(data.terms as any)?.extraClauses && (
                <Clause n="10." title="Additional terms">
                  <span className="whitespace-pre-wrap">{(data.terms as any).extraClauses}</span>
                </Clause>
              )}
            </div>

            {/* Signatures */}
            <div className="px-8 py-6 border-t border-ink-100 grid grid-cols-2 gap-8">
              <SignatureBlock
                role="Landlord"
                signerName={data.ownerSignerName}
                signedAt={data.ownerSignedAt}
                fallbackOrg={data.orgName}
              />
              <SignatureBlock
                role="Tenant"
                signerName={data.tenantSignerName}
                signedAt={data.tenantSignedAt}
                fallbackOrg={data.tenantLegalName}
              />
            </div>

            <div className="px-8 py-4 border-t border-ink-100 bg-ink-50/30 flex items-center justify-between text-[10px] font-mono text-ink-400">
              <span>{data.contractNumber}</span>
              <span>Generated {fmtDateTime(data.createdAt)}</span>
            </div>
          </article>

          {/* Right rail — actions */}
          <aside className="space-y-3 print:hidden">

            {/* Status / actions card */}
            <div className="card overflow-hidden">
              <div className="card-header py-3">
                <h3 className="text-sm font-semibold text-ink-900">Signing</h3>
                <Badge variant={badge.variant} dot>{badge.label}</Badge>
              </div>

              <div className="px-4 py-4 space-y-3 text-xs">
                <SignStatusRow
                  label="Landlord"
                  signed={ownerSigned}
                  name={data.ownerSignerName ?? null}
                  at={data.ownerSignedAt}
                />
                <SignStatusRow
                  label="Tenant"
                  signed={tenantSigned}
                  name={data.tenantSignerName ?? null}
                  at={data.tenantSignedAt}
                />
              </div>

              {!ownerSigned && (
                <div className="px-4 py-3 border-t border-ink-100 bg-ink-50/40 space-y-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-ink-600">Your full name</span>
                    <input className="input-base mt-1" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                  </label>
                  {signError && (
                    <div className="flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-[11px] px-2 py-1.5 rounded-md">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" strokeWidth={2} />
                      {signError}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSignError(null);
                      if (signerName.trim().length < 2) { setSignError('Type your full name.'); return; }
                      ownerSign.mutate({ contractId, fullName: signerName.trim() });
                    }}
                    disabled={ownerSign.isPending}
                    className="btn-primary text-xs py-2 w-full justify-center disabled:opacity-60">
                    {ownerSign.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : (<><ShieldCheck className="w-3.5 h-3.5" /> Sign as landlord</>)}
                  </button>
                </div>
              )}

              {ownerSigned && !tenantSigned && tenantSignUrl && (
                <div className="px-4 py-3 border-t border-ink-100 bg-ink-50/40">
                  <p className="text-[11px] font-semibold text-ink-600 mb-1.5">Tenant signing link</p>
                  <p className="text-[10px] text-ink-500 mb-2 leading-relaxed">
                    Single-use link. Send it to the tenant — they sign without needing an account.
                  </p>
                  <div className="flex items-stretch gap-1">
                    <input readOnly value={tenantSignUrl}
                      className="input-base font-mono text-[10px] flex-1" />
                    <button onClick={copyLink}
                      className="btn-secondary text-xs px-2 flex-shrink-0">
                      {copied ? <Check className="w-3.5 h-3.5 text-success-DEFAULT" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {ownerSigned && tenantSigned && (
                <div className="px-4 py-3 border-t border-success-100 bg-success-50/50 flex items-center gap-2 text-xs text-success-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
                  Both parties have signed. Lease is active.
                </div>
              )}
            </div>

            {/* Quick summary */}
            <div className="card overflow-hidden">
              <div className="card-header py-3">
                <h3 className="text-sm font-semibold text-ink-900">Terms summary</h3>
              </div>
              <div className="px-4 py-3 text-xs space-y-1.5">
                <SummaryRow label="Premises"  value={`${data.unitCode} · ${data.floorName}`} mono />
                <SummaryRow label="Rent"      value={fmtMoney(data.monthlyRent, data.currency) + ' / mo'} bold />
                <SummaryRow label="Deposit"   value={fmtMoney(data.depositAmount, data.currency)} />
                <SummaryRow label="Start"     value={fmtDate(data.leaseStart)} />
                <SummaryRow label="End"       value={data.leaseEnd ? fmtDate(data.leaseEnd) : 'Month-to-month'} />
                <SummaryRow label="Rent due"  value={`${data.rentDueDay}${ordinal(data.rentDueDay)} of month`} />
                {data.annualEscalationPct != null && (
                  <SummaryRow label="Escalation" value={`${data.annualEscalationPct}% / yr`} />
                )}
              </div>
            </div>

            <Link href={`/mall/tenants/${data.tenantId}`}
              className="btn-secondary text-xs py-2 w-full justify-center">
              <FileText className="w-3.5 h-3.5" /> Open tenant page <ArrowRight className="w-3 h-3" />
            </Link>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          aside { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-1.5">{n} {title}</p>
      <p className="text-sm text-ink-700 leading-relaxed">{children}</p>
    </div>
  );
}

function SignatureBlock({
  role, signerName, signedAt, fallbackOrg,
}: { role: string; signerName: string | null; signedAt: string | null; fallbackOrg: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{role}</p>
      {signedAt && signerName ? (
        <>
          <p className="mt-2 text-lg font-extrabold tracking-tight text-ink-900"
             style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive' }}>
            {signerName}
          </p>
          <div className="mt-1 border-b border-ink-300 pb-1" />
          <p className="text-[11px] text-ink-500 mt-1.5">
            <CheckCircle2 className="w-3 h-3 text-success-DEFAULT inline -mt-0.5 mr-1" strokeWidth={2.5} />
            Signed {new Date(signedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </>
      ) : (
        <>
          <div className="mt-2 border-b border-dashed border-ink-300 pb-1 text-xs text-ink-400 italic">Awaiting signature</div>
          <p className="text-[11px] text-ink-500 mt-1.5">{fallbackOrg}</p>
        </>
      )}
    </div>
  );
}

function SignStatusRow({
  label, signed, name, at,
}: { label: string; signed: boolean; name: string | null; at: string | null }) {
  return (
    <div className="flex items-start gap-2">
      {signed
        ? <CheckCircle2 className="w-3.5 h-3.5 text-success-DEFAULT mt-0.5 flex-shrink-0" strokeWidth={2.5} />
        : <Clock        className="w-3.5 h-3.5 text-ink-300        mt-0.5 flex-shrink-0" strokeWidth={2} />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-ink-700">{label}</p>
        <p className="text-[11px] text-ink-500 truncate">
          {signed ? (name ?? '—') : 'Pending'}
        </p>
        {signed && at && (
          <p className="text-[10px] font-mono text-ink-400 mt-0.5">
            {new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-ink-400">{label}</span>
      <span className={`text-right ${bold ? 'font-bold text-ink-900' : 'text-ink-700 font-medium'} ${mono ? 'font-mono' : 'tabular-nums'}`}>
        {value}
      </span>
    </div>
  );
}
