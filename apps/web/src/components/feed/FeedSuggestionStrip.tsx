'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronRight, Trophy, Users, GraduationCap, BookOpen } from 'lucide-react';
import type { FeedSuggestedCourse, FeedSuggestedQuiz, FeedSuggestedUser } from '@/lib/feed-normalize';

function Avatar({
  url,
  name,
  size = 44,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const letter = name?.trim()?.charAt(0)?.toUpperCase() || '?';
  if (url)
    return (
      <NextImage
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover border border-gray-100 dark:border-gray-700 shrink-0"
      />
    );
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-amber-400 to-orange-400 text-white flex items-center justify-center text-sm font-semibold shrink-0 border border-amber-300/50"
    >
      {letter}
    </div>
  );
}

export function FeedSuggestedUsersStrip({ locale, users }: { locale: string; users: FeedSuggestedUser[] }) {
  const t = useTranslations('feed.suggestions');
  return (
    <section className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-200 dark:border-gray-800 p-3 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-[#F9A825]" />
          {t('peopleTitle')}
        </h3>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto scrollbar-hide pb-1 pt-1">
        {users.map((u) => {
          const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || t('fallbackName');
          return (
            <Link
              key={u.id}
              href={`/${locale}/profile/${u.id}`}
              className="flex-shrink-0 w-[108px] flex flex-col items-center text-center rounded-lg hover:bg-amber-50/80 dark:hover:bg-amber-900/15 p-2 transition-colors border border-transparent hover:border-amber-200/70 dark:hover:border-amber-800/50"
            >
              <Avatar url={u.profilePictureUrl} name={name} size={52} />
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mt-1.5 line-clamp-2">{name}</p>
              {u.headline ? (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{u.headline}</p>
              ) : u.role ? (
                <p className="text-[10px] text-[#F9A825] mt-0.5">{u.role}</p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function FeedSuggestedCoursesStrip({ locale, courses }: { locale: string; courses: FeedSuggestedCourse[] }) {
  const t = useTranslations('feed.suggestions');
  return (
    <section className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-200 dark:border-gray-800 p-3 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-[#F9A825]" />
          {t('coursesTitle')}
        </h3>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto scrollbar-hide pb-1 pt-1">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/${locale}/learn/course/${c.id}`}
            className="flex-shrink-0 w-[200px] rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#F9A825]/40 dark:hover:border-amber-700/40 overflow-hidden bg-gray-50/50 dark:bg-gray-950/40 transition-colors"
          >
            <div className="relative aspect-[16/10] bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-800 dark:to-gray-900">
              {c.thumbnailUrl ? (
                <NextImage src={c.thumbnailUrl} alt="" fill sizes="200px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-amber-300/80 dark:text-gray-700" />
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
                {c.title || t('untitledCourse')}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                {(c.enrollmentCount ?? 0) > 0
                  ? t('enrolledCount', { count: c.enrollmentCount ?? 0 })
                  : t('open')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FeedSuggestedQuizzesStrip({ locale, quizzes }: { locale: string; quizzes: FeedSuggestedQuiz[] }) {
  const t = useTranslations('feed.suggestions');
  return (
    <section className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-200 dark:border-gray-800 p-3 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-[#F9A825]" />
          {t('quizzesTitle')}
        </h3>
      </div>
      <div className="-mx-1 flex flex-col gap-2">
        {quizzes.map((q, i) => {
          const pid = q.postId;
          const href =
            pid && pid.length > 0 ? `/${locale}/feed/post/${pid}` : q.id ? `/${locale}/learn` : `/${locale}/feed`;
          return (
            <Link
              key={`${pid || q.id || i}`}
              href={href}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#F9A825]/45 hover:bg-amber-50/40 dark:hover:bg-amber-900/15 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-[#F9A825]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {q.title || t('untitledQuiz')}
                </p>
                {q.passingScore != null && typeof q.passingScore === 'number' ? (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('passScore', { score: Math.round(q.passingScore) })}</p>
                ) : null}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
