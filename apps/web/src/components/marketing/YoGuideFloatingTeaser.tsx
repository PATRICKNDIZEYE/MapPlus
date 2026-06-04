'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { AskYoGuide } from '@/components/aisearch/AskYoGuide';

const PROMPTS = [
  'What are you looking for in Kigali?',
  'Wedding shoes? Phone repair? Just ask.',
  'Try: best fresh juice near me',
  'Try: African fabric for a dress',
  'Try: a tailor for a suit',
];

/**
 * Floating "Ask yoGuide" widget for the landing page.
 *
 * Sits bottom-right with a bot avatar + a rotating teaser prompt that
 * invites the visitor to search. Compact and dismissible — feels like a
 * concierge tap-on-the-shoulder, not a marketing pop-up.
 */
export function YoGuideFloatingTeaser() {
  const [open, setOpen]       = useState(false);
  const [shown, setShown]     = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  // The pointer is a one-time onboarding flourish — shows on first
  // arrival, auto-fades after a few seconds, and kills itself the
  // moment the user actually engages.
  const [pointerVisible, setPointerVisible] = useState(false);

  // Slide in shortly after the page settles so it doesn't fight the hero.
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 900);
    const p = setTimeout(() => setPointerVisible(true), 1400);
    const hide = setTimeout(() => setPointerVisible(false), 9000);
    return () => { clearTimeout(t); clearTimeout(p); clearTimeout(hide); };
  }, []);

  // Rotate the prompt so the widget keeps drawing the eye.
  useEffect(() => {
    const t = setInterval(() => {
      setPromptIdx((i) => (i + 1) % PROMPTS.length);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  // Hide the pointer the instant the user opens or dismisses the widget.
  useEffect(() => {
    if (open || dismissed) setPointerVisible(false);
  }, [open, dismissed]);

  if (dismissed) return null;

  return (
    <>
      {/* Onboarding pointer — one tilted line + one slim arrow */}
      <div
        aria-hidden
        className={`fixed z-40 right-[88px] sm:right-[120px] bottom-[26px] sm:bottom-[34px] pointer-events-none transition-all duration-700 ease-out
          ${pointerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      >
        <div className="relative flex items-end gap-2 sm:gap-3">
          {/* Tilted headline */}
          <div className="transform -rotate-[4deg] origin-bottom-right text-right">
            <p
              className="font-black tracking-tight text-ink-900 leading-none whitespace-nowrap"
              style={{ fontSize: 'clamp(16px, 2.6vw, 22px)' }}
            >
              Looking for something in{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary-700">Kigali?</span>
                <svg
                  aria-hidden
                  viewBox="0 0 100 10"
                  className="absolute left-0 right-0 -bottom-1 w-full h-2 text-primary-400 mg-pointer-underline"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 6 Q 30 1, 50 5 T 98 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </p>
          </div>

          {/* Slim arrow — single curve down to the widget */}
          <svg
            aria-hidden
            viewBox="0 0 60 60"
            className="w-12 sm:w-14 h-12 sm:h-14 text-primary-600 mg-pointer-arrow flex-shrink-0"
          >
            <path
              d="M6 8 C 26 8, 44 18, 48 46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M42 40 L 48 48 L 54 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div
        className={`fixed z-40 bottom-4 right-4 sm:bottom-5 sm:right-5 transition-all duration-500 ease-out
          ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open yoGuide search"
          className="group relative flex items-center gap-2.5 pl-2 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-full bg-white border border-ink-200 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25)] hover:shadow-[0_14px_36px_-12px_rgba(75,0,130,0.35)] hover:-translate-y-0.5 transition-all max-w-[88vw]"
        >
          {/* Bot avatar */}
          <span className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-800 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-500/30">
            <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" strokeWidth={2.5} />
            {/* Live dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-500 border-2 border-white">
              <span className="absolute inset-0 rounded-full bg-success-400 animate-ping opacity-75" />
            </span>
          </span>

          {/* Rotating prompt text */}
          <span className="flex flex-col min-w-0 text-left">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700 leading-none">
              Ask yoGuide
            </span>
            <span
              key={promptIdx}
              className="block text-[12px] sm:text-[13px] font-semibold text-ink-900 truncate mt-0.5 animate-fade-up"
              style={{ maxWidth: '210px' }}
            >
              {PROMPTS[promptIdx]}
            </span>
          </span>

          {/* CTA chevron */}
          <span className="hidden sm:flex w-7 h-7 rounded-full bg-primary-50 group-hover:bg-primary-100 items-center justify-center flex-shrink-0 transition-colors">
            <ArrowRight className="w-3.5 h-3.5 text-primary-700 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </span>
        </button>

        {/* Dismiss — sits just above the bubble */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide yoGuide widget"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-ink-200 shadow-sm hover:bg-ink-50 text-ink-500 flex items-center justify-center"
        >
          <X className="w-2.5 h-2.5" strokeWidth={3} />
        </button>
      </div>

      {open && <AskYoGuide onClose={() => setOpen(false)} />}
    </>
  );
}
