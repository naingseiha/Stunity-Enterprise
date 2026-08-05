'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useTranslations } from 'next-intl';
import { Sparkles, BookOpen, Trophy } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import type { FeedSuggestedCourse, FeedSuggestedQuiz, FeedSuggestedUser } from '@/lib/feed-normalize';

const QUIZ_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&q=80',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
];

const COURSE_FALLBACK =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';

function Avatar({
  url,
  name,
  size = 56,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const letter = name?.trim()?.charAt(0)?.toUpperCase() || '?';
  if (url) {
    return (
      <NextImage
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover border-2 border-white dark:border-gray-900 shadow-sm shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-lg font-bold shrink-0 border-2 border-white dark:border-gray-900 shadow-sm"
    >
      {letter}
    </div>
  );
}

function roleLabel(role: string | undefined, t: (key: string) => string) {
  switch (role) {
    case 'TEACHER':
      return t('teacher');
    case 'ADMIN':
    case 'SUPER_ADMIN':
    case 'SCHOOL_ADMIN':
      return t('admin');
    default:
      return t('student');
  }
}

export function FeedSuggestedUsersStrip({ locale, users }: { locale: string; users: FeedSuggestedUser[] }) {
  const t = useTranslations('feed.suggestions');
  const [followingIds, setFollowingIds] = useState<Set<string>>(() => new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const initial = new Set<string>();
    users.forEach((u) => {
      if (u.isFollowing) initial.add(u.id);
    });
    setFollowingIds(initial);
  }, [users]);

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingIds.has(userId)) return;

    const wasFollowing = followingIds.has(userId);
    setLoadingIds((prev) => new Set(prev).add(userId));
    setFollowingIds((prev) => {
      const next = new Set(prev);
      wasFollowing ? next.delete(userId) : next.add(userId);
      return next;
    });

    try {
      const token = TokenManager.getAccessToken();
      if (!token) throw new Error('auth');
      const res = await fetch(`${FEED_SERVICE_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const isFollowing = Boolean(data?.isFollowing ?? data?.data?.isFollowing ?? !wasFollowing);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        isFollowing ? next.add(userId) : next.delete(userId);
        return next;
      });
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        wasFollowing ? next.add(userId) : next.delete(userId);
        return next;
      });
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (!users.length) return null;

  return (
    <section className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{t('peopleTitle')}</h3>
        <Link
          href={`/${locale}/discover`}
          className="text-[13px] font-semibold text-[#F9A825] hover:text-amber-600 transition-colors"
        >
          {t('seeAll')}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4">
        {users.map((u) => {
          const name = `${u.lastName || ''} ${u.firstName || ''}`.trim() || t('fallbackName');
          const isFollowing = followingIds.has(u.id);
          const isLoading = loadingIds.has(u.id);
          return (
            <Link
              key={u.id}
              href={`/${locale}/profile/${u.id}`}
              className="flex-shrink-0 w-[148px] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950/50 hover:border-[#F9A825]/50 transition-colors"
            >
              <div className="relative h-14 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
                {u.coverPhotoUrl ? (
                  <NextImage src={u.coverPhotoUrl} alt="" fill sizes="148px" className="object-cover" />
                ) : null}
              </div>
              <div className="px-3 pb-3 -mt-7 flex flex-col items-center text-center">
                <Avatar url={u.profilePictureUrl} name={name} size={56} />
                <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mt-2 line-clamp-1 w-full">
                  {name}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 min-h-[28px]">
                  {u.headline || roleLabel(u.role, t)}
                </p>
                <button
                  type="button"
                  onClick={(e) => handleFollow(u.id, e)}
                  disabled={isLoading}
                  className={`mt-2 w-full py-1.5 rounded-full text-xs font-bold transition-colors ${
                    isFollowing
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                      : 'bg-[#F9A825]/12 text-[#D97706] border border-[#F9A825]/35 hover:bg-[#F9A825]/20'
                  }`}
                >
                  {isFollowing ? t('following') : t('follow')}
                </button>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function FeedSuggestedCoursesStrip({ locale, courses }: { locale: string; courses: FeedSuggestedCourse[] }) {
  const t = useTranslations('feed.suggestions');
  if (!courses.length) return null;

  return (
    <section className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100">{t('coursesTitle')}</h3>
        <Link
          href={`/${locale}/learn`}
          className="text-[13px] font-semibold text-[#F9A825] hover:text-amber-600 transition-colors"
        >
          {t('seeAll')}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4 snap-x snap-mandatory">
        {courses.map((c) => {
          const thumb = c.thumbnailUrl || COURSE_FALLBACK;
          return (
            <Link
              key={c.id}
              href={`/${locale}/learn/course/${c.id}`}
              className="flex-shrink-0 w-[240px] snap-start rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950/40 hover:border-[#F9A825]/45 transition-colors"
            >
              <div className="relative h-[135px] bg-gray-100 dark:bg-gray-800">
                <NextImage src={thumb} alt="" fill sizes="240px" className="object-cover" />
                {!c.thumbnailUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-100/80 to-orange-100/80 dark:from-gray-800 dark:to-gray-900">
                    <BookOpen className="w-10 h-10 text-amber-300/90" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug min-h-[36px]">
                  {c.title || t('untitledCourse')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {(c.enrollmentCount ?? 0) > 0
                    ? `${(c.rating ?? 4.5).toFixed(1)} ★ · ${t('enrolledCount', { count: c.enrollmentCount ?? 0 })}`
                    : t('open')}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function FeedSuggestedQuizzesStrip({ locale, quizzes }: { locale: string; quizzes: FeedSuggestedQuiz[] }) {
  const t = useTranslations('feed.suggestions');
  const tFeed = useTranslations('feed');
  if (!quizzes.length) return null;

  return (
    <section className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-300" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 truncate">
            {t('quizzesTitle')}
          </h3>
        </div>
        <Link
          href={`/${locale}/live-quiz/join`}
          className="text-[13px] font-bold text-[#F9A825] hover:text-amber-600 transition-colors shrink-0"
        >
          {t('seeAll')}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4 snap-x snap-mandatory">
        {quizzes.map((q, i) => {
          const pid = q.postId;
          const href =
            pid && pid.length > 0
              ? `/${locale}/feed/post/${pid}`
              : q.id
                ? `/${locale}/feed/post/${q.id}`
                : `/${locale}/feed`;
          const questionCount = q.questionCount ?? (Array.isArray(q.questions) ? q.questions.length : 0);
          const points = q.totalPoints ?? Math.max(questionCount * 10, 10);
          const timeLabel = q.timeLimit
            ? tFeed('sections.minutesShort', { count: q.timeLimit })
            : '∞';
          const background = q.thumbnailUrl || QUIZ_BACKGROUNDS[i % QUIZ_BACKGROUNDS.length];

          return (
            <Link
              key={`${pid || q.id || i}`}
              href={href}
              className="flex-shrink-0 w-[240px] snap-start rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950/40 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
            >
              <div className="relative h-[135px] bg-gray-100 dark:bg-gray-800">
                <NextImage src={background} alt="" fill sizes="240px" className="object-cover" />
                <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/45 text-white text-[10px] font-semibold backdrop-blur-sm">
                  <Trophy className="w-3 h-3 text-amber-300" />
                  {t('untitledQuiz')}
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug min-h-[36px]">
                  {q.title || t('untitledQuiz')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {t('quizMeta', {
                    questions: questionCount || '—',
                    time: timeLabel,
                    points,
                  })}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
