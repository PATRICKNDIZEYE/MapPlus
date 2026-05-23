'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Sparkles, Send, Calendar, Loader2, X, Camera, MessageSquare,
  Hash, Package, RefreshCw, CheckCircle2, MessageCircle, Music, XCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'twitter';
type Tone     = 'friendly' | 'professional' | 'playful' | 'urgent';

const PLATFORM_META: Record<Platform, { label: string; icon: typeof Camera }> = {
  instagram: { label: 'Instagram', icon: Camera          },
  facebook:  { label: 'Facebook',  icon: MessageSquare   },
  tiktok:    { label: 'TikTok',    icon: Music           },
  twitter:   { label: 'X',         icon: MessageCircle   },
};

const STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  draft:      { label: 'Draft',      variant: 'gray'  },
  scheduled:  { label: 'Scheduled',  variant: 'blue'  },
  publishing: { label: 'Publishing', variant: 'amber' },
  published:  { label: 'Published',  variant: 'green' },
  failed:     { label: 'Failed',     variant: 'red'   },
  cancelled:  { label: 'Cancelled',  variant: 'gray'  },
};

export default function TenantMarketingPage() {
  const products = trpc.products.listMine.useQuery();
  const posts    = trpc.gosocial.list.useQuery();
  const accounts = trpc.gosocial.listAccounts.useQuery();

  const [productId, setProductId]   = useState<string>('');
  const [tone, setTone]             = useState<Tone>('friendly');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram']);
  const [extra, setExtra]           = useState('');
  const [caption, setCaption]       = useState('');
  const [hashtags, setHashtags]     = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [err, setErr]               = useState<string | null>(null);

  const generate    = trpc.gosocial.generate.useMutation({
    onSuccess: (r) => { setCaption(r.caption); setHashtags(r.hashtags); setErr(null); },
    onError:   (e) => setErr(e.message),
  });
  const createDraft = trpc.gosocial.createDraft.useMutation({
    onSuccess: () => {
      setCaption(''); setHashtags([]); setScheduleAt(''); setProductId('');
      posts.refetch();
    },
    onError: (e) => setErr(e.message),
  });
  const publishNow = trpc.gosocial.publishNow.useMutation({ onSuccess: () => posts.refetch() });
  const cancel     = trpc.gosocial.cancel.useMutation({ onSuccess: () => posts.refetch() });

  const togglePlatform = (p: Platform) => setSelectedPlatforms((prev) =>
    prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
  );

  const connectedSet = useMemo(
    () => new Set((accounts.data ?? []).filter((a) => a.isActive).map((a) => a.platform)),
    [accounts.data],
  );

  function runGenerate() {
    setErr(null);
    if (!productId) { setErr('Pick a product first.'); return; }
    generate.mutate({
      productId,
      tone,
      platforms: selectedPlatforms,
      extraInstructions: extra.trim() || undefined,
    });
  }

  function saveDraft(asScheduled: boolean) {
    setErr(null);
    if (!caption.trim()) { setErr('Caption is required.'); return; }
    if (!selectedPlatforms.length) { setErr('Pick at least one platform.'); return; }
    if (asScheduled && !scheduleAt) { setErr('Pick a schedule date.'); return; }
    createDraft.mutate({
      productId: productId || undefined,
      caption: caption.trim(),
      hashtags,
      platforms: selectedPlatforms,
      scheduledAt: asScheduled ? new Date(scheduleAt).toISOString() : undefined,
    });
  }

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Tenant Hub</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Go Social</h1>
        <p className="text-sm text-ink-500 mt-1">AI-generated captions, hashtags, and scheduling for your social channels.</p>
      </header>

      {/* Connected accounts */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Connected accounts</h2>
          <p className="text-[11px] text-ink-400">{(accounts.data ?? []).filter((a) => a.isActive).length} active</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['instagram', 'facebook', 'tiktok', 'twitter'] as Platform[]).map((p) => {
            const Icon = PLATFORM_META[p].icon;
            const connected = connectedSet.has(p);
            return (
              <span key={p}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  ${connected ? 'bg-success-50 text-success-700 border border-success-100' : 'bg-ink-50 text-ink-500 border border-ink-100'}`}>
                <Icon className="w-3 h-3" strokeWidth={2} />
                {PLATFORM_META[p].label}
                {connected && <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />}
              </span>
            );
          })}
        </div>
        <p className="text-[11px] text-ink-400 mt-3">OAuth connection flows ship in a follow-up release; for dev you can link accounts via the API.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Composer */}
        <section className="lg:col-span-3 card overflow-hidden">
          <div className="card-header py-3 px-5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-600" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-ink-900">Compose a post</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <Field label="Product">
              <select className="input-base" value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">— pick a product —</option>
                {(products.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tone">
                <select className="input-base" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="playful">Playful</option>
                  <option value="urgent">Urgent / promo</option>
                </select>
              </Field>
              <Field label="Platforms">
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
                    const Icon = PLATFORM_META[p].icon;
                    const on = selectedPlatforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border
                          ${on ? 'bg-primary-50 text-primary-700 border-primary-100' : 'bg-white text-ink-500 border-ink-200 hover:border-primary-200'}`}
                      >
                        <Icon className="w-3 h-3" strokeWidth={2} /> {PLATFORM_META[p].label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            <Field label="Extra direction (optional)">
              <input className="input-base" value={extra} onChange={(e) => setExtra(e.target.value)}
                placeholder="e.g. emphasise weekend discount" maxLength={500} />
            </Field>

            <button onClick={runGenerate} disabled={generate.isPending}
              className="btn-primary text-sm py-2 w-full justify-center">
              {generate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Generate with AI
            </button>

            {/* Caption + hashtags preview */}
            <div className="pt-2 border-t border-ink-100">
              <Field label="Caption">
                <textarea
                  className="input-base min-h-[100px]"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Caption will appear here after generation — or write your own."
                  maxLength={2000}
                />
              </Field>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1.5">Hashtags</p>
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.map((h) => (
                    <span key={h} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[11px] font-medium">
                      <Hash className="w-2.5 h-2.5" strokeWidth={2.5} />{h}
                      <button onClick={() => setHashtags((prev) => prev.filter((x) => x !== h))} className="ml-0.5 text-primary-700/60 hover:text-primary-700">
                        <X className="w-2.5 h-2.5" strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                  {!hashtags.length && <p className="text-[11px] text-ink-400">No hashtags yet.</p>}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
                <Field label="Schedule (optional)">
                  <input type="datetime-local" className="input-base text-xs"
                    value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                </Field>
                <button onClick={() => saveDraft(false)} disabled={createDraft.isPending}
                  className="btn-secondary text-xs py-1.5">
                  Save draft
                </button>
                <button onClick={() => saveDraft(true)} disabled={createDraft.isPending}
                  className="btn-primary text-xs py-1.5">
                  {createDraft.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                  Schedule
                </button>
              </div>

              {err && <p className="text-xs text-danger-700 mt-2">{err}</p>}
            </div>
          </div>
        </section>

        {/* Post history */}
        <aside className="lg:col-span-2 card overflow-hidden">
          <div className="card-header py-3 px-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Recent posts</h2>
            <button onClick={() => posts.refetch()} className="text-ink-400 hover:text-ink-700">
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
          {posts.isLoading ? (
            <div className="px-5 py-10 text-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
          ) : !posts.data?.length ? (
            <div className="px-5 py-10 text-center text-sm text-ink-500">
              <Send className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
              No posts yet.
            </div>
          ) : (
            <ul className="divide-y divide-ink-100 max-h-[600px] overflow-y-auto">
              {posts.data.map((post) => {
                const meta = STATUS_BADGE[post.status] ?? { label: post.status, variant: 'gray' as const };
                const platforms = (post.platforms as Platform[]) ?? [];
                return (
                  <li key={post.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <div className="flex items-center gap-0.5">
                        {platforms.map((p) => {
                          const Icon = PLATFORM_META[p]?.icon;
                          return Icon ? <Icon key={p} className="w-3 h-3 text-ink-400" strokeWidth={2} /> : null;
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-ink-700 line-clamp-3 leading-relaxed">{post.caption}</p>
                    {post.scheduledAt && (
                      <p className="text-[10px] text-ink-400 mt-1.5">
                        {post.status === 'scheduled' ? 'Goes live' : 'Was scheduled'} {new Date(post.scheduledAt).toLocaleString('en-RW')}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      {(post.status === 'draft' || post.status === 'scheduled') && (
                        <>
                          <button onClick={() => publishNow.mutate({ id: post.id })}
                            className="text-[11px] font-semibold text-primary-700 hover:text-primary-800">
                            Publish now
                          </button>
                          <button onClick={() => cancel.mutate({ id: post.id })}
                            className="text-[11px] font-semibold text-ink-500 hover:text-danger-700 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
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
