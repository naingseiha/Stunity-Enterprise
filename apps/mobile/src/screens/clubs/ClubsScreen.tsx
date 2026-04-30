/**
 * ClubsScreen — Optimized for performance
 *
 * Perf changes (mirrors FeedScreen patterns):
 * - FlatList → FlashList (cell recycling, 120fps capable)
 * - estimatedItemSize for immediate layout
 * - drawDistance pre-renders off-screen cells
 * - getItemType bucketed recycling by club type
 * - ClubCard extracted as React.memo — stable between renders
 * - All callbacks wrapped in useCallback with correct deps
 * - renderHeader wrapped in useCallback
 * - removeClippedSubviews on Android only
 * - Skeleton loading on initial load instead of full-page spinner
 * - Incremental paginated loading with FlashList onEndReached
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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
  Dimensions,
  FlatList,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { clubsApi, classesApi } from '@/api';
import type { Club } from '@/api/clubs';
import type { MyClassSummary } from '@/api/classes';
import { useNavigationContext, useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import StunityLogo from '../../../assets/Stunity.svg';
import { ClubCard } from '@/components/clubs/ClubCard';
import { BannerCarousel, ShortcutItem, COLORS, CLUBS_PAGE_SIZE } from '@/components/clubs/ClubsComponents';
import { ClubsHeaderSkeleton, ClubCardSkeleton } from '@/components/clubs/ClubsSkeletons';
import { useTranslation } from 'react-i18next';

type ClubFilter = 'all' | 'joined' | 'discover';

const CLASS_COLORS = [
  { bg: '#EEF2FF', text: '#4338CA', iconBg: '#DBEAFE', accent: '#3730A3' }, // Indigo/Blue
  { bg: '#F5F3FF', text: '#6D28D9', iconBg: '#EDE9FE', accent: '#5B21B6' }, // Purple
  { bg: '#FFF7ED', text: '#C2410C', iconBg: '#FFEDD5', accent: '#9A3412' }, // Orange
  { bg: '#F0FDF4', text: '#15803D', iconBg: '#DCFCE7', accent: '#166534' }, // Green
];

const getCurrentMonthLabel = (): string => {
  const now = new Date();
  return `Month ${now.getMonth() + 1}`;
};

const getCurrentRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => date.toISOString().split('T')[0];
  return { startDate: format(start), endDate: format(end) };
};

const canUseInitialSchoolClasses = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.schoolId && (user.role === 'STUDENT' || user.role === 'TEACHER' || user.role === 'PARENT'));

const SchoolClassCard = React.memo(
  ({ item, index, onPress }: { item: MyClassSummary; index: number; onPress: (item: MyClassSummary) => void }) => {
    const { t, i18n } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const isKhmer = i18n.language?.startsWith('km');
    const colorStyle = CLASS_COLORS[index % CLASS_COLORS.length];
    
    return (
      <TouchableOpacity 
        style={[
          styles.schoolClassCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => onPress(item)} 
        activeOpacity={0.8}
      >
        <View style={styles.schoolClassContent}>
          <Text style={[styles.schoolClassName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.schoolClassMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {t('classes.directory.gradeShort', { grade: item.grade })}
            {item.section ? `•${item.section}` : ''} • {t('classes.directory.studentCountShort', { count: item.studentCount })}
          </Text>
        </View>

        <View style={[styles.schoolClassIconWrap, { backgroundColor: isDark ? `${colorStyle.accent}24` : colorStyle.iconBg }]}>
          <Ionicons name="school" size={18} color={colorStyle.text} />
        </View>
      </TouchableOpacity>
    );
  }
);


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ClubsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const isKhmer = i18n.language?.startsWith('km');
  const navigation = useNavigation<any>();
  const { openSidebar } = useNavigationContext();
  const user = useAuthStore((state) => state.user);
  const initialClubsPage = clubsApi.getCachedClubsPaginated({ page: 1, limit: CLUBS_PAGE_SIZE });
  const initialAcademicYears = classesApi.getCachedAcademicYears() || [];
  const initialSelectedYearId = initialAcademicYears.find((year) => year.isCurrent)?.id || null;
  const initialSchoolClasses = canUseInitialSchoolClasses(user)
    ? (classesApi.getCachedMyClasses({ academicYearId: initialSelectedYearId || undefined }) || [])
    : [];
  const hasInitialVisibleContent = Boolean(initialClubsPage || initialSchoolClasses.length > 0);

  const [loading, setLoading]                   = useState(!hasInitialVisibleContent);
  const [refreshing, setRefreshing]             = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter]     = useState<ClubFilter>('all');
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
  const [academicYears, setAcademicYears]       = useState<any[]>(initialAcademicYears);
  const [selectedYearId, setSelectedYearId]     = useState<string | null>(initialSelectedYearId);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminClasses, setAdminClasses]         = useState<MyClassSummary[]>([]);
  const [loadingAdminClasses, setLoadingAdminClasses] = useState(false);
  const [inviteCount, setInviteCount]           = useState(0);

  const pageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);
  const hasMoreClubsRef = useRef(true);
  const hasLoadedContentRef = useRef(Boolean(initialClubsPage));
  const selectedFilterRef = useRef<ClubFilter>(selectedFilter);
  const debouncedQueryRef = useRef('');
  const prefetchedClassDetailKeysRef = useRef<Set<string>>(new Set());
  const prefetchedClubDetailKeysRef = useRef<Set<string>>(new Set());
  const hasFocusedOnceRef = useRef(false);
  const canViewSchoolClasses = Boolean(
    user?.schoolId && (user?.role === 'STUDENT' || user?.role === 'TEACHER' || user?.role === 'PARENT')
  );
  const isAdminOrStaff = Boolean(
    user?.role === 'ADMIN' || user?.role === 'STAFF' || user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN'
  );

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
      console.error('Failed to load academic years', err);
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
        const data = await classesApi.getMyClasses({ force, academicYearId: selectedYearId || undefined });
        setSchoolClasses(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setSchoolClassesError(err?.message || t('clubs.screen.loadSchoolClassesFailed'));
      } finally {
        setLoadingSchoolClasses(false);
      }
    },
    [canViewSchoolClasses, selectedYearId, t]
  );

  const loadAdminClasses = useCallback(async (query = '') => {
    if (!isAdminOrStaff) return;
    try {
      setLoadingAdminClasses(true);
      const data = await classesApi.getClasses({ search: query });
      setAdminClasses(data);
    } catch (err) {
      console.error('Failed to load admin classes', err);
    } finally {
      setLoadingAdminClasses(false);
    }
  }, [isAdminOrStaff]);

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
      const { clubs: pageClubs, pagination } = await clubsApi.getClubsPaginated(params, isUserAction);
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
  }, [loadSchoolClasses]);

  useEffect(() => {
    if (isAdminOrStaff) {
      loadAdminClasses();
    }
  }, [loadAdminClasses, isAdminOrStaff]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  useFocusEffect(
    useCallback(() => {
      // Skip first focus because initial loading already runs on mount.
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

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
    const visibleClasses = (isAdminOrStaff ? adminClasses : schoolClasses).slice(0, 3);
    if (visibleClasses.length === 0) return;

    const task = InteractionManager.runAfterInteractions(() => {
      visibleClasses.forEach(prefetchClassDetails);
    });

    return () => {
      task.cancel?.();
    };
  }, [adminClasses, isAdminOrStaff, prefetchClassDetails, schoolClasses]);

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

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMoreClubs(true);
    setRefreshing(true);
    clubsApi.invalidateClubsCache();
    if (canViewSchoolClasses) {
      classesApi.invalidateMyClassesCache();
    }

    Promise.all([
      loadClubs({ silent: true, reset: true, page: 1, filter: selectedFilterRef.current, query: debouncedQueryRef.current }),
      isAdminOrStaff ? loadAdminClasses(adminSearchQuery) : loadSchoolClasses(true),
      loadInvites(),
    ]).finally(() => setRefreshing(false));
  }, [adminSearchQuery, isAdminOrStaff, loadAdminClasses, loadClubs, loadInvites, loadSchoolClasses]);

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
    (classItem: MyClassSummary) => {
      prefetchClassDetails(classItem);

      navigation.navigate('ClassDetails', {
        classId: classItem.id,
        className: classItem.name,
        myRole: classItem.myRole,
        linkedStudentId: classItem.linkedStudentId,
        linkedTeacherId: classItem.linkedTeacherId,
        homeroomTeacherId: classItem.homeroomTeacher?.id,
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
        },
      });
    },
    [navigation, prefetchClassDetails]
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

  // ── Header ────────────────────────────────────────────────────────────────
  const renderHeader = useCallback(() => {
    const schoolClassesSubtitle = isAdminOrStaff
      ? t('clubs.screen.schoolClassesSubtitle.admin')
      : user?.role === 'TEACHER'
        ? t('clubs.screen.schoolClassesSubtitle.teacher')
        : user?.role === 'PARENT'
          ? t('clubs.screen.schoolClassesSubtitle.parent')
          : t('clubs.screen.schoolClassesSubtitle.student');

    const shortcuts = [
      { id: 'all',      label: t('clubs.screen.shortcuts.allClubs'), icon: 'sparkles',    color: COLORS.primary,     bgInner: isDark ? '#0F2F37' : COLORS.primaryLight },
      { id: 'joined',   label: t('clubs.screen.shortcuts.myClubs'),  icon: 'heart',       color: '#FB7185',          bgInner: isDark ? '#3A1720' : '#FFF1F2' },
      { id: 'discover', label: t('clubs.screen.shortcuts.discover'), icon: 'compass',     color: '#F59E0B',          bgInner: isDark ? '#3B2B09' : '#FEF3C7' },
      { id: 'create',   label: t('clubs.screen.shortcuts.create'),   icon: 'add-circle',  color: COLORS.primaryDark, bgInner: isDark ? '#0F2F37' : COLORS.primaryLight },
    ];

    return (
      <View style={styles.listHeader}>
        {/* Shortcuts */}
        <View style={styles.shortcutsRow}>
          {shortcuts.map((s) => {
            const isActive = selectedFilter === s.id;
            return (
              <ShortcutItem
                key={s.id}
                s={s}
                isActive={isActive}
                onPress={() => s.id === 'create' ? handleCreateClub() : handleFilterChange(s.id as ClubFilter)}
              />
            );
          })}
        </View>

        {/* Banner Carousel */}
        <BannerCarousel navigation={navigation} />

        {/* School Classes Section */}
        {(canViewSchoolClasses || isAdminOrStaff) && (
          <View style={styles.schoolClassesSection}>
            <View style={styles.schoolClassesHeader}>
              <View style={styles.schoolClassesHeaderInfo}>
                <Text style={[styles.schoolClassesTitle, { color: colors.text }]}>
                  {isAdminOrStaff ? t('classes.directory.title') : t('clubs.screen.schoolClasses')}
                </Text>
                <Text style={[styles.schoolClassesSubtitle, { color: colors.textSecondary }]}>
                  {schoolClassesSubtitle}
                </Text>
              </View>

              {/* Academic Year Selector - Now in its own row for better clarity */}
              {!isAdminOrStaff && academicYears.length > 1 && (
                <View style={styles.yearSelectorContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.yearSelector}
                  >
                    {academicYears.map((year) => (
                      <TouchableOpacity
                        key={year.id}
                        onPress={() => setSelectedYearId(year.id)}
                        style={[
                          styles.yearPill,
                          { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                          selectedYearId === year.id && styles.yearPillActive
                        ]}
                      >
                        {selectedYearId === year.id && (
                          <Ionicons name="calendar" size={14} color="#FFF" style={{ marginRight: 6 }} />
                        )}
                        <Text style={[
                          styles.yearPillText,
                          { color: colors.textSecondary },
                          selectedYearId === year.id && styles.yearPillTextActive
                        ]}>
                          {year.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {isAdminOrStaff && (
              <View style={styles.adminSearchWrap}>
                <View style={[styles.adminSearchBar, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.adminSearchInput, { color: colors.text }]}
                    placeholderTextColor={colors.textTertiary}
                    placeholder={t('clubs.screen.searchClassesPlaceholder')}
                    value={adminSearchQuery}
                    onChangeText={(text) => {
                      setAdminSearchQuery(text);
                      loadAdminClasses(text);
                    }}
                  />
                </View>
              </View>
            )}

            {loadingSchoolClasses || loadingAdminClasses ? (
              <View style={[styles.schoolClassesLoading, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={COLORS.primaryDark} />
                <Text style={[styles.schoolClassesLoadingText, { color: colors.textSecondary }, isKhmer && styles.khmerInlineText]}>{t('clubs.screen.updatingClasses')}</Text>
              </View>
            ) : schoolClassesError ? (
              <View style={[styles.schoolClassesLoading, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.schoolClassesErrorText}>{schoolClassesError}</Text>
                <TouchableOpacity
                  style={styles.schoolRetryBtn}
                  onPress={() => isAdminOrStaff ? loadAdminClasses(adminSearchQuery) : loadSchoolClasses(true)}
                >
                  <Text style={[styles.schoolRetryText, isKhmer && styles.khmerInlineText]}>{t('common.tryAgain')}</Text>
                </TouchableOpacity>
              </View>
            ) : (isAdminOrStaff ? adminClasses : schoolClasses).length === 0 ? (
              <View style={[styles.schoolClassesEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textTertiary} />
                <Text style={[styles.schoolClassesEmptyText, { color: colors.textSecondary }]}>
                  {isAdminOrStaff 
                    ? t('clubs.screen.noClassesDirectory')
                    : user?.role === 'PARENT'
                      ? t('clubs.screen.noLinkedChildClasses')
                      : t('clubs.screen.noClassesYear')}
                </Text>
              </View>
            ) : (
              <View style={styles.schoolClassesGrid}>
                {(isAdminOrStaff ? adminClasses : schoolClasses).slice(0, 6).map((item, idx) => (
                  <View key={item.id} style={styles.gridItemWrapper}>
                    <SchoolClassCard item={item} index={idx} onPress={handleClassPress} />
                  </View>
                ))}
                
                {(isAdminOrStaff ? adminClasses : schoolClasses).length > 6 && (
                  <TouchableOpacity 
                    style={[styles.seeAllGridBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    onPress={() => {
                        navigation.navigate('ClassDirectory');
                    }}
                  >
                    <Text style={[styles.seeAllGridText, { color: colors.textSecondary }]}>
                      {t('clubs.screen.seeAllCount', { count: (isAdminOrStaff ? adminClasses : schoolClasses).length })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Section heading + search */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }, isKhmer && styles.khmerInlineText]}>{canViewSchoolClasses ? t('clubs.screen.communityClubs') : t('clubs.screen.todaysClubs')}</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleFilterChange('all')}>
            <Text style={[styles.viewAllText, isKhmer && styles.khmerInlineText]}>{t('learn.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('clubs.screen.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [
    canViewSchoolClasses,
    isAdminOrStaff,
    academicYears,
    selectedYearId,
    adminClasses,
    adminSearchQuery,
    handleClassPress,
    handleCreateClub,
    handleFilterChange,
    loadAdminClasses,
    loadSchoolClasses,
    loadingAdminClasses,
    loadingSchoolClasses,
    navigation,
    schoolClasses,
    schoolClassesError,
    searchQuery,
    selectedFilter,
    colors,
    isDark,
    isKhmer,
    t,
    user?.role,
  ]);

  // ── Render item (memoized card) ───────────────────────────────────────────
  const renderClubCard = useCallback(
    ({ item }: { item: Club }) => (
      <ClubCard
        item={item}
        isJoined={Boolean(item.isJoined || joinedClubSet.has(item.id))}
        isBusy={busyClubId === item.id}
        onPress={handleClubPress}
        onToggleMembership={handleToggleMembership}
      />
    ),
    [joinedClubSet, busyClubId, handleClubPress, handleToggleMembership]
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
          {selectedFilter === 'joined' && !searchQuery ? t('clubs.screen.noJoined') : t('clubs.screen.noFound')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
          {searchQuery ? t('learn.empty.noCoursesSubtitle') : t('clubs.screen.exploreMore')}
        </Text>
      </View>
    ),
    [selectedFilter, searchQuery, t, colors.textSecondary, colors.textTertiary]
  );

  const renderFooter = useCallback(
    () =>
      isLoadingMore ? (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={COLORS.primaryDark} />
          <Text style={[styles.footerLoadingText, { color: colors.textSecondary }, isKhmer && styles.khmerInlineText]}>{t('clubs.screen.loadingMore')}</Text>
        </View>
      ) : null,
    [isLoadingMore, isKhmer, t, colors.textSecondary]
  );

  // ── getItemType — bucket by club type for recycling ───────────────────────
  const getItemType = useCallback(
    (item: Club) => item.type ?? 'CASUAL_STUDY_GROUP',
    []
  );

  const keyExtractor = useCallback((item: Club) => item.id, []);

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <SafeAreaView edges={['top']} style={[styles.headerSafe, { backgroundColor: colors.background }]}>
          <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={openSidebar} style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="menu-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <StunityLogo width={108} height={30} />
            <View style={styles.topBarActions}>
              <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="add-circle-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="mail-unread-outline" size={22} color={colors.text} />
                {inviteCount > 0 ? (
                  <View style={styles.inviteBadge}>
                    <Text style={styles.inviteBadgeText}>{inviteCount > 99 ? '99+' : String(inviteCount)}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="refresh-outline" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.safeArea}>
          <BlurView
            intensity={isDark ? 42 : 72}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.loadingBlurShell,
              {
                backgroundColor: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.18)',
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.loadingBlurContent}>
              <ClubsHeaderSkeleton />
              {[1, 2, 3].map((i) => <ClubCardSkeleton key={i} />)}
            </ScrollView>
          </BlurView>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={[styles.headerSafe, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={openSidebar} style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="menu-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <StunityLogo width={108} height={30} />
          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={handleCreateClub} style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="add-circle-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenInvites} style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="mail-unread-outline" size={22} color={colors.text} />
              {inviteCount > 0 ? (
                <View style={styles.inviteBadge}>
                  <Text style={styles.inviteBadgeText}>{inviteCount > 99 ? '99+' : String(inviteCount)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="refresh-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      <View style={styles.safeArea}>
        {/* @ts-ignore FlashList types omit some valid props */}
        <FlashList
          data={filteredClubs}
          keyExtractor={keyExtractor}
          renderItem={renderClubCard}
          estimatedItemSize={180}
          drawDistance={600}
          getItemType={getItemType}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreClubs}
          onEndReachedThreshold={0.4}
          // iOS: removeClippedSubviews causes native layer hide/show jank — Android only
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
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

  headerSafe: {
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  schoolClassesSection: {
    paddingBottom: 24,
  },
  schoolClassesHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  schoolClassesHeaderInfo: {
    marginBottom: 12,
  },
  schoolClassesTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  schoolClassesSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  yearSelectorContainer: {
    marginBottom: 8,
  },
  yearSelector: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 4,
    gap: 8,
  },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  yearPillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  yearPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  yearPillTextActive: {
    color: '#FFFFFF',
  },
  adminSearchWrap: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  adminSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  adminSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  schoolClassesLoading: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
  },
  schoolClassesLoadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
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
    borderColor: '#E2E8F0',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  schoolClassesEmptyText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  schoolClassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  gridItemWrapper: {
    width: '48.5%',
    marginBottom: 12,
  },
  schoolClassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 76,
  },
  schoolClassContent: {
    flex: 1,
    marginRight: 8,
  },
  schoolClassName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  schoolClassMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },
  schoolClassIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllGridBtn: {
    width: '48.5%',
    height: 76,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  seeAllGridText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
    borderBottomColor: '#F8FAFC',
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
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
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
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
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
    backgroundColor: '#F1F5F9',
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
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  khmerInlineText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
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
    color: COLORS.textMuted,
  },
});
