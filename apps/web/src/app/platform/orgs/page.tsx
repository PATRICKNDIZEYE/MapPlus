'use client';

import { useState } from 'react';
import {
  Building2, Plus, Loader2, X, MapPin, CheckCircle2, PauseCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

const STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  active:     { label: 'Active',     variant: 'green' },
  inactive:   { label: 'Inactive',   variant: 'gray'  },
  onboarding: { label: 'Onboarding', variant: 'amber' },
  suspended:  { label: 'Suspended',  variant: 'red'   },
};

export default function PlatformOrgsPage() {
  const orgs      = trpc.platform.listOrgs.useQuery();
  const buildings = trpc.platform.listBuildings.useQuery();
  const [showOrgForm,      setShowOrgForm]      = useState(false);
  const [showBuildingForm, setShowBuildingForm] = useState(false);

  return (
    <div className="px-8 py-7 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Platform Console</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Orgs &amp; malls</h1>
          <p className="text-sm text-ink-500 mt-1">Onboard new mall operators and the buildings they manage.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Orgs */}
        <section className="card overflow-hidden">
          <div className="card-header py-3 px-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Organizations</h2>
            <button onClick={() => setShowOrgForm(true)} className="btn-primary text-xs py-1.5 px-3">
              <Plus className="w-3 h-3" /> New org
            </button>
          </div>
          {orgs.isLoading ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
          ) : !orgs.data?.length ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500">
              <Building2 className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
              No mall operators yet.
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {orgs.data.map((o) => (
                <li key={o.id} className="px-5 py-3">
                  <p className="text-sm font-semibold text-ink-900">{o.name}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {o.type.replace('_', ' ')} · {o.buildingCount} building{o.buildingCount === 1 ? '' : 's'} · {o.tenantCount} tenant{o.tenantCount === 1 ? '' : 's'}
                  </p>
                  {(o.contactEmail || o.contactPhone) && (
                    <p className="text-[11px] text-ink-400 mt-0.5">{o.contactEmail} {o.contactPhone && `· ${o.contactPhone}`}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Buildings */}
        <section className="card overflow-hidden">
          <div className="card-header py-3 px-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Buildings</h2>
            <button
              onClick={() => setShowBuildingForm(true)}
              disabled={!orgs.data?.length}
              className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
            >
              <Plus className="w-3 h-3" /> New building
            </button>
          </div>
          {buildings.isLoading ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
          ) : !buildings.data?.length ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500">
              <Building2 className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
              Create an org first, then add its first building.
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {buildings.data.map((b) => <BuildingRow key={b.id} building={b} onChanged={() => buildings.refetch()} />)}
            </ul>
          )}
        </section>
      </div>

      {showOrgForm && <OrgForm onClose={() => setShowOrgForm(false)} onCreated={() => { setShowOrgForm(false); orgs.refetch(); }} />}
      {showBuildingForm && orgs.data && <BuildingForm orgs={orgs.data} onClose={() => setShowBuildingForm(false)} onCreated={() => { setShowBuildingForm(false); buildings.refetch(); }} />}
    </div>
  );
}

type Building = {
  id: string;
  name: string;
  slug: string;
  orgName: string | null;
  city: string | null;
  status: string;
  floorsCount: number;
  unitCount: number;
  tenantCount: number;
};

function BuildingRow({ building, onChanged }: { building: Building; onChanged: () => void }) {
  const meta = STATUS_BADGE[building.status] ?? { label: building.status, variant: 'gray' as const };
  const suspend = trpc.platform.suspendBuilding.useMutation({ onSuccess: () => onChanged() });
  const activate = trpc.platform.activateBuilding.useMutation({ onSuccess: () => onChanged() });

  return (
    <li className="px-5 py-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 text-primary-600" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-ink-900 truncate">{building.name}</p>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <p className="text-[11px] text-ink-500">
          {building.orgName} · <code className="text-ink-700">{building.slug}</code>
          {building.city && <> · <span className="inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" strokeWidth={2.5} /> {building.city}</span></>}
        </p>
        <p className="text-[11px] text-ink-400 mt-0.5">
          {building.floorsCount} floors · {building.unitCount} units · {building.tenantCount} tenants
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {building.status === 'suspended' ? (
          <button onClick={() => activate.mutate({ buildingId: building.id })} disabled={activate.isPending}
            className="text-xs font-semibold text-success-700 hover:text-success-700/80 inline-flex items-center gap-1">
            {activate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Activate
          </button>
        ) : (
          <button onClick={() => suspend.mutate({ buildingId: building.id })} disabled={suspend.isPending}
            className="text-xs font-semibold text-danger-700 hover:text-danger-700/80 inline-flex items-center gap-1">
            {suspend.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <PauseCircle className="w-3 h-3" />}
            Suspend
          </button>
        )}
      </div>
    </li>
  );
}

function OrgForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'building_owner' | 'management_company' | 'property_manager'>('building_owner');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const create = trpc.platform.createOrg.useMutation({ onSuccess: () => onCreated(), onError: (e) => setErr(e.message) });

  return (
    <Modal title="New mall org" onClose={onClose}>
      <Field label="Org name" required>
        <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
      </Field>
      <Field label="Type">
        <select className="input-base" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="building_owner">Building owner</option>
          <option value="management_company">Management company</option>
          <option value="property_manager">Property manager</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact email">
          <input className="input-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contact phone">
          <input className="input-base" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      {err && <p className="text-xs text-danger-700 mt-2">{err}</p>}
      <FormActions
        onCancel={onClose}
        loading={create.isPending}
        submitLabel="Create org"
        onSubmit={() => {
          if (name.trim().length < 2) { setErr('Name is required.'); return; }
          create.mutate({
            name: name.trim(),
            type,
            contactEmail: email.trim() || undefined,
            contactPhone: phone.trim() || undefined,
          });
        }}
      />
    </Modal>
  );
}

type Org = { id: string; name: string };

function BuildingForm({ orgs, onClose, onCreated }: { orgs: Org[]; onClose: () => void; onCreated: () => void }) {
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? '');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [floors, setFloors] = useState('1');
  const [err, setErr] = useState<string | null>(null);
  const create = trpc.platform.createBuilding.useMutation({ onSuccess: () => onCreated(), onError: (e) => setErr(e.message) });

  function autoSlug(value: string) {
    setName(value);
    if (!slug) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }

  return (
    <Modal title="New building" onClose={onClose}>
      <Field label="Owner org" required>
        <select className="input-base" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Building name" required>
          <input className="input-base" value={name} onChange={(e) => autoSlug(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Slug (URL)" required>
          <input className="input-base font-mono" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} maxLength={100} />
        </Field>
      </div>
      <Field label="Address">
        <input className="input-base" value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="Number of floors">
        <input className="input-base" type="number" min={1} max={50} value={floors} onChange={(e) => setFloors(e.target.value)} />
      </Field>
      {err && <p className="text-xs text-danger-700 mt-2">{err}</p>}
      <FormActions
        onCancel={onClose}
        loading={create.isPending}
        submitLabel="Create building"
        onSubmit={() => {
          if (!orgId || !name.trim() || !slug.trim()) { setErr('Org, name, and slug are required.'); return; }
          create.mutate({
            orgId,
            name: name.trim(),
            slug: slug.trim(),
            address: address.trim() || undefined,
            floorsCount: parseInt(floors, 10) || 1,
          });
        }}
      />
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1">
        {label}{required && <span className="text-danger-700 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function FormActions({ onCancel, onSubmit, loading, submitLabel }: { onCancel: () => void; onSubmit: () => void; loading: boolean; submitLabel: string }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3">
      <button onClick={onCancel} className="text-sm text-ink-500 hover:text-ink-900 px-3 py-1.5">Cancel</button>
      <button onClick={onSubmit} disabled={loading} className="btn-primary text-sm py-1.5">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {submitLabel}
      </button>
    </div>
  );
}
