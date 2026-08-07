'use client';

import { Lightbulb } from 'lucide-react';

interface BrainModeToggleProps {
  active: boolean;
  onToggle: () => void;
  activeLabel?: string;
  inactiveLabel?: string;
  contextOnLabel?: string;
}

/**
 * Compact Brain Mode pill — mirrors native BrainModeToggle.
 * When active, shows a short “sorted by educational value” hint on the left.
 */
export default function BrainModeToggle({
  active,
  onToggle,
  activeLabel = 'Brain Mode',
  inactiveLabel = 'Brain Mode',
  contextOnLabel = 'Sorted by educational value',
}: BrainModeToggleProps) {
  return (
    <div className="brain-mode-toggle flex items-center justify-between gap-2 px-4 py-1.5 min-h-9 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10">
      {active ? (
        <p className="flex-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mr-2">
          {contextOnLabel}
        </p>
      ) : (
        <span className="flex-1" aria-hidden />
      )}

      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? activeLabel : inactiveLabel}
        onClick={onToggle}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors active:scale-95 ${
          active
            ? 'bg-sky-500 text-white'
            : 'bg-slate-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10'
        }`}
      >
        <Lightbulb
          className={`w-3.5 h-3.5 ${active ? 'text-yellow-300' : 'text-gray-400'}`}
          fill={active ? 'currentColor' : 'none'}
        />
        <span>{active ? activeLabel : inactiveLabel}</span>
      </button>
    </div>
  );
}
