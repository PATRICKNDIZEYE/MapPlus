'use client';

import { useState } from 'react';
import {
  AlertTriangle, Loader2, CheckCircle2, Shield, Wrench, Sparkles, Flame,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

const TYPE_ICON: Record<string, typeof AlertTriangle> = {
  security:    Shield,
  maintenance: Wrench,
  cleaning:    Sparkles,
  safety:      Flame,
  other:       AlertTriangle,
};

const STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  open:        { label: 'Open',        variant: 'red'   },
  assigned:    { label: 'Assigned',    variant: 'amber' },
  in_progress: { label: 'In progress', variant: 'blue'  },
  resolved:    { label: 'Resolved',    variant: 'green' },
  closed:      { label: 'Closed',      variant: 'gray'  },
};

const STATUS_VALUES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'] as const;

export default function AdminIncidentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const list = trpc.incidents.list.useQuery(
    statusFilter
      ? { status: [statusFilter as 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'] }
      : undefined,
  );

  return (
    <div className="px-8 py-7 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Incidents</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Security & safety incidents</h1>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-base text-sm py-1.5 px-3"
        >
          <option value="">All statuses</option>
          {STATUS_VALUES.map((s) => <option key={s} value={s}>{STATUS_BADGE[s]!.label}</option>)}
        </select>
      </header>

      <div className="card overflow-hidden">
        {list.isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : !list.data?.length ? (
          <div className="px-6 py-12 text-center text-sm text-ink-500">
            <Shield className="w-6 h-6 mx-auto mb-2 text-ink-300" strokeWidth={1.5} />
            No incidents reported.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {list.data.map((i) => <IncidentRow key={i.id} incident={i} onChanged={() => list.refetch()} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

type Incident = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  location: string | null;
  photoUrl: string | null;
  reportedAt: Date | string;
  resolutionNote: string | null;
};

function IncidentRow({ incident, onChanged }: { incident: Incident; onChanged: () => void }) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');
  const Icon = TYPE_ICON[incident.type] ?? AlertTriangle;
  const meta = STATUS_BADGE[incident.status] ?? { label: incident.status, variant: 'gray' as const };

  const updateStatus = trpc.incidents.updateStatus.useMutation({ onSuccess: () => onChanged() });
  const resolve = trpc.incidents.resolve.useMutation({
    onSuccess: () => { setResolving(false); setNote(''); onChanged(); },
  });

  return (
    <li className="px-5 py-4 flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary-600" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-ink-900 truncate">{incident.title}</p>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <p className="text-xs text-ink-600 leading-relaxed">{incident.description}</p>
        {incident.location && <p className="text-xs text-ink-400 mt-1">Location: {incident.location}</p>}
        <p className="text-[11px] text-ink-400 mt-1">Reported {new Date(incident.reportedAt).toLocaleDateString('en-RW')}</p>
        {incident.resolutionNote && (
          <p className="text-xs mt-2 px-3 py-2 bg-success-50 border border-success-100 rounded-lg text-success-700">
            Resolved: {incident.resolutionNote}
          </p>
        )}
        {resolving && (
          <div className="mt-3 flex items-end gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-base text-sm flex-1 py-1.5"
              placeholder="Resolution note"
            />
            <button
              disabled={!note.trim() || resolve.isPending}
              onClick={() => resolve.mutate({ id: incident.id, resolutionNote: note.trim() })}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {resolve.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Save
            </button>
            <button onClick={() => setResolving(false)} className="text-xs text-ink-500 hover:text-ink-900">Cancel</button>
          </div>
        )}
      </div>
      {incident.status !== 'resolved' && incident.status !== 'closed' && !resolving && (
        <div className="flex flex-col gap-1 items-end flex-shrink-0">
          {incident.status === 'open' && (
            <button
              onClick={() => updateStatus.mutate({ id: incident.id, status: 'in_progress' })}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Start work
            </button>
          )}
          <button
            onClick={() => setResolving(true)}
            className="text-xs font-semibold text-success-700 hover:text-success-700/80"
          >
            Resolve
          </button>
        </div>
      )}
    </li>
  );
}
