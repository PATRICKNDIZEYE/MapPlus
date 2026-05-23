'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Phone, MessageCircle, Globe, Building2, Calendar, Banknote,
  ShoppingBag, BarChart3, Receipt, Pencil, Trash2, Loader2, AlertCircle,
  CheckCircle2, Clock, AlertTriangle, ExternalLink, Eye, Navigation,
  Sparkles, ShieldCheck, FileText, Image as ImageIcon, Globe2,
} from 'lucide-react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

type Tab = 'overview' | 'payments' | 'traffic' | 'catalog' | 'lease';

const TAB_LIST: Array<{ key: Tab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }> = [
  { key: 'overview', label: 'Overview', icon: Sparkles    },
  { key: 'payments', label: 'Payments', icon: Receipt     },
  { key: 'traffic',  label: 'Traffic',  icon: BarChart3   },
  { key: 'catalog',  label: 'Catalog',  icon: ShoppingBag },
  { key: 'lease',    label: 'Lease',    icon: FileText    },
];

const VERIFICATION_BADGE: Record<string, { variant: 'green' | 'amber' | 'gray' | 'red'; label: string }> = {
  verified:       { variant: 'green', label: 'Verified'        },
  needs_review:   { variant: 'amber', label: 'Needs review'    },
  unverified:     { variant: 'gray',  label: 'Unverified'      },
  reported_wrong: { variant: 'red',   label: 'Reported wrong'  },
};

function fmtMoney(n: number | null | undefined, currency = 'USD') {
  if (n == null) return '—';
  return `${currency} ${Math.round(n).toLocaleString()}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMonth(period: string) {
  const [y, m] = period.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

function initials(name: string) {
  const w = name.trim().split(/\s+/);
  if (w.length === 1) return name.slice(0, 2).toUpperCase();
  return (w[0]![0]! + w[1]![0]!).toUpperCase();
}

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tab, setTab] = useState<Tab>('overview');

  const { data, isLoading, error } = trpc.tenants.detail.useQuery(
    { tenantId },
    { enabled: !!tenantId },
  );

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
            <p className="text-sm font-semibold text-ink-900">Tenant not found</p>
            <p className="text-xs text-ink-500 mt-1">{error?.message ?? 'No tenant record matches this ID.'}</p>
            <Link href="/mall/tenants" className="btn-secondary text-xs py-2 mt-5 inline-flex">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to tenants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const verification = data.verificationStatus ? VERIFICATION_BADGE[data.verificationStatus] : null;
  const name = data.tradeName ?? data.publicName ?? '—';

  return (
    <div className="min-h-full bg-ink-50/40">

      {/* Top breadcrumb */}
      <div className="px-6 pt-5 pb-3">
        <Link href="/mall/tenants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> All tenants
        </Link>
      </div>

      {/* Hero — cover + identity */}
      <div className="px-6">
        <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
          <div className="relative h-40 bg-gradient-to-br from-primary-600 via-primary-500 to-violet-600 overflow-hidden">
            {data.coverPhotoUrl ? (
              <Image src={data.coverPhotoUrl} alt={name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 1200px" />
            ) : (
              <div className="absolute inset-0"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                }}
              />
            )}
          </div>

          <div className="px-6 pb-5 -mt-12 relative">
            <div className="flex items-end gap-4 flex-wrap">
              {/* Logo */}
              <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                {data.logoUrl ? (
                  <Image src={data.logoUrl} alt={name} width={88} height={88} className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-ink-900 flex items-center justify-center text-white text-xl font-extrabold tracking-tight">
                    {initials(name)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-12">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-extrabold text-ink-900 tracking-tight truncate">{name}</h1>
                  {verification && <Badge variant={verification.variant} dot>{verification.label}</Badge>}
                  {data.isPublished && <Badge variant="blue" dot>Published</Badge>}
                </div>
                <p className="text-sm text-ink-500 mt-1 truncate">{data.legalName}</p>
                <p className="text-xs text-ink-400 mt-1.5 flex items-center gap-3 flex-wrap">
                  {data.category && <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" strokeWidth={2} /> {data.category}</span>}
                  {data.unitCode && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" strokeWidth={2} />
                      <Link href="/mall/units" className="font-mono font-semibold hover:text-ink-700">
                        {data.unitCode}
                      </Link>
                      <span className="text-ink-300"> · {data.floorName}</span>
                      {data.areaSqm != null && <span className="text-ink-300"> · {data.areaSqm.toFixed(0)} m²</span>}
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-12 flex items-center gap-2 flex-shrink-0">
                <button className="btn-secondary text-xs py-2"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <Link href={data.shopId ? `/map/chic-kigali?shop=${data.shopId}` : '/map/chic-kigali'}
                  target="_blank"
                  className="btn-primary text-xs py-2">
                  <ExternalLink className="w-3.5 h-3.5" /> View on map
                </Link>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-ink-100 px-6 flex items-center gap-1 overflow-x-auto">
            {TAB_LIST.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px
                    ${active ? 'border-primary-600 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800'}`}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-6">
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'payments' && <PaymentsTab data={data} />}
        {tab === 'traffic'  && <TrafficTab tenantId={tenantId} totals={data.traffic} />}
        {tab === 'catalog'  && <CatalogTab catalog={data.catalog} />}
        {tab === 'lease'    && <LeaseTab data={data} />}
      </div>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────

type DetailData = NonNullable<ReturnType<typeof trpc.tenants.detail.useQuery>['data']>;

// ── Overview tab ────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: DetailData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl">

      <div className="lg:col-span-2 space-y-5">
        {/* Description */}
        <Card title="About">
          <p className="text-sm text-ink-700 leading-relaxed">
            {data.description ?? <span className="text-ink-400 italic">No description yet. The tenant can write one from their portal.</span>}
          </p>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Monthly rent"  value={fmtMoney(data.monthlyRent, data.currency)} sub="Lease record" />
          <Stat label="Profile views" value={(data.traffic.views ?? 0).toLocaleString()} sub="Last 30 days" />
          <Stat label="Directions"    value={(data.traffic.directions ?? 0).toLocaleString()} sub="Last 30 days" />
          <Stat label="Calls"         value={(data.traffic.calls ?? 0).toLocaleString()} sub="Last 30 days" />
        </div>

        {/* Operating hours */}
        <Card title="Operating hours">
          {data.operatingHours
            ? <OperatingHours hours={data.operatingHours} />
            : <p className="text-sm text-ink-400 italic">Not set. The tenant can configure hours from their portal.</p>}
        </Card>

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <Card title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((t) => (
                <span key={t} className="text-[11px] font-medium text-ink-700 bg-ink-100 px-2 py-1 rounded-md">{t}</span>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-5">
        {/* Contact */}
        <Card title="Contact">
          <ContactRow icon={Phone}         value={data.contactPhone ?? data.shopPhone} href={(data.contactPhone ?? data.shopPhone) ? `tel:${data.contactPhone ?? data.shopPhone}` : null} />
          <ContactRow icon={MessageCircle} value={data.contactWhatsapp} href={data.contactWhatsapp ? `https://wa.me/${(data.contactWhatsapp ?? '').replace(/\D/g, '')}` : null} />
          <ContactRow icon={Mail}          value={data.contactEmail ?? data.shopEmail} href={(data.contactEmail ?? data.shopEmail) ? `mailto:${data.contactEmail ?? data.shopEmail}` : null} />
          <ContactRow icon={Globe2}        value={data.website ?? null} href={data.website ?? null} />
        </Card>

        {/* Profile health */}
        <Card title="Profile health">
          <Health label="Public name"        done={!!data.publicName} />
          <Health label="Category"           done={!!data.category} />
          <Health label="Description"        done={!!data.description} />
          <Health label="Phone or email"     done={!!(data.contactPhone ?? data.shopPhone ?? data.contactEmail)} />
          <Health label="Cover photo"        done={!!data.coverPhotoUrl} />
          <Health label="Logo"               done={!!data.logoUrl} />
          <Health label="Operating hours"    done={!!data.operatingHours} />
          <Health label="Catalog items"      done={data.catalog.length > 0} />
        </Card>
      </div>
    </div>
  );
}

// ── Payments tab ─────────────────────────────────────────────────────────

function PaymentsTab({ data }: { data: DetailData }) {
  const paid    = data.payments.filter((p) => p.status === 'paid');
  const due     = data.payments.filter((p) => p.status === 'due');
  const late    = data.payments.filter((p) => p.status === 'late');
  const collected = paid.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Collected"  value={fmtMoney(collected, data.currency)} sub={`${paid.length} payments`} />
        <Stat label="Outstanding" value={fmtMoney(late.reduce((s, p) => s + p.amount, 0), data.currency)} sub={`${late.length} late`} accent={late.length ? 'danger' : undefined} />
        <Stat label="Due this month" value={fmtMoney(due[0]?.amount ?? 0, data.currency)} sub={due[0] ? fmtMonth(due[0].period) : '—'} />
        <Stat label="Monthly rent" value={fmtMoney(data.monthlyRent, data.currency)} sub={data.leaseStart ? `Since ${fmtDate(data.leaseStart)}` : '—'} />
      </div>

      <div className="card overflow-hidden">
        <div className="card-header py-3">
          <h3 className="text-sm font-semibold text-ink-900">Payment history</h3>
          <span className="text-[11px] text-ink-400">Latest first · synthesised for demo</span>
        </div>
        {data.payments.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-ink-400">
            No lease start date set — payment history can&apos;t be generated.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/40">
                <th className="text-left px-5 py-2.5 text-[10px] font-bold text-ink-400 uppercase tracking-widest">Period</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-ink-400 uppercase tracking-widest">Status</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-ink-400 uppercase tracking-widest">Amount</th>
                <th className="text-right px-5 py-2.5 text-[10px] font-bold text-ink-400 uppercase tracking-widest">Paid on</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.period} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-2.5 text-sm font-semibold text-ink-900">{fmtMonth(p.period)}</td>
                  <td className="px-4 py-2.5">
                    <PaymentBadge status={p.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums font-semibold text-ink-900">
                    {fmtMoney(p.amount, data.currency)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-xs text-ink-500 tabular-nums">{p.paidAt ? fmtDate(p.paidAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status: 'paid' | 'due' | 'late' }) {
  if (status === 'paid') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-700"><CheckCircle2 className="w-3 h-3" strokeWidth={2.5} /> Paid</span>;
  if (status === 'due')  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning-700"><Clock        className="w-3 h-3" strokeWidth={2.5} /> Due</span>;
  return                       <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger-700"><AlertTriangle className="w-3 h-3" strokeWidth={2.5} /> Late</span>;
}

// ── Traffic tab ──────────────────────────────────────────────────────────

function TrafficTab({ tenantId, totals }: { tenantId: string; totals: DetailData['traffic'] }) {
  const { data: series, isLoading } = trpc.tenants.trafficSeries.useQuery({ tenantId, days: 30 });

  const max = useMemo(() => Math.max(1, ...(series ?? []).map((d) => d.views)), [series]);

  return (
    <div className="space-y-5 max-w-6xl">

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Profile views"      value={totals.views.toLocaleString()}      sub="last 30 days" icon={Eye} />
        <Stat label="Direction requests" value={totals.directions.toLocaleString()} sub="last 30 days" icon={Navigation} />
        <Stat label="Contact clicks"     value={totals.calls.toLocaleString()}      sub="last 30 days" icon={Phone} />
      </div>

      <div className="card overflow-hidden">
        <div className="card-header py-3">
          <h3 className="text-sm font-semibold text-ink-900">Daily profile views · last 30 days</h3>
          {totals.synthetic && <span className="text-[11px] text-warning-700 font-medium">Synthesised demo data</span>}
        </div>
        <div className="px-5 py-5">
          {isLoading || !series ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
            </div>
          ) : (
            <div className="flex items-end gap-1 h-44">
              {series.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full bg-primary-500 rounded-t-sm hover:bg-primary-600 transition-colors relative"
                    style={{ height: `${Math.max(4, (d.views / max) * 160)}px` }}
                    title={`${d.day} · ${d.views} views`}
                  />
                </div>
              ))}
            </div>
          )}
          {series && (
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-ink-400">
              <span>{series[0]?.day}</span>
              <span>{series[Math.floor(series.length / 2)]?.day}</span>
              <span>{series[series.length - 1]?.day}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Catalog tab ──────────────────────────────────────────────────────────

function CatalogTab({ catalog }: { catalog: DetailData['catalog'] }) {
  if (!catalog.length) {
    return (
      <div className="max-w-2xl">
        <div className="card overflow-hidden">
          <div className="px-6 py-10 text-center">
            <ShoppingBag className="w-7 h-7 text-ink-300 mx-auto mb-3" strokeWidth={2} />
            <p className="text-sm font-semibold text-ink-900">No products published yet</p>
            <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
              The tenant can add their catalogue from the tenant portal. Items become searchable on the public map immediately.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="card overflow-hidden">
        <div className="card-header py-3">
          <h3 className="text-sm font-semibold text-ink-900">Catalog</h3>
          <span className="text-[11px] text-ink-400 tabular-nums">{catalog.length} items</span>
        </div>

        <div className="divide-y divide-ink-100">
          {catalog.map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-4 hover:bg-ink-50/50">
              <div className="w-12 h-12 rounded-lg bg-ink-50 border border-ink-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {p.imageUrl
                  ? <Image src={p.imageUrl} alt={p.name} width={48} height={48} className="object-cover" />
                  : <ImageIcon className="w-4 h-4 text-ink-300" strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                {p.description && <p className="text-xs text-ink-500 truncate">{p.description}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-ink-900 tabular-nums">{p.price ?? '—'}</p>
                <p className="text-[10px] text-ink-400">{p.currency}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Lease tab ────────────────────────────────────────────────────────────

function LeaseTab({ data }: { data: DetailData }) {
  return (
    <div className="max-w-3xl space-y-5">
      <Card title="Lease record">
        <Row label="Legal name"      value={data.legalName} />
        <Row label="Trade name"      value={data.tradeName} />
        <Row label="Lease start"     value={fmtDate(data.leaseStart)} />
        <Row label="Lease end"       value={fmtDate(data.leaseEnd)} />
        <Row label="Monthly rent"    value={fmtMoney(data.monthlyRent, data.currency)} bold />
        <Row label="Security deposit" value={fmtMoney(data.depositAmount, data.currency)} />
      </Card>

      <Card title="Unit">
        <Row label="Unit code"    value={data.unitCode ?? '—'} mono />
        <Row label="Unit name"    value={data.unitName ?? '—'} />
        <Row label="Floor"        value={data.floorName ?? '—'} />
        <Row label="Area"         value={data.areaSqm != null ? `${data.areaSqm.toFixed(1)} m²` : '—'} />
        <Row label="Floor rate"   value={data.floorPricePerSqm != null ? `${fmtMoney(data.floorPricePerSqm, data.floorCurrency ?? data.currency)} / m²` : '—'} />
      </Card>

      <Card title="Status">
        <Row label="Verification">
          {data.verificationStatus
            ? <Badge variant={(VERIFICATION_BADGE[data.verificationStatus]?.variant) ?? 'gray'} dot>{VERIFICATION_BADGE[data.verificationStatus]?.label}</Badge>
            : '—'}
        </Row>
        <Row label="Published"    value={data.isPublished ? 'Yes' : 'No'} />
        <Row label="Wrong-info reports" value={String(data.reportCount ?? 0)} />
      </Card>

      <div className="card overflow-hidden border-danger-100">
        <div className="px-5 py-4 border-b border-danger-100 bg-danger-50/40 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-ink-900">Unassign tenant</p>
            <p className="text-xs text-ink-500 mt-0.5">Frees the unit, deletes the shop profile and lease record. Cannot be undone.</p>
          </div>
          <button className="inline-flex items-center gap-1.5 bg-white border border-danger-200 text-danger-700 hover:bg-danger-50 text-xs font-semibold px-3 py-2 rounded-lg">
            <Trash2 className="w-3.5 h-3.5" /> Unassign
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="card-header py-3">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Stat({
  label, value, sub, accent, icon: Icon,
}: { label: string; value: string; sub: string; accent?: 'danger'; icon?: React.ComponentType<{ className?: string; strokeWidth?: number }> }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3 h-3 text-ink-400" strokeWidth={2} />}
        <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-xl font-extrabold tabular-nums tracking-tight ${accent === 'danger' ? 'text-danger-700' : 'text-ink-900'}`}>
        {value}
      </p>
      <p className="text-[10px] text-ink-400 mt-0.5">{sub}</p>
    </div>
  );
}

function Row({
  label, value, children, mono, bold,
}: { label: string; value?: string; children?: React.ReactNode; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0 last:pb-0 border-b border-ink-50 last:border-0">
      <span className="text-xs text-ink-400">{label}</span>
      <span className={`text-right ${bold ? 'font-bold text-ink-900' : 'text-ink-800 font-medium'} ${mono ? 'font-mono' : ''}`}>
        {children ?? value ?? '—'}
      </span>
    </div>
  );
}

function ContactRow({
  icon: Icon, value, href,
}: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; value: string | null; href: string | null }) {
  if (!value) return (
    <div className="flex items-center gap-2.5 py-1.5 text-ink-300">
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      <span className="text-xs italic">Not set</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" strokeWidth={2} />
      {href
        ? <a href={href} target="_blank" rel="noreferrer" className="text-xs text-ink-700 hover:text-primary-600 truncate">{value}</a>
        : <span className="text-xs text-ink-700 truncate">{value}</span>}
    </div>
  );
}

function Health({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done
        ? <CheckCircle2 className="w-3.5 h-3.5 text-success-DEFAULT flex-shrink-0" strokeWidth={2.5} />
        : <span className="w-3.5 h-3.5 rounded-full border border-ink-200 flex-shrink-0" />}
      <span className={done ? 'text-ink-700' : 'text-ink-400'}>{label}</span>
    </div>
  );
}

function OperatingHours({ hours }: { hours: unknown }) {
  if (!hours || typeof hours !== 'object') return <p className="text-xs text-ink-400">Invalid hours data.</p>;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const map  = hours as Record<string, { open?: string; close?: string; closed?: boolean }>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-xs">
      {days.map((d) => {
        const day = map[d.toLowerCase()];
        return (
          <div key={d} className="text-center">
            <p className="text-[10px] font-bold text-ink-400 uppercase">{d}</p>
            <p className={`mt-1 font-mono tabular-nums ${day?.closed ? 'text-ink-300' : 'text-ink-800'}`}>
              {day?.closed ? 'Closed' : (day?.open && day?.close ? `${day.open}–${day.close}` : '—')}
            </p>
          </div>
        );
      })}
    </div>
  );
}
