'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AskYoGuide } from './AskYoGuide';

/**
 * Floating action button — drop into any shopper-facing layout to expose
 * Ask yoGuide. Renders the chat modal lazily so it's not in the bundle until
 * the user clicks.
 */
export function AskYoGuideTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white text-sm font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:scale-105 transition-all"
        aria-label="Ask yoGuide"
      >
        <Sparkles className="w-4 h-4" strokeWidth={2.5} />
        Ask yoGuide
      </button>
      {open && <AskYoGuide onClose={() => setOpen(false)} />}
    </>
  );
}
