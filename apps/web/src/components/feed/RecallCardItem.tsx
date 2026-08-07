'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  BookOpen,
  Calculator,
  Check,
  Code2,
  FlaskConical,
  Globe2,
  Leaf,
  Orbit,
  RefreshCw,
  Shield,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import type { RecallCard, RecallGrade } from '@/lib/feed-smart-scroll-types';

type Stage = 'resting' | 'revealed' | 'completed';

const SUBJECT_CONFIG: Record<
  string,
  { icon: typeof Leaf; accent: string; soft: string }
> = {
  biology: { icon: Leaf, accent: '#16A34A', soft: 'bg-green-50 dark:bg-green-900/20' },
  mathematics: { icon: Calculator, accent: '#0284C7', soft: 'bg-sky-50 dark:bg-sky-900/20' },
  physics: { icon: Orbit, accent: '#4F46E5', soft: 'bg-indigo-50 dark:bg-indigo-900/20' },
  chemistry: { icon: FlaskConical, accent: '#9333EA', soft: 'bg-purple-50 dark:bg-purple-900/20' },
  english: { icon: BookOpen, accent: '#EA580C', soft: 'bg-orange-50 dark:bg-orange-900/20' },
  history: { icon: RefreshCw, accent: '#CA8A04', soft: 'bg-yellow-50 dark:bg-yellow-900/20' },
  geography: { icon: Globe2, accent: '#0D9488', soft: 'bg-teal-50 dark:bg-teal-900/20' },
  computerScience: { icon: Code2, accent: '#DB2777', soft: 'bg-pink-50 dark:bg-pink-900/20' },
};

const DEFAULT_SUBJECT = {
  icon: Sparkles,
  accent: '#6366F1',
  soft: 'bg-indigo-50 dark:bg-indigo-900/20',
};

function strengthLabel(strength: number): { label: string; color: string } {
  if (strength >= 0.7) return { label: 'Fresh', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' };
  if (strength >= 0.35) return { label: 'Fading', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' };
  return { label: 'Forgotten', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' };
}

interface RecallCardItemProps {
  card: RecallCard;
  onGrade?: (cardId: string, grade: RecallGrade) => void;
  onDefer?: (cardId: string) => void;
}

export default function RecallCardItem({ card, onGrade, onDefer }: RecallCardItemProps) {
  const subject = SUBJECT_CONFIG[card.subject] ?? DEFAULT_SUBJECT;
  const Icon = subject.icon;
  const badge = useMemo(() => strengthLabel(card.recallStrength), [card.recallStrength]);

  const [stage, setStage] = useState<Stage>('resting');
  const [earnedXp, setEarnedXp] = useState(0);
  const [fillPct, setFillPct] = useState(Math.round(card.recallStrength * 100));

  const handleReveal = useCallback(() => setStage('revealed'), []);

  const handleGrade = useCallback(
    (grade: RecallGrade) => {
      const xp =
        grade === 'again' ? 1 : grade === 'good' ? card.xpReward : Math.round(card.xpReward * 1.4);
      setEarnedXp(xp);
      setFillPct(grade === 'again' ? Math.min(100, Math.round((card.recallStrength + 0.15) * 100)) : 100);
      setStage('completed');
      onGrade?.(card.id, grade);
    },
    [card.id, card.recallStrength, card.xpReward, onGrade],
  );

  return (
    <article className="feed-card-mobile recall-card-mobile bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${subject.soft}`}
          style={{ color: subject.accent }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Memory Check</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {card.subjectLabel}
            {card.courseTitle ? ` · ${card.courseTitle}` : ''}
            {card.daysSinceLastSeen > 0 ? ` · ${card.daysSinceLastSeen}d ago` : ''}
          </p>
        </div>
      </div>

      {stage !== 'completed' && (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {card.questionText}
          </p>

          {stage === 'resting' && (
            <button
              type="button"
              onClick={handleReveal}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-colors"
              style={{ backgroundColor: `${subject.accent}18`, color: subject.accent }}
            >
              Reveal answer →
            </button>
          )}

          {stage === 'revealed' && (
            <div className="mt-3 space-y-3 animate-fadeIn">
              <div
                className="rounded-xl px-3.5 py-3 border"
                style={{
                  backgroundColor: `${subject.accent}10`,
                  borderColor: `${subject.accent}33`,
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: subject.accent }}>
                  Answer
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{card.answerText}</p>
                {card.hint && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Hint: {card.hint}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGrade('again')}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                >
                  Again
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade('good')}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400"
                >
                  Good
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade('easy')}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                >
                  Easy
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {stage === 'completed' && (
        <div className="mt-4 flex flex-col items-center text-center animate-fadeIn">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: `${subject.accent}18`, color: subject.accent }}
          >
            <Check className="w-6 h-6" />
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-gray-100">+{earnedXp}</p>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">XP earned</p>
          <div className="w-full mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${fillPct}%`, backgroundColor: subject.accent }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ backgroundColor: `${subject.accent}14`, color: subject.accent }}
        >
          {card.subjectLabel.split('·')[0]?.trim() || 'Recall'}
        </span>
        <div className="flex items-center gap-2">
          {card.protectsStreak && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              Streak
            </span>
          )}
          {stage === 'resting' && (
            <button
              type="button"
              onClick={() => onDefer?.(card.id)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
