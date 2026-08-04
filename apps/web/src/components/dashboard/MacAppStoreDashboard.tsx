'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  GraduationCap,
  Users,
  School,
  Target,
  UserPlus,
  BookOpen,
  ClipboardList,
  BarChart3,
  Calendar,
  Settings,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Search,
  ArrowUpRight,
  Compass,
  CheckCircle2,
  UserCheck,
  Clock,
  Award,
  TrendingUp,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import StudentGradeBreakdown from './StudentGradeBreakdown';
import StudentClassBreakdown from './StudentClassBreakdown';

interface MacAppStoreDashboardProps {
  locale: string;
  user: any;
  school: any;
  activeYear: any;
  stats: {
    students: string;
    teachers: string;
    classes: string;
    attendanceRate: string;
  };
  comprehensiveData?: any;
  attendanceSummary?: any;
  gradeStatsData?: any;
  classStatsData?: any;
  onNavigate?: (href: string) => void;
}

interface AppModuleItem {
  id: string;
  title: string;
  khmerTitle: string;
  subtitle: string;
  khmerSubtitle: string;
  category: 'people' | 'academics' | 'operations' | 'reports' | 'settings' | 'tools';
  icon: LucideIcon;
  gradient: string;
  iconBg: string;
  href: string;
  badge?: string;
  khmerBadge?: string;
  priceTag?: string;
  stat?: string;
  badgeColor?: string;
}



export default function MacAppStoreDashboard({
  locale,
  user,
  school,
  activeYear,
  stats,
  gradeStatsData,
  classStatsData,
  attendanceSummary,
}: MacAppStoreDashboardProps) {
  const router = useRouter();
  const isKhmer = locale === 'km';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  // All Admin App Modules
  const appModules: AppModuleItem[] = useMemo(
    () => [
      {
        id: 'students',
        title: 'Students Hub',
        khmerTitle: 'គ្រប់គ្រងសិស្ស',
        subtitle: 'Directory, Enrolment & Profiles',
        khmerSubtitle: 'បញ្ជីឈ្មោះ ចុះឈ្មោះ និងប្រវត្តិរូប',
        category: 'people',
        icon: UserPlus,
        gradient: 'from-blue-500 to-cyan-400',
        iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-400',
        href: `/${locale}/students`,
        badge: 'Popular',
        khmerBadge: 'ពេញនិយម',
        priceTag: 'OPEN',
        stat: stats.students,
        badgeColor: 'bg-blue-100 text-blue-600',
      },
      {
        id: 'teachers',
        title: 'Teachers Directory',
        khmerTitle: 'គ្រប់គ្រងគ្រូ',
        subtitle: 'Faculty staff & class assignments',
        khmerSubtitle: 'គ្រូ បែងចែកថ្នាក់ មុខវិជ្ជា',
        category: 'people',
        icon: Users,
        gradient: 'from-purple-500 to-indigo-500',
        iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-500',
        href: `/${locale}/teachers`,
        priceTag: 'OPEN',
        stat: stats.teachers,
      },
      {
        id: 'parents',
        title: 'Parent Relations',
        khmerTitle: 'ទំនាក់ទំនងអាណាព្យាបាល',
        subtitle: 'Parent profiles & student links',
        khmerSubtitle: 'គ្រប់គ្រងគណនី និងការតភ្ជាប់',
        category: 'people',
        icon: UserCheck,
        gradient: 'from-amber-500 to-yellow-500',
        iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-500',
        href: `/${locale}/parents`,
        priceTag: 'OPEN',
      },
      {
        id: 'classes',
        title: 'Class & Sections',
        khmerTitle: 'ថ្នាក់រៀន',
        subtitle: 'Grade levels, rooms & sections',
        khmerSubtitle: 'ថ្នាក់ បន្ទប់ និងកាលវិភាគ',
        category: 'academics',
        icon: BookOpen,
        gradient: 'from-emerald-500 to-teal-400',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-400',
        href: `/${locale}/classes`,
        priceTag: 'OPEN',
        stat: stats.classes,
      },
      {
        id: 'grades',
        title: 'Grade Score Entry',
        khmerTitle: 'បញ្ចូលពិន្ទុ',
        subtitle: 'Monthly & semester exam results',
        khmerSubtitle: 'ពិន្ទុប្រចាំខែ និងឆមាស',
        category: 'academics',
        icon: ClipboardList,
        gradient: 'from-violet-500 to-fuchsia-500',
        iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
        href: `/${locale}/grades/entry`,
        priceTag: 'OPEN',
      },
      {
        id: 'timetable',
        title: 'Master Timetable',
        khmerTitle: 'កាលវិភាគសិក្សា',
        subtitle: 'Schedules, shifts & periods',
        khmerSubtitle: 'ម៉ោងបង្រៀន និងកាលវិភាគប្រចាំថ្ងៃ',
        category: 'academics',
        icon: Clock,
        gradient: 'from-blue-600 to-indigo-700',
        iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-700',
        href: `/${locale}/timetable`,
        priceTag: 'OPEN',
      },
      {
        id: 'attendance',
        title: 'Daily Attendance',
        khmerTitle: 'ស្រង់វត្តមាន',
        subtitle: 'Mark class attendance & notify parents',
        khmerSubtitle: 'ស្រង់វត្តមាន និងជូនដំណឹងអាណាព្យាបាល',
        category: 'operations',
        icon: Calendar,
        gradient: 'from-amber-500 to-orange-400',
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-400',
        href: `/${locale}/attendance/mark`,
        badge: 'Live',
        khmerBadge: 'ផ្ទាល់',
        priceTag: 'OPEN',
        stat: stats.attendanceRate,
        badgeColor: 'bg-rose-100 text-rose-600',
      },
      {
        id: 'attendance-dashboard',
        title: 'Attendance Center',
        khmerTitle: 'មជ្ឈមណ្ឌលវត្តមាន',
        subtitle: 'Real-time school attendance stats',
        khmerSubtitle: 'ស្ថិតិវត្តមានទូទាំងសាលា',
        category: 'operations',
        icon: LayoutGrid,
        gradient: 'from-rose-500 to-pink-500',
        iconBg: 'bg-gradient-to-br from-rose-500 to-pink-500',
        href: `/${locale}/attendance/dashboard`,
        badge: 'Pro',
        khmerBadge: 'កម្រិតខ្ពស់',
        priceTag: 'OPEN',
        badgeColor: 'bg-purple-100 text-purple-600',
      },
      {
        id: 'reports',
        title: 'Transcripts & Cards',
        khmerTitle: 'សៀវភៅតាមដាន',
        subtitle: 'Generate report cards & GPA summaries',
        khmerSubtitle: 'ចេញសៀវភៅតាមដាន និងរបាយការណ៍',
        category: 'reports',
        icon: BarChart3,
        gradient: 'from-sky-500 to-blue-600',
        iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
        href: `/${locale}/grades/reports`,
        priceTag: 'OPEN',
      },
      {
        id: 'analytics',
        title: 'Analytics & Insights',
        khmerTitle: 'ការវិភាគ',
        subtitle: 'School performance data & trends',
        khmerSubtitle: 'ទិន្នន័យ និងនិន្នាការសាលា',
        category: 'reports',
        icon: TrendingUp,
        gradient: 'from-cyan-500 to-teal-500',
        iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-500',
        href: `/${locale}/reports`,
        priceTag: 'OPEN',
      },
      {
        id: 'settings',
        title: 'Academic Settings',
        khmerTitle: 'ការកំណត់ប្រព័ន្ធ',
        subtitle: 'Academic years, school config',
        khmerSubtitle: 'ឆ្នាំសិក្សា ប្រវត្តិរូបសាលា',
        category: 'settings',
        icon: Settings,
        gradient: 'from-slate-600 to-slate-800',
        iconBg: 'bg-gradient-to-br from-slate-600 to-slate-800',
        href: `/${locale}/settings/academic-years`,
        priceTag: 'CONFIG',
      },
      {
        id: 'admissions',
        title: 'Admissions',
        khmerTitle: 'ការទទួលចូលរៀន',
        subtitle: 'New student application processing',
        khmerSubtitle: 'ដំណើរការចុះឈ្មោះចូលរៀនថ្មី',
        category: 'people',
        icon: Award,
        gradient: 'from-pink-500 to-rose-500',
        iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
        href: `/${locale}/admissions`,
        priceTag: 'OPEN',
        badge: 'New',
        khmerBadge: 'ថ្មី',
        badgeColor: 'bg-green-100 text-green-600',
      },
    ],
    [locale, stats]
  );

  // Category filter
  const categories = [
    { id: 'all', name: 'All Modules', khmerName: 'មុខងារទាំងអស់', icon: Compass },
    { id: 'people', name: 'People & Staff', khmerName: 'សិស្ស និងបុគ្គលិក', icon: Users },
    { id: 'academics', name: 'Academics', khmerName: 'ការសិក្សា', icon: BookOpen },
    { id: 'operations', name: 'Operations', khmerName: 'ប្រតិបត្តិការ', icon: LayoutGrid },
    { id: 'reports', name: 'Reports', khmerName: 'របាយការណ៍', icon: BarChart3 },
    { id: 'settings', name: 'Settings', khmerName: 'ការកំណត់', icon: Settings },
  ];

  const filteredApps = useMemo(() => {
    return appModules.filter((app) => {
      const matchCat = activeCategory === 'all' || app.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCat;
      return (
        matchCat &&
        (app.title.toLowerCase().includes(q) ||
          app.khmerTitle.includes(q) ||
          app.subtitle.toLowerCase().includes(q) ||
          app.khmerSubtitle.includes(q))
      );
    });
  }, [appModules, activeCategory, searchQuery]);

  // Split filteredApps into rows of 3 for the "Apps We Love" grid
  const appRows = useMemo(() => {
    const rows: AppModuleItem[][] = [];
    for (let i = 0; i < filteredApps.length; i += 3) {
      rows.push(filteredApps.slice(i, i + 3));
    }
    return rows;
  }, [filteredApps]);

  // Horizontal scroll
  const scrollHorizontal = (dir: 'left' | 'right') => {
    if (horizontalScrollRef.current) {
      const amount = 320;
      horizontalScrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#111113]">
      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <div className="min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#111113]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-gray-800/60">
          <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
            <h1 className="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight">
              {isKhmer ? 'ស្វែងរក' : 'Discover'}
            </h1>

            {/* Search bar in header */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isKhmer ? 'ស្វែងរក...' : 'Search modules...'}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-gray-800 rounded-full text-[12px] font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all border-0"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-black rounded-full uppercase tracking-wider hidden sm:inline-flex">
                {activeYear?.name || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 pb-20 pt-6 space-y-10">

          {/* ── SECTION 1: Hero Featured Banners ───────────────────────── */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hero Card 1 — Students */}
              <AnimatedContent animation="slide-up" delay={80}>
                <div
                  onClick={() => router.push(`/${locale}/students`)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white p-6 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.015] hover:shadow-2xl hover:shadow-blue-500/30 border border-white/10"
                >
                  {/* Decorative glow orb */}
                  <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
                  <div className="absolute -right-4 -bottom-8 w-32 h-32 bg-cyan-400/20 rounded-full blur-xl pointer-events-none" />

                  <div className="relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-200">
                      {isKhmer ? 'មុខងារពិសេស' : 'FEATURED MANAGEMENT'}
                    </span>
                    <h2 className="text-xl font-black leading-snug mt-1 mb-2">
                      {isKhmer ? 'ប្រព័ន្ធគ្រប់គ្រងសិស្ស' : 'Smart Student Onboarding & Profiles'}
                    </h2>
                    <p className="text-[12px] text-blue-100/80 leading-relaxed line-clamp-2">
                      {isKhmer
                        ? 'គ្រប់គ្រងបញ្ជីឈ្មោះ ចុះឈ្មោះ និងប្រវត្តិរូបបានលឿន'
                        : 'Manage registrations, photo profiles, and academic records seamlessly.'}
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <span className="inline-flex items-center px-4 py-1.5 bg-white text-blue-700 font-black text-[11px] rounded-full shadow-sm hover:bg-blue-50 transition-colors">
                        {isKhmer ? 'បើកមុខងារ' : 'Open Directory'}
                      </span>
                      <span className="text-[11px] text-blue-200 flex items-center gap-1">
                        {stats.students} {isKhmer ? 'សិស្សសរុប' : 'students'}
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  <div className="absolute right-6 bottom-6 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                    <GraduationCap className="w-9 h-9 text-white" />
                  </div>
                </div>
              </AnimatedContent>

              {/* Hero Card 2 — Attendance */}
              <AnimatedContent animation="slide-up" delay={130}>
                <div
                  onClick={() => router.push(`/${locale}/attendance/mark`)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white p-6 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.015] hover:shadow-2xl hover:shadow-emerald-500/30 border border-white/10"
                >
                  <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
                  <div className="absolute -right-4 -bottom-8 w-32 h-32 bg-teal-300/20 rounded-full blur-xl pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-200">
                        {isKhmer ? 'ប្រតិបត្តិការប្រចាំថ្ងៃ' : 'DAILY OPERATIONS'}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                        {stats.attendanceRate}
                      </span>
                    </div>
                    <h2 className="text-xl font-black leading-snug mt-0 mb-2">
                      {isKhmer ? 'ប្រព័ន្ធស្រង់វត្តមាន' : 'Automated Attendance Command'}
                    </h2>
                    <p className="text-[12px] text-emerald-100/80 leading-relaxed line-clamp-2">
                      {isKhmer
                        ? 'ស្រង់វត្តមានប្រចាំថ្ងៃ ជូនដំណឹងស្វ័យប្រវត្ត'
                        : 'Track student presence instantly and broadcast real-time updates.'}
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <span className="inline-flex items-center px-4 py-1.5 bg-white text-emerald-700 font-black text-[11px] rounded-full shadow-sm hover:bg-emerald-50 transition-colors">
                        {isKhmer ? 'ស្រង់វត្តមាន' : 'Mark Attendance'}
                      </span>
                    </div>
                  </div>

                  <div className="absolute right-6 bottom-6 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                    <Target className="w-9 h-9 text-white" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-emerald-700 shadow">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </AnimatedContent>
            </div>
          </section>

          {/* ── SECTION 2: Category Pills ───────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
                      : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <CatIcon className="w-3.5 h-3.5" />
                  {isKhmer ? cat.khmerName : cat.name}
                </button>
              );
            })}
          </div>

          {/* ── SECTION 3: "Apps We Love" — App Store Row Grid ─────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight">
                  {isKhmer ? 'មុខងារដែលយើងចូលចិត្ត' : 'Apps and Functions We Love'}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isKhmer ? 'ចុចលើ OPEN ដើម្បីចូល' : 'Tap OPEN to launch the management form'}
                </p>
              </div>
              <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 hidden sm:block">
                {filteredApps.length} {isKhmer ? 'មុខងារ' : 'Modules'}
              </span>
            </div>

            {/* App Store Row Layout — each row = 3 apps, separated by divider */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-gray-800/80 shadow-sm">
              {appRows.map((row, rowIdx) => (
                <div key={rowIdx}>
                  {rowIdx > 0 && (
                    <div className="border-t border-slate-100 dark:border-gray-800/60 mx-4" />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {row.map((app, appIdx) => {
                      const Icon = app.icon;
                      const isLast = appIdx === row.length - 1;
                      return (
                        <React.Fragment key={app.id}>
                          <div
                            onClick={() => router.push(app.href)}
                            className="group relative flex items-center gap-3.5 p-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-all duration-200"
                          >
                            {/* App Icon */}
                            <div
                              className={`w-[54px] h-[54px] rounded-[14px] ${app.iconBg} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}
                            >
                              <Icon className="w-7 h-7" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[13px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                                  {isKhmer ? app.khmerTitle : app.title}
                                </span>
                                {app.badge && (
                                  <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded-md flex-shrink-0 ${app.badgeColor || 'bg-blue-100 text-blue-600'}`}>
                                    {isKhmer ? app.khmerBadge : app.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                                {isKhmer ? app.khmerSubtitle : app.subtitle}
                              </p>
                              {app.stat && (
                                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                                  {app.stat} {app.id === 'students' ? (isKhmer ? 'នាក់' : 'students') : app.id === 'teachers' ? (isKhmer ? 'នាក់' : 'teachers') : app.id === 'classes' ? (isKhmer ? 'ថ្នាក់' : 'classes') : ''}
                                </p>
                              )}
                            </div>

                            {/* OPEN button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(app.href); }}
                              className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-black text-[11px] tracking-wide hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all duration-200 shadow-sm"
                            >
                              {app.priceTag || 'OPEN'}
                            </button>
                          </div>

                          {/* Vertical divider between columns (not after last in row) */}
                          {!isLast && appIdx < row.length - 1 && (
                            <div className="hidden lg:block absolute" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredApps.length === 0 && (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-[13px] font-semibold">
                    {isKhmer ? 'រកមិនឃើញ' : 'No modules found'}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ── SECTION 4: Grade Breakdown (if data available) ─────────── */}
          {gradeStatsData && (
            <section>
              <AnimatedContent animation="slide-up" delay={200}>
                <StudentGradeBreakdown gradeData={gradeStatsData} classData={classStatsData} locale={locale} />
              </AnimatedContent>
            </section>
          )}

          {/* ── SECTION 5: Dark Showcase Cards (Like App Store Games) ──── */}
          <section>
            <h2 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight mb-4">
              {isKhmer ? 'ឧបករណ៍រដ្ឋបាលពិសេស' : 'The Latest Must-Have Admin Utilities'}
            </h2>

            <div className="relative">
              {/* Scroll Arrow Left */}
              <button
                onClick={() => scrollHorizontal('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shadow-lg hover:bg-slate-50 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>

              {/* Showcase horizontal scroll */}
              <div
                ref={horizontalScrollRef}
                className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
              >
                {/* Showcase 1 — Grade Reports */}
                <AnimatedContent animation="slide-up" delay={200}>
                  <div
                    onClick={() => router.push(`/${locale}/grades/reports`)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 text-white flex-shrink-0 w-[300px] h-60 p-5 flex flex-col justify-end shadow-lg transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl snap-start"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-slate-900/50 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-600/50 via-blue-700/30 to-slate-950 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-5 right-5 w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center z-20">
                      <BarChart3 className="w-6 h-6 text-sky-300" />
                    </div>
                    <div className="relative z-20 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-sky-400">
                        {isKhmer ? 'របាយការណ៍' : 'ANALYTICS & CARDS'}
                      </span>
                      <h3 className="text-[16px] font-black text-white leading-snug">
                        {isKhmer ? 'សៀវភៅតាមដាន & GPA' : 'Transcripts & Grade Book'}
                      </h3>
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {isKhmer ? 'ចេញសៀវភៅតាមដានប្រចាំខែ' : 'Generate complete grade sheets and report cards.'}
                      </p>
                      <div className="pt-1 flex items-center gap-1 text-sky-400 text-[11px] font-bold">
                        {isKhmer ? 'ចូលមើល' : 'View Reports'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </AnimatedContent>

                {/* Showcase 2 — Classes */}
                <AnimatedContent animation="slide-up" delay={250}>
                  <div
                    onClick={() => router.push(`/${locale}/classes`)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 text-white flex-shrink-0 w-[300px] h-60 p-5 flex flex-col justify-end shadow-lg transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl snap-start"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-slate-900/50 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/50 via-teal-700/30 to-slate-950 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-5 right-5 w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center z-20">
                      <BookOpen className="w-6 h-6 text-emerald-300" />
                    </div>
                    <div className="relative z-20 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                        {isKhmer ? 'ថ្នាក់រៀន' : 'CLASS BUILDER'}
                      </span>
                      <h3 className="text-[16px] font-black text-white leading-snug">
                        {isKhmer ? 'ថ្នាក់ & បន្ទប់សិក្សា' : 'Grade Levels & Sections'}
                      </h3>
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {isKhmer ? 'ចំណុះថ្នាក់ គ្រូប្រចាំ' : 'Organize homeroom assignments and capacity.'}
                      </p>
                      <div className="pt-1 flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                        {isKhmer ? 'គ្រប់គ្រង' : 'Manage Classes'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </AnimatedContent>

                {/* Showcase 3 — Timetable */}
                <AnimatedContent animation="slide-up" delay={300}>
                  <div
                    onClick={() => router.push(`/${locale}/timetable`)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 text-white flex-shrink-0 w-[300px] h-60 p-5 flex flex-col justify-end shadow-lg transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl snap-start"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-slate-900/50 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/50 via-purple-700/30 to-slate-950 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-5 right-5 w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center z-20">
                      <Clock className="w-6 h-6 text-violet-300" />
                    </div>
                    <div className="relative z-20 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                        {isKhmer ? 'ពេលវេលាសិក្សា' : 'SCHEDULE MASTER'}
                      </span>
                      <h3 className="text-[16px] font-black text-white leading-snug">
                        {isKhmer ? 'កាលវិភាគ & ម៉ោង' : 'Master Timetable Setup'}
                      </h3>
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {isKhmer ? 'ម៉ោងបង្រៀន ប្រចាំថ្ងៃ' : 'Configure shifts, periods and daily schedules.'}
                      </p>
                      <div className="pt-1 flex items-center gap-1 text-violet-400 text-[11px] font-bold">
                        {isKhmer ? 'ចូលមើល' : 'Open Timetable'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </AnimatedContent>

                {/* Showcase 4 — Settings */}
                <AnimatedContent animation="slide-up" delay={350}>
                  <div
                    onClick={() => router.push(`/${locale}/settings/academic-years`)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 text-white flex-shrink-0 w-[300px] h-60 p-5 flex flex-col justify-end shadow-lg transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl snap-start"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-slate-900/50 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/50 via-indigo-800/30 to-slate-950 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-5 right-5 w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center z-20">
                      <Settings className="w-6 h-6 text-indigo-300" />
                    </div>
                    <div className="relative z-20 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                        {isKhmer ? 'ឆ្នាំសិក្សា' : 'ACADEMIC SESSION'}
                      </span>
                      <h3 className="text-[16px] font-black text-white leading-snug">
                        {isKhmer ? 'ការកំណត់ប្រព័ន្ធ' : 'School System Config'}
                      </h3>
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {isKhmer ? 'ព័ត៌មានសាលា ឆ្នាំសិក្សា' : 'Manage school profile and active academic session.'}
                      </p>
                      <div className="pt-1 flex items-center gap-1 text-indigo-400 text-[11px] font-bold">
                        {isKhmer ? 'ការកំណត់' : 'Configure'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </AnimatedContent>
              </div>

              {/* Scroll Arrow Right */}
              <button
                onClick={() => scrollHorizontal('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shadow-lg hover:bg-slate-50 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </section>

          {/* ── SECTION 6: "Try These Favourites" (mini horizontal row) ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight">
                {isKhmer ? 'ព្យាយាមមុខងារទាំងនេះ' : 'Try These Admin Favourites'}
              </h2>
              <button
                onClick={() => setActiveCategory('all')}
                className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline"
              >
                {isKhmer ? 'មើលទាំងអស់' : 'See All'}
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {[
                { app: appModules.find(a => a.id === 'teachers')! },
                { app: appModules.find(a => a.id === 'parents')! },
                { app: appModules.find(a => a.id === 'grades')! },
                { app: appModules.find(a => a.id === 'timetable')! },
                { app: appModules.find(a => a.id === 'analytics')! },
                { app: appModules.find(a => a.id === 'admissions')! },
              ].filter(item => item.app).map(({ app }, idx) => {
                const Icon = app.icon;
                return (
                  <div
                    key={app.id}
                    onClick={() => router.push(app.href)}
                    className="group flex-shrink-0 flex items-center gap-3 p-3.5 pr-4 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200/80 dark:border-gray-800/80 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02] min-w-[220px]"
                  >
                    <div className={`w-11 h-11 rounded-[12px] ${app.iconBg} flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5.5 h-5.5 w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {isKhmer ? app.khmerTitle : app.title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {isKhmer ? app.khmerSubtitle : app.subtitle}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(app.href); }}
                      className="flex-shrink-0 px-3 py-1 rounded-full bg-slate-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-black text-[10px] hover:bg-blue-600 hover:text-white transition-all"
                    >
                      {app.priceTag || 'GET'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── SECTION 7: Class Breakdown ─────────────────────────────── */}
          {classStatsData && (
            <section>
              <AnimatedContent animation="slide-up" delay={250}>
                <StudentClassBreakdown classData={classStatsData} locale={locale} />
              </AnimatedContent>
            </section>
          )}

          {/* ── SECTION 8: Quick Stats Bar ────────────────────────────── */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: isKhmer ? 'សិស្សសរុប' : 'Total Students', value: stats.students, icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-900/30' },
                { label: isKhmer ? 'គ្រូបង្រៀន' : 'Teachers', value: stats.teachers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-900/30' },
                { label: isKhmer ? 'ថ្នាក់រៀន' : 'Classes', value: stats.classes, icon: School, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-900/30' },
                { label: isKhmer ? 'វត្តមាន' : 'Attendance Rate', value: stats.attendanceRate, icon: Target, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-900/30' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <AnimatedContent key={i} animation="slide-up" delay={100 + i * 40}>
                    <div className={`${item.bg} ${item.border} border rounded-2xl p-4 flex items-center gap-3`}>
                      <div className={`w-9 h-9 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm ${item.color}`}>
                        <Icon className="w-4.5 h-4.5 w-5 h-5" />
                      </div>
                      <div>
                        <p className={`text-xl font-black ${item.color} leading-none`}>{item.value}</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide">{item.label}</p>
                      </div>
                    </div>
                  </AnimatedContent>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
