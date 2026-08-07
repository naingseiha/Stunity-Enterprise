'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import {
  fetchReelsFeed,
  readReelsCache,
  isReelsCacheFresh,
  type ReelFeedItem,
  type ReelType,
} from '@/lib/reels-cache';
import {
  Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX,
  Lightbulb, Sparkles, Rocket, ChevronUp, ChevronDown,
  Trophy, BookOpen, HelpCircle, FileText, Zap, X, Check,
  Play, RefreshCw,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';

// ─── Types ─────────────────────────────────────────────────────────────────
interface ReelCreator {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string | null;
}

// ─── Subject Gradients (mirrors FocusReelsScreen.tsx) ─────────────────────
const SUBJECT_GRADIENTS: Record<string, [string, string]> = {
  physics:     ['#0B1437', '#3B4CCA'],
  mathematics: ['#0A2540', '#10A8B8'],
  math:        ['#0A2540', '#10A8B8'],
  biology:     ['#06281E', '#10B981'],
  chemistry:   ['#2B0F4A', '#A855F7'],
  history:     ['#3B1209', '#EA580C'],
  english:     ['#1F1147', '#7C3AED'],
  literature:  ['#1F1147', '#7C3AED'],
  geography:   ['#022C22', '#34D399'],
  arts:        ['#3D0A30', '#EC4899'],
  general:     ['#111827', '#374151'],
};
const DEFAULT_GRADIENT: [string, string] = ['#1A0B3D', '#7C3AED'];

function gradientFor(subject?: string): [string, string] {
  if (!subject) return DEFAULT_GRADIENT;
  const key = subject.toLowerCase().split(/[·\s/]/)[0].trim();
  return SUBJECT_GRADIENTS[key] ?? DEFAULT_GRADIENT;
}

const TYPE_CONFIG: Record<ReelType, { label: string; color: string; Icon: any }> = {
  FOCUS_REEL:    { label: 'FOCUS REEL',     color: '#A855F7', Icon: Play },
  RECALL_CARD:   { label: 'FLASHCARD',       color: '#3B82F6', Icon: RefreshCw },
  QUIZ_QUESTION: { label: 'QUICK QUIZ',      color: '#10B981', Icon: HelpCircle },
  TF_CARD:       { label: 'TRUE OR FALSE',   color: '#22D3EE', Icon: Check },
  CLOZE_CARD:    { label: 'FILL THE BLANK',  color: '#F472B6', Icon: FileText },
  BOUNTY:        { label: 'BOUNTY',          color: '#F59E0B', Icon: Trophy },
  POST:          { label: 'POST',            color: '#EC4899', Icon: FileText },
};

// ─── Fallback Reels (while loading / no API data) ─────────────────────────
const FALLBACK_REELS: ReelFeedItem[] = [
  {
    id: 'reel-physics-1',
    type: 'FOCUS_REEL',
    subject: 'Physics',
    payload: {
      title: 'Quantum Wave-Particle Duality',
      description: 'Light behaves as both a wave and a particle — the double-slit experiment showed that electrons fired one at a time still form an interference pattern, proving quantum superposition.',
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
      explanation: 'The mitochondria produces ATP through cellular respiration, earning it the nickname "powerhouse of the cell."',
    },
    engagement: { likesCount: 182, commentsCount: 14, sharesCount: 8, bookmarked: false, myReaction: null },
  },
  {
    id: 'recall-biology-1',
    type: 'RECALL_CARD',
    subject: 'Biology',
    payload: {
      subjectLabel: 'Biology · Cell Structure',
      front: 'What phase of mitosis do chromosomes align at the equator?',
      back: 'Metaphase — chromosomes line up at the metaphase plate (cell equator) during this phase, pulled by spindle fibers attached to centromeres.',
      recallStrength: 0.4,
    },
    engagement: { likesCount: 97, commentsCount: 6, sharesCount: 3, bookmarked: false, myReaction: null },
  },
  {
    id: 'tf-math-1',
    type: 'TF_CARD',
    subject: 'Mathematics',
    payload: {
      question: 'The square root of 144 is 12.',
      answer: true,
      explanation: '√144 = 12, because 12 × 12 = 144.',
      points: 5,
    },
    engagement: { likesCount: 63, commentsCount: 4, sharesCount: 2, bookmarked: false, myReaction: null },
  },
  {
    id: 'reel-chemistry-1',
    type: 'FOCUS_REEL',
    subject: 'Chemistry',
    payload: {
      title: 'Periodic Table — Period 3 Trends',
      description: 'Moving left to right across Period 3: atomic radius decreases, ionisation energy increases, electronegativity rises. Na is a soft metal; Cl is a reactive non-metal.',
      creator: { id: 't2', firstName: 'Marie', lastName: 'Curie' },
    },
    engagement: { likesCount: 134, commentsCount: 18, sharesCount: 9, bookmarked: false, myReaction: null },
  },
];

// ─── Individual Reel Card Components ───────────────────────────────────────

function FocusReelCard({ item }: { item: ReelFeedItem }) {
  const [g1, g2] = gradientFor(item.subject);
  const { title, description, creator } = item.payload;
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-5 pb-24">
      {/* Subject tag */}
      {item.subject && (
        <div className="mb-3">
          <span className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            {item.subject}
          </span>
        </div>
      )}
      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <Play className="w-3.5 h-3.5" style={{ color: TYPE_CONFIG[item.type].color }} />
        <span className="text-[10px] font-black tracking-widest" style={{ color: TYPE_CONFIG[item.type].color }}>
          {TYPE_CONFIG[item.type].label}
        </span>
      </div>
      {/* Title */}
      {title && <h2 className="text-white text-2xl font-black leading-tight mb-2 drop-shadow-md">{title}</h2>}
      {/* Description */}
      {description && <p className="text-white/80 text-sm leading-relaxed mb-4 line-clamp-4">{description}</p>}
      {/* Creator */}
      {creator && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            {creator.firstName?.[0]}{creator.lastName?.[0]}
          </div>
          <span className="text-white/90 text-sm font-semibold">
            {creator.lastName} {creator.firstName}
          </span>
        </div>
      )}
    </div>
  );
}

function QuizCard({ item, onAnswer }: { item: ReelFeedItem; onAnswer: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const { question, options, correctAnswer, points, explanation } = item.payload;
  const [g1, g2] = gradientFor(item.subject);

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === correctAnswer;
    onAnswer(correct);
    setTimeout(() => setShowExplanation(true), 600);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <HelpCircle className="w-5 h-5 text-emerald-400" />
        <span className="text-[11px] font-black tracking-widest text-emerald-400">QUICK QUIZ</span>
        {points && (
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold">
            <Zap className="w-3 h-3" /> +{points} XP
          </span>
        )}
      </div>
      {/* Question */}
      <p className="text-white text-xl font-bold leading-snug mb-7 drop-shadow">{question}</p>
      {/* Options */}
      <div className="space-y-3">
        {options?.map((opt: string, idx: number) => {
          const isSelected = selected === idx;
          const isCorrect = idx === correctAnswer;
          let bg = 'rgba(255,255,255,0.1)';
          let border = 'rgba(255,255,255,0.2)';
          if (selected !== null) {
            if (isCorrect) { bg = 'rgba(16,185,129,0.25)'; border = '#10B981'; }
            else if (isSelected) { bg = 'rgba(239,68,68,0.2)'; border = '#EF4444'; }
          }
          return (
            <button key={idx} onClick={() => handleSelect(idx)}
              className="w-full text-left px-4 py-3.5 rounded-2xl text-white font-medium text-sm transition-all active:scale-[0.98]"
              style={{ backgroundColor: bg, border: `1.5px solid ${border}` }}>
              <span className="mr-2 font-black" style={{ color: isSelected && !isCorrect ? '#EF4444' : isCorrect && selected !== null ? '#10B981' : '#fff' }}>
                {String.fromCharCode(65 + idx)}.
              </span>
              {opt}
              {selected !== null && isCorrect && <Check className="inline w-4 h-4 ml-2 text-emerald-400" />}
            </button>
          );
        })}
      </div>
      {/* Explanation */}
      {showExplanation && explanation && (
        <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/20 text-white/85 text-xs leading-relaxed">
          💡 {explanation}
        </div>
      )}
    </div>
  );
}

function FlashCard({ item }: { item: ReelFeedItem }) {
  const [flipped, setFlipped] = useState(false);
  const { front, back, subjectLabel, recallStrength } = item.payload;
  const strength = Math.round((recallStrength ?? 0.5) * 100);

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10">
      <div className="flex items-center gap-2 mb-5">
        <RefreshCw className="w-5 h-5 text-blue-400" />
        <span className="text-[11px] font-black tracking-widest text-blue-400">FLASHCARD</span>
        {subjectLabel && <span className="ml-auto text-[10px] text-white/50">{subjectLabel}</span>}
      </div>

      {/* Recall strength bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[10px] text-white/50 mb-1">
          <span>Recall Strength</span><span>{strength}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${strength}%`, background: 'linear-gradient(to right, #3B82F6, #06B6D4)' }} />
        </div>
      </div>

      {/* Flip card */}
      <button onClick={() => setFlipped(!flipped)}
        className="w-full min-h-[220px] rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 active:scale-[0.98]"
        style={{ background: flipped ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
        <p className="text-white text-lg font-bold leading-snug">
          {flipped ? back : front}
        </p>
        <span className="mt-4 text-white/40 text-xs">{flipped ? 'Tap to see question' : 'Tap to reveal answer'}</span>
      </button>
    </div>
  );
}

function TrueFalseCard({ item, onAnswer }: { item: ReelFeedItem; onAnswer: (correct: boolean) => void }) {
  const [answered, setAnswered] = useState<boolean | null>(null);
  const { question, answer, explanation, points } = item.payload;

  const handleAnswer = (choice: boolean) => {
    if (answered !== null) return;
    setAnswered(choice);
    onAnswer(choice === answer);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10">
      <div className="flex items-center gap-2 mb-5">
        <Check className="w-5 h-5 text-cyan-400" />
        <span className="text-[11px] font-black tracking-widest text-cyan-400">TRUE OR FALSE</span>
        {points && <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold"><Zap className="w-3 h-3" />+{points}</span>}
      </div>
      <p className="text-white text-2xl font-bold leading-snug mb-10 text-center">{question}</p>
      <div className="flex gap-4">
        <button onClick={() => handleAnswer(true)}
          className="flex-1 py-5 rounded-3xl font-black text-lg transition-all active:scale-95"
          style={{ background: answered !== null ? (answer === true ? 'rgba(16,185,129,0.3)' : answered === true ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)') : 'rgba(16,185,129,0.15)', border: answered !== null && answer === true ? '2px solid #10B981' : '1.5px solid rgba(255,255,255,0.2)', color: '#10B981' }}>
          TRUE
        </button>
        <button onClick={() => handleAnswer(false)}
          className="flex-1 py-5 rounded-3xl font-black text-lg transition-all active:scale-95"
          style={{ background: answered !== null ? (answer === false ? 'rgba(16,185,129,0.3)' : answered === false ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)') : 'rgba(239,68,68,0.15)', border: answered !== null && answer === false ? '2px solid #10B981' : '1.5px solid rgba(255,255,255,0.2)', color: '#EF4444' }}>
          FALSE
        </button>
      </div>
      {answered !== null && explanation && (
        <div className="mt-5 p-3 rounded-xl bg-white/10 text-white/80 text-xs leading-relaxed">
          💡 {explanation}
        </div>
      )}
    </div>
  );
}

function BountyCard({ item }: { item: ReelFeedItem }) {
  const [g1, g2] = gradientFor(item.subject);
  const { title, description, xpReward, subject } = item.payload;
  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 py-10">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-5 h-5 text-amber-400" />
        <span className="text-[11px] font-black tracking-widest text-amber-400">BOUNTY CHALLENGE</span>
      </div>
      <div className="p-6 rounded-3xl mb-5" style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(251,191,36,0.3)' }}>
        <div className="text-center mb-5">
          <div className="text-5xl font-black text-amber-400 mb-1">+{xpReward ?? 50} XP</div>
          <div className="text-white/50 text-xs">Reward for answering this bounty</div>
        </div>
        {subject && <div className="text-center mb-3"><span className="text-xs text-amber-300 font-bold">{subject}</span></div>}
        {title && <p className="text-white text-lg font-bold text-center mb-3">{title}</p>}
        {description && <p className="text-white/70 text-sm text-center">{description}</p>}
      </div>
      <button className="w-full py-4 rounded-2xl font-bold text-black text-base" style={{ background: 'linear-gradient(to right, #F59E0B, #F97316)' }}>
        Answer This Bounty 🏆
      </button>
    </div>
  );
}

// ─── Engagement Bar (Right side floating) ──────────────────────────────────
function EngagementBar({ item, onLike, onComment }: { item: ReelFeedItem; onLike: () => void; onComment: () => void }) {
  const [liked, setLiked] = useState(!!item.engagement?.myReaction);
  const [bookmarked, setBookmarked] = useState(!!item.engagement?.bookmarked);
  const likeCount = (item.engagement?.likesCount ?? 0) + (liked ? 1 : 0);

  return (
    <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
      {/* Like */}
      <button onClick={() => { setLiked(!liked); onLike(); }} className="flex flex-col items-center gap-1 group">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${liked ? 'bg-red-500' : 'bg-white/15'}`}>
          <Heart className={`w-5 h-5 transition-all ${liked ? 'fill-white text-white' : 'text-white'}`} />
        </div>
        <span className="text-white text-[11px] font-bold drop-shadow">{likeCount > 0 ? likeCount : ''}</span>
      </button>

      {/* Comment */}
      <button onClick={onComment} className="flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-all">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <span className="text-white text-[11px] font-bold drop-shadow">{item.engagement?.commentsCount ?? ''}</span>
      </button>

      {/* Share */}
      <button className="flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-all">
          <Share2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-white text-[11px] font-bold drop-shadow">{item.engagement?.sharesCount ?? ''}</span>
      </button>

      {/* Bookmark */}
      <button onClick={() => setBookmarked(!bookmarked)} className="flex flex-col items-center gap-1">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${bookmarked ? 'bg-amber-400' : 'bg-white/15'}`}>
          <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-white text-white' : 'text-white'}`} />
        </div>
      </button>
    </div>
  );
}

// ─── Main Reels Page ────────────────────────────────────────────────────────
export default function ReelsPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const initialUserId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return TokenManager.getUserData()?.user?.id || '';
  }, []);
  const initialCache = initialUserId ? readReelsCache(initialUserId) : null;

  const [userId, setUserId] = useState(initialUserId);
  const [reels, setReels] = useState<ReelFeedItem[]>(initialCache?.items ?? []);
  const [loading, setLoading] = useState(!initialCache?.items?.length);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [showXpPop, setShowXpPop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    const uid = userId || TokenManager.getUserData()?.user?.id || '';
    if (!uid) {
      setLoading(false);
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
      } else if (!hasVisible && FALLBACK_REELS.length) {
        setReels(FALLBACK_REELS);
      }
    } catch {
      if (!hasVisible && FALLBACK_REELS.length) {
        setReels(FALLBACK_REELS);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, reels.length]);

  useEffect(() => {
    const uid = TokenManager.getUserData()?.user?.id || '';
    if (!uid) {
      setLoading(false);
      if (FALLBACK_REELS.length) setReels(FALLBACK_REELS);
      return;
    }
    setUserId(uid);

    const cached = readReelsCache(uid);
    if (cached?.items?.length) {
      setReels(cached.items);
      setLoading(false);
      if (!isReelsCacheFresh(uid)) void load({ silent: true });
      return;
    }

    void load({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !isReelsCacheFresh(userId)) {
        void load({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId, load]);

  // Snap scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrolling.current) return;
      const scrollTop = container.scrollTop;
      const itemHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex !== currentIndex) setCurrentIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex]);

  const scrollTo = useCallback((dir: 'up' | 'down') => {
    const container = containerRef.current;
    if (!container) return;
    const newIndex = dir === 'down' ? Math.min(currentIndex + 1, reels.length - 1) : Math.max(currentIndex - 1, 0);
    isScrolling.current = true;
    container.scrollTo({ top: newIndex * window.innerHeight, behavior: 'smooth' });
    setCurrentIndex(newIndex);
    setTimeout(() => { isScrolling.current = false; }, 500);
  }, [currentIndex, reels.length]);

  const handleCorrectAnswer = useCallback((xp: number) => {
    setXpGained(prev => prev + xp);
    setShowXpPop(true);
    setTimeout(() => setShowXpPop(false), 1500);
  }, []);

  const currentReel = reels[currentIndex];
  const [g1, g2] = currentReel ? gradientFor(currentReel.subject) : DEFAULT_GRADIENT;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ zIndex: 10 }}>
      {loading && reels.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <RefreshCw className="w-8 h-8 text-white/40 animate-spin" />
        </div>
      ) : null}
      {/* Fullscreen vertical snap scroll container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reels.map((item, idx) => {
          const [c1, c2] = gradientFor(item.subject);
          return (
            <div key={item.id}
              className="relative w-full overflow-hidden"
              style={{ height: '100dvh', scrollSnapAlign: 'start', background: `linear-gradient(160deg, ${c1}, ${c2})` }}>

              {/* Card content by type */}
              {item.type === 'FOCUS_REEL' && <FocusReelCard item={item} />}
              {item.type === 'QUIZ_QUESTION' && (
                <QuizCard item={item} onAnswer={(correct) => correct && handleCorrectAnswer(item.payload.points ?? 10)} />
              )}
              {item.type === 'RECALL_CARD' && <FlashCard item={item} />}
              {item.type === 'TF_CARD' && (
                <TrueFalseCard item={item} onAnswer={(correct) => correct && handleCorrectAnswer(item.payload.points ?? 5)} />
              )}
              {item.type === 'BOUNTY' && <BountyCard item={item} />}
              {item.type === 'POST' && <FocusReelCard item={item} />}

              {/* Right engagement bar */}
              <EngagementBar item={item} onLike={() => {}} onComment={() => {}} />

              {/* Bottom: swipe hint */}
              {idx === 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
                  <ChevronUp className="w-5 h-5 text-white/40 animate-bounce" />
                  <span className="text-white/30 text-[10px]">Swipe up</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Top bar: subject title + XP total */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', paddingBottom: '12px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <span className="text-white font-black text-base tracking-wide">Focus Reels</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-white text-xs font-bold">{xpGained} XP</span>
        </div>
      </div>

      {/* Nav arrows (desktop / tablet) */}
      <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-3 z-20">
        <button onClick={() => scrollTo('up')} disabled={currentIndex === 0}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition">
          <ChevronUp className="w-5 h-5" />
        </button>
        <button onClick={() => scrollTo('down')} disabled={currentIndex === reels.length - 1}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20">
        {reels.map((_, idx) => (
          <div key={idx} className="rounded-full transition-all"
            style={{ width: 3, height: idx === currentIndex ? 20 : 5, background: idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.3)' }} />
        ))}
      </div>

      {/* XP Pop animation */}
      {showXpPop && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none animate-bounce">
          <div className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-xl text-white"
            style={{ background: 'linear-gradient(to right, #F59E0B, #EF4444)' }}>
            <Zap className="w-5 h-5" />+XP
          </div>
        </div>
      )}

      {/* Bottom nav spacer — keeps content above bottom tab bar */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
      
      {/* Navigation (Renders MobileBottomNav on mobile, Sidebar on desktop) */}
      <UnifiedNavigation />
    </div>
  );
}
