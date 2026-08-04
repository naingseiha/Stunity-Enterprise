"use client";

import { useTranslations } from "next-intl";
import { I18nText as AutoI18nText } from "@/components/i18n/I18nText";
import {
  useState,
  useTransition,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  TrendingUp,
  ClipboardList,
  ClipboardCheck,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Ticket,
  MapPin,
  Loader2,
  Shield,
  Archive,
  UserX,
  Moon,
  Sun,
  Gamepad2,
  Globe,
  School,
  Brain,
  PieChart,
  Briefcase,
  Clock3,
  FolderKanban,
  Compass,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import AcademicYearSelector from "./AcademicYearSelector";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  prefetchAdminConversations,
  prefetchMessageParents,
} from "@/hooks/useAdminMessaging";
import { prefetchAcademicYears } from "@/hooks/useAcademicYears";
import { prefetchAttendanceSummary } from "@/hooks/useAttendanceSummary";
import { prefetchParents } from "@/hooks/useParents";
import { prefetchSchoolLocations } from "@/hooks/useSchoolLocations";
import { prefetchStudents } from "@/hooks/useStudents";
import { prefetchTeachers } from "@/hooks/useTeachers";
import { prefetchClasses } from "@/hooks/useClasses";
import { prefetchSubjects } from "@/hooks/useSubjects";
import { TokenManager } from "@/lib/api/auth";
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
} from "@/lib/api/config";
import { writePersistentCache } from "@/lib/persistent-cache";
import {
  buildRouteDataCacheKey,
  writeRouteDataCache,
} from "@/lib/route-data-cache";
import { formatEducationModelLabel } from "@/lib/educationModel";
import { isSchoolAttendanceAdminRole } from "@/lib/permissions/schoolAttendance";

interface UnifiedNavProps {
  user?: any;
  school?: any;
  onLogout?: () => void;
}

type SchoolPrefetchType =
  | "dashboard"
  | "students"
  | "parents"
  | "teachers"
  | "classes"
  | "subjects"
  | "messages"
  | "locations"
  | "academic-years"
  | "attendance-dashboard"
  | "grades-core"
  | "attendance-core"
  | "failed-students"
  | "year-end"
  | "timetable-core"
  | null;
type SchoolSkeletonType = "table" | "cards" | "form" | "dashboard";

interface SchoolMenuItem {
  name: string;
  icon: any;
  path: string;
  prefetch: SchoolPrefetchType;
  skeleton: SchoolSkeletonType;
  activePaths?: string[];
}

interface SchoolMenuSection {
  key: string;
  label: string;
  icon: any;
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

export default function UnifiedNavigation({
  user,
  school,
  onLogout,
}: UnifiedNavProps) {
  const autoT = useTranslations();
  const tNav = useTranslations("navigation");
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1] || "en";
  const [, startTransition] = useTransition();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolMenuQuery, setSchoolMenuQuery] = useState("");
  const [expandedSchoolSections, setExpandedSchoolSections] = useState<
    Record<string, boolean>
  >({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [, setTransitionSkeleton] = useState<{
    type: SchoolSkeletonType;
    hasSidebar: boolean;
  } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const warmedPrimaryNavKeyRef = useRef<string | null>(null);
  const warmedSchoolDataKeyRef = useRef<string | null>(null);
  const navFeedbackDedupRef = useRef<{ path: string; at: number } | null>(null);
  const navFeedbackTimeoutRef = useRef<number | null>(null);

  // Sync search query with URL
  useEffect(() => {
    const q = searchParams?.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      startTransition(() => {
        router.push(
          `/${locale}/search?q=${encodeURIComponent(searchQuery.trim())}`,
        );
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
    if (typeof window === "undefined") return;

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
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Memoize context calculations for better performance
  const isSchoolContext = useMemo(
    () =>
      pathname.includes("/dashboard") ||
      pathname.includes("/students") ||
      pathname.includes("/admissions") ||
      pathname.includes("/people") ||
      pathname.includes("/parents") ||
      pathname.includes("/teachers") ||
      pathname.includes("/classes") ||
      pathname.includes("/grades") ||
      pathname.includes("/attendance") ||
      pathname.includes("/timetable") ||
      pathname.includes("/settings") ||
      pathname.includes("/reports") ||
      pathname.includes("/teacher/quizzes/analytics") ||
      pathname.includes("/discover") ||
      pathname.includes("/welcome") ||
      pathname.includes("/admin"), // Added for admin pages like claim-codes
    [pathname],
  );

  const isFeedContext = useMemo(() => pathname.includes("/feed"), [pathname]);
  const isClubsContext = useMemo(() => pathname.includes("/clubs"), [pathname]);
  const isEventsContext = useMemo(
    () => pathname.includes("/events"),
    [pathname],
  );
  const isLiveQuizContext = useMemo(
    () => pathname.includes("/live-quiz"),
    [pathname],
  );
  const isLearnContext = useMemo(() => pathname.includes("/learn"), [pathname]);
  const isAdminPanelContext = useMemo(
    () => pathname.includes("/admin") || pathname.includes("/super-admin"),
    [pathname],
  );
  const educationModelLabel = useMemo(
    () => formatEducationModelLabel(school?.educationModel),
    [school?.educationModel],
  );
  const showEducationModel = Boolean(school?.id);
  const schoolLogoUrl =
    school?.logoUrl || school?.logo || school?.imageUrl || null;

  // Optimistic active state - uses pending path if navigating, otherwise actual path
  const getOptimisticActive = useCallback(
    (itemPath: string, actualActive: boolean) => {
      if (optimisticPath) {
        // Check if this item's path matches the optimistic path
        return (
          optimisticPath.startsWith(itemPath) ||
          itemPath.startsWith(optimisticPath)
        );
      }
      return actualActive;
    },
    [optimisticPath],
  );

  // Handle optimistic navigation with instant visual feedback
  const normalizeWarmClub = useCallback((club: any) => {
    const resolvedType = club?.clubType || club?.type || "CASUAL_STUDY_GROUP";
    const resolvedPrivacy = club?.privacy || club?.mode || "PUBLIC";

    return {
      ...club,
      clubType: resolvedType,
      privacy: resolvedPrivacy,
    };
  }, []);

  // Memoized nav items to prevent re-creation on every render
  const navItems = useMemo(
    () =>
      [
        {
          key: "feed",
          name: tNav("items.feed"),
          icon: Home,
          path: `/${locale}/feed`,
          active: isFeedContext,
          badge: null,
          prefetch: null as SchoolPrefetchType,
        },
        {
          key: "clubs",
          name: tNav("items.clubs"),
          icon: Users,
          path: `/${locale}/clubs`,
          active: isClubsContext,
          badge: null,
          prefetch: null as SchoolPrefetchType,
        },
        {
          key: "events",
          name: tNav("items.events"),
          icon: Calendar,
          path: `/${locale}/events`,
          active: isEventsContext,
          badge: null,
          prefetch: null as SchoolPrefetchType,
        },
        {
          key: "liveQuiz",
          name: tNav("items.liveQuiz"),
          icon: Gamepad2,
          path: `/${locale}/live-quiz/join`,
          active: isLiveQuizContext,
          badge: null,
          prefetch: null as SchoolPrefetchType,
        },
        {
          key: "learn",
          name: tNav("items.learn"),
          icon: BookOpen,
          path: `/${locale}/learn`,
          active: isLearnContext,
          badge: null,
          prefetch: null as SchoolPrefetchType,
        },
        {
          key: "school",
          name: tNav("items.school"),
          icon: GraduationCap,
          path: `/${locale}/dashboard`,
          active: isSchoolContext,
          badge: null,
          prefetch: null as SchoolPrefetchType,
        },
      ].filter((item) => {
        // If we are in school management context, only show Feed and School
        if (isSchoolContext) {
          return item.key === "feed" || item.key === "school";
        }

        // Hide 'School' menu if the user is not part of any school
        if (item.key === "school" && !school) {
          return false;
        }
        return true;
      }),
    [
      locale,
      isFeedContext,
      isClubsContext,
      isEventsContext,
      isLiveQuizContext,
      isSchoolContext,
      isLearnContext,
      school,
      tNav,
    ],
  );

  // Translation management is mounted inside the super-admin workspace and
  // its route guard rejects school admins. Keep navigation aligned with that
  // authorization boundary so regular admins never see a dead Platform link.
  const canManageTranslations = Boolean(
    user?.isSuperAdmin || user?.role === "SUPER_ADMIN",
  );
  const canManageClaimCodes = Boolean(
    user?.isSuperAdmin ||
      ["ADMIN", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(user?.role || ""),
  );

  const canOpenAttendanceDashboard = isSchoolAttendanceAdminRole(user?.role);
  const canViewTeacherQuizAnalytics =
    ["TEACHER", "ADMIN", "STAFF", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(
      user?.role ?? "",
    ) || Boolean(user?.isSuperAdmin);

  const standaloneSchoolMenuItems = useMemo<SchoolMenuItem[]>(
    () => [
      {
        name: locale === 'km' ? "ទំព័រដើម" : "Discover",
        icon: Compass,
        path: `/${locale}/discover`,
        prefetch: null,
        skeleton: "dashboard",
      },
      {
        name: tNav("items.dashboard"),
        icon: BarChart3,
        path: `/${locale}/dashboard`,
        prefetch: "dashboard",
        skeleton: "dashboard",
      },
      {
        name: tNav("items.messages"),
        icon: MessageCircle,
        path: `/${locale}/dashboard/messages`,
        prefetch: "messages",
        skeleton: "table",
      },
    ],
    [locale, tNav],
  );

  // Discoverable hybrid IA: destinations stay directly accessible while
  // collapsible groups keep the sidebar compact.
  const schoolMenuSections = useMemo<SchoolMenuSection[]>(
    () => [
      {
        key: "people",
        label: tNav("sections.people"),
        icon: Users,
        items: [
          {
            name: tNav("items.students"),
            icon: Users,
            path: `/${locale}/students`,
            prefetch: "students",
            skeleton: "table" as const,
          },
          {
            name: tNav("items.admissions"),
            icon: ClipboardCheck,
            path: `/${locale}/admissions`,
            prefetch: null,
            skeleton: "table" as const,
          },
          {
            name: tNav("items.parents"),
            icon: Users,
            path: `/${locale}/parents`,
            prefetch: "parents",
            skeleton: "table" as const,
          },
          {
            name: tNav("items.teachers"),
            icon: User,
            path: `/${locale}/teachers`,
            prefetch: "teachers",
            skeleton: "table" as const,
          },
        ],
      },
      {
        key: "academic",
        label: tNav("sections.academic"),
        icon: GraduationCap,
        items: [
          {
            name: tNav("items.classes"),
            icon: BookOpen,
            path: `/${locale}/classes`,
            prefetch: "classes",
            skeleton: "cards" as const,
          },
          {
            name: tNav("items.subjects"),
            icon: BookOpen,
            path: `/${locale}/settings/subjects`,
            prefetch: "subjects",
            skeleton: "table" as const,
          },
          {
            name: tNav("items.timetable"),
            icon: Calendar,
            path: `/${locale}/timetable`,
            prefetch: "timetable-core",
            skeleton: "cards" as const,
          },
          {
            name: tNav("items.masterTimetable"),
            icon: Calendar,
            path: `/${locale}/timetable/master`,
            prefetch: "timetable-core",
            skeleton: "table" as const,
          },
          {
            name: tNav("items.gradeEntry"),
            icon: ClipboardList,
            path: `/${locale}/grades/entry`,
            prefetch: "grades-core",
            skeleton: "table" as const,
          },
        ],
      },
      {
        key: "attendance",
        label: tNav("sections.attendance"),
        icon: ClipboardCheck,
        items: [
          {
            name: tNav("items.markAttendance"),
            icon: ClipboardCheck,
            path: `/${locale}/attendance/mark`,
            prefetch: "attendance-core",
            skeleton: "table" as const,
          },
          {
            name: tNav("items.monthlyAttendanceEntry"),
            icon: ClipboardCheck,
            path: `/${locale}/attendance/monthly-entry`,
            prefetch: "attendance-core",
            skeleton: "table" as const,
          },
          ...(canOpenAttendanceDashboard
            ? [
                {
                  name: tNav("items.attendanceDashboard"),
                  icon: BarChart3,
                  path: `/${locale}/attendance/dashboard`,
                  prefetch: "attendance-dashboard" as const,
                  skeleton: "dashboard" as const,
                },
              ]
            : []),
          {
            name: tNav("items.attendanceReports"),
            icon: FolderKanban,
            path: `/${locale}/attendance/reports`,
            prefetch: "attendance-core",
            skeleton: "table" as const,
          },
        ],
      },
      {
        key: "insights",
        label: tNav("sections.insights"),
        icon: PieChart,
        items: [
          {
            name: tNav("items.reports"),
            icon: FolderKanban,
            path: `/${locale}/reports`,
            prefetch: "grades-core",
            skeleton: "dashboard" as const,
            activePaths: [
              `/${locale}/reports`,
              `/${locale}/grades/reports`,
              `/${locale}/grades/monthly-report`,
              `/${locale}/grades/analytics`,
            ],
          },
          ...(canViewTeacherQuizAnalytics
            ? [
                {
                  name: tNav("items.quizAnalytics"),
                  icon: Brain,
                  path: `/${locale}/teacher/quizzes/analytics`,
                  prefetch: null,
                  skeleton: "dashboard" as const,
                },
              ]
            : []),
        ],
      },
      {
        key: "yearEnd",
        label: tNav("sections.yearEnd"),
        icon: Clock3,
        items: [
          {
            name: tNav("items.yearEndWorkflow"),
            icon: Archive,
            path: `/${locale}/settings/year-end-workflow`,
            prefetch: "year-end",
            skeleton: "table" as const,
          },
          {
            name: tNav("items.promotion"),
            icon: TrendingUp,
            path: `/${locale}/settings/promotion`,
            prefetch: "year-end",
            skeleton: "table" as const,
          },
          {
            name: tNav("items.failedStudents"),
            icon: UserX,
            path: `/${locale}/settings/failed-students`,
            prefetch: "failed-students",
            skeleton: "table" as const,
          },
        ],
      },
      {
        key: "administration",
        label: tNav("sections.administration"),
        icon: Briefcase,
        items: [
          {
            name: tNav("items.academicYears"),
            icon: Calendar,
            path: `/${locale}/settings/academic-years`,
            prefetch: "academic-years",
            skeleton: "table" as const,
            activePaths: [`/${locale}/settings/academic-years`],
          },
          {
            name: tNav("items.schoolProfile"),
            icon: School,
            path: `/${locale}/settings/school-profile`,
            prefetch: null,
            skeleton: "form" as const,
          },
          {
            name: tNav("items.campusLocations"),
            icon: MapPin,
            path: `/${locale}/settings/locations`,
            prefetch: "locations",
            skeleton: "table" as const,
          },
          ...(canManageClaimCodes
            ? [
                {
                  name: tNav("items.claimCodes"),
                  icon: Ticket,
                  path: `/${locale}/admin/claim-codes`,
                  prefetch: null,
                  skeleton: "table" as const,
                },
              ]
            : []),
          ...(canOpenAttendanceDashboard
            ? [
                {
                  name: tNav("items.disciplineDelegations"),
                  icon: Shield,
                  path: `/${locale}/admin/discipline`,
                  prefetch: null,
                  skeleton: "table" as const,
                },
              ]
            : []),
        ],
      },
      ...(canManageTranslations
        ? [
            {
              key: "platform",
              label: tNav("sections.platform"),
              icon: Shield,
              items: [
                {
                  name: tNav("items.languageManagement"),
                  icon: Globe,
                  path: `/${locale}/super-admin/language`,
                  prefetch: null,
                  skeleton: "table" as const,
                },
              ],
            },
          ]
        : []),
    ],
    [
      canManageTranslations,
      canManageClaimCodes,
      canOpenAttendanceDashboard,
      canViewTeacherQuizAnalytics,
      locale,
      tNav,
    ],
  );

  const isSchoolItemActive = useCallback(
    (item: SchoolMenuItem) => {
      if (
        item.activePaths?.some((activePath) => pathname.startsWith(activePath))
      ) {
        return true;
      }
      return pathname === item.path;
    },
    [pathname],
  );

  const filteredSchoolMenuSections = useMemo(() => {
    const query = schoolMenuQuery.trim().toLocaleLowerCase();
    if (!query) return schoolMenuSections;

    return schoolMenuSections
      .map((section) => {
        const sectionMatches = section.label
          .toLocaleLowerCase()
          .includes(query);
        return {
          ...section,
          items: sectionMatches
            ? section.items
            : section.items.filter((item) =>
                item.name.toLocaleLowerCase().includes(query),
              ),
        };
      })
      .filter((section) => section.items.length > 0);
  }, [schoolMenuQuery, schoolMenuSections]);

  useEffect(() => {
    const activeSection = schoolMenuSections.find((section) =>
      section.items.some(isSchoolItemActive),
    );
    if (!activeSection) return;

    setExpandedSchoolSections((current) =>
      current[activeSection.key]
        ? current
        : { ...current, [activeSection.key]: true },
    );
  }, [isSchoolItemActive, schoolMenuSections]);

  const toggleSchoolSection = useCallback((sectionKey: string) => {
    setExpandedSchoolSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  }, []);

  // Flatten for mobile menu compatibility
  const schoolMenuItems = useMemo(
    () => [
      ...standaloneSchoolMenuItems,
      ...schoolMenuSections.flatMap((s) => s.items),
    ],
    [schoolMenuSections, standaloneSchoolMenuItems],
  );

  // Prefetch data on hover for instant navigation
  const handleLinkHover = useCallback(
    (prefetchType: SchoolPrefetchType) => {
      if (!prefetchType) return;

      const selectedAcademicYearId =
        typeof window !== "undefined"
          ? localStorage.getItem("selectedAcademicYearId") || undefined
          : undefined;

      switch (prefetchType) {
        case "students":
          prefetchStudents({
            page: 1,
            limit: 20,
            academicYearId: selectedAcademicYearId,
          });
          break;
        case "teachers":
          prefetchTeachers({ page: 1, limit: 20 });
          break;
        case "parents":
          prefetchParents({ page: 1, limit: 20 });
          break;
        case "messages":
          prefetchAdminConversations();
          prefetchMessageParents();
          break;
        case "classes":
          prefetchClasses({
            limit: 50,
            academicYearId: selectedAcademicYearId,
          });
          break;
        case "subjects":
          prefetchSubjects({ isActive: true, includeTeachers: true });
          break;
        case "locations":
          prefetchSchoolLocations();
          break;
        case "academic-years": {
          const { school } = TokenManager.getUserData();
          prefetchAcademicYears(school?.id);
          break;
        }
        case "attendance-dashboard": {
          if (!canOpenAttendanceDashboard) break;
          const { school } = TokenManager.getUserData();
          prefetchAttendanceSummary(school?.id, "month");
          break;
        }
        case "grades-core": {
          const { school } = TokenManager.getUserData();
          prefetchAcademicYears(school?.id);
          prefetchClasses({
            limit: 50,
            academicYearId: selectedAcademicYearId,
          });
          prefetchSubjects({ isActive: true, includeTeachers: true });
          break;
        }
        case "attendance-core": {
          const { school } = TokenManager.getUserData();
          prefetchAcademicYears(school?.id);
          prefetchClasses({
            limit: 50,
            academicYearId: selectedAcademicYearId,
          });
          prefetchSchoolLocations();
          break;
        }
        case "failed-students": {
          const { school } = TokenManager.getUserData();
          prefetchAcademicYears(school?.id);
          prefetchStudents({
            page: 1,
            limit: 500,
            academicYearId: selectedAcademicYearId,
          });
          break;
        }
        case "year-end": {
          const { school } = TokenManager.getUserData();
          prefetchAcademicYears(school?.id);
          break;
        }
        case "timetable-core":
          prefetchTeachers({ page: 1, limit: 100 });
          prefetchClasses({
            limit: 50,
            academicYearId: selectedAcademicYearId,
          });
          prefetchSubjects({ isActive: true, includeTeachers: true });
          break;
        case "dashboard": {
          const token = TokenManager.getAccessToken();
          const { school } = TokenManager.getUserData();
          const selectedAcademicYearId =
            typeof window !== "undefined"
              ? localStorage.getItem("selectedAcademicYearId") || undefined
              : undefined;

          if (!token || !school?.id || !selectedAcademicYearId) break;

          fetch(
            `${SCHOOL_SERVICE_URL}/schools/${school.id}/academic-years/${selectedAcademicYearId}/stats`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          )
            .then(async (response) => {
              if (!response.ok) return;
              const data = await response.json();
              if (data?.success && data?.data) {
                writePersistentCache(
                  `dashboard:year-stats:v2:${school.id}:${selectedAcademicYearId}`,
                  data.data,
                );
              }
            })
            .catch(() => {});
          break;
        }
      }
    },
    [canOpenAttendanceDashboard],
  );

  const primeRoute = useCallback(
    (path: string, prefetchType: SchoolPrefetchType) => {
      router.prefetch(path);
      handleLinkHover(prefetchType);
    },
    [handleLinkHover, router],
  );

  const beginNavigationFeedback = useCallback(
    (path: string, skeleton: SchoolSkeletonType | null, hasSidebar = true) => {
      const now = Date.now();
      const lastFeedback = navFeedbackDedupRef.current;
      if (
        lastFeedback &&
        lastFeedback.path === path &&
        now - lastFeedback.at < 350
      ) {
        return;
      }
      navFeedbackDedupRef.current = { path, at: now };

      setOptimisticPath(path);
      setTransitionSkeleton(skeleton ? { type: skeleton, hasSidebar } : null);
      router.prefetch(path);
    },
    [router],
  );

  const warmSchoolServices = useCallback(() => {
    if (typeof window === "undefined") return;

    const warmedKey = "stunity:school-services-warmed";
    if (sessionStorage.getItem(warmedKey) === "true") return;

    sessionStorage.setItem(warmedKey, "true");

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
        method: "GET",
        cache: "no-store",
        keepalive: true,
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const primaryNavPaths = navItems
      .map((item) => item.path)
      .filter((path) => path !== pathname);
    const warmKey = primaryNavPaths.join("|");

    if (!warmKey || warmedPrimaryNavKeyRef.current === warmKey) return;

    const warmPrimaryRoutes = () => {
      primaryNavPaths.forEach((path) => router.prefetch(path));
      warmedPrimaryNavKeyRef.current = warmKey;
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmPrimaryRoutes, {
        timeout: 1500,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmPrimaryRoutes, 200);
    return () => window.clearTimeout(timeoutId);
  }, [navItems, pathname, router]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id || isSchoolContext) return;

    const token = TokenManager.getAccessToken();
    if (!token) return;

    const sessionKey = `stunity:primary-nav-data-warmed:${user.id}`;
    if (sessionStorage.getItem(sessionKey) === "true") return;

    sessionStorage.setItem(sessionKey, "true");

    const headers = { Authorization: `Bearer ${token}` };
    const timedFetch = (url: string) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 6000);
      return fetch(url, { headers, signal: controller.signal }).finally(() =>
        window.clearTimeout(timeoutId),
      );
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
        timedFetch(
          `${FEED_SERVICE_URL}/calendar?limit=20&startAfter=${encodeURIComponent(startOfToday.toISOString())}`,
        ),
        timedFetch(`${FEED_SERVICE_URL}/calendar/upcoming?limit=5`),
        timedFetch(`${LEARN_SERVICE_URL}/courses`),
        timedFetch(`${LEARN_SERVICE_URL}/courses/my-courses`),
        timedFetch(`${LEARN_SERVICE_URL}/courses/my-created`),
        timedFetch(`${LEARN_SERVICE_URL}/learning-paths/paths`),
        timedFetch(`${LEARN_SERVICE_URL}/courses/stats/my-learning`),
        timedFetch(`${SUBJECT_SERVICE_URL}/subjects?isActive=true`),
        user.role === "STUDENT"
          ? timedFetch(`${GRADE_SERVICE_URL}/grades/student/${user.id}`)
          : Promise.resolve(null),
      ]);

      const parseJson = async (
        result: PromiseSettledResult<Response | null>,
      ) => {
        if (result.status !== "fulfilled" || !result.value || !result.value.ok)
          return null;
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
          buildRouteDataCacheKey("clubs", "my"),
          myClubsData.clubs.map(normalizeWarmClub),
        );
      }
      if (clubTypesData) {
        writeRouteDataCache(
          buildRouteDataCacheKey("clubs", "types"),
          clubTypesData,
        );
      }
      if (discoverClubsData?.clubs) {
        writeRouteDataCache(
          buildRouteDataCacheKey("clubs", "discover", "all", "all"),
          discoverClubsData.clubs.map(normalizeWarmClub),
        );
      }
      if (eventsData?.events) {
        writeRouteDataCache(
          buildRouteDataCacheKey("events", "list", "upcoming", "all", "all"),
          eventsData.events,
        );
      }
      if (upcomingEventsData) {
        writeRouteDataCache(
          buildRouteDataCacheKey("events", "upcoming"),
          upcomingEventsData,
        );
      }

      writeRouteDataCache<CachedLearnPayload>(
        buildRouteDataCacheKey("learn", "hub", user.id),
        {
          courses: coursesData?.courses || [],
          enrolledCourses: enrolledCoursesData?.courses || [],
          createdCourses: createdCoursesData?.courses || [],
          learningPaths: learningPathsData?.paths || [],
          subjects: Array.isArray(subjectsData) ? subjectsData : [],
          myGrades: gradesData?.grades || gradesData || [],
          stats: {
            enrolledCourses: Number(
              learningStatsData?.enrolledCourses ??
                enrolledCoursesData?.courses?.length ??
                0,
            ),
            completedCourses: Number(
              learningStatsData?.completedCourses ??
                enrolledCoursesData?.courses?.filter(
                  (course: any) => course.progress === 100,
                ).length ??
                0,
            ),
            hoursLearned: Number(learningStatsData?.hoursLearned ?? 28),
            currentStreak: Number(learningStatsData?.currentStreak ?? 7),
            certificates: 1,
          },
        },
      );
    };

    const runWarmup = () => {
      warmPrimaryNavData().catch(() => {
        sessionStorage.removeItem(sessionKey);
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(runWarmup, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(runWarmup, 800);
    return () => window.clearTimeout(timeoutId);
  }, [isSchoolContext, normalizeWarmClub, user?.id, user?.role]);

  useEffect(() => {
    if (
      !isSchoolContext ||
      isAdminPanelContext ||
      typeof window === "undefined"
    )
      return;

    const selectedAcademicYearId =
      localStorage.getItem("selectedAcademicYearId") || "all";
    const warmKey = `${pathname}:${selectedAcademicYearId}`;
    if (warmedSchoolDataKeyRef.current === warmKey) return;

    const warmSchoolData = () => {
      warmSchoolServices();
      schoolMenuItems.forEach((item) => router.prefetch(item.path));
      warmedSchoolDataKeyRef.current = warmKey;
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmSchoolData, {
        timeout: 1200,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmSchoolData, 250);
    return () => window.clearTimeout(timeoutId);
  }, [
    handleLinkHover,
    isAdminPanelContext,
    isSchoolContext,
    pathname,
    router,
    schoolMenuItems,
    warmSchoolServices,
  ]);

  return (
    <>
      {/* Flat, Apple-inspired application menubar */}
      <nav
        className={`
        kh-navigation-font sticky top-0 z-50 border-b transition-colors duration-200
        ${
          scrolled
            ? "border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85"
            : "border-slate-200/70 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
        }
      `}
      >
        <div className="mx-auto max-w-[1440px] px-3 sm:px-5 lg:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            {/* Logo & Main Nav */}
            <div className="flex min-w-0 items-center gap-3 xl:gap-6">
              {/* Logo */}
              <Link
                href={
                  isSchoolContext ? `/${locale}/dashboard` : `/${locale}/feed`
                }
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  const targetPath = isSchoolContext
                    ? `/${locale}/dashboard`
                    : `/${locale}/feed`;
                  setOptimisticPath(targetPath);
                  setTransitionSkeleton(
                    isSchoolContext
                      ? { type: "dashboard", hasSidebar: true }
                      : { type: "cards", hasSidebar: false },
                  );
                  router.push(targetPath);
                }}
                className="group relative flex shrink-0 items-center gap-2"
                title={isSchoolContext ? "Go to Dashboard" : "Go to Feed"}
              >
                <Image
                  src="/Stunity.png"
                  alt={autoT(
                    "auto.web.components_UnifiedNavigation.k_afe8796c",
                  )}
                  width={112}
                  height={28}
                  priority
                  className="h-7 w-auto object-contain transition-opacity duration-200 group-hover:opacity-80"
                />
              </Link>

              {/* Workspace switcher */}
              <div className="hidden items-center md:flex">
                {navItems.map((item) => {
                  const isActive = getOptimisticActive(item.path, item.active);
                  const isNavigating =
                    optimisticPath === item.path && pathname !== item.path;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      prefetch={true}
                      onClick={(e) => {
                        e.preventDefault();
                        // Escape valve: if this item is already stuck in navigating state, clear it
                        if (
                          optimisticPath === item.path &&
                          pathname !== item.path
                        ) {
                          setOptimisticPath(null);
                          setTransitionSkeleton(null);
                        }
                        const skeletonType =
                          item.name === "School" ? "dashboard" : "cards";
                        const hasSidebar = item.name === "School";
                        beginNavigationFeedback(
                          item.path,
                          skeletonType,
                          hasSidebar,
                        );
                        router.push(item.path);
                      }}
                      onMouseEnter={() => router.prefetch(item.path)}
                      onFocus={() => router.prefetch(item.path)}
                      className="relative px-3 py-2"
                    >
                      <span
                        className={`
                        relative z-10 flex items-center gap-1.5 text-[12px] font-medium tracking-tight transition-colors duration-150
                        ${
                          isActive
                            ? "text-slate-950 dark:text-white"
                            : "text-slate-500 group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:text-white"
                        }
                      `}
                      >
                        {isNavigating && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        {item.name}
                      </span>
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
            <div
              className={`
              hidden lg:flex items-center transition-all duration-300 ease-out
              ${searchFocused ? "flex-1 max-w-md mx-2" : "w-44 xl:w-56"}
            `}
            >
              <div className="relative w-full group">
                <Search
                  className={`
                  absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200
                  ${searchFocused ? "text-slate-700 dark:text-slate-200" : "text-slate-400 group-hover:text-slate-600"}
                `}
                />
                <input
                  type="text"
                  placeholder={autoT(
                    "auto.web.components_UnifiedNavigation.k_1b8d4e99",
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={handleSearchKeyDown}
                  className={`
                    w-full rounded-lg border border-transparent bg-transparent py-2 pl-9 pr-4 text-[12px] transition-all duration-200
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    hover:bg-slate-100/80 dark:hover:bg-slate-900
                    focus:border-slate-200 focus:bg-slate-50 focus:outline-none dark:focus:border-slate-800 dark:focus:bg-slate-900
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
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher variant="flat" />
              </div>

              {/* Academic Year Selector (only in school context) */}
              {isSchoolContext && (
                <div className="hidden md:block">
                  <AcademicYearSelector variant="flat" />
                </div>
              )}

              {/* Messages */}
              <Link
                href={`/${locale}/messages`}
                className="relative hidden h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white sm:grid"
                title={tNav("items.messages")}
              >
                <MessageCircle className="w-[18px] h-[18px]" />
              </Link>

              {/* Dark/Light mode toggle */}
              <button
                onClick={toggleTheme}
                className="hidden h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white sm:grid"
                title={
                  resolvedTheme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="w-[18px] h-[18px]" />
                ) : (
                  <Moon className="w-[18px] h-[18px]" />
                )}
              </button>

              {/* Notifications */}
              <button className="relative hidden h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white sm:grid">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>

              {/* Profile Menu */}
              <div className="relative ml-1" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`
                    flex items-center gap-2 rounded-lg p-1 transition-colors duration-200
                    ${
                      profileMenuOpen
                        ? "bg-slate-100 dark:bg-slate-900"
                        : "hover:bg-slate-100 dark:hover:bg-slate-900"
                    }
                  `}
                >
                  <div
                    suppressHydrationWarning
                    className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {isHydrated && user?.profilePictureUrl ? (
                      <Image
                        src={user.profilePictureUrl}
                        alt={user.firstName}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        {user?.firstName?.[0]}
                        {user?.lastName?.[0]}
                      </>
                    )}
                  </div>
                  <div className="hidden 2xl:block max-w-32 text-left leading-tight">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="truncate text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      {user?.role?.replaceAll("_", " ")}
                    </p>
                  </div>
                  <ChevronDown
                    className={`hidden 2xl:block h-3.5 w-3.5 text-slate-400 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Profile Dropdown - Refined */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div
                          suppressHydrationWarning
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold shadow-md overflow-hidden"
                        >
                          {isHydrated && user?.profilePictureUrl ? (
                            <Image
                              src={user.profilePictureUrl}
                              alt={user.firstName}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              {user?.firstName?.[0]}
                              {user?.lastName?.[0]}
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {school?.name}
                          </p>
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
                      {(user?.isSuperAdmin || user?.role === "SUPER_ADMIN") && (
                        <Link
                          href={`/${locale}/super-admin`}
                          prefetch={true}
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group"
                        >
                          <Shield className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                          <span className="flex-1">
                            <AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_0fd43693" />
                          </span>
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
                        <span className="flex-1">
                          <AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_ed5c09ec" />
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                      </Link>
                      <Link
                        href={`/${locale}/settings`}
                        prefetch={true}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group"
                      >
                        <Settings className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <span className="flex-1">
                          <AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_980d81f0" />
                        </span>
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
                        <span>
                          <AutoI18nText i18nKey="auto.web.components_UnifiedNavigation.k_f4afa24e" />
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={
                  mobileMenuOpen ? tNav("closeMenu") : tNav("openMenu")
                }
                className="md:hidden ml-1 p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-all duration-200"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Refined */}
        {mobileMenuOpen && (
          <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-slate-200 bg-white/98 backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-950/98">
            <div className="space-y-0.5 px-3 py-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = getOptimisticActive(item.path, item.active);
                const isNavigating =
                  optimisticPath === item.path && pathname !== item.path;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    prefetch={true}
                    onClick={(e) => {
                      e.preventDefault();
                      // Escape valve: if this item is already stuck in navigating state, clear it
                      if (
                        optimisticPath === item.path &&
                        pathname !== item.path
                      ) {
                        setOptimisticPath(null);
                        setTransitionSkeleton(null);
                        setMobileMenuOpen(false);
                      }
                      const skeletonType =
                        item.name === "School" ? "dashboard" : "cards";
                      const hasSidebar = item.name === "School";
                      beginNavigationFeedback(
                        item.path,
                        skeletonType,
                        hasSidebar,
                      );
                      setMobileMenuOpen(false);
                      router.push(item.path);
                    }}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors
                      ${
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                      }
                    `}
                  >
                    {isNavigating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      <Icon
                        className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`}
                      />
                    )}
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-[10px] font-semibold rounded-full uppercase">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  </Link>
                );
              })}

              {isSchoolContext && (
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/70">
                    <div>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                        {school?.name || tNav("adminWorkspace")}
                      </p>
                      <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                        {tNav("adminWorkspace")}
                      </p>
                    </div>
                    <AcademicYearSelector />
                  </div>

                  <div className="mb-3 space-y-1 border-b border-slate-200 pb-3 dark:border-slate-800">
                    {standaloneSchoolMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isSchoolItemActive(item);
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                            isActive
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"
                              : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                          }`}
                        >
                          {isActive ? (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-400" />
                          ) : null}
                          <Icon
                            className={`h-4 w-4 ${
                              isActive
                                ? "text-blue-600 dark:text-blue-300"
                                : "text-slate-400"
                            }`}
                          />
                          <span className="kh-navigation-main-item flex-1">
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={schoolMenuQuery}
                      onChange={(event) =>
                        setSchoolMenuQuery(event.target.value)
                      }
                      placeholder={tNav("searchMenu")}
                      aria-label={tNav("searchMenu")}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700"
                    />
                  </div>

                  {filteredSchoolMenuSections.map((section) => {
                    const SectionIcon = section.icon;
                    const sectionHasActiveItem =
                      section.items.some(isSchoolItemActive);
                    const isExpanded =
                      Boolean(schoolMenuQuery.trim()) ||
                      Boolean(expandedSchoolSections[section.key]);

                    return (
                      <div key={section.key} className="mb-1">
                        <button
                          type="button"
                          onClick={() => toggleSchoolSection(section.key)}
                          aria-expanded={isExpanded}
                          className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            sectionHasActiveItem
                              ? "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white"
                              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                          }`}
                        >
                          <SectionIcon className="h-4 w-4 text-slate-400" />
                          <span className="kh-navigation-main-item flex-1 text-[13px]">
                            {section.label}
                          </span>
                          <span className="min-w-5 rounded-md bg-slate-100 px-1.5 py-0.5 text-center text-[9px] font-semibold text-slate-500 group-hover:bg-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-800">
                            {section.items.length}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isExpanded ? (
                          <div className="mt-1 space-y-px">
                            {section.items.map((item) => {
                              const Icon = item.icon;
                              const isActive = isSchoolItemActive(item);
                              return (
                                <Link
                                  key={item.path}
                                  href={item.path}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                                    isActive
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"
                                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                                  }`}
                                >
                                  {isActive ? (
                                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-400" />
                                  ) : null}
                                  <Icon
                                    className={`h-4 w-4 ${
                                      isActive
                                        ? "text-blue-600 dark:text-blue-300"
                                        : "text-slate-400"
                                    }`}
                                  />
                                  <span className="kh-navigation-submenu flex-1">
                                    {item.name}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {filteredSchoolMenuSections.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                      {tNav("noMenuResults")}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* School context sidebar: grouped work areas */}
      {isSchoolContext && (
        <aside className="kh-navigation-font fixed left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] w-64 flex-col overflow-hidden border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-900">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {schoolLogoUrl ? (
                  <Image
                    src={schoolLogoUrl}
                    alt={school?.name || tNav("items.school")}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <School className="h-[19px] w-[19px]" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  {tNav("adminWorkspace")}
                </p>
                <p className="mt-0.5 truncate text-[13px] font-bold text-slate-900 dark:text-white">
                  {school?.name || tNav("items.school")}
                </p>
                {showEducationModel ? (
                  <p className="mt-0.5 truncate text-[9px] font-medium text-slate-400 dark:text-slate-500">
                    {educationModelLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="sticky top-0 z-10 bg-white pb-2 dark:bg-slate-950">
              <div className="space-y-1 pb-3">
                {standaloneSchoolMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = optimisticPath
                    ? optimisticPath === item.path
                    : isSchoolItemActive(item);
                  const isNavigating =
                    optimisticPath === item.path && pathname !== item.path;

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      prefetch={true}
                      onMouseEnter={() => primeRoute(item.path, item.prefetch)}
                      onFocus={() => primeRoute(item.path, item.prefetch)}
                      onClick={(event) => {
                        event.preventDefault();
                        beginNavigationFeedback(item.path, item.skeleton, true);
                        router.push(item.path);
                      }}
                      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/70"
                      }`}
                    >
                      {isActive ? (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-400" />
                      ) : null}
                      <span className="grid h-6 w-6 shrink-0 place-items-center">
                        {isNavigating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Icon
                            className={`h-3.5 w-3.5 ${
                              isActive
                                ? "text-blue-600 dark:text-blue-300"
                                : "text-slate-400"
                            }`}
                          />
                        )}
                      </span>
                      <span className="kh-navigation-main-item min-w-0 flex-1 truncate">
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={schoolMenuQuery}
                    onChange={(event) => setSchoolMenuQuery(event.target.value)}
                    placeholder={tNav("searchMenu")}
                    aria-label={tNav("searchMenu")}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {filteredSchoolMenuSections.map((section) => {
                const SectionIcon = section.icon;
                const sectionHasActiveItem =
                  section.items.some(isSchoolItemActive);
                const isExpanded =
                  Boolean(schoolMenuQuery.trim()) ||
                  Boolean(expandedSchoolSections[section.key]);

                return (
                  <section key={section.key}>
                    <button
                      type="button"
                      onClick={() => toggleSchoolSection(section.key)}
                      aria-expanded={isExpanded}
                      className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        sectionHasActiveItem
                          ? "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900/70 dark:hover:text-white"
                      }`}
                    >
                      <SectionIcon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          sectionHasActiveItem
                            ? "text-slate-700 dark:text-slate-200"
                            : "text-slate-400"
                        }`}
                      />
                      <span className="kh-navigation-main-item min-w-0 flex-1 truncate text-[12px]">
                        {section.label}
                      </span>
                      <span className="min-w-5 rounded-md bg-slate-100 px-1.5 py-0.5 text-center text-[9px] font-semibold tabular-nums text-slate-500 group-hover:bg-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-800">
                        {section.items.length}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded ? (
                      <div className="mt-1 space-y-px">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = optimisticPath
                            ? optimisticPath === item.path ||
                              Boolean(
                                item.activePaths?.some((path) =>
                                  optimisticPath.startsWith(path),
                                ),
                              )
                            : isSchoolItemActive(item);
                          const isNavigating =
                            optimisticPath === item.path &&
                            pathname !== item.path;

                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              prefetch={true}
                              onMouseEnter={() =>
                                primeRoute(item.path, item.prefetch)
                              }
                              onFocus={() =>
                                primeRoute(item.path, item.prefetch)
                              }
                              onClick={(e) => {
                                e.preventDefault();
                                // Escape valve: if this item is already stuck in navigating state, clear it
                                if (
                                  optimisticPath === item.path &&
                                  pathname !== item.path
                                ) {
                                  setOptimisticPath(null);
                                  setTransitionSkeleton(null);
                                }
                                beginNavigationFeedback(
                                  item.path,
                                  item.skeleton,
                                  true,
                                );
                                router.push(item.path);
                              }}
                              className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                                isActive
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/70 dark:hover:text-white"
                              }`}
                            >
                              {isActive ? (
                                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-400" />
                              ) : null}
                              <span
                                className={`grid h-6 w-6 shrink-0 place-items-center transition-colors ${
                                  isActive
                                    ? "text-blue-600 dark:text-blue-300"
                                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                }`}
                              >
                                {isNavigating ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Icon className="h-3.5 w-3.5" />
                                )}
                              </span>
                              <span className="kh-navigation-submenu min-w-0 flex-1 truncate">
                                {item.name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}

              {filteredSchoolMenuSections.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {tNav("noMenuResults")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-900">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Shield className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  {tNav("secureWorkspace")}
                </p>
                <p className="kh-navigation-note truncate text-[8px] text-slate-400">
                  {tNav("roleBasedAccess")}
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
