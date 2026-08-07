'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { TokenManager } from '@/lib/api/auth';
import {
  fetchReelsFeed,
  fetchMoreReelsFeed,
  readReelsCache,
  isReelsCacheFresh,
  type ReelFeedItem,
  type ReelType,
} from '@/lib/reels-cache';
import { fetchReelsState, postReelInteraction } from '@/lib/api/reels';
import {
  Heart, MessageCircle, Share2, Bookmark,
  ChevronUp, ChevronDown, Trophy,
  Zap, Check, Play, RefreshCw, Volume2, VolumeX, X,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import ComboBar from '@/components/reels/ComboBar';
import BountyDetailModal from '@/components/feed/BountyDetailModal';
import type { FeynmanBounty } from '@/lib/feed-smart-scroll-types';

// ─── Subject Gradients (3-stop native parity) ─────────────────────────────
const SUBJECT_GRADIENTS: Record<string, [string, string, string]> = {
  physics:     ['#0B1437', '#1E3A8A', '#3B4CCA'],
  mathematics: ['#0A2540', '#0E7490', '#10A8B8'],
  math:        ['#0A2540', '#0E7490', '#10A8B8'],
  biology:     ['#06281E', '#047857', '#10B981'],
  chemistry:   ['#2B0F4A', '#7E22CE', '#A855F7'],
  history:     ['#3B1209', '#C2410C', '#EA580C'],
  english:     ['#1F1147', '#5B21B6', '#7C3AED'],
  literature:  ['#1F1147', '#5B21B6', '#7C3AED'],
  geography:   ['#022C22', '#059669', '#34D399'],
  arts:        ['#3D0A30', '#BE185D', '#EC4899'],
  general:     ['#111827', '#1F2937', '#374151'],
};
const DEFAULT_GRADIENT: [string, string, string] = ['#1A0B3D', '#5B21B6', '#7C3AED'];

function gradientFor(subject?: string): [string, string, string] {
  if (!subject) return DEFAULT_GRADIENT;
  const key = subject.toLowerCase().split(/[·\s/]/)[0].trim();
  return SUBJECT_GRADIENTS[key] ?? DEFAULT_GRADIENT;
}

function gradientCss(subject?: string) {
  const [a, b, c] = gradientFor(subject);
  return `linear-gradient(160deg, ${a}, ${b}, ${c})`;
}

const TYPE_CONFIG: Record<ReelType, { label: string; color: string }> = {
  FOCUS_REEL:    { label: 'FOCUS REEL',     color: '#A855F7' },
  RECALL_CARD:   { label: 'FLASHCARD',       color: '#3B82F6' },
  QUIZ_QUESTION: { label: 'QUICK QUIZ',      color: '#10B981' },
  TF_CARD:       { label: 'TRUE OR FALSE',   color: '#22D3EE' },
  CLOZE_CARD:    { label: 'FILL THE BLANK',  color: '#F472B6' },
  BOUNTY:        { label: 'BOUNTY',          color: '#F59E0B' },
  POST:          { label: 'POST',            color: '#EC4899' },
};

const REEL_PAGE_HEIGHT =
  'calc(100dvh - var(--bottom-nav-height, 64px) - env(safe-area-inset-bottom, 0px))';

const FALLBACK_REELS: ReelFeedItem[] = [
  {
    id: 'reel-physics-1',
    type: 'FOCUS_REEL',
    subject: 'Physics',
    payload: {
      title: 'Quantum Wave-Particle Duality',
      description:
        'Light behaves as both a wave and a particle — the double-slit experiment showed that electrons fired one at a time still form an interference pattern.',
      creator: { id: 't1', firstName: 'Albert', lastName: 'Einstein' },
    },
    engagement: { likesCount: 248, commentsCount: 31, sharesCount: 12, bookmarked: false, myReaction: null },
  },
  {
    id: 'quiz-biology-1',
    type: 'QUIZ_QUESTION',
    subject: 'Biology',
    payload: {
      question: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'],
      correctAnswer: 1,
      points: 10,
      explanation: 'Mitochondria produce ATP through cellular respiration.',
    },
    engagement: { likesCount: 182, commentsCount: 14, sharesCount: 8 },
  },
  {
    id: 'recall-biology-1',
    type: 'RECALL_CARD',
    subject: 'Biology',
    payload: {
      subjectLabel: 'Biology · Cell Structure',
      question: {
        text: 'What phase of mitosis do chromosomes align at the equator?',
        options: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'],
        correctAnswer: 1,
      },
      xpReward: 5,
      recallStrength: 0.4,
    },
    engagement: { likesCount: 97, commentsCount: 6 },
  },
  {
    id: 'tf-math-1',
    type: 'TF_CARD',
    subject: 'Mathematics',
    payload: {
      claim: 'The square root of 144 is 12.',
      correctAnswer: 0,
      explanation: '√144 = 12, because 12 × 12 = 144.',
      points: 5,
    },
    engagement: { likesCount: 63, commentsCount: 4 },
  },
  {
    id: 'cloze-chem-1',
    type: 'CLOZE_CARD',
    subject: 'Chemistry',
    payload: {
      sentence: 'Water has the chemical formula ___.',
      options: ['H2O', 'CO2', 'NaCl', 'O2'],
      correctAnswer: 0,
      points: 8,
      explanation: 'Two hydrogen atoms bonded to one oxygen atom.',
    },
    engagement: { likesCount: 54, commentsCount: 3 },
  },
  {
    id: 'bounty-calc-1',
    type: 'BOUNTY',
    subject: 'Mathematics',
    payload: {
      id: 'bounty-calc-1',
      questionText: 'Can someone explain the chain rule in calculus simply?',
      bountyXp: 250,
      asker: { id: 'u1', firstName: 'Dara', lastName: 'Sok', name: 'Dara' },
      hoursLeft: 5,
      replyCount: 2,
    },
    engagement: { likesCount: 41, commentsCount: 2 },
  },
];

type InteractFn = (payload: {
  correct?: boolean;
  grade?: 'again' | 'good' | 'easy';
  chosenIndex?: number;
  xpEarned?: number;
}) => void;

function TypePill({ type, extra }: { type: ReelType; extra?: string }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <div className="flex items-center gap-2 mb-4">
      <span
        className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full"
        style={{ color: cfg.color, backgroundColor: `${cfg.color}22` }}
      >
        {cfg.label}
      </span>
      {extra && (
        <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold">
          <Zap className="w-3 h-3" /> {extra}
        </span>
      )}
    </div>
  );
}

function FocusReelCard({ item }: { item: ReelFeedItem }) {
  const p = item.payload;
  const title = p.title ?? p.questionText;
  const description = p.description ?? p.content;
  const creator = p.creator ?? p.author;
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-5 pb-28">
      {item.subject && (
        <span className="self-start text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-3 bg-white/15 text-white">
          {item.subject}
        </span>
      )}
      <TypePill type={item.type === 'POST' ? 'POST' : 'FOCUS_REEL'} />
      {title && <h2 className="text-white text-2xl font-black leading-tight mb-2 drop-shadow-md">{title}</h2>}
      {description && <p className="text-white/80 text-sm leading-relaxed mb-4 line-clamp-5">{description}</p>}
      {creator && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            {(creator.firstName?.[0] || creator.name?.[0] || '?')}
            {creator.lastName?.[0] || ''}
          </div>
          <span className="text-white/90 text-sm font-semibold">
            {creator.lastName ? `${creator.lastName} ${creator.firstName}` : creator.name}
          </span>
        </div>
      )}
    </div>
  );
}

function QuizCard({ item, onInteract }: { item: ReelFeedItem; onInteract: InteractFn }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const p = item.payload;
  const question = p.question ?? p.questionText;
  const options: string[] = p.options ?? [];
  const correctAnswer = p.correctAnswer ?? 0;
  const points = p.points ?? 10;

  const handleSubmit = () => {
    if (selected === null || submitted) return;
    setSubmitted(true);
    const correct = selected === correctAnswer;
    onInteract({ correct, chosenIndex: selected, xpEarned: correct ? points : 0 });
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10 pb-28">
      <TypePill type="QUIZ_QUESTION" extra={`+${points} XP`} />
      <p className="text-white text-xl font-bold leading-snug mb-6 drop-shadow">{question}</p>
      <div className="space-y-3">
        {options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect = idx === correctAnswer;
          let bg = 'rgba(255,255,255,0.1)';
          let border = 'rgba(255,255,255,0.2)';
          if (submitted) {
            if (isCorrect) { bg = 'rgba(16,185,129,0.25)'; border = '#10B981'; }
            else if (isSelected) { bg = 'rgba(239,68,68,0.2)'; border = '#EF4444'; }
          } else if (isSelected) {
            bg = 'rgba(16,185,129,0.18)';
            border = '#10B981';
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={submitted}
              onClick={() => setSelected(idx)}
              className="w-full text-left px-4 py-3.5 rounded-2xl text-white font-medium text-sm transition-all active:scale-[0.98]"
              style={{ backgroundColor: bg, border: `1.5px solid ${border}` }}
            >
              <span className="mr-2 font-black">{String.fromCharCode(65 + idx)}.</span>
              {opt}
              {submitted && isCorrect && <Check className="inline w-4 h-4 ml-2 text-emerald-400" />}
            </button>
          );
        })}
      </div>
      {!submitted ? (
        <button
          type="button"
          disabled={selected === null}
          onClick={handleSubmit}
          className="mt-5 w-full py-3.5 rounded-2xl font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
        >
          Submit
        </button>
      ) : p.explanation ? (
        <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/20 text-white/85 text-xs leading-relaxed">
          {p.explanation}
        </div>
      ) : null}
    </div>
  );
}

function TrueFalseCard({ item, onInteract }: { item: ReelFeedItem; onInteract: InteractFn }) {
  const [picked, setPicked] = useState<number | null>(null);
  const p = item.payload;
  // Native: claim + correctAnswer 0|1. Legacy fallback: question + answer boolean.
  const claim = p.claim ?? p.question;
  const correctAnswer: number =
    typeof p.correctAnswer === 'number'
      ? p.correctAnswer
      : p.answer === false
        ? 1
        : 0;
  const points = p.points ?? 5;
  const answered = picked !== null;

  const handleTap = (idx: number) => {
    if (answered) return;
    setPicked(idx);
    const correct = idx === correctAnswer;
    onInteract({ correct, chosenIndex: idx, xpEarned: correct ? points : 0 });
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10 pb-28">
      <TypePill type="TF_CARD" extra={`+${points} XP`} />
      <p className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3 text-center">True or false?</p>
      <p className="text-white text-2xl font-bold leading-snug mb-10 text-center">{claim}</p>
      <div className="flex gap-4">
        {[
          { idx: 0, label: 'TRUE', color: '#10B981' },
          { idx: 1, label: 'FALSE', color: '#EF4444' },
        ].map((c) => {
          const isCorrect = c.idx === correctAnswer;
          const isPicked = picked === c.idx;
          let bg = `${c.color}22`;
          let border = 'rgba(255,255,255,0.2)';
          if (answered) {
            if (isCorrect) { bg = `${c.color}EE`; border = c.color; }
            else if (isPicked) { bg = 'rgba(239,68,68,0.5)'; border = '#EF4444'; }
          }
          return (
            <button
              key={c.idx}
              type="button"
              disabled={answered}
              onClick={() => handleTap(c.idx)}
              className="flex-1 py-5 rounded-3xl font-black text-lg transition-all active:scale-95 text-white"
              style={{ background: bg, border: `2px solid ${border}` }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {answered && p.explanation && (
        <div className="mt-5 p-3 rounded-xl bg-white/10 text-white/80 text-xs leading-relaxed">{p.explanation}</div>
      )}
    </div>
  );
}

function ClozeCard({ item, onInteract }: { item: ReelFeedItem; onInteract: InteractFn }) {
  const [picked, setPicked] = useState<number | null>(null);
  const p = item.payload;
  const sentence: string = p.sentence ?? '';
  const options: string[] = p.options ?? [];
  const correctAnswer = p.correctAnswer ?? 0;
  const points = p.points ?? 8;
  const answered = picked !== null;
  const [before, ...rest] = sentence.split(/_{3,}/);
  const after = rest.join('___');
  const blankWord = answered ? (options[picked!] ?? '______') : '______';

  const handlePick = (idx: number) => {
    if (answered) return;
    setPicked(idx);
    const correct = idx === correctAnswer;
    onInteract({ correct, chosenIndex: idx, xpEarned: correct ? points : 0 });
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10 pb-28">
      <TypePill type="CLOZE_CARD" extra={`+${points} XP`} />
      <p className="text-white text-xl font-bold leading-snug mb-8 text-center">
        {before}
        <span
          className="inline-block mx-1 px-2 py-0.5 rounded-lg border border-dashed"
          style={{
            color: answered ? (picked === correctAnswer ? '#10B981' : '#F472B6') : '#F472B6',
            borderColor: answered ? (picked === correctAnswer ? '#10B981' : '#F472B6') : 'rgba(244,114,182,0.5)',
            background: 'rgba(244,114,182,0.12)',
          }}
        >
          {blankWord}
        </span>
        {after}
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {options.map((opt, idx) => {
          const isCorrect = idx === correctAnswer;
          const isPicked = picked === idx;
          let bg = 'rgba(255,255,255,0.1)';
          let border = 'rgba(255,255,255,0.2)';
          if (answered) {
            if (isCorrect) { bg = 'rgba(16,185,129,0.3)'; border = '#10B981'; }
            else if (isPicked) { bg = 'rgba(239,68,68,0.25)'; border = '#EF4444'; }
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={answered}
              onClick={() => handlePick(idx)}
              className="px-4 py-2.5 rounded-full text-sm font-bold text-white active:scale-95 transition-all"
              style={{ background: bg, border: `1.5px solid ${border}` }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered && p.explanation && (
        <div className="mt-5 p-3 rounded-xl bg-white/10 text-white/80 text-xs leading-relaxed">{p.explanation}</div>
      )}
    </div>
  );
}

function RecallCard({ item, onInteract }: { item: ReelFeedItem; onInteract: InteractFn }) {
  const p = item.payload;
  const q = p.question;
  const options: string[] | undefined = q?.options ?? p.options;
  const hasOptions = Array.isArray(options) && options.length >= 2;
  const correctIdx: number = q?.correctAnswer ?? p.correctAnswer ?? 0;
  const questionText = q?.text ?? p.front ?? p.questionText ?? '';
  const answerText = options?.[correctIdx] ?? p.back ?? '';
  const xpGood = p.xpReward ?? 5;
  const xpEasy = Math.round(xpGood * 1.4);

  const [selected, setSelected] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState(false);
  const answered = selected !== null;
  const wasCorrect = answered && selected === correctIdx;

  if (hasOptions) {
    return (
      <div className="absolute inset-0 flex flex-col justify-center px-5 py-10 pb-28">
        <TypePill type="RECALL_CARD" />
        {p.subjectLabel && <p className="text-white/50 text-xs mb-3">{p.subjectLabel}</p>}
        <p className="text-white text-xl font-bold leading-snug mb-6">{questionText}</p>
        <div className="space-y-2.5">
          {options!.map((opt, idx) => {
            const isCorrect = idx === correctIdx;
            const isPicked = selected === idx;
            let bg = 'rgba(255,255,255,0.1)';
            let border = 'rgba(255,255,255,0.2)';
            if (answered) {
              if (isCorrect) { bg = 'rgba(16,185,129,0.25)'; border = '#10B981'; }
              else if (isPicked) { bg = 'rgba(239,68,68,0.2)'; border = '#EF4444'; }
            }
            return (
              <button
                key={idx}
                type="button"
                disabled={answered}
                onClick={() => {
                  if (answered) return;
                  setSelected(idx);
                  if (idx !== correctIdx) onInteract({ grade: 'again', chosenIndex: idx });
                }}
                className="w-full text-left px-4 py-3 rounded-2xl text-white text-sm font-medium active:scale-[0.98]"
                style={{ background: bg, border: `1.5px solid ${border}` }}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {answered && wasCorrect && !graded && (
          <div className="mt-5 space-y-2">
            <p className="text-white/70 text-xs text-center font-semibold">How well did you know it?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setGraded(true); onInteract({ grade: 'good', chosenIndex: selected! }); }}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-sky-500/80"
              >
                Good <span className="text-white/70 text-xs">+{xpGood}</span>
              </button>
              <button
                type="button"
                onClick={() => { setGraded(true); onInteract({ grade: 'easy', chosenIndex: selected! }); }}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-emerald-500/80"
              >
                Easy <span className="text-white/70 text-xs">+{xpEasy}</span>
              </button>
            </div>
          </div>
        )}
        {graded && (
          <p className="mt-4 text-center text-white/50 text-xs font-semibold">Scroll for the next reel</p>
        )}
      </div>
    );
  }

  // Free-recall flip fallback
  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10 pb-28">
      <TypePill type="RECALL_CARD" />
      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        className="w-full min-h-[200px] rounded-3xl p-6 flex flex-col items-center justify-center text-center active:scale-[0.98]"
        style={{ background: flipped ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}
      >
        <p className="text-white text-lg font-bold leading-snug">{flipped ? answerText : questionText}</p>
        <span className="mt-4 text-white/40 text-xs">{flipped ? 'Tap to see question' : 'Tap to reveal answer'}</span>
      </button>
      {flipped && !graded && (
        <div className="mt-4 flex gap-2">
          {(['again', 'good', 'easy'] as const).map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => { setGraded(true); onInteract({ grade }); }}
              className={`flex-1 py-3 rounded-2xl font-bold text-white text-sm ${
                grade === 'again' ? 'bg-rose-500/70' : grade === 'good' ? 'bg-sky-500/80' : 'bg-emerald-500/80'
              }`}
            >
              {grade === 'again' ? 'Again' : grade === 'good' ? `Good +${xpGood}` : `Easy +${xpEasy}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BountyCard({
  item,
  onOpen,
}: {
  item: ReelFeedItem;
  onOpen: (bounty: FeynmanBounty) => void;
}) {
  const p = item.payload;
  const questionText = p.questionText ?? p.title ?? p.description ?? '';
  const bountyXp = p.bountyXp ?? p.xpReward ?? 50;
  const askerName = p.asker?.name ?? p.asker?.firstName ?? 'Student';
  const hoursLeft = p.hoursLeft;

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10 pb-28">
      <TypePill type="BOUNTY" extra={`${bountyXp} XP`} />
      <p className="text-white/60 text-xs mb-3">
        Asked by @{askerName}
        {hoursLeft != null ? ` · ${hoursLeft}h left` : ''}
      </p>
      <div className="p-6 rounded-3xl mb-5 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(251,191,36,0.3)' }}>
        <Trophy className="w-7 h-7 text-amber-300 mx-auto mb-3" />
        <p className="text-white text-lg font-bold leading-snug">{questionText}</p>
        {p.replyCount != null && (
          <p className="text-white/50 text-xs mt-3">{p.replyCount} replies so far</p>
        )}
      </div>
      <button
        type="button"
        onClick={() =>
          onOpen({
            id: p.id ?? item.id,
            asker: {
              id: p.asker?.id ?? 'unknown',
              name: askerName,
              gradeLabel: p.asker?.gradeLabel,
            },
            subject: item.subject ?? p.subject ?? 'General',
            questionText,
            bountyXp,
            hoursLeft: hoursLeft ?? 6,
            tutorsWorking: p.tutorsWorking ?? 0,
            answersCount: p.replyCount ?? p.answersCount ?? 0,
            createdAt: item.createdAt ?? new Date().toISOString(),
          })
        }
        className="w-full py-4 rounded-2xl font-bold text-white text-base"
        style={{ background: 'linear-gradient(to right, #F59E0B, #EA580C)' }}
      >
        Answer & claim bounty
      </button>
    </div>
  );
}

function EngagementBar({
  item,
  accent,
  horizontal,
}: {
  item: ReelFeedItem;
  accent: string;
  horizontal?: boolean;
}) {
  const [liked, setLiked] = useState(!!item.engagement?.myReaction || !!item.engagement?.isLikedByMe);
  const [bookmarked, setBookmarked] = useState(!!item.engagement?.bookmarked);
  const likeCount = (item.engagement?.likesCount ?? 0) + (liked && !item.engagement?.isLikedByMe ? 1 : 0);

  const btn = (children: ReactNode, onClick?: () => void) => (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
      {children}
    </button>
  );

  return (
    <div
      className={
        horizontal
          ? 'absolute bottom-20 left-0 right-0 flex items-center justify-center gap-8 px-6'
          : 'absolute right-3 bottom-28 flex flex-col items-center gap-5'
      }
    >
      {btn(
        <>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${liked ? 'bg-red-500' : 'bg-white/15'}`}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-white text-white' : 'text-white'}`} />
          </div>
          {!horizontal && <span className="text-white text-[11px] font-bold">{likeCount || ''}</span>}
        </>,
        () => setLiked((v) => !v),
      )}
      {btn(
        <>
          <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          {!horizontal && <span className="text-white text-[11px] font-bold">{item.engagement?.commentsCount || ''}</span>}
        </>,
      )}
      {btn(
        <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
          <Share2 className="w-5 h-5 text-white" style={{ color: accent }} />
        </div>,
      )}
      {btn(
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${bookmarked ? 'bg-amber-400' : 'bg-white/15'}`}>
          <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-white text-white' : 'text-white'}`} />
        </div>,
        () => setBookmarked((v) => !v),
      )}
    </div>
  );
}

function SessionCompleteOverlay({
  reviewed,
  xp,
  upcoming,
  onDismiss,
}: {
  reviewed: number;
  xp: number;
  upcoming: number;
  onDismiss: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: 'linear-gradient(160deg, #1A0B3D, #5B21B6)' }}>
        <button type="button" onClick={onDismiss} className="absolute top-4 right-4 text-white/50" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <p className="text-amber-300 text-xs font-black tracking-widest mb-2">SESSION COMPLETE</p>
        <h3 className="text-white text-2xl font-black mb-4">Come back tomorrow</h3>
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-xl bg-white/10 py-3">
            <p className="text-white text-lg font-black">{reviewed}</p>
            <p className="text-white/50 text-[10px]">Reviewed</p>
          </div>
          <div className="rounded-xl bg-white/10 py-3">
            <p className="text-amber-300 text-lg font-black">+{xp}</p>
            <p className="text-white/50 text-[10px]">XP</p>
          </div>
          <div className="rounded-xl bg-white/10 py-3">
            <p className="text-sky-300 text-lg font-black">{upcoming}</p>
            <p className="text-white/50 text-[10px]">Tomorrow</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-3 rounded-full font-bold text-white"
          style={{ background: 'linear-gradient(90deg, #A855F7, #7C3AED)' }}
        >
          Keep scrolling
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ReelsPage() {
  const initialUserId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return TokenManager.getUserData()?.user?.id || '';
  }, []);
  const initialCache = initialUserId ? readReelsCache(initialUserId) : null;

  const [userId, setUserId] = useState(initialUserId);
  const [reels, setReels] = useState<ReelFeedItem[]>(initialCache?.items ?? []);
  const [hasMore, setHasMore] = useState(initialCache?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCache?.nextCursor ?? null);
  const [loading, setLoading] = useState(!initialCache?.items?.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [dueRecallCount, setDueRecallCount] = useState(0);
  const [upcomingRecall, setUpcomingRecall] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [showLoot, setShowLoot] = useState(false);
  const [xpBurst, setXpBurst] = useState<number | null>(null);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [muted, setMuted] = useState(true);
  const [bountyDetail, setBountyDetail] = useState<FeynmanBounty | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const prevDueRef = useRef<number | null>(null);

  const loadState = useCallback(async () => {
    const state = await fetchReelsState();
    if (!state) return;
    setCombo(state.combo ?? 0);
    setDueRecallCount(state.dueRecallCount ?? 0);
    setUpcomingRecall(state.upcomingRecallCount ?? 0);
    if (prevDueRef.current === null) prevDueRef.current = state.dueRecallCount ?? 0;
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    const uid = userId || TokenManager.getUserData()?.user?.id || '';
    if (!uid) {
      setLoading(false);
      if (!reels.length) setReels(FALLBACK_REELS);
      return;
    }
    if (!userId) setUserId(uid);

    const hasVisible = reels.length > 0;
    const silent = (opts?.silent === true || hasVisible) && !opts?.force;

    try {
      if (!silent) setLoading(true);
      if (!opts?.force && isReelsCacheFresh(uid) && hasVisible) {
        setLoading(false);
        return;
      }
      const payload = await fetchReelsFeed({ userId: uid, force: opts?.force });
      if (payload?.items?.length) {
        setReels(payload.items);
        setHasMore(payload.hasMore);
        setNextCursor(payload.nextCursor);
      } else if (!hasVisible) {
        setReels(FALLBACK_REELS);
      }
    } catch {
      if (!hasVisible) setReels(FALLBACK_REELS);
    } finally {
      setLoading(false);
    }
  }, [userId, reels.length]);

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const merged = await fetchMoreReelsFeed(userId);
      if (merged?.items?.length) {
        setReels(merged.items);
        setHasMore(merged.hasMore);
        setNextCursor(merged.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [userId, hasMore, nextCursor, loadingMore]);

  useEffect(() => {
    const uid = TokenManager.getUserData()?.user?.id || '';
    if (!uid) {
      setLoading(false);
      if (!reels.length) setReels(FALLBACK_REELS);
      return;
    }
    setUserId(uid);
    const cached = readReelsCache(uid);
    if (cached?.items?.length) {
      setReels(cached.items);
      setHasMore(cached.hasMore);
      setNextCursor(cached.nextCursor);
      setLoading(false);
      if (!isReelsCacheFresh(uid)) void load({ silent: true });
    } else {
      void load({ silent: false });
    }
    void loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (isScrolling.current) return;
      const pageH = container.clientHeight || window.innerHeight;
      const newIndex = Math.round(container.scrollTop / pageH);
      if (newIndex !== currentIndex) setCurrentIndex(newIndex);
      if (newIndex >= reels.length - 3) void loadMore();
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, reels.length, loadMore]);

  const scrollTo = useCallback((dir: 'up' | 'down') => {
    const container = containerRef.current;
    if (!container) return;
    const pageH = container.clientHeight || window.innerHeight;
    const newIndex = dir === 'down'
      ? Math.min(currentIndex + 1, reels.length - 1)
      : Math.max(currentIndex - 1, 0);
    isScrolling.current = true;
    container.scrollTo({ top: newIndex * pageH, behavior: 'smooth' });
    setCurrentIndex(newIndex);
    setTimeout(() => { isScrolling.current = false; }, 500);
  }, [currentIndex, reels.length]);

  const handleInteract = useCallback(
    async (item: ReelFeedItem, payload: Parameters<InteractFn>[0]) => {
      const result = await postReelInteraction({
        itemId: item.id,
        itemType: item.type,
        correct: payload.correct,
        grade: payload.grade,
        chosenIndex: payload.chosenIndex,
        xpEarned: payload.xpEarned,
      });

      const xp =
        result?.xpEarned ??
        payload.xpEarned ??
        (payload.grade === 'easy' ? 7 : payload.grade === 'good' ? 5 : payload.correct ? 5 : 0);

      if (xp > 0) {
        setSessionXp((v) => v + xp);
        setXpBurst(xp);
        setTimeout(() => setXpBurst(null), 1200);
      }

      if (typeof result?.combo === 'number') setCombo(result.combo);
      else if (payload.correct || (payload.grade && payload.grade !== 'again')) {
        setCombo((c) => {
          const next = c + 1;
          if (next > 0 && next % 5 === 0) {
            setShowLoot(true);
            setTimeout(() => setShowLoot(false), 2000);
          }
          return next;
        });
      } else if (payload.correct === false || payload.grade === 'again') {
        setCombo(0);
      }

      if (item.type === 'RECALL_CARD') {
        setSessionReviewed((n) => n + 1);
        const nextDue = typeof result?.dueRecallCount === 'number'
          ? result.dueRecallCount
          : Math.max(0, dueRecallCount - 1);
        if (prevDueRef.current && prevDueRef.current > 0 && nextDue === 0) {
          setShowSessionComplete(true);
        }
        setDueRecallCount(nextDue);
        prevDueRef.current = nextDue;
        if (typeof result?.upcomingRecallCount === 'number') {
          setUpcomingRecall(result.upcomingRecallCount);
        }
      }

      if (result?.lootUnlocked) {
        setShowLoot(true);
        setTimeout(() => setShowLoot(false), 2000);
      }
    },
    [dueRecallCount],
  );

  const learningTypes: ReelType[] = ['QUIZ_QUESTION', 'TF_CARD', 'CLOZE_CARD', 'RECALL_CARD', 'BOUNTY'];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden reels-shell" style={{ zIndex: 10 }}>
      {loading && reels.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: gradientCss('general') }}>
          <RefreshCw className="w-8 h-8 text-white/40 animate-spin" />
        </div>
      )}

      {!loading && reels.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" style={{ background: gradientCss() }}>
          <Play className="w-10 h-10 text-white/40 mb-4" />
          <p className="text-white font-bold text-lg mb-2">No reels right now</p>
          <p className="text-white/50 text-sm mb-5">Pull to refresh or come back soon.</p>
          <button
            type="button"
            onClick={() => void load({ force: true })}
            className="px-5 py-2.5 rounded-full bg-white/15 text-white text-sm font-bold"
          >
            Retry
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="overflow-y-scroll"
        style={{
          height: REEL_PAGE_HEIGHT,
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {reels.map((item, idx) => {
          const accent = TYPE_CONFIG[item.type]?.color ?? '#A855F7';
          const horizontalRail = learningTypes.includes(item.type);
          return (
            <div
              key={item.id}
              className="relative w-full overflow-hidden"
              style={{
                height: REEL_PAGE_HEIGHT,
                scrollSnapAlign: 'start',
                background: gradientCss(item.subject),
              }}
            >
              {item.type === 'FOCUS_REEL' && <FocusReelCard item={item} />}
              {item.type === 'POST' && <FocusReelCard item={item} />}
              {item.type === 'QUIZ_QUESTION' && (
                <QuizCard item={item} onInteract={(p) => handleInteract(item, p)} />
              )}
              {item.type === 'TF_CARD' && (
                <TrueFalseCard item={item} onInteract={(p) => handleInteract(item, p)} />
              )}
              {item.type === 'CLOZE_CARD' && (
                <ClozeCard item={item} onInteract={(p) => handleInteract(item, p)} />
              )}
              {item.type === 'RECALL_CARD' && (
                <RecallCard item={item} onInteract={(p) => handleInteract(item, p)} />
              )}
              {item.type === 'BOUNTY' && (
                <BountyCard item={item} onOpen={setBountyDetail} />
              )}

              <EngagementBar item={item} accent={accent} horizontal={horizontalRail} />

              {idx === 0 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
                  <ChevronUp className="w-5 h-5 text-white/40 animate-bounce" />
                  <span className="text-white/30 text-[10px]">Swipe up</span>
                </div>
              )}
            </div>
          );
        })}

        {loadingMore && (
          <div className="flex items-center justify-center py-8" style={{ height: 80 }}>
            <RefreshCw className="w-5 h-5 text-white/30 animate-spin" />
          </div>
        )}
      </div>

      <ComboBar combo={combo} dueRecallCount={dueRecallCount} />

      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className="absolute top-[calc(env(safe-area-inset-top,0px)+48px)] right-3 z-20 w-9 h-9 rounded-full bg-black/30 flex items-center justify-center text-white/80"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-3 z-20">
        <button type="button" onClick={() => scrollTo('up')} disabled={currentIndex === 0}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20">
          <ChevronUp className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => scrollTo('down')} disabled={currentIndex >= reels.length - 1}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {xpBurst != null && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce">
          <div className="px-5 py-3 rounded-full font-black text-xl text-white"
            style={{ background: 'linear-gradient(to right, #F59E0B, #EF4444)' }}>
            +{xpBurst} XP
          </div>
        </div>
      )}

      {showLoot && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-5 rounded-3xl text-center text-white"
            style={{ background: 'linear-gradient(135deg, #FDE047, #F59E0B, #EA580C)' }}>
            <p className="text-sm font-black tracking-widest">LOOT BOX UNLOCKED</p>
            <p className="text-xs mt-1 opacity-90">+50 XP bonus</p>
          </div>
        </div>
      )}

      {showSessionComplete && (
        <SessionCompleteOverlay
          reviewed={sessionReviewed}
          xp={sessionXp}
          upcoming={upcomingRecall}
          onDismiss={() => setShowSessionComplete(false)}
        />
      )}

      <BountyDetailModal
        isOpen={bountyDetail !== null}
        bounty={bountyDetail}
        mode="explain"
        onClose={() => setBountyDetail(null)}
      />

      <UnifiedNavigation />
    </div>
  );
}
