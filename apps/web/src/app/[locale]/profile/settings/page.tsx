'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Edit3,
  Globe,
  LogOut,
  Moon,
  Sun,
  Users,
  Trophy,
  School,
  User,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { useTheme } from '@/contexts/ThemeContext';
import UnifiedNavigation from '@/components/UnifiedNavigation';

export default function ProfileSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const isKm = locale === 'km';
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const user = useMemo(() => {
    try {
      return TokenManager.getUserData()?.user ?? null;
    } catch {
      return null;
    }
  }, []);

  const profileId = user?.id || 'me';
  const displayName =
    [user?.lastName, user?.firstName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    (isKm ? 'គណនី' : 'Account');

  const switchLocale = (next: 'en' | 'km') => {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;
    const path = window.location.pathname.replace(/^\/(en|km)/, `/${next}`);
    router.replace(path || `/${next}/profile/settings`);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await TokenManager.logout();
      router.replace(`/${locale}/auth/login`);
    } finally {
      setLoggingOut(false);
    }
  };

  const quickLinks = [
    {
      href: `/${locale}/feed?tab=bookmarks`,
      icon: Bookmark,
      label: isKm ? 'បានរក្សាទុក' : 'Bookmarks',
      color: '#6366F1',
    },
    {
      href: `/${locale}/profile/${profileId}?tab=posts`,
      icon: User,
      label: isKm ? 'ប្រកាសរបស់ខ្ញុំ' : 'My posts',
      color: '#0EA5E9',
    },
    {
      href: `/${locale}/profile/${profileId}/connections`,
      icon: Users,
      label: isKm ? 'ការតភ្ជាប់' : 'Connections',
      color: '#10B981',
    },
    {
      href: `/${locale}/profile/${profileId}?tab=performance`,
      icon: Trophy,
      label: isKm ? 'សមិទ្ធិផល' : 'Achievements',
      color: '#F59E0B',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <UnifiedNavigation />
      <div
        className="md:max-w-lg md:mx-auto"
        style={{
          paddingTop: 'calc(var(--top-bar-height) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <header className="px-4 py-3 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-[var(--top-bar-height)] z-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-slate-900 dark:text-white">
              {isKm ? 'ការកំណត់' : 'Settings'}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">{displayName}</p>
          </div>
        </header>

        <div className="px-4 pt-4 space-y-4">
          <Link
            href={`/${locale}/profile/${profileId}/edit`}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="w-11 h-11 rounded-full bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center text-sky-600">
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {isKm ? 'កែប្រវត្តិរូប' : 'Edit profile'}
              </p>
              <p className="text-xs text-slate-500">
                {isKm ? 'រូបថត ជីវប្រវត្តិ និងព័ត៌មាន' : 'Photo, bio, and details'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          <div className="grid grid-cols-4 gap-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}18` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {isKm ? 'រូបរាង' : 'Appearance'}
            </p>
            <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isKm ? 'របៀបងងឹត' : 'Dark mode'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {theme === 'system' ? (isKm ? 'តាមប្រព័ន្ធ' : 'System') : theme}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800">
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                      theme === mode
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {mode === 'system' ? (isKm ? 'ស្វ័យ' : 'Auto') : mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-sky-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isKm ? 'ភាសា' : 'Language'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isKm ? 'ភាសាខ្មែរ' : 'English'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => switchLocale('km')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    isKm
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  ខ្មែរ
                </button>
                <button
                  type="button"
                  onClick={() => switchLocale('en')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    !isKm
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </section>

          {(user?.role === 'ADMIN' ||
            user?.role === 'STAFF' ||
            user?.role === 'SCHOOL_ADMIN' ||
            user?.role === 'TEACHER') && (
            <Link
              href={`/${locale}/settings`}
              className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <School className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {isKm ? 'ការកំណត់សាលា' : 'School settings'}
                </p>
                <p className="text-xs text-slate-500">
                  {isKm ? 'ឆ្នាំសិក្សា និង workspace' : 'Academic years & workspace'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 font-bold text-sm disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut
              ? isKm
                ? 'កំពុងចាកចេញ…'
                : 'Signing out…'
              : isKm
                ? 'ចាកចេញ'
                : 'Log out'}
          </button>
        </div>
      </div>
    </div>
  );
}
