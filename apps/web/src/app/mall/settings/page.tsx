'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Lock, Mail, Building2, Shield, LogOut,
  Check, AlertCircle, Save,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth.store';
import { Badge } from '@/components/ui/Badge';

const ROLE_LABELS: Record<string, string> = {
  super_admin:      'Super admin',
  org_owner:        'Organisation owner',
  building_manager: 'Building manager',
  floor_manager:    'Floor manager',
  tenant_admin:     'Tenant admin',
  tenant_staff:     'Tenant staff',
  public:           'Public',
};

export default function SettingsPage() {
  const router = useRouter();
  const user  = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const utils = trpc.useUtils();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
    }
  }, [user]);

  const updateProfile  = trpc.auth.updateProfile.useMutation();
  const changePassword = trpc.auth.changePassword.useMutation();

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await updateProfile.mutateAsync({
        firstName: firstName.trim() || null,
        lastName:  lastName.trim()  || null,
      });
      await utils.auth.me.invalidate();
      setProfileMsg({ type: 'ok', text: 'Profile updated.' });
    } catch (err) {
      setProfileMsg({ type: 'err', text: err instanceof Error ? err.message : 'Save failed' });
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'err', text: 'New password must be at least 8 characters.' });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setPasswordMsg({ type: 'ok', text: 'Password changed.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setPasswordMsg({
        type: 'err',
        text: msg.toLowerCase().includes('current password') || msg.includes('UNAUTHORIZED')
          ? 'Current password is incorrect.'
          : msg,
      });
    }
  }

  function onSignOut() {
    clear();
    router.replace('/login');
  }

  const initials = (() => {
    if (!user) return '–';
    const f = user.firstName?.charAt(0) ?? '';
    const l = user.lastName?.charAt(0) ?? '';
    const combined = (f + l).toUpperCase();
    return combined || user.email.charAt(0).toUpperCase();
  })();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink-900 tracking-tight">Settings</h1>
        <p className="text-sm text-ink-500 mt-1">Manage your account, security, and session.</p>
      </div>

      {/* Identity card */}
      <div className="card overflow-hidden mb-6">
        <div className="card-header py-4">
          <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
            <User className="w-4 h-4 text-ink-400" strokeWidth={2} /> Account
          </h2>
        </div>
        <div className="px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-base font-bold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink-900 truncate">
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unnamed user'}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                <Mail className="w-3 h-3" strokeWidth={2} /> {user?.email ?? '–'}
              </span>
              {user?.role && (
                <Badge variant="blue" dot>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={onSaveProfile} className="card overflow-hidden mb-6">
        <div className="card-header py-4">
          <h2 className="text-sm font-semibold text-ink-900">Profile</h2>
          <span className="text-[11px] text-ink-400">Visible to other administrators</span>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-base"
              placeholder="First"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-base"
              placeholder="Last"
              maxLength={100}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Email</label>
            <input type="email" value={user?.email ?? ''} className="input-base bg-ink-50 cursor-not-allowed" disabled />
            <p className="text-[11px] text-ink-400 mt-1">Email changes require an administrator.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-end gap-3 bg-ink-50/50">
          {profileMsg && (
            <span className={`flex items-center gap-1.5 text-xs font-medium
              ${profileMsg.type === 'ok' ? 'text-success-700' : 'text-danger-700'}`}>
              {profileMsg.type === 'ok'
                ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                : <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />}
              {profileMsg.text}
            </span>
          )}
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="btn-primary text-xs py-2 disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={2} />
            {updateProfile.isPending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      {/* Password form */}
      <form onSubmit={onChangePassword} className="card overflow-hidden mb-6">
        <div className="card-header py-4">
          <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-ink-400" strokeWidth={2} /> Change password
          </h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Current password</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-base"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">New password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-base"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Confirm new password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-base"
                placeholder="Re-enter password"
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-end gap-3 bg-ink-50/50">
          {passwordMsg && (
            <span className={`flex items-center gap-1.5 text-xs font-medium
              ${passwordMsg.type === 'ok' ? 'text-success-700' : 'text-danger-700'}`}>
              {passwordMsg.type === 'ok'
                ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                : <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />}
              {passwordMsg.text}
            </span>
          )}
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="btn-primary text-xs py-2 disabled:opacity-60"
          >
            <Lock className="w-3.5 h-3.5" strokeWidth={2} />
            {changePassword.isPending ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>

      {/* Organisation / role info */}
      <div className="card overflow-hidden mb-6">
        <div className="card-header py-4">
          <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-ink-400" strokeWidth={2} /> Workspace
          </h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <Row label="Role" icon={Shield}>
            {ROLE_LABELS[user?.role ?? 'public'] ?? '–'}
          </Row>
          <Row label="Organisation" icon={Building2}>
            {user?.orgId ? <span className="font-mono">{user.orgId.slice(0, 8)}…</span> : '—'}
          </Row>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card overflow-hidden">
        <div className="card-header py-4">
          <h2 className="text-sm font-semibold text-ink-900">Session</h2>
        </div>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Sign out of this device</p>
            <p className="text-xs text-ink-500 mt-0.5">You will need to enter your credentials again.</p>
          </div>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 bg-white border border-danger-200 text-danger-700 hover:bg-danger-50 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label, icon: Icon, children,
}: { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-ink-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-ink-400">{label}</p>
        <p className="text-ink-800 font-medium truncate">{children}</p>
      </div>
    </div>
  );
}
