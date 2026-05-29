'use client';

import { useState } from 'react';
import { 
  Flame, Trophy, Target, Award, Code, Clock, Eye, 
  TrendingUp, CheckCircle, Diamond, Shield, Zap, 
  ChevronRight, Calendar, Users, Star, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
}

interface PerformanceTabProps {
  statsSummary: PerformanceStatsSummary | null;
  achievements: any[];
  projectsCount: number;
  profile: any;
  locale: string;
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

export default function PerformanceTab({ 
  statsSummary, achievements = [], projectsCount = 0, profile, locale 
}: PerformanceTabProps) {
  const summary = statsSummary || {
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
    studiedToday: false
  };

  const xpPct = summary.xpToNextLevel > 0 ? Math.min(summary.xpProgress / summary.xpToNextLevel, 1) : 0;
  const quizTarget = Math.max(summary.totalQuizzes + 5, 10);
  const quizPct = Math.min(summary.totalQuizzes / quizTarget, 1);
  const scorePct = Math.min(summary.avgScore / 100, 1);

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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Section - Ring & Streak Overview */}
      <div className="grid md:grid-cols-2 gap-4">
        
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
        </div>

      </div>

      {/* Discovery Stats & Quiz Performance */}
      <div className="grid md:grid-cols-2 gap-4">
        
        {/* Discovery stats card */}
        <div className="bg-gradient-to-br from-sky-50/30 to-cyan-50/20 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-500" />
              Profile Discovery
            </h3>
            <span className="bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 text-xs font-bold px-2.5 py-1 rounded-full">
              Score: {profile?.profilePerformanceScore || 0}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-xl font-black text-gray-900 dark:text-white">{profile?.stats?.totalViews || 0}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">Total Views</div>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-xl font-black text-gray-900 dark:text-white">{profile?.stats?.followers || 0}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">Followers</div>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-xl font-black text-gray-900 dark:text-white">{profile?.stats?.postsThisMonth || 0}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-semibold">Posts (Mo)</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-4 py-2 rounded-xl">
            <TrendingUp className="w-4 h-4" />
            <span>Profile views increased by {profile?.trendingProfileScore || 0}% this week</span>
          </div>
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

      {/* Leaderboard CTA Card */}
      <Link href={`/${locale}/leaderboard`} className="block">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white flex items-center justify-between shadow-md hover:shadow-lg transition-all hover:scale-101 cursor-pointer group">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-base leading-none">View Global Leaderboard</h4>
              <p className="text-xs text-white/80 mt-1.5 font-medium">Rank among top students in Cambodian MoEYS learning network</p>
            </div>
          </div>
          <ArrowUpRight className="w-6 h-6 text-white/70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
      </Link>

    </div>
  );
}
