'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, X, Send, Mic, MicOff, Loader2, Package, Store, ArrowRight,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { trpc } from '@/lib/trpc';

type ProductHit = {
  productId: string;
  name: string;
  category: string | null;
  priceAmount: number | null;
  currency: string;
  imageUrl: string | null;
  shopId: string;
  shopName: string;
  buildingName: string;
  floorName: string;
  unitCode: string;
};

type ShopHit = {
  shopId: string;
  shopName: string;
  category: string | null;
  description: string | null;
  buildingName: string;
  floorName: string;
  unitCode: string;
};

type Turn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  shops?: ShopHit[];
  products?: ProductHit[];
};

const SUGGESTIONS = [
  'Where can I buy a laptop?',
  'Show me restaurants on the ground floor',
  'I need a pharmacy nearby',
  'Find dresses under 50000 RWF',
];

interface SpeechResult { isFinal: boolean; 0: { transcript: string } }
interface SpeechEvent { results: { length: number; [k: number]: SpeechResult } }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function AskYoGuide({ onClose }: { onClose: () => void }) {
  const locale = (useLocale() as 'en' | 'rw') ?? 'en';
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const ask = trpc.aisearch.ask.useMutation();

  // Auto-scroll on new turn.
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  // Initialise SpeechRecognition once.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = locale === 'rw' ? 'rw-RW' : 'en-US';
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  }, [locale]);

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    const userTurn: Turn = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    try {
      const res = await ask.mutateAsync({ query: trimmed, locale });
      const products = res.toolCalls
        .filter((c) => c.tool === 'search_products')
        .flatMap((c) => (Array.isArray(c.result) ? (c.result as ProductHit[]) : []))
        .slice(0, 5);
      const shops = res.toolCalls
        .filter((c) => c.tool === 'search_shops')
        .flatMap((c) => (Array.isArray(c.result) ? (c.result as ShopHit[]) : []))
        .slice(0, 5);
      setTurns((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: res.reply, shops, products },
      ]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: (err as Error).message },
      ]);
    }
  }

  const hasVoice = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[80vh]">

        {/* Header */}
        <header className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900 leading-none">Ask yoGuide</p>
              <p className="text-[11px] text-ink-500 mt-0.5">Cross-mall AI search</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Conversation */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {turns.length === 0 && (
            <div className="text-center py-6">
              <Sparkles className="w-8 h-8 text-primary-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-ink-700">Ask anything about the mall.</p>
              <p className="text-xs text-ink-500 mt-1">Type or talk — I search every shop on mallGuide.</p>
              <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-ink-100 hover:bg-primary-50 hover:text-primary-700 text-ink-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t) => (
            <TurnBubble key={t.id} turn={t} onAsk={submit} />
          ))}

          {ask.isPending && (
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>yoGuide is searching the network…</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
          className="px-5 py-4 border-t border-ink-100"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={locale === 'rw' ? 'Baza yoGuide…' : 'Ask anything…'}
                className="input-base text-sm pr-10"
                autoFocus
              />
              {hasVoice && (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors
                    ${listening ? 'bg-danger-100 text-danger-700' : 'text-ink-400 hover:text-primary-700 hover:bg-primary-50'}`}
                  aria-label={listening ? 'Stop listening' : 'Voice input'}
                >
                  {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!input.trim() || ask.isPending}
              className="btn-primary text-sm py-2 px-3 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TurnBubble({ turn, onAsk }: { turn: Turn; onAsk: (text: string) => void }) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-primary-600 text-white text-sm leading-relaxed">
          {turn.text}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="max-w-[88%] px-3 py-2 rounded-2xl rounded-tl-sm bg-ink-100 text-ink-900 text-sm leading-relaxed whitespace-pre-wrap">
        {turn.text}
      </div>
      {turn.products && turn.products.length > 0 && (
        <div className="grid grid-cols-1 gap-2 ml-2">
          {turn.products.map((p) => <ProductCard key={p.productId} product={p} />)}
        </div>
      )}
      {turn.shops && turn.shops.length > 0 && !turn.products?.length && (
        <div className="grid grid-cols-1 gap-2 ml-2">
          {turn.shops.map((s) => <ShopCard key={s.shopId} shop={s} />)}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ProductHit }) {
  return (
    <Link
      href={`/shop/${product.shopId}`}
      className="block px-3 py-2.5 rounded-xl border border-ink-200 hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-ink-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : <Package className="w-4 h-4 text-ink-400" strokeWidth={2} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900 truncate">{product.name}</p>
          <p className="text-[11px] text-ink-500 truncate">
            {product.shopName} · {product.buildingName} · {product.floorName} {product.unitCode}
          </p>
          {product.priceAmount && (
            <p className="text-xs font-bold text-primary-700 mt-0.5 tabular-nums">
              {Number(product.priceAmount).toLocaleString('en-RW')} {product.currency}
            </p>
          )}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-ink-300 flex-shrink-0 mt-1" strokeWidth={2.5} />
      </div>
    </Link>
  );
}

function ShopCard({ shop }: { shop: ShopHit }) {
  return (
    <Link
      href={`/shop/${shop.shopId}`}
      className="block px-3 py-2.5 rounded-xl border border-ink-200 hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-primary-600" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900 truncate">{shop.shopName}</p>
          <p className="text-[11px] text-ink-500 truncate">
            {shop.category} · {shop.buildingName} · {shop.floorName} {shop.unitCode}
          </p>
          {shop.description && (
            <p className="text-[11px] text-ink-400 truncate mt-0.5">{shop.description}</p>
          )}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-ink-300 flex-shrink-0 mt-1" strokeWidth={2.5} />
      </div>
    </Link>
  );
}
