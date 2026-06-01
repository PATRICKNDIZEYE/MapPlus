'use client';

import { useState } from 'react';
import { Settings, Loader2, Save, KeyRound, Eye, EyeOff } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function PlatformConfigPage() {
  const list = trpc.platform.listConfig.useQuery();

  return (
    <div className="px-8 py-7 max-w-4xl mx-auto">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Platform Console</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Platform config</h1>
        <p className="text-sm text-ink-500 mt-1">
          Network-wide settings used by every mall. Changes apply immediately.
          Secrets are masked here — type a new value to overwrite.
        </p>
      </header>

      <div className="card overflow-hidden">
        {list.isLoading ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : !list.data?.length ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500">
            <Settings className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
            No config rows yet. Defaults are seeded by the migration.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {list.data.map((row) => (
              <ConfigRow key={row.id} row={row} onSaved={() => list.refetch()} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type ConfigRow = {
  id: string;
  key: string;
  valueText: string | null;
  isSecret: string;
  description: string | null;
  updatedAt: Date | string;
};

function ConfigRow({ row, onSaved }: { row: ConfigRow; onSaved: () => void }) {
  const isSecret = row.isSecret === 'Y';
  const [value, setValue] = useState(isSecret ? '' : row.valueText ?? '');
  const [reveal, setReveal] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const upsert = trpc.platform.upsertConfig.useMutation({
    onSuccess: () => {
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
      onSaved();
    },
  });

  function save() {
    upsert.mutate({
      key: row.key,
      valueText: value.trim() || null,
      isSecret,
      description: row.description ?? undefined,
    });
  }

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3 mb-2">
        {isSecret ? (
          <KeyRound className="w-4 h-4 text-warning-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
        ) : (
          <Settings className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-ink-900">{row.key}</p>
          {row.description && <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{row.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-7">
        <div className="flex-1 relative">
          <input
            type={isSecret && !reveal ? 'password' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isSecret ? (row.valueText ?? 'Set a new value') : 'Set a value'}
            className="input-base text-sm pr-8"
          />
          {isSecret && (
            <button onClick={() => setReveal((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
              {reveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <button onClick={save} disabled={upsert.isPending} className="btn-primary text-xs py-1.5 flex-shrink-0">
          {upsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
        {savedAt && <span className="text-[11px] text-success-700 font-medium">Saved</span>}
      </div>
    </li>
  );
}
