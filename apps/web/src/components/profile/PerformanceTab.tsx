'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  Flame, Trophy, Target, Award, Code, Clock, Eye, 
  TrendingUp, CheckCircle, Diamond, Shield, Snowflake,
  ChevronRight, Star, ArrowUpRight, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import SubjectMasteryTree from '@/components/profile/SubjectMasteryTree';
import StreakLeaderboardWidget from '@/components/profile/StreakLeaderboard';
import { postStreakFreeze, getGlobalStanding } from '@/lib/api/analytics';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

interface PerformanceStatsSummary {
  xp: number;
  level: number;
  xpProgress: number;
  xpToNextLevel: number;
  totalQuizzes: number;
  totalPoints: number;
  avgScore: number;
  winRate: number;
  winStreak: number;
  correctAnswers: number;
  totalAnswers: number;
  currentStreak: number;
  longestStreak?: number;
  recentScores: number[];
  weekActivity?: boolean[];
  freezesAvailable?: number;
  studiedToday?: boolean;
  streakAtRisk?: boolean;
}

export interface PerformanceVisitor {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null;
  headline?: string;
  viewedAt?: string;
}

interface PerformanceTabProps {
  statsSummary: PerformanceStatsSummary | null;
  achievements: any[];
  projectsCount: number;
  profile: any;
  locale: string;
  visitors?: PerformanceVisitor[];
  /** When set, parent owns visitor loading (mobile). When omitted, tab self-fetches. */
  visitorsLoading?: boolean;
  currentUserId?: string;
  onStatsPatch?: (patch: Partial<PerformanceStatsSummary>) => void;
}

/** Normalize xpProgress: absolute XP toward next level, or 0–1 ratio from older APIs. */
function xpProgressPct(xpProgress: number, xpToNextLevel: number) {
  if (xpToNextLevel <= 0) return 0;
  if (xpProgress > 0 && xpProgress <= 1 && xpToNextLevel > 1) {
    return Math.min(xpProgress, 1);
  }
  return Math.min(xpProgress / xpToNextLevel, 1);
}

function formatXpProgress(xpProgress: number, xpToNextLevel: number) {
  if (xpProgress > 0 && xpProgress <= 1 && xpToNextLevel > 1) {
    return Math.round(xpProgress * xpToNextLevel);
  }
  return Math.round(xpProgress);
}

function ProgressRing({ 
  cx, cy, r, strokeWidth, progress, color1, color2, id 
}: { 
  cx: number; cy: number; r: number; strokeWidth: number; 
  progress: number; color1: string; color2: string; id: string;
}) {
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(progress, 1));

  return (
    <>
      <defs>
        <linearGradient id={`ring_${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color1} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
      </defs>
      {/* Background Track */}
      <circle cx={cx} cy={cy} r={r} stroke={`${color1}15`} strokeWidth={strokeWidth} fill="none" />
      {/* Active Indicator */}
      <circle 
        cx={cx} cy={cy} r={r}
        stroke={`url(#ring_${id})`}
        strokeWidth={strokeWidth} 
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90, ${cx}, ${cy})`}
        className="transition-all duration-1000 ease-out"
      />
    </>
  );
}

function MiniLineChart({ data, width = 240, height = 80 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-20 text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
        <span className="text-xs">Complete quizzes to unlock analytics</span>
      </div>
    );
  }

  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y };
  });

  let lineD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
    const cp2x = points[i].x - (points[i].x - points[i - 1].x) / 3;
    lineD += ` C ${cp1x},${points[i - 1].y} ${cp2x},${points[i].y} ${points[i].x},${points[i].y}`;
  }

  const fillD = `${lineD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

  return (
    <svg width="100%" height={height} className="overflow-visible mt-2">
      <defs>
        <linearGradient id="chart_glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#chart_glow)" />
      <path d={lineD} fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle 
          key={i} 
          cx={p.x} 
          cy={p.y} 
          r="4.5" 
          fill="#FFF" 
          stroke="#0EA5E9" 
          strokeWidth="2.5" 
          className="transition-all duration-300 hover:scale-125 cursor-pointer shadow-sm"
        >
          <title>{`Score: ${data[i]}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function compactNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function relativeTime(iso?: string, isKm = false) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return isKm ? `${Math.max(1, mins)}នាទីមុន` : `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isKm ? `${hrs}ម៉ោងមុន` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return isKm ? `${days}ថ្ងៃមុន` : `${days}d ago`;
}

export default function PerformanceTab({ 
  statsSummary, achievements = [], projectsCount = 0, profile, locale,
  visitors: visitorsProp = [], visitorsLoading: visitorsLoadingProp,
  currentUserId, onStatsPatch,
}: PerformanceTabProps) {
  const isKm = locale === 'km';
  const [localSummary, setLocalSummary] = useState<PerformanceStatsSummary | null>(statsSummary);
  const [freezing, setFreezing] = useState(false);
  const [freezeMsg, setFreezeMsg] = useState<string | null>(null);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [localVisitors, setLocalVisitors] = useState<PerformanceVisitor[]>([]);
  const [localVisitorsLoading, setLocalVisitorsLoading] = useState(false);

  const parentOwnsVisitors = visitorsLoadingProp !== undefined;
  const visitors = parentOwnsVisitors || visitorsProp.length > 0 ? visitorsProp : localVisitors;
  const visitorsLoading = parentOwnsVisitors ? !!visitorsLoadingProp : localVisitorsLoading;

  useEffect(() => {
    setLocalSummary(statsSummary);
  }, [statsSummary]);

  useEffect(() => {
    if (!profile?.isOwnProfile) return;
    let cancelled = false;
    getGlobalStanding()
      .then((s) => { if (!cancelled) setGlobalRank(s.rank); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profile?.isOwnProfile, profile?.id]);

  useEffect(() => {
    if (!profile?.isOwnProfile || parentOwnsVisitors) return;
    let cancelled = false;
    setLocalVisitorsLoading(true);
    (async () => {
      try {
        const token = TokenManager.getAccessToken();
        if (!token) return;
        const res = await fetch(`${FEED_SERVICE_URL}/users/me/profile/visitors/preview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setLocalVisitors(data?.visitors || data?.data?.visitors || []);
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLocalVisitorsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.isOwnProfile, profile?.id, parentOwnsVisitors]);

  const summary = localSummary || statsSummary || {
    xp: profile?.totalPoints || 0,
    level: profile?.level || 1,
    xpProgress: 0,
    xpToNextLevel: 250,
    totalQuizzes: 0,
    totalPoints: profile?.totalPoints || 0,
    avgScore: 0,
    winRate: 0,
    winStreak: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    currentStreak: profile?.currentStreak || 0,
    longestStreak: profile?.longestStreak || 0,
    recentScores: [],
    weekActivity: [false, false, false, false, false, false, false],
    freezesAvailable: 0,
    studiedToday: false,
    streakAtRisk: false,
  };

  const handleFreeze = useCallback(async () => {
    if (freezing || (summary.freezesAvailable ?? 0) <= 0) return;
    setFreezing(true);
    setFreezeMsg(null);
    try {
      const result = await postStreakFreeze();
      if (!result?.success) {
        setFreezeMsg(isKm ? 'មិនអាចប្រើ freeze បានទេ' : 'Could not use freeze');
        return;
      }
      const patch: Partial<PerformanceStatsSummary> = {
        freezesAvailable: result.freezesAvailable,
        weekActivity: result.weekActivity,
        studiedToday: result.studiedToday,
        streakAtRisk: result.streakAtRisk,
        currentStreak: result.currentStreak ?? summary.currentStreak,
      };
      setLocalSummary((prev) => ({ ...(prev || summary), ...patch }));
      onStatsPatch?.(patch);
      setFreezeMsg(isKm ? 'បានរក្សា streak!' : 'Streak protected!');
    } catch {
      setFreezeMsg(isKm ? 'មានបញ្ហា' : 'Something went wrong');
    } finally {
      setFreezing(false);
    }
  }, [freezing, summary, isKm, onStatsPatch]);

  const stats = profile?.stats || {};
  const profileViews30d = Number(stats.profileViews30d ?? profile?.profileViews30d ?? stats.totalViews ?? 0);
  const uniqueViewers30d = Number(stats.uniqueProfileViewers30d ?? profile?.uniqueProfileViewers30d ?? 0);
  const profileViews7d = Number(stats.profileViews7d ?? profile?.profileViews7d ?? 0);
  const profilePerformanceScore = Number(
    stats.profilePerformanceScore ?? profile?.profilePerformanceScore ?? 0,
  );
  const trendingProfileScore = Number(
    stats.trendingProfileScore ?? profile?.trendingProfileScore ?? 0,
  );
  const profileMomentum = Math.min(100, Math.max(8, profilePerformanceScore || 8));

  const xpPct = xpProgressPct(summary.xpProgress, summary.xpToNextLevel);
  const xpTowardNext = formatXpProgress(summary.xpProgress, summary.xpToNextLevel);
  const quizTarget = Math.max(summary.totalQuizzes + 5, 10);
  const quizPct = Math.min(summary.totalQuizzes / quizTarget, 1);
  const scorePct = Math.min(summary.avgScore / 100, 1);
  const freezes = summary.freezesAvailable ?? 0;
  const canFreeze =
    !!profile?.isOwnProfile &&
    freezes > 0 &&
    !summary.studiedToday &&
    !freezing;

  const size = 136;
  const cx = size / 2;
  const cy = size / 2;

  const rings = [
    { r: 58, stroke: 8.5, pct: xpPct, id: 'xp', c1: '#38BDF8', c2: '#0284C7' },
    { r: 46, stroke: 7, pct: quizPct, id: 'quiz', c1: '#34D399', c2: '#059669' },
    { r: 35, stroke: 6, pct: scorePct, id: 'streak', c1: '#FBBF24', c2: '#F97316' },
  ];

  // Milestone mapping matching mobile LearningStreakCard
  const MILESTONES = [3, 7, 14, 30, 50, 100];
  const nextMilestone = MILESTONES.find(m => m > summary.currentStreak) ?? 100;
  const prevMilestone = MILESTONES[MILESTONES.indexOf(nextMilestone) - 1] ?? 0;
  const milestoneSpan = Math.max(1, nextMilestone - prevMilestone);
  const milestoneProgress = Math.min(1, Math.max(0, (summary.currentStreak - prevMilestone) / milestoneSpan));

  // Attendance setup matching mobile
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIndex = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const weekActivity = summary.weekActivity || [false, false, false, false, false, false, false];

  const coreStats = [
    { label: 'Quizzes Done', value: summary.totalQuizzes, icon: Target, c1: '#E0F2FE', c2: '#0EA5E9', tint: '#0C4A6E' },
    { label: 'Total Points', value: summary.totalPoints.toLocaleString(), icon: Star, c1: '#FFEDD5', c2: '#F59E0B', tint: '#92400E' },
    { label: 'Study Hours', value: profile?.totalLearningHours || 0, icon: Clock, c1: '#DCFCE7', c2: '#10B981', tint: '#065F46' },
    { label: 'Streak Status', value: `${summary.currentStreak} Days`, icon: Flame, c1: '#FFE4E6', c2: '#F43F5E', tint: '#9F1239' },
    { label: 'Achievements', value: achievements.length || 0, icon: Award, c1: '#F3E8FF', c2: '#8B5CF6', tint: '#5B21B6' },
    { label: 'Projects', value: projectsCount || 0, icon: Code, c1: '#DBEAFE', c2: '#3B82F6', tint: '#1E3A8A' }
  ];

  const rarityColors: Record<string, string> = {
    COMMON: 'from-gray-400 to-gray-500 border-gray-300 dark:border-gray-600',
    UNCOMMON: 'from-green-400 to-green-600 border-green-300 dark:border-green-700',
    RARE: 'from-blue-400 to-blue-600 border-blue-300 dark:border-blue-700',
    EPIC: 'from-purple-400 to-purple-600 border-purple-300 dark:border-purple-700',
    LEGENDARY: 'from-amber-400 to-orange-500 border-amber-300 dark:border-amber-700 ring-4 ring-amber-500/20'
  };

  return (
    <div className="space-y-3 sm:space-y-4 px-3 sm:px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Section - Ring & Streak Overview */}
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
        
        {/* Activity & XP Progress Ring */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all gap-4">
          <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <div className="absolute inset-4 rounded-full bg-sky-500/5 dark:bg-sky-500/10 backdrop-blur-sm" />
            <svg width={size} height={size} className="overflow-visible">
              {rings.map(ring => (
                <ProgressRing 
                  key={ring.id}
                  cx={cx} cy={cy} r={ring.r} strokeWidth={ring.stroke}
                  progress={ring.pct}
                  color1={ring.c1} color2={ring.c2}
                  id={ring.id}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-900 dark:text-gray-100 leading-none">{summary.level}</span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Level</span>
            </div>
          </div>

          <div className="flex-1 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950 flex items-center justify-center">
                <Diamond className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{summary.xp.toLocaleString()} XP</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Total Points</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{summary.totalQuizzes} Done</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Completed Quizzes</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{summary.currentStreak} Days</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Active Streak</div>
              </div>
            </div>

            <div className="pt-1 space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>{isKm ? 'XP ទៅកម្រិតបន្ទាប់' : 'XP to next level'}</span>
                <span className="text-sky-600">{xpTowardNext} / {summary.xpToNextLevel}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all"
                  style={{ width: `${Math.round(xpPct * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {isKm
                  ? `នៅសល់ ${Math.max(0, summary.xpToNextLevel - xpTowardNext).toLocaleString()} XP → Lv.${summary.level + 1}`
                  : `${Math.max(0, summary.xpToNextLevel - xpTowardNext).toLocaleString()} XP to Lv.${summary.level + 1}`}
              </p>
            </div>
          </div>
        </div>

        {/* Learning Streak Card */}
        <div className="bg-gradient-to-br from-orange-50/50 via-white to-amber-50/50 dark:from-orange-950/20 dark:via-gray-800 dark:to-amber-950/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-base">
                <Flame className="w-5 h-5 text-orange-500" />
                Streak Status
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Study daily to level up your achievements!</p>
            </div>
            {summary.studiedToday && (
              <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle className="w-3.5 h-3.5" />
                Done Today
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-5xl font-black text-orange-500 leading-none tracking-tight">{summary.currentStreak}</span>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase">Days</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Best Streak: {summary.longestStreak || summary.currentStreak}d</span>
          </div>

          {/* Progress to next Milestone */}
          {summary.currentStreak > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                <span>Streak Milestone: {nextMilestone} Days</span>
                <span>{summary.currentStreak}/{nextMilestone}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000"
                  style={{ width: `${milestoneProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Week attendance tracker */}
          <div className="flex justify-between items-center mt-5">
            {days.map((d, index) => {
              const active = weekActivity[index];
              const isToday = index === todayIndex;
              return (
                <div key={index} className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    active 
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  } ${isToday ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-800' : ''}`}>
                    {active ? '✓' : d}
                  </div>
                  <span className={`text-[10px] font-semibold ${isToday ? 'text-orange-500 font-extrabold' : 'text-gray-400'}`}>
                    {d}
                  </span>
                </div>
              );
            })}
          </div>

          {summary.streakAtRisk && !summary.studiedToday && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{isKm ? 'Streak របស់អ្នកកំពុងប្រឈម — សិក្សាថ្ងៃនេះ ឬប្រើ freeze' : 'Your streak is at risk — study today or use a freeze'}</span>
            </div>
          )}

          {profile?.isOwnProfile && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                  <Snowflake className="w-3.5 h-3.5" />
                  {freezes} {isKm ? 'freeze' : 'freezes'}
                </span>
                {!summary.streakAtRisk && canFreeze && (
                  <button
                    type="button"
                    onClick={() => void handleFreeze()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-sky-500 text-white"
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    {isKm ? 'ប្រើ freeze' : 'Use freeze'}
                  </button>
                )}
              </div>
              {/* Native parity: primary freeze CTA when at-risk */}
              {summary.streakAtRisk && !summary.studiedToday && freezes > 0 && (
                <button
                  type="button"
                  onClick={() => void handleFreeze()}
                  disabled={freezing}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-200 border border-sky-200/80 dark:border-sky-500/30 disabled:opacity-50"
                >
                  <Snowflake className={`w-4 h-4 ${freezing ? 'animate-pulse' : ''}`} />
                  {freezing
                    ? (isKm ? 'កំពុងរក្សា…' : 'Protecting…')
                    : (isKm ? 'ប្រើ streak freeze' : 'Use streak freeze')}
                </button>
              )}
            </div>
          )}
          {freezeMsg && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600">{freezeMsg}</p>
          )}
        </div>

      </div>

      {/* Discovery Stats & Quiz Performance */}
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
        
        {/* Discovery stats card */}
        <div className="bg-gradient-to-br from-sky-50/30 to-cyan-50/20 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6 flex flex-col shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-sky-500 shrink-0" />
                {isKm ? 'ការរកឃើញប្រវត្តិរូប' : 'Profile Discovery'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isKm ? 'របៀបដែលអ្នកលេចឡើងក្នុងបណ្តាញ' : 'How you show up across the network'}
              </p>
            </div>
            <span className="bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 text-center leading-tight">
              <span className="block text-sm font-black">{profilePerformanceScore}</span>
              <span className="text-[9px] uppercase tracking-wide opacity-80">{isKm ? 'ពិន្ទុ' : 'Score'}</span>
            </span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
              <span>{isKm ? 'សន្ទុះ' : 'Momentum'}</span>
              <span>{Math.round(profileMomentum)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500"
                style={{ width: `${profileMomentum}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-lg font-black text-gray-900 dark:text-white">{compactNumber(profileViews30d)}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">{isKm ? 'មើល 30ថ្ងៃ' : 'Views 30d'}</div>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-lg font-black text-gray-900 dark:text-white">{compactNumber(uniqueViewers30d)}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">{isKm ? 'អ្នកមើល' : 'Unique'}</div>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-lg font-black text-gray-900 dark:text-white">{compactNumber(profileViews7d)}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">{isKm ? 'សប្តាហ៍នេះ' : 'This week'}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold px-3 py-1.5 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              {trendingProfileScore} {isKm ? 'និន្នាការ' : 'trend'}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-[11px] font-semibold px-3 py-1.5 rounded-full">
              {isKm ? 'អ្នកបង្កើតការសិក្សា' : 'Learning creator'}
            </span>
          </div>

          {profile?.isOwnProfile && (visitorsLoading || visitors.length > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isKm ? 'អ្នកមើលថ្មីៗ' : 'Recent visitors'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {visitorsLoading
                      ? (isKm ? 'កំពុងផ្ទុក…' : 'Loading…')
                      : (isKm ? '៣០ ថ្ងៃចុងក្រោយ' : 'Last 30 days')}
                  </p>
                </div>
                {!visitorsLoading && visitors.length > 0 && (
                  <Link
                    href={`/${locale}/profile/visitors`}
                    className="text-[11px] font-bold text-sky-600 inline-flex items-center gap-0.5"
                  >
                    {isKm ? 'មើលទាំងអស់' : 'View all'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              {visitorsLoading && visitors.length === 0 ? (
                <div className="space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-2 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {visitors.slice(0, 3).map((v) => {
                    const name = [v.lastName, v.firstName].filter(Boolean).join(' ') || 'User';
                    return (
                      <Link
                        key={`${v.id}-${v.viewedAt || ''}`}
                        href={`/${locale}/profile/${v.id}`}
                        className="flex items-center gap-2.5"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-sky-100 shrink-0">
                          {v.profilePictureUrl ? (
                            <Image src={v.profilePictureUrl} alt="" width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-sky-700">
                              {(v.firstName?.[0] || '') + (v.lastName?.[0] || '')}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                          {v.headline ? (
                            <p className="text-[10px] text-slate-400 truncate">{v.headline}</p>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                          {relativeTime(v.viewedAt, isKm)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {profile?.isOwnProfile && !visitorsLoading && visitors.length === 0 && (
            <Link
              href={`/${locale}/profile/visitors`}
              className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] font-bold text-sky-600"
            >
              <span>{isKm ? 'មើលអ្នកមើលប្រវត្តិរូប' : 'See profile visitors'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Quiz Performance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Quiz Performance
            </h3>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Solo Attempt History</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.winRate}%</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">Pass Rate</div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-500">{summary.winStreak}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">Win Streak</div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{summary.correctAnswers}/{summary.totalAnswers}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">Correct Answers</div>
            </div>
          </div>

          <div className="mt-4">
            <MiniLineChart data={summary.recentScores} />
          </div>
        </div>

      </div>

      {/* Core Stats Overview Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5 text-base">
          <Shield className="w-5 h-5 text-violet-500" />
          Academic Overview
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {coreStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div 
                key={i} 
                className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-all hover:scale-102 hover:shadow-sm"
                style={{ backgroundColor: `${stat.c1}15` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.c2 }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">{stat.value}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase mt-0.5">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements Showcase */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-amber-500" />
            Achievements & Badges
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">{achievements.length} Unlocked</span>
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <Award className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm">Complete challenges to earn rare badges!</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {achievements.map((ua) => {
              const borderStyle = rarityColors[ua.rarity] || rarityColors.COMMON;
              return (
                <div 
                  key={ua.id} 
                  className="flex flex-col items-center p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-55 dark:bg-gray-900/40 w-32 flex-shrink-0 text-center group transition-all hover:-translate-y-1 hover:shadow-sm"
                  title={`${ua.title}: ${ua.description}`}
                >
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${borderStyle} flex items-center justify-center text-2xl shadow-md transition-transform group-hover:rotate-12`}>
                    {ua.badgeUrl ? (
                      <Image src={ua.badgeUrl} alt="" width={40} height={40} className="w-10 h-10 object-contain" />
                    ) : (
                      <span>🏆</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-850 dark:text-gray-250 truncate mt-3 w-full">
                    {ua.title}
                  </span>
                  <span className="text-[9px] text-gray-400 mt-1 truncate w-full uppercase font-black tracking-wider">
                    {ua.rarity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SubjectMasteryTree
        profileUserId={profile?.id}
        currentUserId={currentUserId || (profile?.isOwnProfile ? profile?.id : undefined)}
        isKm={isKm}
      />

      <StreakLeaderboardWidget
        profileUserId={profile?.id}
        currentUserId={currentUserId || (profile?.isOwnProfile ? profile?.id : undefined)}
        isKm={isKm}
      />

      {/* Leaderboard CTA Card */}
      <Link href={`/${locale}/leaderboard`} className="block">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white flex items-center justify-between shadow-md hover:shadow-lg transition-all hover:scale-101 cursor-pointer group">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-base leading-none">
                {globalRank != null
                  ? (isKm ? `អ្នកនៅលំដាប់ #${globalRank}` : `You're #${globalRank}`)
                  : (isKm ? 'មើលតារាងពិន្ទុសកល' : 'View Global Leaderboard')}
              </h4>
              <p className="text-xs text-white/80 mt-1.5 font-medium">
                {isKm ? 'ចូលរួមជាមួយសិស្សកំពូលក្នុងបណ្តាញសិក្សា' : 'Rank among top students in the learning network'}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-6 h-6 text-white/70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
      </Link>

    </div>
  );
}
