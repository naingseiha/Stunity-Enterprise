/**
 * LearnScreen — Optimized for performance
 *
 * Perf changes (mirrors FeedScreen patterns):
 * - ScrollView (no virtualization) → FlashList with flat data model
 * - estimatedItemSize for immediate layout measurement
 * - drawDistance pre-renders off-screen cells
 * - getItemType bucketing: 'header' | 'course' | 'enrolled_course' | 'path'
 * - CourseCard + PathCard extracted as React.memo components
 * - All render/handler callbacks wrapped in useCallback
 * - Skeleton loading on initial load instead of full-page spinner
 * - removeClippedSubviews on Android only
 *
 * Architecture: Flat data array with typed items for FlashList:
 *   { type: 'HEADER' }
 *   { type: 'COURSE', data: LearnCourse, showEnroll?: boolean, enrolledData?: LearnEnrolledCourse }
 *   { type: 'PATH', data: LearnPath }
 *   { type: 'EMPTY', title, subtitle, icon }
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import * as Haptics from 'expo-haptics';
import { Colors, Typography, Shadows } from '@/config';

import StunityLogo from '../../../assets/Stunity.svg';
import { learnApi } from '@/api';
import type { LearnCourse, LearnEnrolledCourse, LearnPath, LearningStats, LearnHubData } from '@/api/learn';
import { LearnStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';
import { Skeleton } from '@/components/common/Loading';
import { CourseCard } from '@/components/learn/CourseCard';
import { PathCard } from '@/components/learn/PathCard';
import { LearnHeaderSkeleton, CourseCardSkeleton, skeletonStyles } from '@/components/learn/LearnSkeletons';

type NavigationProp = LearnStackScreenProps<'LearnHub'>['navigation'];
type TabType = 'explore' | 'enrolled' | 'created' | 'paths';

const TABS: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'explore',  label: 'Explore',     icon: 'compass-outline'    },
  { id: 'enrolled', label: 'My Courses',  icon: 'book-outline'       },
  { id: 'created',  label: 'Created',     icon: 'school-outline'     },
  { id: 'paths',    label: 'Paths',       icon: 'git-branch-outline' },
];

interface TabColorPalette {
  inactiveBackground: string;
  inactiveBorder: string;
  inactiveIcon: string;
  inactiveText: string;
  activeBackground: string;
  activeBorder: string;
}

const UNIFIED_PALETTE: TabColorPalette = {
  inactiveBackground: '#FFFFFF',
  inactiveBorder: '#E2E8F0',
  inactiveIcon: '#64748B',
  inactiveText: '#475569',
  activeBackground: '#0F172A',
  activeBorder: '#0F172A',
};

const TAB_COLOR_PALETTES: Record<TabType, TabColorPalette> = {
  explore: { ...UNIFIED_PALETTE, activeBackground: '#14B8A6', activeBorder: '#14B8A6' },
  enrolled: { ...UNIFIED_PALETTE, activeBackground: '#14B8A6', activeBorder: '#14B8A6' },
  created: { ...UNIFIED_PALETTE, activeBackground: '#14B8A6', activeBorder: '#14B8A6' },
  paths: { ...UNIFIED_PALETTE, activeBackground: '#14B8A6', activeBorder: '#14B8A6' },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURED_CARD_WIDTH = SCREEN_WIDTH * 0.88;
const FEATURED_CARD_GAP = 16;

interface FeaturedCourseTheme {
  accentColor: string;
  accentDeepColor: string;
  accentSoftColor: string;
  badgeBackground: string;
  badgeColor: string;
  levelBackground: string;
  levelColor: string;
  iconColor: string;
  buttonColor: string;
  shadowColor: string;
  orbColor: string;
}

interface SuggestedCourseItem {
  course: LearnCourse;
  badgeLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme: FeaturedCourseTheme;
}

const FEATURED_COURSE_THEMES: FeaturedCourseTheme[] = [
  {
    accentColor: '#F59E0B',
    accentDeepColor: '#B45309',
    accentSoftColor: '#FEF3C7',
    badgeBackground: '#FFFBEB',
    badgeColor: '#F97316',
    levelBackground: '#EEF2FF',
    levelColor: '#4F46E5',
    iconColor: '#14B8A6',
    buttonColor: '#2563EB',
    shadowColor: 'rgba(37, 99, 235, 0.26)',
    orbColor: 'rgba(14, 165, 233, 0.12)',
  },
  {
    accentColor: '#7C3AED',
    accentDeepColor: '#6D28D9',
    accentSoftColor: '#EDE9FE',
    badgeBackground: '#FDF2F8',
    badgeColor: '#EC4899',
    levelBackground: '#ECFDF5',
    levelColor: '#059669',
    iconColor: '#7C3AED',
    buttonColor: '#7C3AED',
    shadowColor: 'rgba(124, 58, 237, 0.28)',
    orbColor: 'rgba(124, 58, 237, 0.12)',
  },
  {
    accentColor: '#14B8A6',
    accentDeepColor: '#0369A1',
    accentSoftColor: '#E0F2FE',
    badgeBackground: '#FEF3C7',
    badgeColor: '#D97706',
    levelBackground: '#E0F2FE',
    levelColor: '#0284C7',
    iconColor: '#14B8A6',
    buttonColor: '#14B8A6',
    shadowColor: 'rgba(15, 118, 110, 0.26)',
    orbColor: 'rgba(6, 182, 212, 0.12)',
  },
];

interface LearnCategoryItem {
  name: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
}

const PRESET_CATEGORIES: Omit<LearnCategoryItem, 'count'>[] = [
  { name: 'Programming',         icon: 'code-slash-outline',    iconColor: '#EF4444', iconBackground: '#FEE2E2' },
  { name: 'Data Science',        icon: 'analytics-outline',     iconColor: '#0284C7', iconBackground: '#E0F2FE' },
  { name: 'Machine Learning',    icon: 'hardware-chip-outline', iconColor: '#7C3AED', iconBackground: '#EDE9FE' },
  { name: 'Mobile Development',  icon: 'phone-portrait-outline',iconColor: '#059669', iconBackground: '#D1FAE5' },
  { name: 'Web Development',     icon: 'globe-outline',         iconColor: '#2563EB', iconBackground: '#DBEAFE' },
  { name: 'Design',              icon: 'color-palette-outline', iconColor: '#DB2777', iconBackground: '#FCE7F3' },
  { name: 'Business',            icon: 'briefcase-outline',     iconColor: '#D97706', iconBackground: '#FEF3C7' },
  { name: 'Marketing',           icon: 'megaphone-outline',     iconColor: '#EA580C', iconBackground: '#FFEDD5' },
  { name: 'Photography',         icon: 'camera-outline',        iconColor: '#2563EB', iconBackground: '#DBEAFE' },
  { name: 'Music',               icon: 'musical-notes-outline', iconColor: '#7C3AED', iconBackground: '#F3E8FF' },
  { name: 'Languages',           icon: 'language-outline',      iconColor: '#14B8A6', iconBackground: '#CCFBF1' },
  { name: 'Personal Development',icon: 'sparkles-outline',      iconColor: '#7C3AED', iconBackground: '#F3E8FF' },
  { name: 'Health & Fitness',    icon: 'fitness-outline',       iconColor: '#16A34A', iconBackground: '#DCFCE7' },
  { name: 'Database',            icon: 'layers-outline',        iconColor: '#0284C7', iconBackground: '#E0F2FE' },
  { name: 'Cloud Computing',     icon: 'cloud-outline',         iconColor: '#2563EB', iconBackground: '#DBEAFE' },
  { name: 'Mathematics',         icon: 'calculator-outline',    iconColor: '#4F46E5', iconBackground: '#E0E7FF' },
  { name: 'Science',             icon: 'flask-outline',         iconColor: '#14B8A6', iconBackground: '#E0F2FE' },
  { name: 'Technology',          icon: 'construct-outline',     iconColor: '#4F46E5', iconBackground: '#E0E7FF' },
  { name: 'Other',               icon: 'grid-outline',          iconColor: '#475569', iconBackground: '#E2E8F0' },
];

const DEFAULT_CATEGORY_STYLE: Omit<LearnCategoryItem, 'name' | 'count'> = {
  icon: 'grid-outline',
  iconColor: '#475569',
  iconBackground: '#E2E8F0',
};
const TOP_CATEGORY_LIMIT = 6;

const getSuggestionIconForCourse = (course: LearnCourse): keyof typeof Ionicons.glyphMap => {
  const presetMatch = PRESET_CATEGORIES.find((item) => item.name.toLowerCase() === course.category.toLowerCase());
  if (presetMatch) return presetMatch.icon;

  const normalized = course.category.toLowerCase();
  if (normalized.includes('data') || normalized.includes('analysis')) return 'analytics-outline';
  if (normalized.includes('design')) return 'color-palette-outline';
  if (normalized.includes('business') || normalized.includes('marketing')) return 'briefcase-outline';
  if (normalized.includes('language')) return 'language-outline';
  if (normalized.includes('science')) return 'flask-outline';
  if (normalized.includes('music')) return 'musical-notes-outline';
  if (normalized.includes('photo')) return 'camera-outline';
  return 'sparkles-outline';
};

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins  = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatK = (value: number) => {
  if (!value) return '0';
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(1)}k`;
};

// ─── Flat list item types ─────────────────────────────────────────────────────
type ListItem =
  | { type: 'COURSE'; data: LearnCourse; showEnroll?: boolean; enrolledData?: LearnEnrolledCourse }
  | { type: 'PATH'; data: LearnPath }
  | { type: 'INSTRUCTOR_BANNER' }
  | { type: 'EMPTY'; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap };


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LearnScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LearnStackScreenProps<'LearnHub'>['route']>();
  const { openSidebar } = useNavigationContext();

  const initialTab = route.params?.initialTab;
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'explore');

  // Sync state if initialTab changes from navigation
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [debouncedQuery,   setDebouncedQuery]   = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAllCategories,setShowAllCategories]= useState(false);
  const [courses,          setCourses]          = useState<LearnCourse[]>([]);
  const [enrolledCourses,  setEnrolledCourses]  = useState<LearnEnrolledCourse[]>([]);
  const [createdCourses,   setCreatedCourses]   = useState<LearnCourse[]>([]);
  const [paths,            setPaths]            = useState<LearnPath[]>([]);
  const [stats,            setStats]            = useState<LearningStats | null>(null);
  const [busyCourseId,     setBusyCourseId]     = useState<string | null>(null);
  const [busyPathId,       setBusyPathId]       = useState<string | null>(null);

  const enrolledCourseIds = useMemo(
    () => new Set(enrolledCourses.map((c) => c.id)),
    [enrolledCourses]
  );

  // ── Search debounce — only re-filter after user stops typing (300ms) ──────
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(text.trim().toLowerCase());
    }, 300);
  }, []);

  // ── Data loading — useFocusEffect with hasFetched guard ───────────────────
  // hasFetched prevents re-firing the 5 API calls every time React Navigation
  // re-renders the screen tree mid-navigate (same pattern as FeedScreen).
  const hasFetched = useRef(false);
  const isRefreshing = useRef(false);
  const loadLearningData = useCallback(async (force = false) => {
    try {
      // Single HTTP request — /courses/learn-hub runs all queries server-side in parallel.
      // Cache hit (within 30s) returns instantly with zero network.
      const hub: LearnHubData = await learnApi.getLearnHub(force);
      setCourses(hub.courses);
      setEnrolledCourses(hub.myCourses);
      setCreatedCourses(hub.myCreated);
      setPaths(hub.paths);
      setStats(hub.stats);
    } catch (error: any) {
      Alert.alert('Learning', error?.message || 'Failed to load learning data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isRefreshing.current = false;
    }
  }, []);

  // Load once on mount — useEffect starts immediately even before focus transitions finish.
  // This provides a faster perceived load as data might be ready when animation ends.
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      loadLearningData();
    }
  }, [loadLearningData]);

  // Optional: Re-fetch on focus if data is potentially stale (e.g. 5 min old)
  // Not strictly needed for now as we have the 30s TTL cache on learnApi.

  const onRefresh = useCallback(() => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    learnApi.invalidateLearnHubCache();
    setRefreshing(true);
    loadLearningData(true);
  }, [loadLearningData]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCoursePress = useCallback(
    (courseId: string) => {
      learnApi.prefetchCourseDetail(courseId);
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation]
  );

  const handleCreateCourse = useCallback(
    () => navigation.navigate('CreateCourse'),
    [navigation]
  );

  const handleOpenInstructorDashboard = useCallback(
    () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('InstructorDashboard');
    },
    [navigation]
  );

  const handleEnrollCourse = useCallback(async (courseId: string) => {
    try {
      setBusyCourseId(courseId);
      await learnApi.enrollInCourse(courseId);
      // Bust cache so next load gets fresh enrolment state
      learnApi.invalidateLearnHubCache();
      const hub = await learnApi.getLearnHub(true);
      setCourses(hub.courses);
      setEnrolledCourses(hub.myCourses);
    } catch (error: any) {
      Alert.alert('Enrollment', error?.message || 'Unable to enroll in this course');
    } finally {
      setBusyCourseId(null);
    }
  }, []);

  const handleEnrollPath = useCallback(async (pathId: string) => {
    try {
      setBusyPathId(pathId);
      await learnApi.enrollInPath(pathId);
      learnApi.invalidateLearnHubCache();
      const hub = await learnApi.getLearnHub(true);
      setEnrolledCourses(hub.myCourses);
      setPaths(hub.paths);
    } catch (error: any) {
      Alert.alert('Learning Path', error?.message || 'Unable to enroll in this learning path');
    } finally {
      setBusyPathId(null);
    }
  }, []);

  const normalizedQuery = debouncedQuery;

  // ── Category data ─────────────────────────────────────────────────────────
  const categoryItems = useMemo<LearnCategoryItem[]>(() => {
    const counts = new Map<string, number>();
    courses.forEach((course) => {
      const category = (course.category || 'General').trim() || 'General';
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    const presetNameSet = new Set(PRESET_CATEGORIES.map((c) => c.name));
    const presetItems   = PRESET_CATEGORIES.map((c) => ({ ...c, count: counts.get(c.name) || 0 }));
    const extraItems: LearnCategoryItem[] = [...counts.entries()]
      .filter(([name]) => !presetNameSet.has(name))
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, ...DEFAULT_CATEGORY_STYLE }));

    return [...presetItems, ...extraItems];
  }, [courses]);

  const rankedCategoryItems = useMemo<LearnCategoryItem[]>(
    () =>
      categoryItems
        .map((item, index) => ({ item, index }))
        .sort((a, b) => b.item.count !== a.item.count ? b.item.count - a.item.count : a.index - b.index)
        .map(({ item }) => item),
    [categoryItems]
  );

  const visibleCategoryItems = useMemo<LearnCategoryItem[]>(() => {
    if (showAllCategories) return rankedCategoryItems;
    const limited = rankedCategoryItems.slice(0, TOP_CATEGORY_LIMIT);
    if (selectedCategory !== 'All' && !limited.some((c) => c.name === selectedCategory)) {
      const selectedItem = rankedCategoryItems.find((c) => c.name === selectedCategory);
      if (selectedItem) return [...limited.slice(0, Math.max(0, TOP_CATEGORY_LIMIT - 1)), selectedItem];
    }
    return limited;
  }, [rankedCategoryItems, selectedCategory, showAllCategories]);

  const canToggleCategoryList = rankedCategoryItems.length > TOP_CATEGORY_LIMIT;

  const suggestedCourses = useMemo<SuggestedCourseItem[]>(() => {
    const ranked = [...courses]
      .sort((a, b) => {
        const scoreA = (a.isFeatured ? 120000 : 0) + (a.isNew ? 25000 : 0) + Math.round(a.rating * 1000) + a.enrolledCount;
        const scoreB = (b.isFeatured ? 120000 : 0) + (b.isNew ? 25000 : 0) + Math.round(b.rating * 1000) + b.enrolledCount;
        return scoreB - scoreA;
      })
      .slice(0, 2);

    return ranked.map((course, index) => ({
      course,
      badgeLabel: course.isFeatured ? 'Featured' : course.isNew ? 'New' : 'Popular',
      icon: getSuggestionIconForCourse(course),
      theme: FEATURED_COURSE_THEMES[index % FEATURED_COURSE_THEMES.length],
    }));
  }, [courses]);

  // ── Filtered data per tab ─────────────────────────────────────────────────
  const filteredCourses = useMemo(
    () => courses.filter((course) => {
      const cat = (course.category || 'General').trim() || 'General';
      return (
        (selectedCategory === 'All' || cat === selectedCategory) &&
        (!normalizedQuery ||
          course.title.toLowerCase().includes(normalizedQuery) ||
          course.description.toLowerCase().includes(normalizedQuery) ||
          cat.toLowerCase().includes(normalizedQuery))
      );
    }),
    [courses, normalizedQuery, selectedCategory]
  );

  const filteredEnrolled = useMemo(
    () => enrolledCourses.filter((c) =>
      !normalizedQuery || c.title.toLowerCase().includes(normalizedQuery) || c.category.toLowerCase().includes(normalizedQuery)
    ),
    [enrolledCourses, normalizedQuery]
  );

  const filteredCreated = useMemo(
    () => createdCourses.filter((c) =>
      !normalizedQuery || c.title.toLowerCase().includes(normalizedQuery) || c.category.toLowerCase().includes(normalizedQuery)
    ),
    [createdCourses, normalizedQuery]
  );

  const filteredPaths = useMemo(
    () => paths.filter((p) =>
      !normalizedQuery || p.title.toLowerCase().includes(normalizedQuery) || p.description.toLowerCase().includes(normalizedQuery)
    ),
    [paths, normalizedQuery]
  );

  // ── Build flat list data array ────────────────────────────────────────────
  // Note: HEADER is no longer in listData — it is rendered via ListHeaderComponent
  // so FlashList doesn't try to recycle it alongside course/path cells.
  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (activeTab === 'explore') {
      if (filteredCourses.length === 0) {
        items.push({ type: 'EMPTY', title: 'No courses found', subtitle: 'Try another keyword or refresh.', icon: 'search-outline' });
      } else {
        filteredCourses.forEach((c) => items.push({ type: 'COURSE', data: c, showEnroll: true }));
      }
      return items;
    }

    if (activeTab === 'enrolled') {
      if (filteredEnrolled.length === 0) {
        items.push({ type: 'EMPTY', title: 'No enrolled courses', subtitle: 'Enroll in a course from Explore to start learning.', icon: 'book-outline' });
      } else {
        filteredEnrolled.forEach((c) => items.push({ type: 'COURSE', data: c, enrolledData: c }));
      }
      return items;
    }

    if (activeTab === 'created') {
      if (filteredCreated.length === 0) {
        items.push({ type: 'EMPTY', title: 'No created courses', subtitle: 'Your created courses will appear here.', icon: 'school-outline' });
      } else {
        items.push({ type: 'INSTRUCTOR_BANNER' });
        filteredCreated.forEach((c) => items.push({ type: 'COURSE', data: c }));
      }
      return items;
    }

    // paths tab
    if (filteredPaths.length === 0) {
      items.push({ type: 'EMPTY', title: 'No learning paths', subtitle: 'Learning paths will appear here soon.', icon: 'git-branch-outline' });
    } else {
      filteredPaths.forEach((p) => items.push({ type: 'PATH', data: p }));
    }
    return items;
  }, [activeTab, filteredCourses, filteredEnrolled, filteredCreated, filteredPaths]);

  // ── Header component (stats + category grid) ──────────────────────────────
  const renderHeader = useCallback(() => {
    // Stat cards
    const statCards = stats ? [
      { key: 'enrolled',  value: `${stats.enrolledCourses}`,  label: 'Enrolled',   icon: 'book' as const,             iconColor: '#2563EB', iconBackground: '#EFF6FF', cardBackground: '#FFFFFF', borderColor: '#F1F5F9' },
      { key: 'completed', value: `${stats.completedCourses}`, label: 'Completed',  icon: 'checkmark-circle' as const, iconColor: '#059669', iconBackground: '#ECFDF5', cardBackground: '#FFFFFF', borderColor: '#F1F5F9' },
      { key: 'hours',     value: `${stats.hoursLearned}h`,    label: 'Hours',      icon: 'time' as const,             iconColor: '#D97706', iconBackground: '#FFFBEB', cardBackground: '#FFFFFF', borderColor: '#F1F5F9' },
      { key: 'streak',    value: `${stats.currentStreak}`,    label: 'Streak',     icon: 'flame' as const,            iconColor: '#EA580C', iconBackground: '#FFF7ED', cardBackground: '#FFFFFF', borderColor: '#F1F5F9' },
    ] : [];

    return (
      <View style={styles.headerContent}>
        {activeTab === 'explore' && suggestedCourses.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredSectionHeader}>
              <Text style={styles.featuredSectionTitle}>Suggested courses</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredHorizontalScroll}
              snapToInterval={FEATURED_CARD_WIDTH + FEATURED_CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
            >
              {suggestedCourses.map((item) => {
                const { course, theme } = item;
                const isEnrolled = enrolledCourseIds.has(course.id);
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.featuredCardWrap, { shadowColor: theme.shadowColor }]}
                    activeOpacity={0.9}
                    onPress={() => handleCoursePress(course.id)}
                  >
                    <View style={[styles.featuredCard, { borderColor: theme.accentSoftColor }]}>
                      <View style={styles.featuredAbstractBg}>
                        <LinearGradient
                          colors={['rgba(34, 211, 238, 0.08)', 'rgba(8, 145, 178, 0.15)']}
                          style={styles.featuredAbstractShape1}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                        <LinearGradient
                          colors={['rgba(34, 211, 238, 0.2)', 'rgba(8, 145, 178, 0.25)']}
                          style={styles.featuredAbstractShape2}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                      </View>
  
                      <View style={styles.featuredCardBody}>
                        <View style={styles.featuredArtworkWrap}>
                          <View style={[styles.featuredArtworkHalo, { backgroundColor: `${theme.iconColor}15` }]} />
                          <View style={[styles.featuredIconWrap, { backgroundColor: `${theme.iconColor}10`, borderColor: `${theme.iconColor}20` }]}>
                            <Ionicons name={item.icon} size={32} color={theme.iconColor} />
                          </View>
                        </View>
  
                        <View style={styles.featuredContentRow}>
                          <View style={styles.featuredTopRow}>
                            <View style={[styles.featuredBadgePill, { backgroundColor: theme.badgeBackground, borderColor: `${theme.badgeColor}33` }]}>
                              <Ionicons name="flame" size={11} color={theme.badgeColor} />
                              <Text style={[styles.featuredHeroBadgeText, { color: theme.badgeColor }]}>{item.badgeLabel}</Text>
                            </View>
                            <View style={[styles.featuredLevelPill, { backgroundColor: theme.levelBackground, borderColor: `${theme.levelColor}2A` }]}>
                              <Text style={[styles.featuredLevelText, { color: theme.levelColor }]}>{course.level.replace('_', ' ')}</Text>
                            </View>
                          </View>
  
                          <View style={styles.featuredTextBlock}>
                            <Text style={styles.featuredTitle} numberOfLines={2}>{course.title}</Text>
                            <Text style={styles.featuredSubtitle} numberOfLines={1}>
                              {course.category} · {formatDuration(course.duration)}
                            </Text>
                          </View>
  
                          <View style={styles.featuredBottomRow}>
                            <View style={styles.featuredMetaRow}>
                              <View style={styles.featuredMetaItem}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={[styles.featuredMetaText, { color: '#F59E0B', fontWeight: '700' }]}>{course.rating.toFixed(1)}</Text>
                              </View>
                              <Text style={styles.featuredMetaDivider}>•</Text>
                              <View style={styles.featuredMetaItem}>
                                <Ionicons name="people" size={12} color="#64748B" />
                                <Text style={styles.featuredMetaText}>{formatK(course.enrolledCount)}</Text>
                              </View>
                            </View>
  
                            <View style={[styles.featuredCtaButton, { backgroundColor: theme.buttonColor }]}>
                              <Text style={styles.featuredCtaText}>
                                {isEnrolled ? 'Continue' : 'Start'}
                              </Text>
                              <Ionicons name="arrow-forward" size={12} color="#FFF" />
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category grid */}
        <View style={styles.categorySurface}>
          <View style={styles.categorySection}>
            <View style={styles.categoryHeaderRow}>
              <View style={styles.categoryHeaderInfo}>
                <Text style={styles.categoryHeaderTitle}>Explore categories</Text>
              </View>
              <View style={styles.categoryHeaderActions}>
                {selectedCategory !== 'All' && (
                  <TouchableOpacity style={styles.categoryHeaderButton} onPress={() => setSelectedCategory('All')}>
                    <Text style={styles.categoryHeaderButtonText}>All courses</Text>
                  </TouchableOpacity>
                )}
                {canToggleCategoryList && (
                  <TouchableOpacity
                    style={styles.categoryHeaderButton}
                    onPress={() => setShowAllCategories((v) => !v)}
                  >
                    <Text style={styles.categoryHeaderButtonText}>{showAllCategories ? 'View less' : 'View all'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.categoryGrid}>
              {visibleCategoryItems.map((category, index) => {
                const isActive     = selectedCategory === category.name;
                const isTopCategory= category.count > 0 && index < 3;
                return (
                  <TouchableOpacity
                    key={category.name}
                    style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                    onPress={() => setSelectedCategory(category.name)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.categoryContent}>
                      <View style={styles.categoryTitleRow}>
                        <Text numberOfLines={1} style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                          {category.name}
                        </Text>
                        {isTopCategory && (
                          <View style={[styles.categoryTrendBadge, isActive && styles.categoryTrendBadgeActive]}>
                            <Text style={[styles.categoryTrendText, isActive && styles.categoryTrendTextActive]}>Top</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.categoryCount, isActive && styles.categoryCountActive]}>
                        {category.count} courses
                      </Text>
                    </View>
                    <View style={[styles.categoryIconWrap, { backgroundColor: category.iconBackground }, isActive && styles.categoryIconWrapActive]}>
                      <Ionicons name={category.icon} size={18} color={category.iconColor} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Stat cards */}
        {stats && (
          <View style={styles.statsSection}>
            <View style={styles.statsSectionHeader}>
              <Text style={styles.statsSectionTitle}>Learning snapshot</Text>
            </View>
            <View style={styles.statsRow}>
              {statCards.map((item) => (
                <View key={item.key} style={[styles.statCard, { backgroundColor: item.cardBackground, borderColor: item.borderColor }]}>
                  <View style={styles.statCardTopRow}>
                    <View style={[styles.statIconWrap, { backgroundColor: item.iconBackground }]}>
                      <Ionicons name={item.icon} size={15} color={item.iconColor} />
                    </View>
                    <Text style={[styles.statValue, { color: item.iconColor }]}>{item.value}</Text>
                  </View>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }, [
    activeTab,
    stats,
    suggestedCourses,
    enrolledCourseIds,
    handleCoursePress,
    visibleCategoryItems,
    selectedCategory,
    showAllCategories,
    canToggleCategoryList,
  ]);

  // ── Stable handler ref — avoids new arrow functions in renderItem on every render
  // (same pattern as FeedScreen uses for handlersRef)
  const handlersRef = useRef({ handleCoursePress, handleEnrollCourse, handleEnrollPath, handleOpenInstructorDashboard });
  useEffect(() => {
    handlersRef.current = { handleCoursePress, handleEnrollCourse, handleEnrollPath, handleOpenInstructorDashboard };
  });

  // ── Render items ───────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'COURSE') {
        const courseId = item.data.id;
        return (
          <CourseCard
            course={item.data}
            variant="full"
            isEnrolled={enrolledCourseIds.has(courseId)}
            isBusy={busyCourseId === courseId}
            progress={item.enrolledData?.progress}
            completedLessons={item.enrolledData?.completedLessons}
            onPress={() => handlersRef.current.handleCoursePress(courseId)}
            onEnroll={item.showEnroll ? () => handlersRef.current.handleEnrollCourse(courseId) : undefined}
          />
        );
      }

      if (item.type === 'PATH') {
        return (
          <PathCard
            path={item.data}
            isBusy={busyPathId === item.data.id}
            onEnroll={handlersRef.current.handleEnrollPath}
          />
        );
      }

      if (item.type === 'INSTRUCTOR_BANNER') {
        return (
          <TouchableOpacity 
            style={styles.instructorBanner}
            onPress={handlersRef.current.handleOpenInstructorDashboard}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.instructorBannerGradient}
            >
              <View style={styles.instructorBannerContent}>
                <View style={styles.instructorBannerIconWrap}>
                  <Ionicons name="analytics" size={24} color="#14B8A6" />
                </View>
                <View style={styles.instructorBannerTextCol}>
                  <Text style={styles.instructorBannerTitle}>Instructor Analytics</Text>
                  <Text style={styles.instructorBannerSubtitle}>Track your revenue and student growth</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      }

      if (item.type === 'EMPTY') {
        return (
          <View style={styles.emptyState}>
            <Ionicons name={item.icon} size={40} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{item.title}</Text>
            <Text style={styles.emptySubtitle}>{item.subtitle}</Text>
          </View>
        );
      }

      return null;
    },
    [enrolledCourseIds, busyCourseId, busyPathId]
  );

  // ── getItemType — prevents tall 'HEADER' cell from recycling into short 'COURSE' cells
  const getItemType = useCallback(
    (item: ListItem) => item.type,
    []
  );

  const keyExtractor = useCallback(
    (item: ListItem, index: number) => {
      if (item.type === 'COURSE') return `course-${item.data.id}`;
      if (item.type === 'PATH')   return `path-${item.data.id}`;
      return `empty-${index}`;
    },
    []
  );

  // ── overrideItemLayout: give FlashList exact heights upfront so it can
  // pre-compute layout without measuring each cell.  Eliminates the jitter
  // you see when quickly scrolling through a heavy list.
  const overrideItemLayout = useCallback(
    (layout: { span?: number; size?: number }, item: ListItem) => {
      if (item.type === 'COURSE') layout.size = 360; // thumbnail 180 + content ~180
      if (item.type === 'PATH')   layout.size = 180;
      if (item.type === 'INSTRUCTOR_BANNER') layout.size = 110;
      if (item.type === 'EMPTY')  layout.size = 220;
    },
    []
  );

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* ─ Hero gradient header — identical to real screen ─ */}
        <LinearGradient
          colors={['#CCFBF1', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroHeaderBg}
        >
          <SafeAreaView edges={['top']} style={styles.headerSafe}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={openSidebar} style={styles.headerIconButton}>
                <Ionicons name="menu-outline" size={24} color="#0F172A" />
              </TouchableOpacity>
              <View>
                <StunityLogo width={108} height={30} />
              </View>
              <View style={styles.topBarActions}>
                <TouchableOpacity style={styles.headerIconButton}>
                  <Ionicons name="add" size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search bar — same position as real screen */}
            <View style={[styles.searchContainer, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1 }]}>
              <Ionicons name="search" size={20} color="#CBD5E1" />
              <View style={{ flex: 1, height: 20, backgroundColor: '#F1F5F9', borderRadius: 6 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ─ Tab bar skeleton — same position and style as real tabs ─ */}
        <View style={[styles.tabsScroll, skeletonStyles.tabsRow]}>
          <Skeleton width={76} height={40} borderRadius={999} />
          <Skeleton width={106} height={40} borderRadius={999} />
          <Skeleton width={80}  height={40} borderRadius={999} />
          <Skeleton width={66}  height={40} borderRadius={999} />
        </View>

        {/* ─ Body content ─ */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <LearnHeaderSkeleton />
          {[1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Premium Hero Header ── */}
      <LinearGradient
        colors={['#CCFBF1', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeaderBg}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={openSidebar} style={styles.headerIconButton}>
              <Ionicons name="menu-outline" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View>
              <StunityLogo width={108} height={30} />
            </View>
            <View style={styles.topBarActions}>
              <TouchableOpacity onPress={handleCreateCourse} style={styles.headerIconButton}>
                <Ionicons name="add" size={24} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onRefresh} style={styles.headerIconButton}>
                <Ionicons name="refresh" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1 }]}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search courses, paths, topics..."
              placeholderTextColor="#94A3B8"
              style={[styles.searchInput, { color: '#0F172A' }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedQuery(''); }}>
                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Tab bar — fixed outside list */}
      <ScrollView
        horizontal
        style={styles.tabsScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const palette = TAB_COLOR_PALETTES[tab.id];
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                { backgroundColor: palette.inactiveBackground, borderColor: palette.inactiveBorder },
                isActive && styles.tabButtonActive,
                isActive && { backgroundColor: palette.activeBackground, borderColor: palette.activeBorder },
              ]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={tab.icon} size={14} color={isActive ? '#FFFFFF' : palette.inactiveIcon} />
              <Text
                allowFontScaling={false}
                style={[
                  styles.tabLabel,
                  { color: isActive ? '#FFFFFF' : palette.inactiveText },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── FlashList ── */}
      {/* @ts-ignore FlashList types omit some valid props */}
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        ListHeaderComponent={renderHeader}
        estimatedItemSize={320}
        overrideItemLayout={overrideItemLayout}
        drawDistance={600}
        // extraData: busyCourseId/busyPathId drive enroll spinner; stats drives stat cards;
        // enrolledCourseIds drives isEnrolled flag without rebuilding listData
        extraData={{ stats, busyCourseId, busyPathId, enrolledCourseIds }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // iOS: removeClippedSubviews causes native layer hide/show jank — Android only
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14B8A6"
            colors={['#14B8A6']}
          />
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Ultra clean very light slate
  },
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
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
    padding: 0,
  },
  featuredSection: {
    marginBottom: 24,
  },
  featuredHorizontalScroll: {
    paddingHorizontal: 12,
    gap: FEATURED_CARD_GAP,
    paddingBottom: 10,
  },
  featuredSectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  featuredSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  featuredSectionSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  featuredCardWrap: {
    width: FEATURED_CARD_WIDTH, // Keep it scrollable width
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  featuredCard: {
    height: 148,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.25,
    borderColor: '#E0F2FE',
    backgroundColor: '#F0FDFA', // Subtle Teal/Cyan background
  },
  featuredAbstractBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
    opacity: 0.6,
  },
  featuredAbstractShape1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 140,
    height: 100,
    borderRadius: 50,
    transform: [{ rotate: '-15deg' }],
  },
  featuredAbstractShape2: {
    position: 'absolute',
    bottom: -30,
    right: 40,
    width: 160,
    height: 80,
    borderRadius: 40,
    transform: [{ rotate: '15deg' }],
  },
  featuredCardBody: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  featuredArtworkWrap: {
    width: 110,
    height: 124,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  featuredArtworkHalo: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: '#FFFFFF', 
  },
  featuredContentRow: {
    flex: 1,
    paddingLeft: 14,
    height: 124,
    justifyContent: 'space-between',
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
  },
  featuredHeroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  featuredLevelPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  featuredLevelText: {
    fontSize: 10,
    fontWeight: '800',
  },
  featuredTextBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  featuredTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  featuredBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  featuredMetaText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  featuredMetaDivider: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
    marginHorizontal: 1,
  },
  featuredCtaButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featuredCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  tabsScroll: {
    maxHeight: 64,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabButtonActive: {
    borderWidth: 1.5,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 40,
  },
  headerContent: {
    marginBottom: 6,
  },
  categorySurface: {
    marginHorizontal: 12,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  // Category section
  categorySection: {
    marginBottom: 0,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  categoryHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  categoryHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  categoryHeaderSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  categoryHeaderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: '56%',
  },
  categoryHeaderButton: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1E4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryHeaderButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48.5%',
    minHeight: 76,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryCardActive: {
    borderColor: '#14B8A6',
    backgroundColor: '#F0FDFA',
  },
  categoryContent: {
    flex: 1,
    marginRight: 8,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapActive: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'left',
    flexShrink: 1,
  },
  categoryLabelActive: {
    color: '#14B8A6',
  },
  categoryTrendBadge: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryTrendBadgeActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  categoryTrendText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  categoryTrendTextActive: {
    color: '#1D4ED8',
  },
  categoryCount: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryCountActive: {
    color: '#2563EB',
  },
  // Stats
  statsSection: {
    marginHorizontal: 12,
    marginBottom: 24,
  },
  statsSectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  statsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  statsSectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 10,
  },
  statCard: {
    width: '48.5%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Course cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 10,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  featuredBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  featuredBadgeText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '700',
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  courseDescription: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  metaRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  footerRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14B8A6',
  },
  durationRow: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '700',
  },
  progressSubText: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#14B8A6',
  },
  actionButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#14B8A6',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Path cards
  pathCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 12,
    marginBottom: 14,
    padding: 16,
  },
  pathTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  pathDescription: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  pathMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pathMetaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  pathMetaDot: {
    marginHorizontal: 6,
    color: '#9CA3AF',
  },
  pathActionButton: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathActionButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  pathActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Instructor Analytics Banner
  instructorBanner: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.md,
  },
  instructorBannerGradient: {
    padding: 16,
  },
  instructorBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  instructorBannerTextCol: {
    flex: 1,
  },
  instructorBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  instructorBannerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  // Empty state
  emptyState: {
    marginTop: 12,
    marginHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
