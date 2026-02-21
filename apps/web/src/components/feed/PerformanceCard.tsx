'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flame, Diamond, BookOpen, Trophy, ChevronRight } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import Link from 'next/link';

const FEED_SERVICE = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

interface PerformanceCardProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string | null;
  };
  locale: string;
}

interface LearningStats {
  currentStreak: number;
  totalPoints: number;
  completedLessons: number;
  level: number;
}

// SVG ring component for progress visualization
function ProgressRing({ 
  cx, cy, r, strokeWidth, progress, gradientId, color1, color2 
}: { 
  cx: number; cy: number; r: number; strokeWidth: number; 
  progress: number; gradientId: string; color1: string; color2: string;
}) {
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(progress, 1));

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color1} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} stroke={`${color1}18`} strokeWidth={strokeWidth} fill="none" />
      {/* Progress */}
      <circle 
        cx={cx} cy={cy} r={r}
        stroke={`url(#${gradientId})`}
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

export default function PerformanceCard({ user, locale }: PerformanceCardProps) {
  const [stats, setStats] = useState<LearningStats>({
    currentStreak: 0,
    totalPoints: 0,
    completedLessons: 0,
    level: 1,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const res = await fetch(`${FEED_SERVICE}/courses/stats/my-learning`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data) {
          setStats({
            currentStreak: data.currentStreak || 0,
            totalPoints: data.totalPoints || 0,
            completedLessons: data.completedLessons || 0,
            level: data.level || 1,
          });
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const xpToNext = 250;
  const xpProgress = stats.totalPoints % xpToNext;
  const pct = Math.min((xpProgress / xpToNext) * 100, 100);
  const nextLevel = stats.level + 1;

  const size = 120;
  const cx = size / 2;
  const cy = size / 2;

  const rings = [
    { r: 52, sw: 9, pct: xpProgress / xpToNext, id: 'xp', c1: '#38BDF8', c2: '#0284C7' },
    { r: 40, sw: 7, pct: stats.completedLessons / Math.max(stats.completedLessons + 5, 10), id: 'lesson', c1: '#34D399', c2: '#059669' },
    { r: 30, sw: 6, pct: stats.currentStreak / 7, id: 'streak', c1: '#FBBF24', c2: '#F97316' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] rounded-full bg-gray-100" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-100 rounded w-24" />
            <div className="h-3 bg-gray-100 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/${locale}/profile/me`} className="block">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 mb-4 cursor-pointer group">
        <div className="flex items-center gap-4">
          {/* Activity Rings */}
          <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            {/* Subtle glow */}
            <div className="absolute inset-2 rounded-full bg-sky-50/60" />
            <svg width={size} height={size}>
              {rings.map(ring => (
                <ProgressRing
                  key={ring.id}
                  cx={cx} cy={cy} r={ring.r} strokeWidth={ring.sw}
                  progress={ring.pct}
                  gradientId={`web_${ring.id}`}
                  color1={ring.c1} color2={ring.c2}
                />
              ))}
            </svg>
            {/* Center level */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-gray-900 leading-none">{stats.level}</span>
              <span className="text-[8px] font-bold text-gray-400 tracking-widest">LEVEL</span>
            </div>
          </div>

          {/* Stats Column */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                <Diamond className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-gray-800">{stats.totalPoints.toLocaleString()}</span>
              <span className="text-xs text-gray-500">XP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-gray-800">{stats.completedLessons}</span>
              <span className="text-xs text-gray-500">Lessons</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <span className="text-sm font-bold text-gray-800">{stats.currentStreak}</span>
              <span className="text-xs text-gray-500">Day Streak</span>
            </div>
          </div>

          {/* Avatar + Arrow */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                {user.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-sm font-bold text-sky-600">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-sky-500 transition-colors" />
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-semibold text-sky-600">{xpProgress} / {xpToNext} XP</span>
            <span className="text-gray-400">Level {nextLevel}</span>
          </div>
          <div className="h-2 bg-sky-50 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
