'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useTransition, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  GraduationCap,
  BookOpen,
  Bell,
  Search,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Users,
  Calendar,
  BarChart3,
  FileText,
  TrendingUp,
  ClipboardList,
  ClipboardCheck,
  MessageCircle,
  ChevronRight,
  Ticket,
  MapPin,
  Loader2,
  Shield,
  Archive,
  UserX,
  Moon,
  Sun,
  Gamepad2,
  LayoutDashboard,
  Globe,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import AcademicYearSelector from './AcademicYearSelector';
import LanguageSwitcher from './LanguageSwitcher';
import { prefetchAdminConversations, prefetchMessageParents } from '@/hooks/useAdminMessaging';
import { prefetchAcademicYears } from '@/hooks/useAcademicYears';
import { prefetchAttendanceSummary } from '@/hooks/useAttendanceSummary';
import { prefetchParents } from '@/hooks/useParents';
import { prefetchSchoolLocations } from '@/hooks/useSchoolLocations';
import { prefetchStudents } from '@/hooks/useStudents';
import { prefetchTeachers } from '@/hooks/useTeachers';
import { prefetchClasses } from '@/hooks/useClasses';
import { prefetchSubjects } from '@/hooks/useSubjects';
import { TokenManager } from '@/lib/api/auth';
import {
  ATTENDANCE_SERVICE_URL,
  AUTH_SERVICE_URL,
  CLASS_SERVICE_URL,
  FEED_SERVICE_URL,
  GRADE_SERVICE_URL,
  LEARN_SERVICE_URL,
  MESSAGING_SERVICE_URL,
  SCHOOL_SERVICE_URL,
  STUDENT_SERVICE_URL,
  SUBJECT_SERVICE_URL,
  TEACHER_SERVICE_URL,
} from '@/lib/api/config';
import { writePersistentCache } from '@/lib/persistent-cache';
import { buildRouteDataCacheKey, writeRouteDataCache } from '@/lib/route-data-cache';
import { formatEducationModelLabel } from '@/lib/educationModel';
import { isSchoolAttendanceAdminRole } from '@/lib/permissions/schoolAttendance';

interface UnifiedNavProps {
  user?: any;
  school?: any;
  onLogout?: () => void;
}

type SchoolPrefetchType =
  | 'dashboard'
  | 'students'
  | 'parents'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'messages'
  | 'locations'
  | 'academic-years'
  | 'attendance-dashboard'
  | 'grades-core'
  | 'attendance-core'
  | 'failed-students'
  | 'year-end'
  | 'timetable-core'
  | null;
type SchoolSkeletonType = 'table' | 'cards' | 'form' | 'dashboard';

interface SchoolMenuItem {
  name: string;
  icon: any;
  path: string;
  prefetch: SchoolPrefetchType;
  skeleton: SchoolSkeletonType;
}

interface SchoolMenuSection {
  label: string;
  items: SchoolMenuItem[];
}

interface CachedLearnPayload {
  courses: any[];
  enrolledCourses: any[];
  createdCourses: any[];
  learningPaths: any[];
  subjects: any[];
  myGrades: any[];
  stats: {
    enrolledCourses: number;
    completedCourses: number;
    hoursLearned: number;
    currentStreak: number;
    certificates: number;
  };
}

export default function UnifiedNavigation({ user, school, onLogout }: UnifiedNavProps) {
    const autoT = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  const locale = pathname.split('/')[1] || 'en';
  const [, startTransition] = useTransition();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeHover, setActiveHover] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [transitionSkeleton, setTransitionSkeleton] = useState<{ type: SchoolSkeletonType; hasSidebar: boolean } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const warmedPrimaryNavKeyRef = useRef<string | null>(null);
  const warmedSchoolDataKeyRef = useRef<string | null>(null);
  const navFeedbackDedupRef = useRef<{ path: string; at: number } | null>(null);
  const navFeedbackTimeoutRef = useRef<number | null>(null);

  // Sync search query with URL
  useEffect(() => {
    const q = searchParams?.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      startTransition(() => {
        router.push(`/${locale}/search?q=${encodeURIComponent(searchQuery.trim())}`);
      });
    }
  };

  // Optimistic navigation - track clicked path for instant feedback
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  // Clear optimistic path when pathname changes (navigation completed)
  useEffect(() => {
    setOptimisticPath(null);
    setTransitionSkeleton(null);
  }, [pathname]);

  // Fail-safe: clear optimistic nav feedback if route transition stalls.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (navFeedbackTimeoutRef.current) {
      window.clearTimeout(navFeedbackTimeoutRef.current);
      navFeedbackTimeoutRef.current = null;
    }

    if (!optimisticPath || pathname === optimisticPath) return;

    navFeedbackTimeoutRef.current = window.setTimeout(() => {
      setOptimisticPath(null);
      setTransitionSkeleton(null);
      navFeedbackTimeoutRef.current = null;
    }, 4000);

    return () => {
      if (navFeedbackTimeoutRef.current) {
        window.clearTimeout(navFeedbackTimeoutRef.current);
        navFeedbackTimeoutRef.current = null;
      }
    };
  }, [optimisticPath, pathname]);

  // Handle scroll for navbar background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoize context calculations for better performance
  const isSchoolContext = useMemo(() =>
    pathname.includes('/dashboard') ||
    pathname.includes('/students') ||
    pathname.includes('/parents') ||
    pathname.includes('/teachers') ||
    pathname.includes('/classes') ||
    pathname.includes('/grades') ||
    pathname.includes('/attendance') ||
    pathname.includes('/timetable') ||
    pathname.includes('/settings') ||
    pathname.includes('/reports') ||
    pathname.includes('/admin')  // Added for admin pages like claim-codes
    , [pathname]);

  const isFeedContext = useMemo(() => pathname.includes('/feed'), [pathname]);
  const isClubsContext = useMemo(() => pathname.includes('/clubs'), [pathname]);
  const isEventsContext = useMemo(() => pathname.includes('/events'), [pathname]);
  const isLiveQuizContext = useMemo(() => pathname.includes('/live-quiz'), [pathname]);
  const isLearnContext = useMemo(() => pathname.includes('/learn'), [pathname]);
  const isAdminPanelContext = useMemo(
    () => pathname.includes('/admin') || pathname.includes('/super-admin'),
    [pathname]
  );
  const educationModelLabel = useMemo(
    () => formatEducationModelLabel(school?.educationModel),
    [school?.educationModel]
  );
  const showEducationModel = Boolean(school?.id);

  // Optimistic active state - uses pending path if navigating, otherwise actual path
  const getOptimisticActive = useCallback((itemPath: string, actualActive: boolean) => {
    if (optimisticPath) {
      // Check if this item's path matches the optimistic path
      return optimisticPath.startsWith(itemPath) || itemPath.startsWith(optimisticPath);
    }
    return actualActive;
  }, [optimisticPath]);

  // Handle optimistic navigation with instant visual feedback
  const normalizeWarmClub = useCallback((club: any) => {
    const resolvedType = club?.clubType || club?.type || 'CASUAL_STUDY_GROUP';
    const resolvedPrivacy = club?.privacy || club?.mode || 'PUBLIC';

    return {
      ...club,
      clubType: resolvedType,
      privacy: resolvedPrivacy,
    };
  }, []);

  // Memoized nav items to prevent re-creation on every render
  const navItems = useMemo(() => [
    {
      name: 'Feed',
      icon: Home,
      path: `/${locale}/feed`,
      active: isFeedContext,
      badge: null,
      prefetch: null as SchoolPrefetchType,
    },
    {
      name: 'Clubs',
      icon: Users,
      path: `/${locale}/clubs`,
      active: isClubsContext,
      badge: null,
      prefetch: null as SchoolPrefetchType,
    },
    {
      name: 'Events',
      icon: Calendar,
      path: `/${locale}/events`,
      active: isEventsContext,
      badge: null,
      prefetch: null as SchoolPrefetchType,
    },
    {
      name: 'Live Quiz',
      icon: Gamepad2,
      path: `/${locale}/live-quiz/join`,
      active: isLiveQuizContext,
      badge: null,
      prefetch: null as SchoolPrefetchType,
    },
    {
      name: 'Learn',
      icon: BookOpen,
      path: `/${locale}/learn`,
      active: isLearnContext,
      badge: null,
      prefetch: null as SchoolPrefetchType,
    },
    {
      name: 'School',
      icon: GraduationCap,
      path: `/${locale}/dashboard`,
      active: isSchoolContext,
      badge: null,
      prefetch: null as SchoolPrefetchType,
    },
  ].filter(item => {
    // If we are in school management context, only show Feed and School
    // This matches the user's request to simplify the menu in admin pages
    if (isSchoolContext) {
      return item.name === 'Feed' || item.name === 'School';
    }

    // Hide 'School' menu if the user is not part of any school
    if (item.name === 'School' && !school) {
      return false;
    }
    return true;
  }), [locale, isFeedContext, isClubsContext, isEventsContext, isLiveQuizContext, isSchoolContext, isLearnContext, school]);

  const canManageTranslations = Boolean(
    user?.isSuperAdmin ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN'
  );

  const canOpenAttendanceDashboard = isSchoolAttendanceAdminRole(user?.role);

  // Memoized school menu sections with grouped items
  const schoolMenuSections = useMemo<SchoolMenuSection[]>(() => [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', icon: BarChart3, path: `/${locale}/dashboard`, prefetch: 'dashboard', skeleton: 'dashboard' as const },
        { name: 'Messages', icon: MessageCircle, path: `/${locale}/dashboard/messages`, prefetch: 'messages', skeleton: 'table' as const },
      ],
    },
    {
      label: 'Academic',
      items: [
        { name: 'Students', icon: Users, path: `/${locale}/students`, prefetch: 'students', skeleton: 'table' as const },
        { name: 'Parents', icon: Users, path: `/${locale}/parents`, prefetch: 'parents', skeleton: 'table' as const },
        { name: 'Teachers', icon: User, path: `/${locale}/teachers`, prefetch: 'teachers', skeleton: 'table' as const },
        { name: 'Classes', icon: BookOpen, path: `/${locale}/classes`, prefetch: 'classes', skeleton: 'cards' as const },
        { name: 'Subjects', icon: BookOpen, path: `/${locale}/settings/subjects`, prefetch: 'subjects', skeleton: 'table' as const },
      ],
    },
    {
      label: 'Schedule',
      items: [
        { name: 'Timetable', icon: Calendar, path: `/${locale}/timetable`, prefetch: 'timetable-core', skeleton: 'cards' as const },
        { name: 'Master Timetable', icon: Calendar, path: `/${locale}/timetable/master`, prefetch: 'timetable-core', skeleton: 'table' as const },
      ],
    },
    {
      label: 'Grades & Attendance',
      items: [
        { name: 'Grade Entry', icon: ClipboardList, path: `/${locale}/grades/entry`, prefetch: 'grades-core', skeleton: 'table' as const },
        { name: 'Report Cards', icon: FileText, path: `/${locale}/grades/reports`, prefetch: 'grades-core', skeleton: 'table' as const },
        { name: 'Monthly Reports', icon: Calendar, path: `/${locale}/grades/monthly-report`, prefetch: 'grades-core', skeleton: 'table' as const },
        { name: 'Grade Analytics', icon: TrendingUp, path: `/${locale}/grades/analytics`, prefetch: 'grades-core', skeleton: 'dashboard' as const },
        ...(canOpenAttendanceDashboard
          ? [{ name: 'Attendance Dashboard', icon: BarChart3, path: `/${locale}/attendance/dashboard`, prefetch: 'attendance-dashboard' as const, skeleton: 'dashboard' as const }]
          : []),
        { name: 'Mark Attendance', icon: ClipboardCheck, path: `/${locale}/attendance/mark`, prefetch: 'attendance-core', skeleton: 'table' as const },
        { name: 'Attendance Reports', icon: ClipboardCheck, path: `/${locale}/attendance/reports`, prefetch: 'attendance-core', skeleton: 'table' as const },
      ],
    },
    {
      label: 'Year-End',
      items: [
        { name: 'Promotion', icon: TrendingUp, path: `/${locale}/settings/promotion`, prefetch: 'year-end', skeleton: 'table' as const },
        { name: 'Failed Students', icon: UserX, path: `/${locale}/settings/failed-students`, prefetch: 'failed-students', skeleton: 'table' as const },
        { name: 'Year-End Workflow', icon: Archive, path: `/${locale}/settings/year-end-workflow`, prefetch: 'year-end', skeleton: 'table' as const },
      ],
    },
    {
      label: 'School Setup',
      items: [
        { name: 'Claim Codes', icon: Ticket, path: `/${locale}/admin/claim-codes`, prefetch: null, skeleton: 'table' as const },
        { name: 'Campus Locations', icon: MapPin, path: `/${locale}/settings/locations`, prefetch: 'locations', skeleton: 'table' as const },
        { name: 'Settings', icon: Settings, path: `/${locale}/settings/academic-years`, prefetch: 'academic-years', skeleton: 'table' as const },
      ],
    },
    ...(canManageTranslations
      ? [{
        label: 'Platform',
        items: [
          { name: 'Language Management', icon: Globe, path: `/${locale}/super-admin/language`, prefetch: null, skeleton: 'table' as const },
        ],
      }]
      : []),
  ], [canManageTranslations, canOpenAttendanceDashboard, locale]);

  // Flatten for mobile menu compatibility
  const schoolMenuItems = useMemo(
    () => schoolMenuSections.flatMap((s) => s.items),
    [schoolMenuSections]
  );

  // Prefetch data on hover for instant navigation
  const handleLinkHover = useCallback((prefetchType: SchoolPrefetchType) => {
    if (!prefetchType) return;

    const selectedAcademicYearId =
      typeof window !== 'undefined' ? localStorage.getItem('selectedAcademicYearId') || undefined : undefined;

    switch (prefetchType) {
      case 'students':
        prefetchStudents({ page: 1, limit: 20, academicYearId: selectedAcademicYearId });
        break;
      case 'teachers':
        prefetchTeachers({ page: 1, limit: 20 });
        break;
      case 'parents':
        prefetchParents({ page: 1, limit: 20 });
        break;
      case 'messages':
        prefetchAdminConversations();
        prefetchMessageParents();
        break;
      case 'classes':
        prefetchClasses({ limit: 50, academicYearId: selectedAcademicYearId });
        break;
      case 'subjects':
        prefetchSubjects({ isActive: true, includeTeachers: true });
        break;
      case 'locations':
        prefetchSchoolLocations();
        break;
      case 'academic-years': {
        const { school } = TokenManager.getUserData();
        prefetchAcademicYears(school?.id);
        break;
      }
      case 'attendance-dashboard': {
        if (!canOpenAttendanceDashboard) break;
        const { school } = TokenManager.getUserData();
        prefetchAttendanceSummary(school?.id, 'month');
        break;
      }
      case 'grades-core': {
        const { school } = TokenManager.getUserData();
        prefetchAcademicYears(school?.id);
        prefetchClasses({ limit: 50, academicYearId: selectedAcademicYearId });
        prefetchSubjects({ isActive: true, includeTeachers: true });
        break;
      }
      case 'attendance-core': {
        const { school } = TokenManager.getUserData();
        prefetchAcademicYears(school?.id);
        prefetchClasses({ limit: 50, academicYearId: selectedAcademicYearId });
        prefetchSchoolLocations();
        break;
      }
      case 'failed-students': {
        const { school } = TokenManager.getUserData();
        prefetchAcademicYears(school?.id);
        prefetchStudents({ page: 1, limit: 500, academicYearId: selectedAcademicYearId });
        break;
      }
      case 'year-end': {
        const { school } = TokenManager.getUserData();
        prefetchAcademicYears(school?.id);
        break;
      }
      case 'timetable-core':
        prefetchTeachers({ page: 1, limit: 100 });
        prefetchClasses({ limit: 50, academicYearId: selectedAcademicYearId });
        prefetchSubjects({ isActive: true, includeTeachers: true });
        break;
      case 'dashboard': {
        const token = TokenManager.getAccessToken();
        const { school } = TokenManager.getUserData();
        const selectedAcademicYearId =
          typeof window !== 'undefined' ? localStorage.getItem('selectedAcademicYearId') || undefined : undefined;

        if (!token || !school?.id || !selectedAcademicYearId) break;

        fetch(`${SCHOOL_SERVICE_URL}/schools/${school.id}/academic-years/${selectedAcademicYearId}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(async (response) => {
            if (!response.ok) return;
            const data = await response.json();
            if (data?.success && data?.data) {
              writePersistentCache(`dashboard:year-stats:${school.id}:${selectedAcademicYearId}`, data.data);
            }
          })
          .catch(() => {});
        break;
      }
    }
  }, [canOpenAttendanceDashboard]);

  const primeRoute = useCallback((path: string, prefetchType: SchoolPrefetchType) => {
    router.prefetch(path);
    handleLinkHover(prefetchType);
  }, [handleLinkHover, router]);

  const beginNavigationFeedback = useCallback(
    (path: string, skeleton: SchoolSkeletonType | null, hasSidebar = true, prefetchType?: SchoolPrefetchType) => {
      const now = Date.now();
      const lastFeedback = navFeedbackDedupRef.current;
      if (lastFeedback && lastFeedback.path === path && now - lastFeedback.at < 350) {
        return;
      }
      navFeedbackDedupRef.current = { path, at: now };

      setOptimisticPath(path);
      setTransitionSkeleton(skeleton ? { type: skeleton, hasSidebar } : null);
      if (prefetchType) {
        primeRoute(path, prefetchType);
      } else {
        router.prefetch(path);
      }
    },
    [primeRoute, router]
  );

  const warmSchoolServices = useCallback(() => {
    if (typeof window === 'undefined') return;

    const warmedKey = 'stunity:school-services-warmed';
    if (sessionStorage.getItem(warmedKey) === 'true') return;

    sessionStorage.setItem(warmedKey, 'true');

    const healthUrls = [
      `${AUTH_SERVICE_URL}/health`,
      `${SCHOOL_SERVICE_URL}/health`,
      `${STUDENT_SERVICE_URL}/health`,
      `${TEACHER_SERVICE_URL}/health`,
      `${CLASS_SERVICE_URL}/health`,
      `${SUBJECT_SERVICE_URL}/health`,
      `${ATTENDANCE_SERVICE_URL}/health`,
      `${GRADE_SERVICE_URL}/health`,
      `${MESSAGING_SERVICE_URL}/health`,
    ];

    healthUrls.forEach((url) => {
      fetch(url, {
        method: 'GET',
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const primaryNavPaths = navItems
      .map((item) => item.path)
      .filter((path) => path !== pathname);
    const warmKey = primaryNavPaths.join('|');

    if (!warmKey || warmedPrimaryNavKeyRef.current === warmKey) return;

    const warmPrimaryRoutes = () => {
      primaryNavPaths.forEach((path) => router.prefetch(path));
      warmedPrimaryNavKeyRef.current = warmKey;
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(warmPrimaryRoutes, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmPrimaryRoutes, 200);
    return () => window.clearTimeout(timeoutId);
  }, [navItems, pathname, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id || isSchoolContext) return;

    const token = TokenManager.getAccessToken();
    if (!token) return;

    const sessionKey = `stunity:primary-nav-data-warmed:${user.id}`;
    if (sessionStorage.getItem(sessionKey) === 'true') return;

    sessionStorage.setItem(sessionKey, 'true');

    const headers = { Authorization: `Bearer ${token}` };
    const timedFetch = (url: string) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 6000);
      return fetch(url, { headers, signal: controller.signal })
        .finally(() => window.clearTimeout(timeoutId));
    };

    const warmPrimaryNavData = async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [
        myClubsRes,
        clubTypesRes,
        discoverClubsRes,
        eventsRes,
        upcomingEventsRes,
        coursesRes,
        enrolledCoursesRes,
        createdCoursesRes,
        learningPathsRes,
        learningStatsRes,
        subjectsRes,
        gradesRes,
      ] = await Promise.allSettled([
        timedFetch(`${FEED_SERVICE_URL}/clubs?limit=20`),
        timedFetch(`${FEED_SERVICE_URL}/clubs/types`),
        timedFetch(`${FEED_SERVICE_URL}/clubs/discover?limit=20`),
        timedFetch(`${FEED_SERVICE_URL}/calendar?limit=20&startAfter=${encodeURIComponent(startOfToday.toISOString())}`),
        timedFetch(`${FEED_SERVICE_URL}/calendar/upcoming?limit=5`),
        timedFetch(`${LEARN_SERVICE_URL}/courses`),
        timedFetch(`${LEARN_SERVICE_URL}/courses/my-courses`),
        timedFetch(`${LEARN_SERVICE_URL}/courses/my-created`),
        timedFetch(`${LEARN_SERVICE_URL}/learning-paths/paths`),
        timedFetch(`${LEARN_SERVICE_URL}/courses/stats/my-learning`),
        timedFetch(`${SUBJECT_SERVICE_URL}/subjects?isActive=true`),
        user.role === 'STUDENT'
          ? timedFetch(`${GRADE_SERVICE_URL}/grades/student/${user.id}`)
          : Promise.resolve(null),
      ]);

      const parseJson = async (result: PromiseSettledResult<Response | null>) => {
        if (result.status !== 'fulfilled' || !result.value || !result.value.ok) return null;
        try {
          return await result.value.json();
        } catch {
          return null;
        }
      };

      const [
        myClubsData,
        clubTypesData,
        discoverClubsData,
        eventsData,
        upcomingEventsData,
        coursesData,
        enrolledCoursesData,
        createdCoursesData,
        learningPathsData,
        learningStatsData,
        subjectsData,
        gradesData,
      ] = await Promise.all([
        parseJson(myClubsRes),
        parseJson(clubTypesRes),
        parseJson(discoverClubsRes),
        parseJson(eventsRes),
        parseJson(upcomingEventsRes),
        parseJson(coursesRes),
        parseJson(enrolledCoursesRes),
        parseJson(createdCoursesRes),
        parseJson(learningPathsRes),
        parseJson(learningStatsRes),
        parseJson(subjectsRes),
        parseJson(gradesRes),
      ]);

      if (myClubsData?.clubs) {
        writeRouteDataCache(
          buildRouteDataCacheKey('clubs', 'my'),
          myClubsData.clubs.map(normalizeWarmClub)
        );
      }
      if (clubTypesData) {
        writeRouteDataCache(buildRouteDataCacheKey('clubs', 'types'), clubTypesData);
      }
      if (discoverClubsData?.clubs) {
        writeRouteDataCache(
          buildRouteDataCacheKey('clubs', 'discover', 'all', 'all'),
          discoverClubsData.clubs.map(normalizeWarmClub)
        );
      }
      if (eventsData?.events) {
        writeRouteDataCache(
          buildRouteDataCacheKey('events', 'list', 'upcoming', 'all', 'all'),
          eventsData.events
        );
      }
      if (upcomingEventsData) {
        writeRouteDataCache(buildRouteDataCacheKey('events', 'upcoming'), upcomingEventsData);
      }

      writeRouteDataCache<CachedLearnPayload>(buildRouteDataCacheKey('learn', 'hub', user.id), {
        courses: coursesData?.courses || [],
        enrolledCourses: enrolledCoursesData?.courses || [],
        createdCourses: createdCoursesData?.courses || [],
        learningPaths: learningPathsData?.paths || [],
        subjects: Array.isArray(subjectsData) ? subjectsData : [],
        myGrades: gradesData?.grades || gradesData || [],
        stats: {
          enrolledCourses: Number(learningStatsData?.enrolledCourses ?? enrolledCoursesData?.courses?.length ?? 0),
          completedCourses: Number(learningStatsData?.completedCourses ?? enrolledCoursesData?.courses?.filter((course: any) => course.progress === 100).length ?? 0),
          hoursLearned: Number(learningStatsData?.hoursLearned ?? 28),
          currentStreak: Number(learningStatsData?.currentStreak ?? 7),
          certificates: 1,
        },
      });
    };

    const runWarmup = () => {
      warmPrimaryNavData().catch(() => {
        sessionStorage.removeItem(sessionKey);
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(runWarmup, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(runWarmup, 800);
    return () => window.clearTimeout(timeoutId);
  }, [isSchoolContext, normalizeWarmClub, user?.id, user?.role]);

  useEffect(() => {
    if (!isSchoolContext || isAdminPanelContext || typeof window === 'undefined') return;

    const selectedAcademicYearId = localStorage.getItem('selectedAcademicYearId') || 'all';
    const warmKey = `${pathname}:${selectedAcademicYearId}`;
    if (warmedSchoolDataKeyRef.current === warmKey) return;

    const warmSchoolData = () => {
      warmSchoolServices();
      schoolMenuItems.forEach((item) => router.prefetch(item.path));
      [...new Set(schoolMenuItems.map((item) => item.prefetch).filter(Boolean))].forEach((prefetchType) => {
        handleLinkHover(prefetchType as SchoolPrefetchType);
      });
      warmedSchoolDataKeyRef.current = warmKey;
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(warmSchoolData, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmSchoolData, 250);
    return () => window.clearTimeout(timeoutId);
  }, [handleLinkHover, isAdminPanelContext, isSchoolContext, pathname, router, schoolMenuItems, warmSchoolServices]);

  return (
    <>
      {/* Apple-inspired Navigation Bar */}
      <nav className={`
        sticky top-0 z-50 transition-all duration-300 ease-out
        ${scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-800/50'
          : 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800'
        }
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Logo & Main Nav */}
            <div className="flex items-center gap-10">
              {/* Logo */}
              <Link
                href={isSchoolContext ? `/${locale}/dashboard` : `/${locale}/feed`}
                prefetch={true}
                onClick={() => {
                  const targetPath = isSchoolContext ? `/${locale}/dashboard` : `/${locale}/feed`;
                  setOptimisticPath(targetPath);
                  setTransitionSkeleton(isSchoolContext ? { type: 'dashboard', hasSidebar: true } : { type: 'cards', hasSidebar: false });
                }}
                className="flex items-center gap-2 group relative"
                title={isSchoolContext ? "Go to Dashboard" : "Go to Feed"}
              >
                <img
                  src="/Stunity.png"
                  alt={autoT("auto.web.components_UnifiedNavigation.k_afe8796c")}
                  className="h-8 w-auto object-contain transition-all duration-200 group-hover:opacity-80"
                />
              </Link>

              {/* Main Navigation - Apple Style */}
              <div className="hidden md:flex items-center">
                {navItems.map((item) => {
                  const isActive = getOptimisticActive(item.path, item.active);
                  const isNavigating = optimisticPath === item.path && pathname !== item.path;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      prefetch={true}
                      onClick={() => {
                        // Escape valve: if this item is already stuck in navigating state, clear it
                        if (optimisticPath === item.path && pathname !== item.path) {
                          setOptimisticPath(null);
                          setTransitionSkeleton(null);
                          return;
                        }
                        const skeletonType = item.name === 'School' ? 'dashboard' : 'cards';
                        const hasSidebar = item.name === 'School';
                        beginNavigationFeedback(item.path, skeletonType, hasSidebar);
                      }}
                      onMouseEnter={() => router.prefetch(item.path)}
                      onFocus={() => router.prefetch(item.path)}
                      className="relative group px-4 py-2"
                    >
                      <span className={`
                        relative z-10 flex items-center gap-1.5 text-[13px] font-medium tracking-tight transition-colors duration-150
                        ${isActive
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                        }
                      `}>
                        {isNavigating && <Loader2 className="w-3 h-3 animate-spin" />}
                        {item.name}
                      </span>
                      {/* Active indicator - subtle underline */}
                      {isActive && (
                        <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-150" />
                      )}
                      {/* Hover indicator */}
                      <span className={`
                        absolute inset-0 rounded-lg bg-gray-100 dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150
                        ${isActive ? 'opacity-0 group-hover:opacity-0' : ''}
                      `} />
                      {/* Badge */}
                      {item.badge && (
                        <span className="absolute -top-0.5 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-[9px] font-semibold rounded-full uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Center Search - Expandable */}
            <div className={`
              hidden lg:flex items-center transition-all duration-300 ease-out
              ${searchFocused ? 'flex-1 max-w-xl mx-4' : 'w-64'}
            `}>
              <div className="relative w-full group">
                <Search className={`
                  absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200
                  ${searchFocused ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'}
                `} />
                <input
                  type="text"
                  placeholder={autoT("auto.web.components_UnifiedNavigation.k_1b8d4e99")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={handleSearchKeyDown}
                  className={`
                    w-full pl-9 pr-4 py-2 text-[13px] rounded-lg transition-all duration-200
                    bg-gray-100/80 dark:bg-gray-800/80 border border-transparent
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:bg-white dark:focus:bg-gray-800 focus:border-gray-200 dark:focus:border-gray-700
                    focus:ring-2 focus:ring-orange-500/20 focus:outline-none
                  `}
                />
                {searchFocused && (
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-200/80 dark:bg-gray-700 rounded">
                    <AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_7e99a5d5" />
                  </kbd>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Academic Year Selector (only in school context) */}
              {isSchoolContext && (
                <div className="hidden sm:block">
                  <AcademicYearSelector />
                </div>
              )}

              {/* Messages */}
              <Link
                href={`/${locale}/messages`}
                className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-all duration-200"
              >
                <MessageCircle className="w-[18px] h-[18px]" />
              </Link>

              {/* Dark/Light mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-all duration-200"
                title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-[18px] h-[18px]" />
                ) : (
                  <Moon className="w-[18px] h-[18px]" />
                )}
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-all duration-200">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>

              {/* Profile Menu */}
              <div className="relative ml-1" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`
                    flex items-center gap-2 p-1 rounded-full transition-all duration-200
                    ${profileMenuOpen
                      ? 'ring-2 ring-orange-500/30 bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-100/80 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm overflow-hidden">
                    {user?.profilePictureUrl ? (
                      <img src={user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </>
                    )}
                  </div>
                </button>

                {/* Profile Dropdown - Refined */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold shadow-md overflow-hidden">
                          {user?.profilePictureUrl ? (
                            <img src={user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{school?.name}</p>
                          {showEducationModel && (
                            <span className="mt-1 inline-flex rounded-full border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300">
                              {educationModelLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {(user?.isSuperAdmin || user?.role === 'SUPER_ADMIN') && (
                        <Link
                          href={`/${locale}/super-admin`}
                          prefetch={true}
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group"
                        >
                          <Shield className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                          <span className="flex-1"><AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_0fd43693" /></span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                        </Link>
                      )}
                      <Link
                        href={`/${locale}/profile/me`}
                        prefetch={true}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group"
                      >
                        <User className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <span className="flex-1"><AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_ed5c09ec" /></span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                      </Link>
                      <Link
                        href={`/${locale}/settings`}
                        prefetch={true}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group"
                      >
                        <Settings className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <span className="flex-1"><AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_980d81f0" /></span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-1 pb-0.5">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout?.();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span><AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_f4afa24e" /></span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden ml-1 p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-all duration-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Refined */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
            <div className="px-3 py-3 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = getOptimisticActive(item.path, item.active);
                const isNavigating = optimisticPath === item.path && pathname !== item.path;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    prefetch={true}
                    onClick={() => {
                      // Escape valve: if this item is already stuck in navigating state, clear it
                      if (optimisticPath === item.path && pathname !== item.path) {
                        setOptimisticPath(null);
                        setTransitionSkeleton(null);
                        setMobileMenuOpen(false);
                        return;
                      }
                      const skeletonType = item.name === 'School' ? 'dashboard' : 'cards';
                      const hasSidebar = item.name === 'School';
                      beginNavigationFeedback(item.path, skeletonType, hasSidebar);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-150
                      ${isActive
                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                      }
                    `}
                  >
                    {isNavigating ? (
                      <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                    ) : (
                      <Icon className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                    )}
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-[10px] font-semibold rounded-full uppercase">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-gray-300'}`} />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* School Context Sidebar - Clean, scannable */}
      {isSchoolContext && (
        <aside className="hidden lg:block fixed left-0 top-14 w-64 h-[calc(100vh-3.5rem)] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-y-auto z-40 transition-all duration-300">
          <div className="py-6 px-4 space-y-8">
            <div className="px-3">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                <AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_4a7c3579" />
              </p>
              {showEducationModel && (
                <p className="mt-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-900/70 dark:bg-blue-900/25 dark:text-blue-300">
                  {educationModelLabel}
                </p>
              )}
            </div>

            {schoolMenuSections.map((section) => (
              <div key={section.label} className="space-y-1.5">
                <p className="px-3 py-1 text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                  {section.label}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = optimisticPath ? optimisticPath === item.path : pathname === item.path;
                  const isNavigating = optimisticPath === item.path && pathname !== item.path;

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      prefetch={true}
                      onMouseEnter={() => primeRoute(item.path, item.prefetch)}
                      onFocus={() => primeRoute(item.path, item.prefetch)}
                      onClick={() => {
                        // Escape valve: if this item is already stuck in navigating state, clear it
                        if (optimisticPath === item.path && pathname !== item.path) {
                          setOptimisticPath(null);
                          setTransitionSkeleton(null);
                          return;
                        }
                        beginNavigationFeedback(item.path, item.skeleton, true, item.prefetch);
                      }}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300
                        ${isActive
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-blue-600' : ''}`} />
                      <span className="flex-1 truncate tracking-tight">{item.name}</span>
                      {isNavigating && (
                        <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin text-blue-500" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      )}
    </>
  );
}
