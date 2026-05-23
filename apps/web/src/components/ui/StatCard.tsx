'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: number; up: boolean };
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

const ICON_COLORS: Record<string, string> = {
  blue:   'bg-primary-50   text-primary-600  border-primary-100',
  green:  'bg-success-50   text-success-700   border-success-100',
  amber:  'bg-warning-50   text-warning-700   border-warning-100',
  purple: 'bg-violet-50    text-violet-600    border-violet-100',
  red:    'bg-danger-50    text-danger-700    border-danger-100',
};

export function StatCard({ label, value, sub, trend, icon: Icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest leading-none">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${ICON_COLORS[color]}`}>
            <Icon className="w-4 h-4" strokeWidth={2} />
          </div>
        )}
      </div>

      <p className="text-2xl font-extrabold text-ink-900 tracking-tight leading-none mb-1">
        {value}
      </p>

      {sub && (
        <p className="text-xs text-ink-400 font-medium">{sub}</p>
      )}

      {trend && (
        <div className={`flex items-center gap-1 mt-2 ${trend.up ? 'text-success-700' : 'text-danger-700'}`}>
          {trend.up
            ? <TrendingUp  className="w-3.5 h-3.5" strokeWidth={2.5} />
            : <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />}
          <span className="text-xs font-semibold">{Math.abs(trend.value)}%</span>
          <span className="text-xs text-ink-400 font-normal">vs yesterday</span>
        </div>
      )}
    </div>
  );
}
