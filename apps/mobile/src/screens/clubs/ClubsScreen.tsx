/**
 * ClubsScreen — the "Classes" tab.
 *
 * Renders ClassHubView (from ClassDetailsScreen.tsx) directly for the signed-in
 * user's class, or the school directory for admin/staff with no class of their
 * own. Club browsing/joining logic remains in this file, gated behind
 * FEATURE_FLAGS.CLUBS_ENABLED, for a future re-enable.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  RefreshControl,
  InteractionManager,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { clubsApi, classesApi } from '@/api';
import {
  readClubsFromCache as readClubsLandingFromCache,
  writeClubsToCache as writeClubsLandingToCache,
  invalidateClubsCache as invalidateClubsLandingCache,
} from '@/screens/clubs/clubsCache';
import type { Club } from '@/api/clubs';
import type { MyClassSummary } from '@/api/classes';
import { UNIFIED_TAB_PALETTE, CLASS_CARD_THEME } from '@/config';
import { useNavigationContext, useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { SchoolClassCard } from '@/components/clubs/SchoolClassCard';
import { COLORS, CLUBS_PAGE_SIZE } from '@/components/clubs/ClubsComponents';
import { SchoolClassCardSkeleton } from '@/components/clubs/ClubsSkeletons';
import { useTranslation } from 'react-i18next';
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint';
import { TABLET_TAB_RAIL_WIDTH } from '@/utils/layout';
import { getClassGenderCounts, getSafeStudentCount } from '@/utils/classGenderCounts';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { ClassHubView } from './ClassDetailsScreen';
import { Image } from 'expo-image';
import { statsAPI, PerformanceStatsSummary } from '@/services/stats';
type ClubFilter = 'all' | 'joined' | 'discover';

// ── Filter tab bar — mirrors LearnScreen pill-tab visual language ─────────────
const CLUB_FILTER_TABS: { id: ClubFilter; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all',      labelKey: 'clubs.screen.shortcuts.allClubs', icon: 'sparkles-outline' },
  { id: 'joined',   labelKey: 'clubs.screen.shortcuts.myClubs',  icon: 'heart-outline' },
  { id: 'discover', labelKey: 'clubs.screen.shortcuts.discover', icon: 'compass-outline' },
];

// Single accent palette — matches LearnScreen's unified teal accent. Light bg + dark text
// when inactive; teal fill + white text when active.
const CLUB_TAB_PALETTE = UNIFIED_TAB_PALETTE;

// Derive a short class code (e.g. "10A") from the class name
const getClassCode = (name: string): string => {
  const match = name.match(/(\d+\s*[A-Za-z]?)/);
  return match ? match[1].replace(/\s/g, '').slice(0, 4) : name.slice(0, 3).toUpperCase();
};

const getCurrentMonthLabel = (): string => {
  return new Date().toLocaleString('default', { month: 'long' });
};

const getCurrentRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => date.toISOString().split('T')[0];
  return { startDate: format(start), endDate: format(end) };
};

const formatTeacherDisplayName = (
  teacher?: MyClassSummary['homeroomTeacher'] | null,
  preferEnglish = false
): string => {
  if (!teacher) return '';

  // Standardize to Last Name + First Name for enterprise consistency
  const nativeName = [teacher.lastName, teacher.firstName].filter(Boolean).join(' ').trim();
  const englishName = [teacher.englishLastName, teacher.englishFirstName].filter(Boolean).join(' ').trim();

  return (preferEnglish ? englishName || nativeName : nativeName || englishName) || '';
};

const canUseInitialSchoolClasses = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(
    user?.schoolId &&
      (user.role === 'STUDENT' ||
        user.role === 'TEACHER' ||
        user.role === 'PARENT' ||
        Boolean(user.teacher?.id || user.teacherId)),
  );

const getClassCacheScopeKey = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  user?.id || `${user?.role || 'anonymous'}:${user?.schoolId || 'no-school'}`;



// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClubsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const isKhmer = i18n.language?.startsWith('km');
  const navigation = useNavigation<any>();
  const { openSidebar } = useNavigationContext();
  const insets = useSafeAreaInsets();
  const layoutBreakpoint = useLayoutBreakpoint();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isThreeColumnTablet = layoutBreakpoint.isTablet && windowWidth > windowHeight && windowWidth >= 1180;
  const isPortraitTablet = layoutBreakpoint.isTablet && windowHeight >= windowWidth && windowWidth >= 820;
  const isClubRailTablet = isThreeColumnTablet || isPortraitTablet;

  const styles = useMemo(
    () =>
      createStyles(
        colors,
        isDark,
        layoutBreakpoint.isTablet,
        layoutBreakpoint.isLargeTablet,
        isThreeColumnTablet,
        isPortraitTablet
      ),
    [colors, isDark, layoutBreakpoint.isTablet, layoutBreakpoint.isLargeTablet, isThreeColumnTablet, isPortraitTablet]
  );

  const threeColumnAvailableWidth = windowWidth - TABLET_TAB_RAIL_WIDTH;
  const threeColumnCenterWidth = Math.max(620, threeColumnAvailableWidth - 260 - 280 - 28);
  /** Measured width of the school-classes band (matches on-screen column, not raw window width). */
  const [schoolClassesBandWidth, setSchoolClassesBandWidth] = useState(0);
  const gridConfig = useMemo(() => {
    const contentW = layoutBreakpoint.isTablet
      ? isThreeColumnTablet
        ? threeColumnCenterWidth
        : Math.min(windowWidth, layoutBreakpoint.contentColumnWidth)
      : windowWidth;
    const gridHPad = 12;
    const basisW =
      layoutBreakpoint.isTablet && schoolClassesBandWidth > 0
        ? schoolClassesBandWidth
        : contentW;
    const innerW = Math.max(0, basisW - gridHPad * 2);
    /** 2-column compact category-style class cards on phones; up to 3 on tablets. */
    const MIN_CLASS_COL_W = isPortraitTablet ? 320 : 200;
    const cols = layoutBreakpoint.isTablet && !isThreeColumnTablet
      ? Math.min(3, Math.max(1, Math.floor(innerW / MIN_CLASS_COL_W)))
      : 2;
    const gap = cols > 1 ? 12 : 12;
    const cellW = cols === 1 ? innerW : (innerW - gap * (cols - 1)) / cols;
    const classPreviewCount = cols * 3;
    const teacherSectionCount = cols * 2;
    return { cols, contentW, gap, cellW, classPreviewCount, teacherSectionCount, gridHPad };
  }, [isPortraitTablet, isThreeColumnTablet, layoutBreakpoint.isTablet, layoutBreakpoint.contentColumnWidth, windowWidth, schoolClassesBandWidth, threeColumnCenterWidth]);
  const user = useAuthStore((state) => state.user);
  // Cache priority: api/clubs.ts in-memory map → clubsCache (memory + disk).
  // The api/clubs.ts cache is per-param-combo and dies on app kill; the
  // clubsCache disk layer was hydrated by MainNavigator at t≈0, so on a
  // cold reopen we still get a synchronous first paint here.
  const initialClubsPage =
    clubsApi.getCachedClubsPaginated({ page: 1, limit: CLUBS_PAGE_SIZE }) ||
    readClubsLandingFromCache(user?.id);
  if (initialClubsPage && __DEV__) {
    const source = clubsApi.getCachedClubsPaginated({ page: 1, limit: CLUBS_PAGE_SIZE })
      ? 'api-mem'
      : 'disk';
    console.log(`[Clubs TTI] ${source}-cache hit (${initialClubsPage.clubs.length} clubs)`);
  }
  const initialAcademicYears = classesApi.getCachedAcademicYears() || [];
  const initialSelectedYearId = initialAcademicYears.find((year) => year.isCurrent)?.id || null;
  const classCacheScopeKey = getClassCacheScopeKey(user);
  const initialSchoolClasses = canUseInitialSchoolClasses(user)
    ? (classesApi.getCachedMyClasses({ academicYearId: initialSelectedYearId || undefined, scopeKey: classCacheScopeKey }) || [])
    : [];
  const hasInitialVisibleContent = Boolean(initialClubsPage || initialSchoolClasses.length > 0);

  // This flag is resolved by loadClubs()'s finally block. When clubs are disabled
  // that call never fires, so don't start "loading" on its account — the classes
  // section below tracks its own loadingSchoolClasses/loadingAdminClasses state.
  const [loading, setLoading]                   = useState(FEATURE_FLAGS.CLUBS_ENABLED && !hasInitialVisibleContent);
  const [refreshing, setRefreshing]             = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter]     = useState<ClubFilter>('all');
  const [stats, setStats]                       = useState<PerformanceStatsSummary | null>(null);

  useEffect(() => {
    if (user?.id) {
      statsAPI.getUserStatsSummary(user.id).then(setStats).catch(() => {});
    }
  }, [user?.id]);

  const tabContentProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    tabContentProgress.setValue(0);
    Animated.timing(tabContentProgress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [selectedFilter, tabContentProgress]);

  const tabContentAnimatedStyle = useMemo(() => ({
    opacity: tabContentProgress,
    transform: [
      {
        translateY: tabContentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  }), [tabContentProgress]);

  const [searchQuery, setSearchQuery]           = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [clubs, setClubs]                       = useState<Club[]>(initialClubsPage?.clubs || []);
  const [joinedClubIds, setJoinedClubIds]       = useState<string[]>(
    initialClubsPage?.clubs.filter((club) => club.isJoined).map((club) => club.id) || []
  );
  const [busyClubId, setBusyClubId]             = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore]       = useState(false);
  const [hasMoreClubs, setHasMoreClubs]         = useState(initialClubsPage?.pagination.hasMore ?? true);
  const [page, setPage]                         = useState(initialClubsPage?.pagination.page ?? 1);
  const [schoolClasses, setSchoolClasses]       = useState<MyClassSummary[]>(initialSchoolClasses);
  const [loadingSchoolClasses, setLoadingSchoolClasses] = useState(
    canUseInitialSchoolClasses(user) ? initialSchoolClasses.length === 0 : false
  );
  const [schoolClassesError, setSchoolClassesError] = useState<string | null>(null);
  const [allSchoolClasses, setAllSchoolClasses] = useState<MyClassSummary[]>([]);
  const [loadingAllSchoolClasses, setLoadingAllSchoolClasses] = useState(false);
  const [allSchoolClassesError, setAllSchoolClassesError] = useState<string | null>(null);
  const [academicYears, setAcademicYears]       = useState<any[]>(initialAcademicYears);
  const [selectedYearId, setSelectedYearId]     = useState<string | null>(initialSelectedYearId);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminClasses, setAdminClasses]         = useState<MyClassSummary[]>([]);
  const [loadingAdminClasses, setLoadingAdminClasses] = useState(false);
  const [inviteCount, setInviteCount]           = useState(0);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const pageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);
  const hasMoreClubsRef = useRef(true);
  const hasLoadedContentRef = useRef(Boolean(initialClubsPage));
  const selectedFilterRef = useRef<ClubFilter>(selectedFilter);
  const debouncedQueryRef = useRef('');
  const prefetchedClassDetailKeysRef = useRef<Set<string>>(new Set());
  const deferredInteractionTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  // Guards the visible-class prefetch so it fires exactly once per mount,
  // even if `schoolClasses` re-populates from the network refresh after the
  // initial cache paint.
  const classDetailPrefetchFiredRef = useRef(false);
  const prefetchedClubDetailKeysRef = useRef<Set<string>>(new Set());
  const hasFocusedOnceRef = useRef(false);
  const hasLinkedTeacherProfile = Boolean(user?.teacher?.id || user?.teacherId);
  const canViewSchoolClasses = Boolean(
    user?.schoolId &&
      (user?.role === 'STUDENT' ||
        user?.role === 'TEACHER' ||
        user?.role === 'PARENT' ||
        hasLinkedTeacherProfile),
  );
  const isAdminOrStaff = Boolean(
    user?.role === 'ADMIN' || user?.role === 'STAFF' || user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN'
  );
  const shouldShowClassHub = true; // User requested to completely remove the old screen for everyone.
  const canUseDisciplineWorkbench = Boolean(isAdminOrStaff || user?.role === 'TEACHER');
  const clubListColumns = 1;
  const shortcutItems = useMemo(() => [
    { id: 'all',      label: t('clubs.screen.shortcuts.allClubs'), icon: 'sparkles',    color: COLORS.primary,     bgInner: isDark ? '#0F2F37' : COLORS.primaryLight },
    { id: 'joined',   label: t('clubs.screen.shortcuts.myClubs'),  icon: 'heart',       color: '#FB7185',          bgInner: isDark ? '#3A1720' : '#FFF1F2' },
    { id: 'discover', label: t('clubs.screen.shortcuts.discover'), icon: 'compass',     color: '#F59E0B',          bgInner: isDark ? '#3B2B09' : '#FEF3C7' },
    { id: 'create',   label: t('clubs.screen.shortcuts.create'),   icon: 'add-circle',  color: COLORS.primaryDark, bgInner: isDark ? '#0F2F37' : COLORS.primaryLight },
  ], [isDark, t]);

  const teacherClassSplit = useMemo(() => {
    const eligible =
      Boolean(user?.schoolId) && (user?.role === 'TEACHER' || hasLinkedTeacherProfile);
    if (!eligible) {
      return { teaching: [] as MyClassSummary[], other: [] as MyClassSummary[] };
    }
    const teaching = schoolClasses.filter((c) => c.hasTimetableAssignment === true);
    return { teaching, other: [] as MyClassSummary[] };
  }, [hasLinkedTeacherProfile, schoolClasses, user?.role, user?.schoolId]);

  const teacherOtherClasses = useMemo(() => {
    const eligible =
      Boolean(user?.schoolId) && (user?.role === 'TEACHER' || hasLinkedTeacherProfile);
    if (!eligible) return [] as MyClassSummary[];
    const teachingIds = new Set(teacherClassSplit.teaching.map((c) => c.id));
    /** Classes in "my" roster that are not timetable-taught (homeroom-only, etc.) */
    const myOtherLinked = schoolClasses.filter((c) => c.hasTimetableAssignment !== true);
    /** Rest of school directory (e.g. homeroom / light list), excluding teaching set */
    const fromDirectory = Array.isArray(allSchoolClasses)
      ? allSchoolClasses.filter((c) => !teachingIds.has(c.id))
      : [];

    const seen = new Set<string>();
    const merged: MyClassSummary[] = [];
    for (const c of myOtherLinked) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        merged.push(c);
      }
    }
    for (const c of fromDirectory) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        merged.push(c);
      }
    }
    return merged;
  }, [
    allSchoolClasses,
    hasLinkedTeacherProfile,
    schoolClasses,
    teacherClassSplit.teaching,
    user?.role,
    user?.schoolId,
  ]);

  const isTeacherClassLayout = Boolean(
    user?.schoolId && (user?.role === 'TEACHER' || hasLinkedTeacherProfile),
  );

  const teacherTeachingIds = useMemo(
    () => new Set(teacherClassSplit.teaching.map((c) => c.id)),
    [teacherClassSplit.teaching],
  );

  const teacherPreviewClasses = useMemo(() => {
    if (!isTeacherClassLayout) return [] as MyClassSummary[];
    return [
      ...teacherClassSplit.teaching,
      ...teacherOtherClasses.filter((c) => !teacherTeachingIds.has(c.id)),
    ];
  }, [isTeacherClassLayout, teacherClassSplit.teaching, teacherOtherClasses, teacherTeachingIds]);

  const previewClasses = useMemo(() => {
    if (isTeacherClassLayout) return teacherPreviewClasses;
    if (isAdminOrStaff) return adminClasses;
    return schoolClasses;
  }, [adminClasses, isAdminOrStaff, isTeacherClassLayout, schoolClasses, teacherPreviewClasses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (clubs.length > 0) {
      hasLoadedContentRef.current = true;
    }
  }, [clubs.length]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  // ── Class Hub Routing Logic ────────────────────────────────────────────────

  // Auto-select class for Class Hub
  useEffect(() => {
    if (shouldShowClassHub && !selectedClassId) {
      const isTeacher = user?.role === 'TEACHER';
      if (isTeacher) {
        if (teacherClassSplit.teaching.length > 0) setSelectedClassId(teacherClassSplit.teaching[0].id);
      } else {
        if (schoolClasses.length > 0) setSelectedClassId(schoolClasses[0].id);
      }
    }
  }, [shouldShowClassHub, schoolClasses, teacherClassSplit.teaching, selectedClassId, user?.role]);

  useEffect(() => {
    hasMoreClubsRef.current = hasMoreClubs;
  }, [hasMoreClubs]);

  useEffect(() => {
    selectedFilterRef.current = selectedFilter;
  }, [selectedFilter]);

  useEffect(() => {
    debouncedQueryRef.current = debouncedSearchQuery;
  }, [debouncedSearchQuery]);

  const prefetchClassDetails = useCallback((classItem: MyClassSummary) => {
    const { startDate, endDate } = getCurrentRange();
    const prefetchKey = [
      classItem.id,
      classItem.myRole,
      classItem.linkedStudentId || '',
      classItem.linkedTeacherId || '',
      selectedYearId || '',
    ].join(':');

    if (prefetchedClassDetailKeysRef.current.has(prefetchKey)) {
      return;
    }

    prefetchedClassDetailKeysRef.current.add(prefetchKey);
    classesApi.prefetchClassDetailBundle({
      classId: classItem.id,
      myRole: classItem.myRole,
      linkedStudentId: classItem.linkedStudentId,
      linkedTeacherId: classItem.linkedTeacherId,
      startDate,
      endDate,
      semester: 1,
      monthLabel: classItem.myRole === 'STUDENT' || classItem.myRole === 'PARENT' ? getCurrentMonthLabel() : undefined,
    });
  }, [selectedYearId]);

  const joinedClubSet     = useMemo(() => new Set(joinedClubIds), [joinedClubIds]);
  const normalizedQuery   = searchQuery.trim().toLowerCase();
  const prefetchClubDetails = useCallback((clubItem: Club) => {
    if (prefetchedClubDetailKeysRef.current.has(clubItem.id)) {
      return;
    }

    prefetchedClubDetailKeysRef.current.add(clubItem.id);
    clubsApi.primeClubCache(clubItem);
    clubsApi.prefetchClubDetail(clubItem.id);
  }, []);

  const loadAcademicYears = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const data = await classesApi.getAcademicYears();
      setAcademicYears(data);
      const current = data.find((y) => y.isCurrent);
      if (current) setSelectedYearId(current.id);
    } catch (err) {
      if (__DEV__) { console.error('Failed to load academic years', err); }
    }
  }, [user?.schoolId]);

  const loadSchoolClasses = useCallback(
    async (force = false) => {
      if (!canViewSchoolClasses) {
        setSchoolClasses([]);
        setSchoolClassesError(null);
        setLoadingSchoolClasses(false);
        return;
      }

      try {
        setLoadingSchoolClasses(true);
        setSchoolClassesError(null);
        const data = await classesApi.getMyClasses({
          force,
          academicYearId: selectedYearId || undefined,
          scopeKey: classCacheScopeKey,
        });
        setSchoolClasses(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setSchoolClassesError(err?.message || t('clubs.screen.loadSchoolClassesFailed'));
      } finally {
        setLoadingSchoolClasses(false);
      }
    },
    [canViewSchoolClasses, classCacheScopeKey, selectedYearId, t]
  );

  const loadAllSchoolClasses = useCallback(async () => {
    if (!user?.schoolId) return;
    if (!(user?.role === 'TEACHER' || user?.teacher?.id || user?.teacherId)) return;
    try {
      setLoadingAllSchoolClasses(true);
      setAllSchoolClassesError(null);
      const data = await classesApi.getClassesLightweight({
        academicYearId: selectedYearId || undefined,
        asRole: 'TEACHER',
      });
      setAllSchoolClasses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setAllSchoolClassesError(err?.message || t('clubs.screen.loadSchoolClassesFailed'));
      setAllSchoolClasses([]);
    } finally {
      setLoadingAllSchoolClasses(false);
    }
  }, [selectedYearId, t, user?.role, user?.schoolId, user?.teacher?.id, user?.teacherId]);

  const loadAdminClasses = useCallback(async (query = '') => {
    // `/classes` is school-scoped: class-service requires a `schoolId` in the
    // token and otherwise 401s with "Invalid token format". `isAdminOrStaff`
    // includes SUPER_ADMIN, who can have no school, so guard on schoolId too —
    // mirroring loadAllSchoolClasses — to avoid a futile call + error overlay.
    if (!isAdminOrStaff || !user?.schoolId) return;
    try {
      setLoadingAdminClasses(true);
      const data = await classesApi.getClasses({ search: query });
      setAdminClasses(data);
    } catch (err) {
      if (__DEV__) { console.error('Failed to load admin classes', err); }
    } finally {
      setLoadingAdminClasses(false);
    }
  }, [isAdminOrStaff, user?.schoolId]);

  const loadInvites = useCallback(async () => {
    try {
      const rows = await clubsApi.getMyClubInvites();
      setInviteCount(Array.isArray(rows) ? rows.length : 0);
    } catch {
      setInviteCount(0);
    }
  }, [t]);

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadClubs = useCallback(async (options?: { silent?: boolean; reset?: boolean; page?: number; filter?: ClubFilter; query?: string }) => {
    const silent = options?.silent ?? false;
    const reset = options?.reset ?? true;
    const targetPage = options?.page ?? 1;
    const targetFilter = options?.filter ?? selectedFilterRef.current;
    const targetQuery = options?.query ?? debouncedQueryRef.current;

    if (!silent) setLoading(true);
    if (!reset) {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    }

    try {
      setError(null);
      const params: { page: number; limit: number; myClubs?: boolean; discover?: boolean; search?: string } = {
        page: targetPage,
        limit: CLUBS_PAGE_SIZE,
      };

      if (targetFilter === 'joined') params.myClubs = true;
      if (targetFilter === 'discover') params.discover = true;
      if (targetQuery.length > 0) params.search = targetQuery;

      // Use cached API call. 'force' is true if this was triggered by a pull-to-refresh or explicit user action.
      // initial load and tab switches benefit from the 30s TTL cache.
      const isUserAction = options?.reset && !options?.silent;
      const t0 = Date.now();
      const { clubs: pageClubs, pagination } = await clubsApi.getClubsPaginated(params, isUserAction);
      // Persist the landing page (no filter, page 1) to the disk-backed
      // cache so next cold reopen renders synchronously. Only the canonical
      // landing view is worth persisting — filters/searches don't need it.
      if (
        user?.id &&
        targetPage === 1 &&
        targetFilter === 'all' &&
        targetQuery.length === 0
      ) {
        writeClubsLandingToCache({ clubs: pageClubs, pagination }, user.id);
        if (__DEV__) console.log(`[Clubs TTI] settle (${Date.now() - t0}ms)`);
      }
      const joinedIdsFromPage = pageClubs.filter((club) => club.isJoined).map((club) => club.id);
      setJoinedClubIds((prev) => {
        const uniqueJoinedIds = new Set(reset ? joinedIdsFromPage : [...prev, ...joinedIdsFromPage]);
        return Array.from(uniqueJoinedIds);
      });
      setClubs((prev) => {
        if (reset) return pageClubs;
        const merged = new Map(prev.map((club) => [club.id, club]));
        pageClubs.forEach((club) => merged.set(club.id, club));
        return Array.from(merged.values());
      });
      setPage(pagination.page);
      pageRef.current = pagination.page;
      setHasMoreClubs(Boolean(pagination.hasMore));
      hasMoreClubsRef.current = Boolean(pagination.hasMore);
    } catch (err: any) {
      setError(err?.message || t('clubs.screen.loadClubsFailed'));
    } finally {
      setLoading(false);
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!FEATURE_FLAGS.CLUBS_ENABLED) return;
    setPage(1);
    setHasMoreClubs(true);
    loadClubs({
      silent: hasLoadedContentRef.current,
      reset: true,
      page: 1,
      filter: selectedFilter,
      query: debouncedSearchQuery,
    });
  }, [loadClubs, selectedFilter, debouncedSearchQuery]);

  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  useEffect(() => {
    loadSchoolClasses();
    loadAllSchoolClasses();
  }, [loadAllSchoolClasses, loadSchoolClasses]);

  useEffect(() => {
    if (isAdminOrStaff) {
      loadAdminClasses();
    }
  }, [loadAdminClasses, isAdminOrStaff]);

  useEffect(() => {
    if (!FEATURE_FLAGS.CLUBS_ENABLED) return;
    loadInvites();
  }, [loadInvites]);

  useFocusEffect(
    useCallback(() => {
      // Skip first focus because initial loading already runs on mount.
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      if (!FEATURE_FLAGS.CLUBS_ENABLED) return;

      loadClubs({
        silent: true,
        reset: true,
        page: 1,
        filter: selectedFilterRef.current,
        query: debouncedQueryRef.current,
      });
      loadInvites();
    }, [loadClubs, loadInvites])
  );

  useEffect(() => {
    // Prefetch only the top card on mount. Earlier this was slice(0, 3), which
    // fanned out 12+ simultaneous HTTP calls (each bundle fires 4–6 requests
    // via getClassDetailBundle) and saturated the gateway, causing /posts/feed
    // and /reels/feed to time out. Other cards prefetch on press intent.
    const visibleClasses = (isTeacherClassLayout ? schoolClasses : isAdminOrStaff ? adminClasses : schoolClasses).slice(
      0,
      1,
    );
    if (visibleClasses.length === 0) return;

    // Defer the class-detail bundle prefetch by 4s and fire exactly once
    // per mount. The 4 parallel class-detail reads (students / timetable /
    // attendance / grades — across 4 microservices) used to land in the
    // middle of the cold-boot waterfall. Now they fire well after every
    // other boot call has settled, so the user perceives cold-boot as
    // "just the cached content paints". Tapping a class within the first
    // 4s still works — the user-intent path bypasses this prefetch.
    if (classDetailPrefetchFiredRef.current) return;
    const deferTimer = setTimeout(() => {
      classDetailPrefetchFiredRef.current = true;
      const task = InteractionManager.runAfterInteractions(() => {
        visibleClasses.forEach(prefetchClassDetails);
      });
      deferredInteractionTaskRef.current = task;
    }, 4000);

    return () => {
      clearTimeout(deferTimer);
      deferredInteractionTaskRef.current?.cancel?.();
    };
  }, [adminClasses, isAdminOrStaff, isTeacherClassLayout, prefetchClassDetails, schoolClasses]);

  useEffect(() => {
    const visibleClubs = clubs.slice(0, 2);
    if (visibleClubs.length === 0) return;

    const task = InteractionManager.runAfterInteractions(() => {
      visibleClubs.forEach(prefetchClubDetails);
    });

    return () => {
      task.cancel?.();
    };
  }, [clubs, prefetchClubDetails]);

  useEffect(() => {
    // Prefetch directory data to improve speed when user clicks "View All"
    InteractionManager.runAfterInteractions(() => {
      classesApi.getAcademicYears();
      if (user?.role === 'TEACHER' || user?.teacher?.id || user?.teacherId) {
        classesApi.getClassesLightweight({ asRole: 'TEACHER' });
      }
    });
  }, [user?.role, user?.teacher?.id, user?.teacherId]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMoreClubs(true);
    setRefreshing(true);
    if (FEATURE_FLAGS.CLUBS_ENABLED) {
      clubsApi.invalidateClubsCache();
      invalidateClubsLandingCache();
    }
    if (canViewSchoolClasses) {
      classesApi.invalidateMyClassesCache();
    }

    Promise.all([
      FEATURE_FLAGS.CLUBS_ENABLED
        ? loadClubs({ silent: true, reset: true, page: 1, filter: selectedFilterRef.current, query: debouncedQueryRef.current })
        : Promise.resolve(),
      isAdminOrStaff ? loadAdminClasses(adminSearchQuery) : loadSchoolClasses(true),
      user?.role === 'TEACHER' || user?.teacher?.id || user?.teacherId
        ? loadAllSchoolClasses()
        : Promise.resolve(),
      FEATURE_FLAGS.CLUBS_ENABLED ? loadInvites() : Promise.resolve(),
    ]).finally(() => setRefreshing(false));
  }, [
    adminSearchQuery,
    isAdminOrStaff,
    loadAdminClasses,
    loadAllSchoolClasses,
    loadClubs,
    loadInvites,
    loadSchoolClasses,
    user?.role,
    user?.teacher?.id,
    user?.teacherId,
  ]);

  const loadMoreClubs = useCallback(() => {
    if (
      loading ||
      refreshing ||
      isLoadingMoreRef.current ||
      !hasMoreClubsRef.current
    ) {
      return;
    }
    const nextPage = pageRef.current + 1;
    loadClubs({
      silent: true,
      reset: false,
      page: nextPage,
      filter: selectedFilterRef.current,
      query: debouncedQueryRef.current,
    });
  }, [loadClubs, loading, refreshing]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleToggleMembership = useCallback(
    async (clubId: string) => {
      const targetClub = clubs.find((club) => club.id === clubId);
      const isJoined = Boolean(targetClub?.isJoined || joinedClubSet.has(clubId));
      try {
        setBusyClubId(clubId);
        if (isJoined) {
          await clubsApi.leaveClub(clubId);
        } else {
          if (targetClub?.mode === 'APPROVAL_REQUIRED') {
            const result = await clubsApi.requestJoinClub(clubId);
            Alert.alert(t('clubScreens.details.joinRequestSent'), result.message || t('clubs.alerts.requestPending'));
          } else if (targetClub?.mode === 'INVITE_ONLY') {
            try {
              const result = await clubsApi.acceptClubInvite(clubId);
              Alert.alert(t('clubScreens.details.invitationAccepted'), result.message || t('clubs.alerts.joinedClub'));
            } catch (inviteErr: any) {
              Alert.alert(t('clubScreens.details.inviteRequired'), inviteErr?.message || t('clubScreens.details.inviteOnlyMessage'));
            }
          } else {
            await clubsApi.joinClub(clubId);
          }
        }
        clubsApi.invalidateClubsCache();
    invalidateClubsLandingCache();
        await loadClubs({
          silent: true,
          reset: true,
          page: 1,
          filter: selectedFilterRef.current,
          query: debouncedQueryRef.current,
        });
        await loadInvites();
      } catch (err: any) {
        Alert.alert(t('clubs.screen.communityClubs'), err?.message || t('clubs.alerts.updateMembershipFailed'));
      } finally {
        setBusyClubId(null);
      }
    },
    [clubs, joinedClubSet, loadClubs, loadInvites]
  );

  const handleClubPress = useCallback(
    (clubItem: Club) => {
      prefetchClubDetails(clubItem);
      navigation.navigate('ClubDetails', {
        clubId: clubItem.id,
        initialClub: {
          id: clubItem.id,
          name: clubItem.name,
          description: clubItem.description,
          type: clubItem.type,
          mode: clubItem.mode,
          memberCount: clubItem.memberCount,
          isJoined: clubItem.isJoined,
          isActive: clubItem.isActive,
          tags: clubItem.tags,
          coverImage: clubItem.coverImage,
          createdAt: clubItem.createdAt,
          updatedAt: clubItem.updatedAt,
        },
      });
    },
    [navigation, prefetchClubDetails]
  );

  const handleClassPress = useCallback(
    (classItem: MyClassSummary, teacherAccess?: 'teaching' | 'other') => {
      prefetchClassDetails(classItem);

      navigation.navigate('ClassDetails', {
        classId: classItem.id,
        className: classItem.name,
        myRole: classItem.myRole,
        linkedStudentId: classItem.linkedStudentId,
        linkedTeacherId: classItem.linkedTeacherId,
        homeroomTeacherId: classItem.homeroomTeacher?.id,
        teacherClassAccess:
          user?.role === 'TEACHER' && !isAdminOrStaff ? teacherAccess : undefined,
        initialSummary: {
          id: classItem.id,
          name: classItem.name,
          grade: classItem.grade,
          section: classItem.section,
          track: classItem.track,
          studentCount: classItem.studentCount,
          myRole: classItem.myRole,
          linkedStudentId: classItem.linkedStudentId,
          linkedTeacherId: classItem.linkedTeacherId,
          homeroomTeacher: classItem.homeroomTeacher,
          isHomeroom: classItem.isHomeroom,
        },
      });
    },
    [navigation, prefetchClassDetails, user?.role, isAdminOrStaff]
  );

  const handleCreateClub = useCallback(
    () => navigation.navigate('CreateClub'),
    [navigation]
  );

  const handleOpenInvites = useCallback(
    () => navigation.navigate('ClubInvites'),
    [navigation]
  );

  const handleFilterChange = useCallback(
    (filter: ClubFilter) => setSelectedFilter(filter),
    []
  );

  // ── Derived data ─────────────────────────────────────────────────────────
  const filteredClubs = useMemo(() => {
    let data = clubs;
    if (selectedFilter === 'joined')   data = data.filter((c) => c.isJoined || joinedClubSet.has(c.id));
    if (selectedFilter === 'discover') data = data.filter((c) => !c.isJoined && !joinedClubSet.has(c.id));
    if (normalizedQuery) {
      data = data.filter((c) => {
        const tags = (c.tags || []).join(' ').toLowerCase();
        return (
          c.name.toLowerCase().includes(normalizedQuery) ||
          c.description.toLowerCase().includes(normalizedQuery) ||
          tags.includes(normalizedQuery)
        );
      });
    }
    return data;
  }, [clubs, joinedClubSet, selectedFilter, normalizedQuery]);


  // ── Class Hub Render ───────────────────────────────────────────────────────
  if (shouldShowClassHub) {
    // Admin/staff with no teaching duties have no "own" class to land on — show
    // the school-wide directory + Discipline Workbench instead of a dead end.
    if (isAdminOrStaff && !hasLinkedTeacherProfile) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: isDark ? colors.card : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#F1F5F9' }}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={openSidebar} style={styles.headerIconButton}>
                <Ionicons name="menu-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.headerTitleWrap}>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                  {t('classes.directory.title')}
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.adminSearchWrap}>
              <View style={[styles.adminSearchBar, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
                <TextInput
                  style={[styles.adminSearchInput, { color: colors.text }]}
                  placeholderTextColor={colors.textTertiary}
                  placeholder={t('clubs.screen.searchClassesPlaceholder')}
                  value={adminSearchQuery}
                  onChangeText={(text) => { setAdminSearchQuery(text); loadAdminClasses(text); }}
                />
              </View>
            </View>
          </SafeAreaView>

          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl refreshing={loadingAdminClasses} onRefresh={() => loadAdminClasses(adminSearchQuery)} tintColor={colors.primary} colors={[colors.primary]} />
            }
          >
            {canUseDisciplineWorkbench && (
              <TouchableOpacity
                style={[styles.disciplineWorkbenchCard, { backgroundColor: isDark ? '#062B34' : '#ECFEFF', borderWidth: 1, borderColor: isDark ? '#0E7490' : '#A5F3FC', shadowOpacity: 0 }]}
                onPress={() => navigation.navigate('DisciplineWorkbench')}
                activeOpacity={0.9}
              >
                <View style={styles.disciplineWorkbenchGradient}>
                  <View style={[styles.disciplineWorkbenchIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#CFFAFE' }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#67E8F9' : '#0E7490'} />
                  </View>
                  <View style={styles.disciplineWorkbenchBody}>
                    <Text style={[styles.disciplineWorkbenchTitle, { color: isDark ? '#ECFEFF' : '#0F172A' }, isKhmer && styles.khmerHeadingText]}>
                      {t('clubs.screen.disciplineWorkbench')}
                    </Text>
                    <Text style={[styles.disciplineWorkbenchSubtitle, { color: isDark ? '#67E8F9' : '#0E7490' }, isKhmer && styles.khmerInlineText]}>
                      {t('clubs.screen.disciplineWorkbenchSubtitle')}
                    </Text>
                  </View>
                  <View style={[styles.disciplineWorkbenchArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF' }]}>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#67E8F9' : '#0E7490'} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {loadingAdminClasses ? (
              <View style={[styles.schoolClassesGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={`skel-${i}`} style={styles.gridItemWrapper}>
                    <SchoolClassCardSkeleton />
                  </View>
                ))}
              </View>
            ) : adminClasses.length === 0 ? (
              <View style={[styles.schoolClassesEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.schoolClassesEmptyIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]}>
                  <Ionicons name="albums-outline" size={26} color={isDark ? '#A5B4FC' : '#6366F1'} />
                </View>
                <Text style={[styles.schoolClassesEmptyTitle, { color: colors.text }, isKhmer && styles.khmerHeadingText]}>
                  {t('clubs.screen.noClassesDirectory')}
                </Text>
                <Text style={[styles.schoolClassesEmptySubtitle, { color: colors.textTertiary }]}>
                  {t('clubs.screen.noClassesHint')}
                </Text>
              </View>
            ) : (
              <View style={[styles.schoolClassesGrid, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 0 }]}>
                {adminClasses.map((item, idx) => (
                  <View key={item.id} style={styles.gridItemWrapper}>
                    <SchoolClassCard item={item} index={idx} variant="grid" onPress={handleClassPress} />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    if (selectedClassId) {
      const isTeacher = user?.role === 'TEACHER';
      const classesForSelector = isTeacher && teacherClassSplit.teaching.length > 0 ? teacherClassSplit.teaching : schoolClasses;
      const classSelectorUi = classesForSelector.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10, alignItems: 'center' }}>
          {classesForSelector.map(cls => {
             const isActive = selectedClassId === cls.id;
             return (
               <TouchableOpacity 
                  key={cls.id} 
                  onPress={() => setSelectedClassId(cls.id)}
                  style={{ 
                    paddingHorizontal: 18, 
                    paddingVertical: 10, 
                    borderRadius: 9999, 
                    borderWidth: 1.5,
                    borderColor: isActive ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                    backgroundColor: isActive ? colors.primary : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
               >
                 <Text style={{ color: isActive ? '#FFFFFF' : colors.textSecondary, fontWeight: isActive ? '700' : '600', fontSize: 14 }}>{cls.name}</Text>
               </TouchableOpacity>
             );
          })}
        </ScrollView>
      ) : null;

      const xp = stats?.xp ?? 0;

      return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#FFFFFF' }}>
           <SafeAreaView edges={['top']} style={{ backgroundColor: isDark ? colors.card : '#FFFFFF', zIndex: 10, borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                 {/* Avatar */}
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {user?.profilePictureUrl ? (
                      <Image source={{ uri: user.profilePictureUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                    ) : (
                      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>{(user?.firstName || 'S')[0]}</Text>
                      </View>
                    )}
                    {!!stats?.level && (
                      <View style={{ position: 'absolute', bottom: -2, right: -4, backgroundColor: '#F59E0B', paddingHorizontal: 4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: isDark ? colors.card : '#FFFFFF' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FFFFFF' }}>{stats.level}</Text>
                      </View>
                    )}
                 </View>

                 {/* Stats & Actions */}
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#EA580C22' : '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, gap: 6, borderWidth: 1, borderColor: isDark ? '#EA580C44' : '#FED7AA' }}>
                      <Ionicons name="flame" size={15} color="#EA580C" />
                      <Text style={{ color: '#EA580C', fontWeight: 'bold' }}>{stats?.currentStreak ?? 0}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#F59E0B22' : '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, gap: 6, borderWidth: 1, borderColor: isDark ? '#F59E0B44' : '#FDE68A' }}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>{xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp} XP</Text>
                    </View>

                    <TouchableOpacity style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', marginLeft: 4 }}>
                      <Ionicons name="chatbubble-ellipses" size={18} color="#0EA5E9" />
                    </TouchableOpacity>
                 </View>
              </View>
           </SafeAreaView>

           <ClassHubView 
             classId={selectedClassId} 
             myRole={user?.role} 
             hideBackButton={true} 
             hideAppBar={true}
             hideTopSafe={true} 
             classSelector={classSelectorUi}
           />
        </View>
      );
    }

    if (loading || loadingSchoolClasses) {
      // Return a simple loading state that doesn't look like the Bento grid
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
           <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    // Render Empty State if not loading and no selected class
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <Ionicons name="school-outline" size={80} color={colors.textTertiary} />
         <Text style={[{ marginTop: 20, color: colors.text, fontSize: 18, fontWeight: 'bold' }, isKhmer && styles.khmerHeadingText]}>{t('classes.noClassesTitle')}</Text>
         <Text style={[{ marginTop: 8, color: colors.textSecondary, textAlign: 'center', marginHorizontal: 32 }, isKhmer && styles.khmerInlineText]}>
            {t('classes.noClassesDesc')}
         </Text>
      </View>
    );
  }

}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (
  colors: any,
  isDark: boolean,
  isTablet: boolean,
  isLargeTablet: boolean,
  isThreeColumnTablet: boolean,
  isPortraitTablet: boolean
) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: isTablet ? 64 : 40,
    paddingHorizontal: isTablet ? 12 : 0,
  },
  animatedTabContent: {
    flex: 1,
    flexDirection: (isThreeColumnTablet || isPortraitTablet) ? 'row' : 'column',
    gap: (isThreeColumnTablet || isPortraitTablet) ? 14 : 0,
    paddingHorizontal: (isThreeColumnTablet || isPortraitTablet) ? 8 : 0,
  },
  tabletContentShell: {
    width: '100%',
    maxWidth: isThreeColumnTablet ? undefined : isPortraitTablet ? 980 : isLargeTablet ? 980 : 900,
    alignSelf: 'center',
  },
  tabletListShell: {
    width: '100%',
    maxWidth: isLargeTablet ? 1100 : 900,
    alignSelf: 'center',
  },
  tabletThreeColumnBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 8,
    paddingTop: 14,
  },
  tabletCenterList: {
    flex: 1,
    minWidth: 0,
  },
  tabletLeftRail: {
    width: isPortraitTablet ? 238 : 260,
    paddingTop: 8,
  },
  tabletRightRail: {
    width: 280,
    paddingTop: 8,
    gap: 14,
  },
  tabletRailCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  tabletRailTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
  },
  tabletShortcutRow: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
  },
  tabletShortcutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  tabletRailStatRow: {
    borderRadius: 16,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    padding: 16,
    marginBottom: 12,
  },
  tabletRailStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
  },
  tabletRailStatLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  tabletRailButton: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
  },
  tabletRailButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  tabletClassRow: {
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
  },
  tabletClassIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletClassText: {
    flex: 1,
    minWidth: 0,
  },
  tabletClassName: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
  },
  tabletClassMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  listHeader: {
    paddingBottom: 16,
  },
  loadingBlurShell: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  loadingBlurContent: {
    paddingBottom: 18,
  },

  // ── Hero header (mirrors LearnScreen) ───────────────────────────────────
  heroHeaderBg: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerSafe: {
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    maxWidth: isTablet ? (isLargeTablet ? 1100 : 900) : undefined,
    alignSelf: 'center',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerIconButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Legacy alias retained for tablet-rail code paths that still reference it
  iconButton: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  // ── Pill tab bar (mirrors LearnScreen) ───────────────────────────────────
  tabsScroll: {
    maxHeight: 68,
    maxWidth: isTablet ? (isLargeTablet ? 1100 : 900) : undefined,
    alignSelf: isTablet ? 'center' : undefined,
    width: '100%',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 8,
    paddingBottom: 14,
    alignItems: 'center',
  },
  tabButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 9999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  inviteBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Shortcuts
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  shortcutItem: {
    alignItems: 'center',
    gap: 8,
  },
  shortcutOuter: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  shortcutOuterActive: {
    borderColor: COLORS.primaryDark,
  },
  shortcutInner: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  shortcutLabelActive: {
    color: COLORS.primaryDark,
  },

  // Banner
  bannerContainer: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  bannerGradient: {
    width: '100%',
    height: 120,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bannerDecorCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -50,
    right: -30,
  },
  bannerDecorCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -30,
    left: 40,
  },
  bannerDecorCircle3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: 20,
    left: -20,
  },
  bannerLeft: {
    marginRight: 12,
    zIndex: 1,
  },
  bannerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerRight: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#E0F9FD',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  bannerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  bannerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 16,
    backgroundColor: COLORS.primary,
  },

  // Section & Search
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  // Pill-shaped search inside the hero, mirrors LearnScreen
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    width: isTablet ? '100%' : undefined,
    maxWidth: isTablet ? (isLargeTablet ? 1068 : 868) : undefined,
    alignSelf: isTablet ? 'center' : undefined,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    padding: 0,
  },

  schoolClassesSection: {
    paddingBottom: 24,
  },
  disciplineWorkbenchCard: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0E7490',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  disciplineWorkbenchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  disciplineWorkbenchDecor1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  disciplineWorkbenchDecor2: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    left: 60,
  },
  disciplineWorkbenchIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disciplineWorkbenchBody: {
    flex: 1,
    minWidth: 0,
  },
  disciplineWorkbenchTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  disciplineWorkbenchSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  disciplineWorkbenchArrow: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolClassesSubsection: {
    paddingHorizontal: 0,
  },
  teacherTwoSectionWrap: {
    marginTop: 4,
    gap: 18,
  },
  teacherSectionCard: {
    marginHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  teacherSeeAllInCard: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  teacherSectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  teacherSectionIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherSectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  teacherSectionCardTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  teacherSectionCardMeta: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: '500',
  },
  /** Class grid inside a teacher section card. */
  schoolClassesGridInCard: {
    paddingHorizontal: 16,
  },
  gridItemMulticol: {
    marginBottom: 0,
  },
  classSubsectionTitle: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 2,
    paddingHorizontal: 12,
  },
  schoolClassesHeader: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  schoolClassesHeaderInfo: {
    marginBottom: 12,
  },
  schoolClassesTitle: {
    fontSize: 18.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  schoolClassesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  schoolClassesTitleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  classCountBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    marginLeft: 4,
  },
  classCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  schoolClassesSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  yearSelectorContainer: {
    marginBottom: 8,
  },
  yearSelector: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 4,
    gap: 8,
  },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  yearPillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  yearPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  yearPillTextActive: {
    color: '#FFFFFF',
  },
  adminSearchWrap: {
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  adminSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    gap: 10,
  },
  adminSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  schoolClassesLoading: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
  },
  schoolClassesLoadingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  schoolClassesErrorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  schoolRetryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  schoolRetryText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  schoolClassesEmpty: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    minHeight: 188,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  schoolClassesEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  schoolClassesEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  schoolClassesEmptySubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  notLinkedCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  notLinkedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  notLinkedTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  notLinkedSubtitle: {
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  schoolClassesGrid: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  schoolClassesGridTight: {
    paddingHorizontal: 12,
    marginTop: 4,
  },
  /** iPad / tablet: 2–3 columns for class cards */
  schoolClassesGridMulticol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItemWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  schoolClassCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 18,
    shadowColor: isDark ? '#000000' : '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  schoolClassMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  schoolClassBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolClassBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  schoolClassTextCenter: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  schoolClassTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  schoolClassName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    flexShrink: 1,
  },
  schoolClassGradePill: {
    backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  schoolClassGradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  schoolClassSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  schoolClassIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  genderStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderStatText: {
    fontSize: 10,
    fontWeight: '800',
  },
  genderStatValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  schoolClassFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schoolClassChips: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  schoolClassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  schoolClassChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  schoolClassChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  seeAllSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(20,184,166,0.12)' : '#F0FDFA',
    borderWidth: 1.25,
    borderColor: isDark ? 'rgba(20,184,166,0.3)' : '#99F6E4',
    gap: 6,
  },
  seeAllGridBtn: {
    width: '100%',
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    marginBottom: 12,
  },
  seeAllGridText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14B8A6',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  classListCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  seeAllTapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderTopWidth: 1,
  },
  seeAllTapText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Cards
  abstractShape: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  clubCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  cardDescription: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  joinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  joinPillJoined: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  joinPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  joinPillTextJoined: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  cardProgressTrack: {
    height: 8,
    backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
    marginHorizontal: 12,
    marginBottom: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 4,
  },
  khmerInlineText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  khmerHeadingText: {
    includeFontPadding: true,
    textAlignVertical: 'center',
    lineHeight: 30,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  
  // ── BENTO BOX REDESIGN STYLES ─────────────────────────────────────────
  bentoContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  bentoNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bentoNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoNavTitleRow: {
    flex: 1,
    alignItems: 'center',
  },
  bentoNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  bentoHeroCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  bentoHeroGradient: {
    padding: 24,
    minHeight: 160,
  },
  bentoHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bentoHeroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bentoHeroPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bentoHeroAvatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoHeroAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoHeroAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bentoHeroAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0EA5E9',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  bentoHeroTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  bentoHeroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bentoHeroStatsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bentoStatsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  bentoStatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  bentoStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bentoStatTextWrap: {
    flex: 1,
  },
  bentoStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  bentoStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  bentoActionGrid: {
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  bentoActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoActionWrap: {
    flex: 1,
  },
  bentoActionBg: {
    padding: 16,
    borderRadius: 20,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  bentoActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bentoActionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  bentoSwimlaneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cleanYearPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  cleanYearPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cleanTeacherSectionWrap: {
    marginTop: 8,
    gap: 32,
    paddingBottom: 16,
  },
  cleanSectionBlock: {
    marginBottom: 24,
  },
  cleanSectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cleanSectionSeeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cleanDeckScrollContent: {
    paddingRight: 20,
    paddingBottom: 8,
  },
});
