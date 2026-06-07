'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, ChevronRight } from 'lucide-react';
import { useMapActions, useMapStore } from '@/store/map.store';
import { trpc } from '@/lib/trpc';
import {
  Laptop2, Shirt, Utensils, Pill, Banknote, Sparkles, Dumbbell, Clapperboard, Store,
} from 'lucide-react';

const CATEGORY_ICON: Record<string, React.ElementType> = {
  'Electronics':        Laptop2,
  'Fashion & Apparel':  Shirt,
  'Food & Beverages':   Utensils,
  'Health & Pharmacy':  Pill,
  'Banking & Finance':  Banknote,
  'Beauty & Cosmetics': Sparkles,
  'Sports & Fitness':   Dumbbell,
  'Entertainment':      Clapperboard,
};

interface SearchBarProps {
  buildingId: string;
}

export function SearchBar({ buildingId }: SearchBarProps) {
  const { setSearch, openSearch, closeSearch, selectShop, setSearchHighlights, clearSearchHighlights } = useMapActions();
  const searchQuery = useMapStore((s) => s.searchQuery);
  const searchOpen  = useMapStore((s) => s.searchOpen);
  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) closeSearch();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeSearch]);

  const { data: results, isLoading } = trpc.search.query.useQuery(
    { buildingId, q: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 },
  );

  // Whenever results land, paint matching shops on the floor plan with
  // category-coloured icons. Cleared on input clear or close.
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      clearSearchHighlights();
      return;
    }
    if (!results) return;
    setSearchHighlights(
      results.map((r) => ({ shopId: r.shopId, category: r.category })),
      debouncedQuery,
    );
  }, [results, debouncedQuery, setSearchHighlights, clearSearchHighlights]);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-lg">
      <div className={`flex items-center bg-white rounded-2xl border transition-all px-3.5 py-2.5 gap-2.5
        ${searchOpen ? 'border-primary-300 ring-2 ring-primary-100 shadow-lg' : 'border-gray-200 shadow-sm'}`}>
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={2} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search shops, brands, services..."
          value={searchQuery}
          onChange={(e) => { setSearch(e.target.value); openSearch(); }}
          onFocus={openSearch}
          className="flex-1 outline-none text-sm text-gray-800 placeholder:text-gray-400 bg-transparent min-w-0"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-primary-400 animate-spin flex-shrink-0" strokeWidth={2} />}
        {searchQuery && !isLoading && (
          <button onClick={() => { closeSearch(); inputRef.current?.blur(); }}
            className="text-gray-300 hover:text-gray-500 flex-shrink-0">
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {searchOpen && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-72 overflow-y-auto">
          {results?.length === 0 && !isLoading && (
            <div className="px-4 py-5 text-center">
              <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No results for <strong>&ldquo;{debouncedQuery}&rdquo;</strong></p>
            </div>
          )}
          {results?.map((r) => {
            const Icon = CATEGORY_ICON[r.category ?? ''] ?? Store;
            return (
              <button key={r.shopId}
                onClick={() => {
                  selectShop({ shopId: r.shopId, shopName: r.shopName, unitId: r.unitId, unitCode: r.unitCode, category: r.category });
                  closeSearch();
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary-600" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.shopName}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {r.floorName}{r.unitCode && ` · ${r.unitCode}`}{r.category && ` · ${r.category}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 ml-auto" strokeWidth={2} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
