'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon, Lock, LogOut, Loader2, CheckCircle2, AlertCircle, Globe,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth.store';

export default function TenantSettingsPage() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const clear  = useAuthStore((s) => s.clear);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setOkMsg('Password updated.');
      setError(null);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    },
    onError: (e) => { setOkMsg(null); setError(e.message); },
  });

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOkMsg(null);
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    changePassword.mutate({ currentPassword, newPassword });
  }

  function signOut() {
    clear();
    router.replace('/login');
  }

  return (
    <div className="px-8 py-7 max-w-3xl mx-auto">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Tenant Hub</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500 mt-1">Manage your account, password, and session.</p>
      </header>

      {/* Account */}
      <section className="card p-5 mb-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-primary-600" strokeWidth={2} />
          Account
        </h2>
        <dl className="text-sm space-y-2">
          <Row label="Email"   value={user?.email ?? '—'} />
          <Row label="Role"    value={user?.role  ?? '—'} />
          <Row label="Name"    value={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'} />
        </dl>
      </section>

      {/* Change password */}
      <section className="card p-5 mb-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-600" strokeWidth={2} />
          Change password
        </h2>
        <form onSubmit={submitPassword} className="space-y-3 max-w-md">
          <Field label="Current password">
            <input type="password" className="input-base" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} minLength={8} required />
          </Field>
          <Field label="New password">
            <input type="password" className="input-base" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
          </Field>
          <Field label="Confirm new password">
            <input type="password" className="input-base" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
          </Field>
          {error && (
            <div className="flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3 py-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}
          {okMsg && (
            <div className="flex items-start gap-2 bg-success-50 border border-success-100 text-success-700 text-xs px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>{okMsg}</span>
            </div>
          )}
          <button type="submit" disabled={changePassword.isPending} className="btn-primary text-sm py-2">
            {changePassword.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            Update password
          </button>
        </form>
      </section>

      {/* Language */}
      <section className="card p-5 mb-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary-600" strokeWidth={2} />
          Language
        </h2>
        <p className="text-xs text-ink-500 mb-3">English is currently the default. Kinyarwanda translations are being rolled out across the app.</p>
        <select className="input-base text-sm max-w-xs" defaultValue="en" disabled>
          <option value="en">English</option>
          <option value="rw">Kinyarwanda (coming soon)</option>
        </select>
      </section>

      {/* Sign out */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <LogOut className="w-4 h-4 text-danger-700" strokeWidth={2} />
          Session
        </h2>
        <p className="text-xs text-ink-500 mb-3">Signing out clears your local session. You can sign back in any time.</p>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 bg-danger-50 hover:bg-danger-100 text-danger-700 text-sm font-semibold px-4 py-2 rounded-full border border-danger-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={2.5} />
          Sign out
        </button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-ink-50 last:border-0">
      <dt className="text-xs text-ink-400 uppercase tracking-wider">{label}</dt>
      <dd className="text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
