'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Pencil, Check, Phone, MessageCircle, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { trpc } from '@/lib/trpc';

// Demo: hardcoded shop ID until the authenticated tenant session is wired in.
const DEMO_SHOP_ID = ''; // will show empty-state upload until seeder runs

const WEEKLY = [62, 88, 74, 95, 108, 117, 132];
const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_W  = Math.max(...WEEKLY);

export default function TenantShopPage() {
  const [editing,    setEditing]    = useState(false);
  const [name,       setName]       = useState('Brewmark Coffee');
  const [desc,       setDesc]       = useState('Espresso, drip, and pastries. Open seven days on the ground floor.');
  const [phone,      setPhone]      = useState('+1 415 555 0123');
  const [whatsapp,   setWhatsapp]   = useState('+1 415 555 0123');
  const [coverUrl,   setCoverUrl]   = useState<string | null>(null);
  const [logoUrl,    setLogoUrl]    = useState<string | null>(null);

  const { data: shopData } = trpc.shops.byId.useQuery(
    { id: DEMO_SHOP_ID },
    { enabled: !!DEMO_SHOP_ID },
  );

  useEffect(() => {
    if (shopData?.coverPhotoUrl) setCoverUrl(shopData.coverPhotoUrl);
    if (shopData?.logoUrl)       setLogoUrl(shopData.logoUrl);
  }, [shopData]);

  const uploadPhoto = trpc.media.uploadShopPhoto.mutate;

  const hasCover  = !!coverUrl;
  const HEALTH = [
    { label: 'Business name',    done: true     },
    { label: 'Phone number',     done: true     },
    { label: 'Description',      done: true     },
    { label: 'Operating hours',  done: true     },
    { label: 'Cover photo',      done: hasCover },
    { label: 'Product listings', done: false    },
    { label: 'WhatsApp linked',  done: true     },
  ];
  const doneCnt = HEALTH.filter((h) => h.done).length;

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-ink-900">My shop</h1>
          <p className="text-sm text-ink-400 mt-0.5">KFC CHIC · Ground Floor · Unit G-A04</p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className={editing ? 'btn-primary text-xs py-1.5' : 'btn-secondary text-xs py-1.5'}
        >
          {editing
            ? <><Check className="w-3.5 h-3.5" /> Save changes</>
            : <><Pencil className="w-3.5 h-3.5" /> Edit profile</>
          }
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left 2/3 */}
        <div className="xl:col-span-2 space-y-4">

          {/* Cover + identity */}
          <div className="card overflow-hidden">
            {/* Cover photo */}
            {editing ? (
              <div className="px-5 pt-5">
                <ImageUpload
                  currentUrl={coverUrl}
                  label="Cover photo"
                  aspect="cover"
                  onUploaded={setCoverUrl}
                  onUpload={(base64, mimeType) =>
                    (uploadPhoto as any)({ shopId: DEMO_SHOP_ID || 'demo', type: 'cover', fileBase64: base64, mimeType })
                  }
                />
              </div>
            ) : (
              <div className="h-28 bg-ink-900 relative overflow-hidden">
                {coverUrl && (
                  <Image src={coverUrl} alt="Cover" fill className="object-cover" />
                )}
              </div>
            )}

            {/* Logo + name */}
            <div className={`${editing ? 'px-5 pt-4 pb-5' : 'pt-4 pb-5 px-5'}`}>
              {editing ? (
                <div className="flex items-start gap-4 mb-4">
                  <ImageUpload
                    currentUrl={logoUrl}
                    label="Logo"
                    aspect="square"
                    onUploaded={setLogoUrl}
                    onUpload={(base64, mimeType) =>
                      (uploadPhoto as any)({ shopId: DEMO_SHOP_ID || 'demo', type: 'logo', fileBase64: base64, mimeType })
                    }
                  />
                  <div className="flex-1 min-w-0 pt-6">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-xl font-bold text-ink-900 border-b-2 border-primary-500 outline-none bg-transparent w-full"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Logo badge (non-edit mode) */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl border-2 border-white shadow-sm overflow-hidden bg-white flex items-center justify-center flex-shrink-0 -mt-8">
                      {logoUrl ? (
                        <Image src={logoUrl} alt="Logo" width={48} height={48} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-xl font-black text-ink-900 tracking-tighter">KF</span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-ink-900">{name}</h2>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="green" dot>Open</Badge>
                <Badge variant="blue">Food &amp; Beverages</Badge>
                <Badge variant="gray">Verified</Badge>
              </div>

              {editing ? (
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={2}
                  className="input-base mt-3 resize-none"
                />
              ) : (
                <p className="mt-3 text-sm text-ink-500 leading-relaxed">{desc}</p>
              )}

              {!hasCover && !editing && (
                <div className="mt-3 flex items-center gap-2 bg-warning-50 border border-warning-100 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-warning-700 font-medium">
                    No cover photo — add one to rank higher in search results.
                  </span>
                  <button onClick={() => setEditing(true)}
                    className="text-xs text-warning-700 underline font-semibold ml-auto flex-shrink-0">
                    Add photo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-4">Contact information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Phone',    icon: Phone,          value: phone,    set: setPhone    },
                { label: 'WhatsApp', icon: MessageCircle,  value: whatsapp, set: setWhatsapp },
              ].map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.label}>
                    <label className="text-xs text-ink-400 font-semibold uppercase tracking-wider block mb-1.5">
                      {field.label}
                    </label>
                    <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 border
                      ${editing ? 'border-ink-300 bg-white' : 'border-ink-100 bg-ink-50'}`}>
                      <Icon className="w-4 h-4 text-ink-400 flex-shrink-0" strokeWidth={2} />
                      {editing ? (
                        <input value={field.value} onChange={(e) => field.set(e.target.value)}
                          className="flex-1 text-sm outline-none bg-transparent text-ink-800" />
                      ) : (
                        <span className="text-sm text-ink-700 font-medium">{field.value}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operating hours */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink-900">Operating hours</h3>
              {editing && (
                <button className="text-xs text-primary-600 font-semibold hover:underline">
                  Apply to all days
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, i) => {
                const isWeekend = i >= 5;
                const closed    = day === 'Sunday';
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-ink-500 w-24 flex-shrink-0">{day}</span>
                    {closed ? (
                      <Badge variant="red">Closed</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold tabular-nums
                          ${editing ? 'border border-ink-200 bg-white text-ink-800' : 'bg-ink-50 text-ink-700'}`}>
                          {isWeekend ? '10:00' : '08:00'}
                        </span>
                        <span className="text-ink-300 text-xs">–</span>
                        <span className={`px-2.5 py-1 rounded text-xs font-semibold tabular-nums
                          ${editing ? 'border border-ink-200 bg-white text-ink-800' : 'bg-ink-50 text-ink-700'}`}>
                          {isWeekend ? '22:00' : '21:00'}
                        </span>
                        <Badge variant="green">Open</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-4">
          {/* Weekly chart */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-1">Visitors this week</h3>
            <p className="text-3xl font-extrabold text-ink-900 tracking-tight mb-4">676</p>
            <div className="flex items-end gap-1.5 h-20">
              {WEEKLY.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full rounded-t ${i === 6 ? 'bg-primary-600' : 'bg-primary-100'}`}
                       style={{ height: `${(v / MAX_W) * 68}px` }} />
                  <span className="text-[10px] text-ink-400 font-medium">{DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick metrics */}
          <div className="card p-5 grid grid-cols-2 gap-4">
            {[
              { v: '124', l: 'Profile views',    sub: 'Today',      c: 'text-primary-600' },
              { v: '32',  l: 'Directions asked',  sub: 'Today',      c: 'text-success-700' },
              { v: '8',   l: 'Phone clicks',      sub: 'Today',      c: 'text-violet-600'  },
              { v: '4.8', l: 'Avg. rating',       sub: '23 reviews', c: 'text-warning-700' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className={`text-2xl font-extrabold tracking-tight ${s.c}`}>{s.v}</p>
                <p className="text-xs text-ink-600 font-semibold mt-0.5">{s.l}</p>
                <p className="text-[10px] text-ink-400">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Profile health */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Profile health</h3>
            <div className="space-y-2.5 mb-4">
              {HEALTH.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  {item.done
                    ? <CheckCircle2 className="w-4 h-4 text-success-DEFAULT flex-shrink-0" strokeWidth={2.5} />
                    : <Circle       className="w-4 h-4 text-ink-200     flex-shrink-0" strokeWidth={2}   />
                  }
                  <span className={`text-xs font-medium ${item.done ? 'text-ink-700' : 'text-ink-400'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div className="h-full bg-success-DEFAULT rounded-full transition-all"
                   style={{ width: `${(doneCnt / HEALTH.length) * 100}%` }} />
            </div>
            <p className="text-[10px] text-ink-400 font-medium mt-1.5">
              {doneCnt}/{HEALTH.length} complete
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
