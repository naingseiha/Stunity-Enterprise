'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { REACTIONS, REACTION_BY_TYPE, isReactionType, topReactionTypes } from '@/lib/feed-reactions';

interface ReactionSummaryProps {
  likesCount: number;
  reactionCounts?: Record<string, number> | null;
  className?: string;
}

export default function ReactionSummary({
  likesCount,
  reactionCounts,
  className = '',
}: ReactionSummaryProps) {
  const tFeed = useTranslations('feed');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const summary = topReactionTypes(reactionCounts);
  const total = likesCount || Object.values(reactionCounts || {}).reduce((s, n) => s + n, 0);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (total <= 0 && summary.length === 0) return null;

  const breakdown = REACTIONS.map((r) => ({
    ...r,
    count: reactionCounts?.[r.type] || 0,
  })).filter((r) => r.count > 0);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        aria-expanded={open}
      >
        <span className="inline-flex -space-x-1">
          {(summary.length > 0 ? summary : (['LIKE'] as const)).map((type) => {
            const meta = isReactionType(type) ? REACTION_BY_TYPE[type] : REACTION_BY_TYPE.LIKE;
            const Icon = meta.icon;
            return (
              <span
                key={type}
                className="w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900"
                style={{ backgroundColor: meta.color }}
              >
                <Icon className="w-2.5 h-2.5 text-white" fill="white" />
              </span>
            );
          })}
        </span>
        {total > 0 ? <span>{total}</span> : null}
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-30 min-w-[180px] rounded-xl bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 shadow-xl p-2">
          <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            {tFeed('reactions.breakdown')}
          </p>
          {(breakdown.length > 0 ? breakdown : [{ ...REACTIONS[0], count: total }]).map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.type} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${r.color}22` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: r.color }} />
                </span>
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">
                  {tFeed(r.labelKey)}
                </span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{r.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
