'use client';

import { useMemo } from 'react';
import {
  Diamond,
  MessageCircle,
  Paperclip,
  Ribbon,
  Trophy,
  Users,
} from 'lucide-react';
import type { FeynmanBounty } from '@/lib/feed-smart-scroll-types';

const ACCENT = '#D97706';

function urgencyFor(hours: number): { color: string; bg: string } {
  if (hours < 2) return { color: '#DC2626', bg: 'bg-red-50 dark:bg-red-900/20' };
  if (hours < 6) return { color: '#D97706', bg: 'bg-amber-50 dark:bg-amber-900/20' };
  return { color: '#0D9488', bg: 'bg-teal-50 dark:bg-teal-900/20' };
}

const TIER_STYLES: Record<string, string> = {
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  silver: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

interface FeynmanBountyItemProps {
  bounty: FeynmanBounty;
  onSeeAnswers?: (bountyId: string) => void;
  onExplain?: (bountyId: string) => void;
}

export default function FeynmanBountyItem({
  bounty,
  onSeeAnswers,
  onExplain,
}: FeynmanBountyItemProps) {
  const urgency = useMemo(() => urgencyFor(bounty.hoursLeft), [bounty.hoursLeft]);

  return (
    <article className="feed-card-mobile bounty-card-mobile bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0 text-amber-600">
          <Ribbon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Bounty Question</h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgency.bg}`}
              style={{ color: urgency.color, borderColor: urgency.color }}
            >
              {bounty.hoursLeft}h left
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {bounty.subject}
            <span className="mx-1">·</span>
            asked by @{bounty.asker.name}
            {bounty.asker.gradeLabel ? ` · ${bounty.asker.gradeLabel}` : ''}
          </p>
        </div>
        <div className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex-shrink-0">
          <Diamond className="w-3 h-3" fill="currentColor" />
          +{bounty.bountyXp} XP
        </div>
      </div>

      <div className="my-3 h-px bg-gray-100 dark:bg-white/10" />

      <p className="text-[15px] leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
        {bounty.questionText}
      </p>

      {bounty.attachmentName && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: ACCENT }}>
          <Paperclip className="w-3.5 h-3.5" />
          {bounty.attachmentName}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {bounty.tutorsWorking} active
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="w-3.5 h-3.5" />
          {bounty.answersCount} answers
        </span>
      </div>

      {bounty.topTutor && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <Trophy className="w-3.5 h-3.5 text-amber-600" />
          <span>
            Top tutor: <strong>@{bounty.topTutor.name}</strong>
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${TIER_STYLES[bounty.topTutor.tier] || TIER_STYLES.bronze}`}>
            {bounty.topTutor.tier}
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSeeAnswers?.(bounty.id)}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
        >
          See answers
        </button>
        <button
          type="button"
          onClick={() => onExplain?.(bounty.id)}
          className="flex-1 py-2.5 rounded-full text-sm font-bold text-white transition-colors"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #92400E)` }}
        >
          Explain it
        </button>
      </div>
    </article>
  );
}
