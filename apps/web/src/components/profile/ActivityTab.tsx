'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Flame,
  Heart,
  Eye,
  Send,
  Users,
  Trophy,
  Clock,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface ActivityPost {
  id: string;
  content?: string;
  createdAt: string;
  likesCount?: number;
}

interface ActivityAchievement {
  id: string;
  title: string;
  issuedDate?: string;
  rarity?: string;
}

interface ActivityTabProps {
  locale: string;
  profileId: string;
  posts: ActivityPost[];
  achievements: ActivityAchievement[];
  currentStreak?: number;
  stats: {
    posts: number;
    followers: number;
    postsThisMonth: number;
    totalLikes: number;
    totalViews: number;
  };
}

const HEAT_CLASSES = [
  'bg-slate-100 dark:bg-slate-800',
  'bg-sky-200 dark:bg-sky-900',
  'bg-sky-400 dark:bg-sky-600',
  'bg-sky-600 dark:bg-sky-400',
] as const;

function buildContributionCells(
  posts: ActivityPost[],
  streak: number,
): { intensity: number; dateLabel: string }[] {
  const activityMap: Record<string, number> = {};
  for (const p of posts) {
    if (!p.createdAt) continue;
    const day = new Date(p.createdAt).toISOString().split('T')[0];
    activityMap[day] = (activityMap[day] || 0) + 1;
  }

  const today = new Date();
  const cells: { intensity: number; dateLabel: string }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const count = activityMap[key] || 0;
    let intensity = 0;
    if (count >= 3) intensity = 3;
    else if (count >= 2) intensity = 2;
    else if (count >= 1) intensity = 1;
    if (streak > 0 && i < streak && intensity === 0) intensity = 1;
    cells.push({
      intensity,
      dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    });
  }
  return cells;
}

function relativeTime(dateStr: string, t: (key: string, values?: Record<string, number>) => string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1) return t('activity.justNow');
  if (diffM < 60) return t('activity.minutesAgo', { count: diffM });
  if (diffH < 24) return t('activity.hoursAgo', { count: diffH });
  if (diffD === 1) return t('activity.yesterday');
  if (diffD < 7) return t('activity.daysAgo', { count: diffD });
  if (diffD < 30) return t('activity.weeksAgo', { count: Math.floor(diffD / 7) });
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityTab({
  locale,
  profileId,
  posts,
  achievements,
  currentStreak = 0,
  stats,
}: ActivityTabProps) {
  const t = useTranslations('profile');

  const cells = useMemo(
    () => buildContributionCells(posts, currentStreak),
    [posts, currentStreak],
  );
  const activeDays = cells.filter((c) => c.intensity > 0).length;

  const timeline = useMemo(() => {
    const items: {
      id: string;
      kind: 'post' | 'achievement';
      title: string;
      subtitle: string;
      time: string;
      sortDate: string;
      color: string;
    }[] = [];

    for (const post of posts.slice(0, 8)) {
      items.push({
        id: `post-${post.id}`,
        kind: 'post',
        title: t('stats.posts'),
        subtitle: (post.content || '').slice(0, 90) || '—',
        time: relativeTime(post.createdAt, t as any),
        sortDate: post.createdAt,
        color: '#0EA5E9',
      });
    }

    for (const ach of achievements.slice(0, 8)) {
      if (!ach.issuedDate) continue;
      items.push({
        id: `ach-${ach.id}`,
        kind: 'achievement',
        title: t('activity.achievementUnlocked'),
        subtitle: ach.title || t('activity.newBadgeEarned'),
        time: relativeTime(ach.issuedDate, t as any),
        sortDate: ach.issuedDate,
        color: '#F59E0B',
      });
    }

    return items
      .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
      .slice(0, 10);
  }, [posts, achievements, t]);

  const engagement = [
    { icon: Heart, label: t('activity.totalLikes'), value: stats.totalLikes, tint: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
    { icon: Eye, label: t('activity.totalViews'), value: stats.totalViews, tint: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40' },
    { icon: Send, label: t('stats.posts'), value: stats.posts, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
    { icon: Users, label: t('stats.followers'), value: stats.followers, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Contribution heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('activity.contributions')}
          </h3>
          <span className="text-xs font-medium text-gray-400">
            {activeDays === 1
              ? t('activity.activeDay', { count: activeDays })
              : t('activity.activeDays', { count: activeDays })}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, i) => (
            <div
              key={i}
              title={cell.dateLabel}
              className={`aspect-square rounded-[4px] ${HEAT_CLASSES[cell.intensity]}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="text-[10px] text-gray-400 font-medium">{t('activity.less')}</span>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`w-3 h-3 rounded-[3px] ${HEAT_CLASSES[i]}`} />
          ))}
          <span className="text-[10px] text-gray-400 font-medium">{t('activity.more')}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
          {t('activity.recentActivity')}
        </h3>
        {timeline.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center">
              <Clock className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('activity.noActivity')}</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{t('activity.activityHint')}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {timeline.map((item) => (
              <li key={item.id} className="flex gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}18` }}
                >
                  {item.kind === 'achievement' ? (
                    <Trophy className="w-4 h-4" style={{ color: item.color }} />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" style={{ color: item.color }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{item.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{item.subtitle}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Engagement grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-[#09CFF7]" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('activity.engagement')}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {engagement.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 dark:border-gray-700 p-4 text-center"
            >
              <div className={`w-9 h-9 mx-auto mb-2 rounded-xl flex items-center justify-center ${item.tint}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                {item.value.toLocaleString()}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link
            href={`/${locale}/feed?author=${profileId}`}
            className="inline-flex items-center gap-1 text-sm font-bold text-[#00B8DB] hover:text-[#09CFF7]"
          >
            {t('posts')}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
