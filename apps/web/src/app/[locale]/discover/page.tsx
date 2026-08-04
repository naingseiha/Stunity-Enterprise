'use client';

import React, { useEffect, useState, use, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { SCHOOL_SERVICE_URL, ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import { isSchoolAttendanceAdminRole } from '@/lib/permissions/schoolAttendance';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';
import type { LucideIcon } from 'lucide-react';
import {
  GraduationCap, Users, School, Target, UserPlus, BookOpen,
  ClipboardList, BarChart3, Calendar, Settings, ChevronRight,
  ChevronLeft, LayoutGrid, Search, ArrowUpRight, Compass,
  CheckCircle2, UserCheck, Clock, Award, TrendingUp,
  LogOut, Moon, Sun, Globe, Bell, Home, Sparkles,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import { useTheme } from '@/contexts/ThemeContext';

interface AppModuleItem {
  id: string;
  title: string;
  khmerTitle: string;
  subtitle: string;
  khmerSubtitle: string;
  category: string;
  icon: LucideIcon;
  iconBg: string;
  href: string;
  badge?: string;
  khmerBadge?: string;
  priceTag?: string;
  stat?: string;
  badgeColor?: string;
}

const STATS_CACHE_TTL = 5 * 60 * 1000;

export default function DiscoverPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;
  const isKhmer = locale === 'km';
  const { schoolId, selectedYear, currentYear } = useAcademicYear();
  const activeYear = selectedYear ?? currentYear;
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSideNav, setActiveSideNav] = useState('discover');
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) { router.replace(`/${locale}/auth/login`); return; }
    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [locale, router]);



  const appModules: AppModuleItem[] = useMemo(() => [
    { id: 'students', title: 'Students Hub', khmerTitle: 'គ្រប់គ្រងសិស្ស', subtitle: 'Directory, Enrolment & Profiles', khmerSubtitle: 'បញ្ជីឈ្មោះ ចុះឈ្មោះ និងប្រវត្តិរូប', category: 'people', icon: UserPlus, iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-400', href: `/${locale}/students`, badge: 'Popular', khmerBadge: 'ពេញនិយម', priceTag: 'OPEN', badgeColor: 'bg-blue-100 text-blue-600' },
    { id: 'teachers', title: 'Teachers Directory', khmerTitle: 'គ្រប់គ្រងគ្រូ', subtitle: 'Faculty staff & class assignments', khmerSubtitle: 'គ្រូ បែងចែកថ្នាក់ មុខវិជ្ជា', category: 'people', icon: Users, iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-500', href: `/${locale}/teachers`, priceTag: 'OPEN' },
    { id: 'parents', title: 'Parent Relations', khmerTitle: 'ទំនាក់ទំនងអាណាព្យាបាល', subtitle: 'Parent profiles & student links', khmerSubtitle: 'គ្រប់គ្រងគណនី និងការតភ្ជាប់', category: 'people', icon: UserCheck, iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-400', href: `/${locale}/parents`, priceTag: 'OPEN' },
    { id: 'classes', title: 'Class & Sections', khmerTitle: 'ថ្នាក់រៀន', subtitle: 'Grade levels, rooms & sections', khmerSubtitle: 'ថ្នាក់ បន្ទប់ និងកាលវិភាគ', category: 'academics', icon: BookOpen, iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-400', href: `/${locale}/classes`, priceTag: 'OPEN' },
    { id: 'grades', title: 'Grade Score Entry', khmerTitle: 'បញ្ចូលពិន្ទុ', subtitle: 'Monthly & semester exam results', khmerSubtitle: 'ពិន្ទុប្រចាំខែ និងឆមាស', category: 'academics', icon: ClipboardList, iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-500', href: `/${locale}/grades/entry`, priceTag: 'OPEN' },
    { id: 'timetable', title: 'Master Timetable', khmerTitle: 'កាលវិភាគសិក្សា', subtitle: 'Schedules, shifts & periods', khmerSubtitle: 'ម៉ោងបង្រៀន និងកាលវិភាគ', category: 'academics', icon: Clock, iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-700', href: `/${locale}/timetable`, priceTag: 'OPEN' },
    { id: 'attendance', title: 'Daily Attendance', khmerTitle: 'ស្រង់វត្តមាន', subtitle: 'Mark class attendance & notify parents', khmerSubtitle: 'ស្រង់វត្តមាន និងជូនដំណឹង', category: 'operations', icon: Calendar, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-400', href: `/${locale}/attendance/mark`, badge: 'Live', khmerBadge: 'ផ្ទាល់', priceTag: 'OPEN', badgeColor: 'bg-rose-100 text-rose-600' },
    { id: 'attendance-dashboard', title: 'Attendance Center', khmerTitle: 'មជ្ឈមណ្ឌលវត្តមាន', subtitle: 'Real-time attendance stats', khmerSubtitle: 'ស្ថិតិវត្តមានទូទាំងសាលា', category: 'operations', icon: LayoutGrid, iconBg: 'bg-gradient-to-br from-rose-500 to-pink-500', href: `/${locale}/attendance/dashboard`, badge: 'Pro', khmerBadge: 'កម្រិតខ្ពស់', priceTag: 'OPEN', badgeColor: 'bg-purple-100 text-purple-600' },
    { id: 'admissions', title: 'Admissions', khmerTitle: 'ការទទួលចូលរៀន', subtitle: 'New student applications', khmerSubtitle: 'ដំណើរការចុះឈ្មោះចូលរៀនថ្មី', category: 'people', icon: Award, iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500', href: `/${locale}/admissions`, priceTag: 'OPEN', badge: 'New', khmerBadge: 'ថ្មី', badgeColor: 'bg-green-100 text-green-600' },
    
    // ── REPORT MODULES FROM /REPORTS PAGE ──────────────────────────────
    { id: 'reports-hub', title: 'Reports Hub', khmerTitle: 'មជ្ឈមណ្ឌលរបាយការណ៍', subtitle: 'All school reports & analytics', khmerSubtitle: 'ផ្ទាំងរបាយការណ៍សរុប និងការវិភាគ', category: 'reports', icon: BarChart3, iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600', href: `/${locale}/reports`, priceTag: 'OPEN' },
    { id: 'reports-dashboard', title: 'Reports Dashboard', khmerTitle: 'ផ្ទាំងរបាយការណ៍', subtitle: 'Scores, attendance & ranking summary', khmerSubtitle: 'ទិដ្ឋភាពទូទៅនៃពិន្ទុ វត្តមាន និងចំណាត់ថ្នាក់', category: 'reports', icon: LayoutGrid, iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500', href: `/${locale}/reports/dashboard`, priceTag: 'OPEN' },
    { id: 'score-analytics', title: 'Score Analytics', khmerTitle: 'វិភាគពិន្ទុ', subtitle: 'Subject & grade performance trends', khmerSubtitle: 'សិក្សាលទ្ធផលតាមមុខវិជ្ជា និងថ្នាក់រៀន', category: 'reports', icon: TrendingUp, iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600', href: `/${locale}/grades/analytics`, priceTag: 'OPEN' },
    { id: 'class-comparison', title: 'Class Comparison', khmerTitle: 'ប្រៀបធៀបថ្នាក់សិក្សា', subtitle: 'Compare results across classes & years', khmerSubtitle: 'ប្រៀបធៀបលទ្ធផលសិក្សារវាងថ្នាក់រៀន', category: 'reports', icon: Clock, iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600', href: `/${locale}/reports/year-comparison`, priceTag: 'OPEN' },
    { id: 'student-demographics', title: 'Student Demographics', khmerTitle: 'វិភាគប្រភពសិស្ស', subtitle: 'Demographics & student origin data', khmerSubtitle: 'វិភាគប្រភព ភេទ និងទិន្នន័យសិស្ស', category: 'reports', icon: Users, iconBg: 'bg-gradient-to-br from-sky-500 to-indigo-500', href: `/${locale}/reports/demographics`, priceTag: 'OPEN' },
    { id: 'student-report-cards', title: 'Student Report Cards', khmerTitle: 'ប័ណ្ណរបាយការណ៍សិស្ស', subtitle: 'Generate & print student report cards', khmerSubtitle: 'ពិនិត្យ និងបោះពុម្ពប័ណ្ណរបាយការណ៍សិស្ស', category: 'reports', icon: ClipboardList, iconBg: 'bg-gradient-to-br from-blue-500 to-blue-700', href: `/${locale}/grades/reports`, priceTag: 'OPEN' },
    { id: 'monthly-academic-report', title: 'Monthly Academic Report', khmerTitle: 'របាយការណ៍សិក្សាប្រចាំខែ', subtitle: 'Monthly ranks & score summaries', khmerSubtitle: 'រៀបចំតារាងលទ្ធផល និងចំណាត់ថ្នាក់ប្រចាំខែ', category: 'reports', icon: Calendar, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500', href: `/${locale}/grades/monthly-report`, priceTag: 'OPEN' },
    { id: 'attendance-reports', title: 'Attendance Reports', khmerTitle: 'របាយការណ៍វត្តមាន', subtitle: 'Monthly attendance & absence breakdown', khmerSubtitle: 'ពិនិត្យវត្តមានប្រចាំខែ និងចំនួនអវត្តមាន', category: 'reports', icon: UserCheck, iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600', href: `/${locale}/attendance/reports`, priceTag: 'OPEN' },
    { id: 'honor-certificates', title: 'Honor Certificates', khmerTitle: 'សូដីយប័ត្រសិស្សពូកែ', subtitle: 'Generate student certificates & awards', khmerSubtitle: 'បង្កើត និងបោះពុម្ពប័ណ្ណសរសើរសម្រាប់សិស្សពូកែ', category: 'reports', icon: Award, iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600', href: `/${locale}/reports/certificate-studio`, badge: 'New', khmerBadge: 'ថ្មី', priceTag: 'OPEN', badgeColor: 'bg-rose-100 text-rose-600' },
    { id: 'poster-studio', title: 'Poster Studio', khmerTitle: 'ស្ទូឌីយោមាតិកាក្រាហ្វិក', subtitle: 'Design achievement posters & banners', khmerSubtitle: 'បង្កើតរូបភាពផ្សព្វផ្សាយលទ្ធផលសាលា', category: 'reports', icon: Sparkles, iconBg: 'bg-gradient-to-br from-fuchsia-500 to-purple-600', href: `/${locale}/reports/poster-studio`, priceTag: 'OPEN' },

    { id: 'settings', title: 'Academic Settings', khmerTitle: 'ការកំណត់', subtitle: 'Academic years & school config', khmerSubtitle: 'ឆ្នាំសិក្សា ប្រវត្តិរូបសាលា', category: 'settings', icon: Settings, iconBg: 'bg-gradient-to-br from-slate-600 to-slate-800', href: `/${locale}/settings/academic-years`, priceTag: 'CONFIG' },
  ], [locale]);

  const categories = [
    { id: 'all', name: 'All Modules', khmerName: 'មុខងារទាំងអស់', icon: Compass },
    { id: 'people', name: 'People & Staff', khmerName: 'សិស្ស និងបុគ្គលិក', icon: Users },
    { id: 'academics', name: 'Academics', khmerName: 'ការសិក្សា', icon: BookOpen },
    { id: 'operations', name: 'Operations', khmerName: 'ប្រតិបត្តិការ', icon: LayoutGrid },
    { id: 'reports', name: 'Reports', khmerName: 'របាយការណ៍', icon: BarChart3 },
    { id: 'settings', name: 'Settings', khmerName: 'ការកំណត់', icon: Settings },
  ];

  const sideNavItems = [
    { id: 'discover', icon: Compass, label: 'Discover', khmer: 'ស្វែងរក', action: () => { setActiveSideNav('discover'); setActiveCategory('all'); } },
    { id: 'dashboard', icon: Home, label: 'Dashboard', khmer: 'ផ្ទាំងគ្រប់គ្រង', action: () => router.push(`/${locale}/dashboard`) },
    { id: 'people', icon: Users, label: 'People', khmer: 'បុគ្គល', action: () => { setActiveSideNav('people'); setActiveCategory('people'); } },
    { id: 'academics', icon: BookOpen, label: 'Academics', khmer: 'ការសិក្សា', action: () => { setActiveSideNav('academics'); setActiveCategory('academics'); } },
    { id: 'operations', icon: LayoutGrid, label: 'Operations', khmer: 'ប្រតិបត្តិ', action: () => { setActiveSideNav('operations'); setActiveCategory('operations'); } },
    { id: 'reports', icon: BarChart3, label: 'Reports', khmer: 'របាយការណ៍', action: () => { setActiveSideNav('reports'); setActiveCategory('reports'); } },
    { id: 'settings', icon: Settings, label: 'Settings', khmer: 'ការកំណត់', action: () => { setActiveSideNav('settings'); setActiveCategory('settings'); } },
  ];

  const filteredApps = useMemo(() => appModules.filter(app => {
    const matchCat = activeCategory === 'all' || app.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchCat;
    return matchCat && (
      app.title.toLowerCase().includes(q) || app.khmerTitle.includes(q) ||
      app.subtitle.toLowerCase().includes(q) || app.khmerSubtitle.includes(q)
    );
  }), [appModules, activeCategory, searchQuery]);

  // Section Groups
  const sectionGroups = useMemo(() => {
    const raw = [
      {
        id: 'people',
        title: 'People & Staff Management',
        khmerTitle: 'គ្រប់គ្រងសិស្ស គ្រូ និងអាណាព្យាបាល',
        subtitle: 'Student records, teachers directory, parent accounts & admissions',
        khmerSubtitle: 'បញ្ជីឈ្មោះសិស្ស គ្រូ ទំនាក់ទំនងអាណាព្យាបាល និងការចុះឈ្មោះ',
        icon: Users,
        color: 'text-blue-600 dark:text-blue-400',
        items: filteredApps.filter(m => m.category === 'people'),
      },
      {
        id: 'academics',
        title: 'Academics & Schedules',
        khmerTitle: 'ការសិក្សា ថ្នាក់រៀន និងកាលវិភាគ',
        subtitle: 'Classes, exam grade entry, and master timetable schedules',
        khmerSubtitle: 'គ្រប់គ្រងថ្នាក់រៀន ការបញ្ចូលពិន្ទុប្រឡង និងកាលវិភាគបង្រៀន',
        icon: BookOpen,
        color: 'text-purple-600 dark:text-purple-400',
        items: filteredApps.filter(m => m.category === 'academics'),
      },
      {
        id: 'operations',
        title: 'Daily Operations & Attendance',
        khmerTitle: 'ប្រតិបត្តិការ និងការស្រង់វត្តមាន',
        subtitle: 'Class presence tracking, automated alerts & attendance center',
        khmerSubtitle: 'ស្រង់វត្តមានសិស្សប្រចាំថ្ងៃ ការជូនដំណឹង និងស្ថិតិវត្តមាន',
        icon: LayoutGrid,
        color: 'text-emerald-600 dark:text-emerald-400',
        items: filteredApps.filter(m => m.category === 'operations'),
      },
      {
        id: 'reports',
        title: 'Reports, Analytics & Certificates Hub',
        khmerTitle: 'មជ្ឈមណ្ឌលរបាយការណ៍ វិភាគពិន្ទុ និងសូដីយប័ត្រ',
        subtitle: 'Transcripts, report cards, score analytics & certificate studio',
        khmerSubtitle: 'ចេញសៀវភៅតាមដាន វិភាគពិន្ទុ របាយការណ៍ប្រចាំខែ និងបង្កើតប័ណ្ណសរសើរ',
        icon: BarChart3,
        color: 'text-amber-600 dark:text-amber-400',
        items: filteredApps.filter(m => m.category === 'reports'),
      },
      {
        id: 'settings',
        title: 'School Administrative Settings',
        khmerTitle: 'ការកំណត់សាលារៀន និងប្រព័ន្ធ',
        subtitle: 'Academic year sessions, school profile, and platform config',
        khmerSubtitle: 'គ្រប់គ្រងឆ្នាំសិក្សា ប្រវត្តិរូបសាលា និងការកំណត់ប្រព័ន្ធ',
        icon: Settings,
        color: 'text-slate-600 dark:text-slate-400',
        items: filteredApps.filter(m => m.category === 'settings'),
      },
    ];

    if (activeCategory === 'all') return raw.filter(g => g.items.length > 0);
    return raw.filter(g => g.id === activeCategory && g.items.length > 0);
  }, [filteredApps, activeCategory]);



  const scrollHorizontal = (dir: 'left' | 'right') => {
    if (horizontalScrollRef.current) horizontalScrollRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#111113] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {isKhmer ? 'កំពុងផ្ទុក...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  const schoolName = school?.name || 'Stunity Admin';
  const firstName = user?.firstName || 'Admin';

  return (
    <div className="flex h-screen bg-[#f5f5f7] dark:bg-[#111113] overflow-hidden">

      {/* ════════════════════════════════════════════════════
          LEFT SIDEBAR — Mac App Store Navigation (w-64 = 256px, matches UnifiedNavigation)
      ════════════════════════════════════════════════════ */}
      <aside className="flex flex-col w-64 flex-shrink-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-full">

        {/* Stunity Platform Branding */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img src="/Stunity.png" alt="Stunity Logo" className="h-7 w-auto object-contain" />
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50">
                Platform
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរក...' : 'Search...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[12px] font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all border-0"
            />
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {sideNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSideNav === item.id;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="truncate">{isKhmer ? item.khmer : item.label}</span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="pt-3 pb-1 px-3">
            <div className="border-t border-slate-200 dark:border-slate-800" />
          </div>

          {/* Language toggle */}
          <button
            onClick={() => router.push(locale === 'km' ? '/en/discover' : '/km/discover')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span>{locale === 'km' ? 'English' : 'ភាសាខ្មែរ'}</span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            <span>{theme === 'dark' ? (isKhmer ? 'ពន្លឺ' : 'Light Mode') : (isKhmer ? 'ងងឹត' : 'Dark Mode')}</span>
          </button>
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow">
              {firstName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate">{firstName}</p>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">{activeYear?.name || '—'}</p>
            </div>
            <button
              onClick={handleLogout}
              title={isKhmer ? 'ចាកចេញ' : 'Logout'}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════
          MAIN CONTENT — Full Screen App Store
      ════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Landing Page Inspired Top Navbar Header */}
        <header className="flex-shrink-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-20">
          <div className="px-6 h-[54px] flex items-center justify-between gap-4">
            {/* Title & Breadcrumb */}
            <div className="flex items-center gap-2 text-[13px] font-bold">
              <span className="text-slate-400 font-medium hidden sm:inline">Stunity Enterprise</span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {activeSideNav === 'discover' && (isKhmer ? 'ស្វែងរកមុខងារ' : 'Discover Platform')}
                {activeSideNav === 'people' && (isKhmer ? 'សិស្ស និងបុគ្គលិក' : 'People & Staff')}
                {activeSideNav === 'academics' && (isKhmer ? 'ការសិក្សា' : 'Academics')}
                {activeSideNav === 'operations' && (isKhmer ? 'ប្រតិបត្តិការ' : 'Operations')}
                {activeSideNav === 'reports' && (isKhmer ? 'របាយការណ៍' : 'Reports & Analytics')}
                {activeSideNav === 'settings' && (isKhmer ? 'ការកំណត់' : 'Settings')}
              </span>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-3">
              {/* System Platform Status */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isKhmer ? 'ប្រព័ន្ធ Cloud ដំណើរការ' : 'Stunity Cloud 2.0'}</span>
              </div>

              {/* Minimalist Landing Language Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full text-xs font-semibold border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => router.push('/en/discover')}
                  className={`px-2.5 py-0.5 rounded-full transition-all duration-200 text-[11px] ${
                    !isKhmer ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/km/discover')}
                  className={`px-2.5 py-0.5 rounded-full transition-all duration-200 text-[11px] ${
                    isKhmer ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  KM
                </button>
              </div>

              {/* Go to Dashboard Shortcut */}
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[12px] font-bold shadow-md shadow-blue-500/20 transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isKhmer ? 'ចូល Dashboard' : 'Full Dashboard'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-950">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8 space-y-10">

            {/* ── EXACT MAC APP STORE FEATURED CARDS SECTION ─────────────── */}
            {(activeCategory === 'all') && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {isKhmer ? 'មុខងារអប់រំឆ្នើម និងប្រព័ន្ធប្រតិបត្តិការ' : 'Essential School OS Applications'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Featured Card 1 — Student Directory */}
                  <AnimatedContent animation="slide-up" delay={60}>
                    <div
                      onClick={() => router.push(`/${locale}/students`)}
                      className="group cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200/60 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                        <img
                          src="/images/discover/student_hub_banner.jpg"
                          alt="Student Hub"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      </div>
                      <div className="mt-3">
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                          {isKhmer ? 'គ្រប់គ្រងសិស្ស' : 'STUDENT HUB'}
                        </p>
                        <h3 className="text-[17px] font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-0.5">
                          {isKhmer ? 'ប្រព័ន្ធគ្រប់គ្រង និងចុះឈ្មោះសិស្ស' : 'Smart Student Directory'}
                        </h3>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 line-clamp-2">
                          {isKhmer ? 'គ្រប់គ្រងបញ្ជីឈ្មោះ ចុះឈ្មោះ និងប្រវត្តិរូបសិស្សឌីជីថល។' : 'Digital profiles, enrolment management, and student history.'}
                        </p>
                      </div>
                    </div>
                  </AnimatedContent>

                  {/* Featured Card 2 — Attendance Command Center */}
                  <AnimatedContent animation="slide-up" delay={100}>
                    <div
                      onClick={() => router.push(`/${locale}/attendance/mark`)}
                      className="group cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200/60 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                        <img
                          src="/images/discover/attendance_hub_banner.jpg"
                          alt="Attendance Hub"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      </div>
                      <div className="mt-3">
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                          {isKhmer ? 'ប្រតិបត្តិការប្រចាំថ្ងៃ' : 'DAILY OPERATIONS'}
                        </p>
                        <h3 className="text-[17px] font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-0.5">
                          {isKhmer ? 'មជ្ឈមណ្ឌលស្រង់វត្តមានស្វ័យប្រវត្តិ' : 'Attendance Command Center'}
                        </h3>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 line-clamp-2">
                          {isKhmer ? 'ស្រង់វត្តមានសិស្សប្រចាំថ្ងៃ ជាមួយការជូនដំណឹងទៅអាណាព្យាបាល។' : 'Daily presence tracking with instant guardian notifications.'}
                        </p>
                      </div>
                    </div>
                  </AnimatedContent>

                  {/* Featured Card 3 — Master Gradebook & Timetable */}
                  <AnimatedContent animation="slide-up" delay={140}>
                    <div
                      onClick={() => router.push(`/${locale}/grades/entry`)}
                      className="group cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200/60 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                        <img
                          src="/images/discover/academics_hub_banner.jpg"
                          alt="Academics Hub"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      </div>
                      <div className="mt-3">
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                          {isKhmer ? 'ការសិក្សា និងពិន្ទុ' : 'ACADEMIC WORKSPACE'}
                        </p>
                        <h3 className="text-[17px] font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-0.5">
                          {isKhmer ? 'សៀវភៅពិន្ទុ និងកាលវិភាគសិក្សា' : 'Master Gradebook & Timetable'}
                        </h3>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 line-clamp-2">
                          {isKhmer ? 'បញ្ចូលពិន្ទុប្រចាំខែ ឆមាស និងរៀបចំកាលវិភាគបង្រៀន។' : 'Exam score entry, GPA reports, and class timetable master.'}
                        </p>
                      </div>
                    </div>
                  </AnimatedContent>

                </div>
              </section>
            )}

            {/* ── CATEGORY PILLS ─────────────────────────────────────── */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setActiveSideNav(cat.id === 'all' ? 'discover' : cat.id); }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
                        : 'bg-white dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                    {isKhmer ? cat.khmerName : cat.name}
                  </button>
                );
              })}
            </div>

            {/* ── CATEGORIZED MODULE SECTIONS ─────────────────────────── */}
            <div className="space-y-8">
              {sectionGroups.map((group) => {
                const GroupIcon = group.icon;
                const rows: AppModuleItem[][] = [];
                for (let i = 0; i < group.items.length; i += 3) {
                  rows.push(group.items.slice(i, i + 3));
                }

                return (
                  <section key={group.id} className="space-y-3">
                    {/* Section Group Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-sm">
                          <GroupIcon className={`w-4 h-4 ${group.color}`} />
                        </div>
                        <div>
                          <h2 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                            {isKhmer ? group.khmerTitle : group.title}
                          </h2>
                          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {isKhmer ? group.khmerSubtitle : group.subtitle}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                        {group.items.length} {isKhmer ? 'មុខងារ' : 'Modules'}
                      </span>
                    </div>

                    {/* Section App Grid */}
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl overflow-hidden border border-slate-200/70 dark:border-gray-800/70 shadow-sm">
                      {rows.map((row, rowIdx) => (
                        <div key={rowIdx}>
                          {rowIdx > 0 && <div className="border-t border-slate-100 dark:border-gray-800/60 mx-4" />}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-slate-100 dark:divide-gray-800/60">
                            {row.map((app) => {
                              const Icon = app.icon;
                              return (
                                <div
                                  key={app.id}
                                  onClick={() => router.push(app.href)}
                                  className="group flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-all duration-150"
                                >
                                  <div className={`w-[48px] h-[48px] rounded-[14px] ${app.iconBg} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                                    <Icon className="w-5.5 h-5.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[12.5px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {isKhmer ? app.khmerTitle : app.title}
                                      </span>
                                      {app.badge && (
                                        <span className={`px-1.5 py-0.5 text-[8.5px] font-black uppercase rounded flex-shrink-0 ${app.badgeColor || 'bg-blue-100 text-blue-600'}`}>
                                          {isKhmer ? app.khmerBadge : app.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{isKhmer ? app.khmerSubtitle : app.subtitle}</p>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); router.push(app.href); }}
                                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-black text-[11px] hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all duration-200 shadow-sm"
                                  >
                                    {app.priceTag || 'OPEN'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              {filteredApps.length === 0 && (
                <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-16 text-center border border-slate-200/70 dark:border-gray-800/70">
                  <Search className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-[13px] font-semibold text-slate-400">{isKhmer ? 'រកមិនឃើញមុខងារនេះទេ' : 'No modules found'}</p>
                </div>
              )}
            </div>

            {/* ── SHOWCASE CARDS WITH 3D GRAPHIC BANNERS (horizontal scroll) ─────────────── */}
            {activeCategory === 'all' && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight">
                    {isKhmer ? 'ឧបករណ៍រដ្ឋបាលពិសេស' : 'The Latest Must-Have Admin Utilities'}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => scrollHorizontal('left')} className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shadow hover:bg-slate-50 transition-all">
                      <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                    <button onClick={() => scrollHorizontal('right')} className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shadow hover:bg-slate-50 transition-all">
                      <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>
                </div>

                <div ref={horizontalScrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {[
                    { 
                      href: `/${locale}/grades/reports`, 
                      image: '/images/discover/transcripts_banner.jpg',
                      accent: 'text-sky-400', 
                      icon: BarChart3, 
                      label: isKhmer ? 'របាយការណ៍' : 'ANALYTICS & CARDS', 
                      title: isKhmer ? 'សៀវភៅតាមដាន & GPA' : 'Transcripts & Grade Book', 
                      desc: isKhmer ? 'ចេញសៀវភៅតាមដានប្រចាំខែ' : 'Generate complete grade sheets and report cards.' 
                    },
                    { 
                      href: `/${locale}/classes`, 
                      image: '/images/discover/class_builder_banner.jpg',
                      accent: 'text-emerald-400', 
                      icon: BookOpen, 
                      label: isKhmer ? 'ថ្នាក់រៀន' : 'CLASS BUILDER', 
                      title: isKhmer ? 'ថ្នាក់ & បន្ទប់សិក្សា' : 'Grade Levels & Sections', 
                      desc: isKhmer ? 'ចំណុះថ្នាក់ គ្រូប្រចាំ' : 'Organize homeroom assignments and capacity.' 
                    },
                    { 
                      href: `/${locale}/timetable`, 
                      image: '/images/discover/timetable_banner.jpg',
                      accent: 'text-violet-400', 
                      icon: Clock, 
                      label: isKhmer ? 'ពេលវេលា' : 'SCHEDULE MASTER', 
                      title: isKhmer ? 'កាលវិភាគ & ម៉ោង' : 'Master Timetable', 
                      desc: isKhmer ? 'ម៉ោងបង្រៀន ប្រចាំថ្ងៃ' : 'Configure shifts, periods and daily schedules.' 
                    },
                    { 
                      href: `/${locale}/settings/academic-years`, 
                      image: '/images/discover/config_banner.jpg',
                      accent: 'text-indigo-400', 
                      icon: Settings, 
                      label: isKhmer ? 'ឆ្នាំសិក្សា' : 'ACADEMIC SESSION', 
                      title: isKhmer ? 'ការកំណត់ប្រព័ន្ធ' : 'School System Config', 
                      desc: isKhmer ? 'ព័ត៌មានសាលា ឆ្នាំសិក្សា' : 'Manage school profile and academic session.' 
                    },
                    { 
                      href: `/${locale}/attendance/dashboard`, 
                      image: '/images/discover/attendance_pro_banner.jpg',
                      accent: 'text-rose-400', 
                      icon: LayoutGrid, 
                      label: isKhmer ? 'វត្តមាន' : 'ATTENDANCE PRO', 
                      title: isKhmer ? 'មជ្ឈមណ្ឌលវត្តមាន' : 'Attendance Command Center', 
                      desc: isKhmer ? 'ស្ថិតិវត្តមានទូទាំងសាលា' : 'Real-time school-wide attendance stats.' 
                    },
                  ].map((card, i) => {
                    const CardIcon = card.icon;
                    return (
                      <AnimatedContent key={i} animation="slide-up" delay={100 + i * 40}>
                        <div
                          onClick={() => router.push(card.href)}
                          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 text-white flex-shrink-0 w-[270px] h-60 p-5 flex flex-col justify-between shadow-lg transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl snap-start border border-white/10"
                        >
                          {/* Card Graphic Image Background with Gradient Overlay */}
                          <div className="absolute inset-0 z-0">
                            <img src={card.image} alt={card.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
                          </div>

                          {/* Card Top Header */}
                          <div className="relative z-10 flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-wider ${card.accent}`}>
                              {card.label}
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow">
                              <CardIcon className={`w-4 h-4 ${card.accent}`} />
                            </div>
                          </div>

                          {/* Card Footer Content */}
                          <div className="relative z-10 space-y-1">
                            <h3 className="text-[15px] font-bold text-white leading-snug group-hover:text-cyan-300 transition-colors">
                              {card.title}
                            </h3>
                            <p className="text-[11px] text-slate-300/90 leading-tight line-clamp-2">{card.desc}</p>
                            <div className={`pt-1 flex items-center gap-1 ${card.accent} text-[11px] font-bold`}>
                              <span>{isKhmer ? 'ចូលមើល' : 'Explore'}</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </AnimatedContent>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── "TRY THESE FAVOURITES" ────────────────────────────── */}
            {activeCategory === 'all' && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight">
                    {isKhmer ? 'ព្យាយាមមុខងារទាំងនេះ' : 'Try These Admin Favourites'}
                  </h2>
                  <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => setActiveCategory('all')}>
                    {isKhmer ? 'មើលទាំងអស់' : 'See All'}
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {[appModules[1], appModules[2], appModules[4], appModules[5], appModules[9], appModules[11]].filter(Boolean).map((app) => {
                    const Icon = app.icon;
                    return (
                      <div
                        key={app.id}
                        onClick={() => router.push(app.href)}
                        className="group flex-shrink-0 flex items-center gap-3 p-3 pr-4 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200/70 dark:border-gray-800/70 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02] min-w-[200px]"
                      >
                        <div className={`w-10 h-10 rounded-[12px] ${app.iconBg} flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                            {isKhmer ? app.khmerTitle : app.title}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{isKhmer ? app.khmerSubtitle : app.subtitle}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(app.href); }}
                          className="flex-shrink-0 px-3 py-1 rounded-full bg-slate-100 dark:bg-gray-800 text-blue-600 font-black text-[10px] hover:bg-blue-600 hover:text-white transition-all"
                        >
                          {app.priceTag || 'GET'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}



          </div>
        </div>
      </div>
    </div>
  );
}
