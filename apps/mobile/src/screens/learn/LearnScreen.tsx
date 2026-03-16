import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import StunityLogo from '../../../assets/Stunity.svg';
import { learnApi } from '@/api';
import type { LearnCourse, LearnEnrolledCourse, LearnPath, LearningStats } from '@/api/learn';
import { LearnStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

type NavigationProp = LearnStackScreenProps<'LearnHub'>['navigation'];
type TabType = 'explore' | 'enrolled' | 'created' | 'paths';

const TABS: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'explore', label: 'Explore', icon: 'compass-outline' },
  { id: 'enrolled', label: 'My Courses', icon: 'book-outline' },
  { id: 'created', label: 'Created', icon: 'school-outline' },
  { id: 'paths', label: 'Paths', icon: 'git-branch-outline' },
];

interface LearnCategoryItem {
  name: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
}

const PRESET_CATEGORIES: Omit<LearnCategoryItem, 'count'>[] = [
  { name: 'Programming', icon: 'code-slash-outline', iconColor: '#EF4444', iconBackground: '#FEE2E2' },
  { name: 'Data Science', icon: 'analytics-outline', iconColor: '#0284C7', iconBackground: '#E0F2FE' },
  { name: 'Machine Learning', icon: 'hardware-chip-outline', iconColor: '#7C3AED', iconBackground: '#EDE9FE' },
  { name: 'Mobile Development', icon: 'phone-portrait-outline', iconColor: '#059669', iconBackground: '#D1FAE5' },
  { name: 'Web Development', icon: 'globe-outline', iconColor: '#2563EB', iconBackground: '#DBEAFE' },
  { name: 'Design', icon: 'color-palette-outline', iconColor: '#DB2777', iconBackground: '#FCE7F3' },
  { name: 'Business', icon: 'briefcase-outline', iconColor: '#D97706', iconBackground: '#FEF3C7' },
  { name: 'Marketing', icon: 'megaphone-outline', iconColor: '#EA580C', iconBackground: '#FFEDD5' },
  { name: 'Photography', icon: 'camera-outline', iconColor: '#2563EB', iconBackground: '#DBEAFE' },
  { name: 'Music', icon: 'musical-notes-outline', iconColor: '#7C3AED', iconBackground: '#F3E8FF' },
  { name: 'Languages', icon: 'language-outline', iconColor: '#0F766E', iconBackground: '#CCFBF1' },
  { name: 'Personal Development', icon: 'sparkles-outline', iconColor: '#7C3AED', iconBackground: '#F3E8FF' },
  { name: 'Health & Fitness', icon: 'fitness-outline', iconColor: '#16A34A', iconBackground: '#DCFCE7' },
  { name: 'Database', icon: 'layers-outline', iconColor: '#0284C7', iconBackground: '#E0F2FE' },
  { name: 'Cloud Computing', icon: 'cloud-outline', iconColor: '#2563EB', iconBackground: '#DBEAFE' },
  { name: 'Mathematics', icon: 'calculator-outline', iconColor: '#4F46E5', iconBackground: '#E0E7FF' },
  { name: 'Science', icon: 'flask-outline', iconColor: '#0EA5E9', iconBackground: '#E0F2FE' },
  { name: 'Technology', icon: 'construct-outline', iconColor: '#4F46E5', iconBackground: '#E0E7FF' },
  { name: 'Other', icon: 'grid-outline', iconColor: '#475569', iconBackground: '#E2E8F0' },
];

const DEFAULT_CATEGORY_STYLE: Omit<LearnCategoryItem, 'name' | 'count'> = {
  icon: 'grid-outline',
  iconColor: '#475569',
  iconBackground: '#E2E8F0',
};
const TOP_CATEGORY_LIMIT = 6;

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatK = (value: number) => {
  if (!value) return '0';
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(1)}k`;
};

export default function LearnScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { openSidebar } = useNavigationContext();

  const [activeTab, setActiveTab] = useState<TabType>('explore');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [courses, setCourses] = useState<LearnCourse[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<LearnEnrolledCourse[]>([]);
  const [createdCourses, setCreatedCourses] = useState<LearnCourse[]>([]);
  const [paths, setPaths] = useState<LearnPath[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [busyPathId, setBusyPathId] = useState<string | null>(null);

  const enrolledCourseIds = useMemo(
    () => new Set(enrolledCourses.map(course => course.id)),
    [enrolledCourses]
  );

  const loadLearningData = useCallback(async () => {
    try {
      const [courseList, myCourses, myCreatedCourses, learningPaths, learningStats] = await Promise.all([
        learnApi.getCourses({ limit: 30 }),
        learnApi.getMyCourses(),
        learnApi.getMyCreatedCourses(),
        learnApi.getLearningPaths({ limit: 20 }),
        learnApi.getLearningStats(),
      ]);

      setCourses(courseList);
      setEnrolledCourses(myCourses);
      setCreatedCourses(myCreatedCourses);
      setPaths(learningPaths);
      setStats(learningStats);
    } catch (error: any) {
      const message = error?.message || 'Failed to load learning data';
      Alert.alert('Learning', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLearningData();
  }, [loadLearningData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLearningData();
  }, [loadLearningData]);

  const handleCoursePress = useCallback((courseId: string) => {
    navigation.navigate('CourseDetail', { courseId });
  }, [navigation]);

  const handleCreateCourse = useCallback(() => {
    navigation.navigate('CreateCourse');
  }, [navigation]);

  const handleEnrollCourse = useCallback(async (courseId: string) => {
    try {
      setBusyCourseId(courseId);
      await learnApi.enrollInCourse(courseId);
      const [courseList, myCourses] = await Promise.all([
        learnApi.getCourses({ limit: 30 }),
        learnApi.getMyCourses(),
      ]);
      setCourses(courseList);
      setEnrolledCourses(myCourses);
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
      const [myCourses, updatedPaths] = await Promise.all([
        learnApi.getMyCourses(),
        learnApi.getLearningPaths({ limit: 20 }),
      ]);
      setEnrolledCourses(myCourses);
      setPaths(updatedPaths);
    } catch (error: any) {
      Alert.alert('Learning Path', error?.message || 'Unable to enroll in this learning path');
    } finally {
      setBusyPathId(null);
    }
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCourses = useMemo(
    () => courses.filter(course => {
      const courseCategory = (course.category || 'General').trim() || 'General';
      return (
        (selectedCategory === 'All' || courseCategory === selectedCategory) &&
        (
          !normalizedQuery ||
          course.title.toLowerCase().includes(normalizedQuery) ||
          course.description.toLowerCase().includes(normalizedQuery) ||
          courseCategory.toLowerCase().includes(normalizedQuery)
        )
      );
    }),
    [courses, normalizedQuery, selectedCategory]
  );

  const categoryItems = useMemo<LearnCategoryItem[]>(() => {
    const counts = new Map<string, number>();
    courses.forEach((course) => {
      const category = (course.category || 'General').trim() || 'General';
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    const presetNameSet = new Set(PRESET_CATEGORIES.map(category => category.name));

    const presetItems = PRESET_CATEGORIES.map((category) => ({
      ...category,
      count: counts.get(category.name) || 0,
    }));

    const extraItems: LearnCategoryItem[] = [...counts.entries()]
      .filter(([name]) => !presetNameSet.has(name))
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        ...DEFAULT_CATEGORY_STYLE,
      }));

    return [...presetItems, ...extraItems];
  }, [courses]);

  const rankedCategoryItems = useMemo<LearnCategoryItem[]>(
    () =>
      categoryItems
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          if (b.item.count !== a.item.count) return b.item.count - a.item.count;
          return a.index - b.index;
        })
        .map(({ item }) => item),
    [categoryItems]
  );

  const visibleCategoryItems = useMemo<LearnCategoryItem[]>(() => {
    if (showAllCategories) return rankedCategoryItems;

    const limited = rankedCategoryItems.slice(0, TOP_CATEGORY_LIMIT);

    if (selectedCategory !== 'All' && !limited.some(category => category.name === selectedCategory)) {
      const selectedItem = rankedCategoryItems.find(category => category.name === selectedCategory);
      if (selectedItem) {
        return [...limited.slice(0, Math.max(0, TOP_CATEGORY_LIMIT - 1)), selectedItem];
      }
    }

    return limited;
  }, [rankedCategoryItems, selectedCategory, showAllCategories]);

  const canToggleCategoryList = rankedCategoryItems.length > TOP_CATEGORY_LIMIT;

  const filteredEnrolled = useMemo(
    () => enrolledCourses.filter(course =>
      !normalizedQuery ||
      course.title.toLowerCase().includes(normalizedQuery) ||
      course.category.toLowerCase().includes(normalizedQuery)
    ),
    [enrolledCourses, normalizedQuery]
  );

  const filteredCreated = useMemo(
    () => createdCourses.filter(course =>
      !normalizedQuery ||
      course.title.toLowerCase().includes(normalizedQuery) ||
      course.category.toLowerCase().includes(normalizedQuery)
    ),
    [createdCourses, normalizedQuery]
  );

  const filteredPaths = useMemo(
    () => paths.filter(path =>
      !normalizedQuery ||
      path.title.toLowerCase().includes(normalizedQuery) ||
      path.description.toLowerCase().includes(normalizedQuery)
    ),
    [paths, normalizedQuery]
  );

  const renderStatCards = () => {
    if (!stats) return null;

    const statCards: Array<{
      key: string;
      value: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      iconColor: string;
      iconBackground: string;
      cardBackground: string;
      borderColor: string;
    }> = [
      {
        key: 'enrolled',
        value: `${stats.enrolledCourses}`,
        label: 'Enrolled',
        icon: 'book-outline',
        iconColor: '#2563EB',
        iconBackground: '#DBEAFE',
        cardBackground: '#EFF6FF',
        borderColor: '#BFDBFE',
      },
      {
        key: 'completed',
        value: `${stats.completedCourses}`,
        label: 'Completed',
        icon: 'checkmark-circle-outline',
        iconColor: '#059669',
        iconBackground: '#D1FAE5',
        cardBackground: '#ECFDF5',
        borderColor: '#A7F3D0',
      },
      {
        key: 'hours',
        value: `${stats.hoursLearned}h`,
        label: 'Hours',
        icon: 'time-outline',
        iconColor: '#D97706',
        iconBackground: '#FEF3C7',
        cardBackground: '#FFFBEB',
        borderColor: '#FDE68A',
      },
      {
        key: 'streak',
        value: `${stats.currentStreak}`,
        label: 'Streak',
        icon: 'flame-outline',
        iconColor: '#EA580C',
        iconBackground: '#FFEDD5',
        cardBackground: '#FFF7ED',
        borderColor: '#FDBA74',
      },
    ];

    return (
      <View style={styles.statsRow}>
        {statCards.map((item) => (
          <View
            key={item.key}
            style={[styles.statCard, { backgroundColor: item.cardBackground, borderColor: item.borderColor }]}
          >
            <View style={styles.statCardTopRow}>
              <View style={[styles.statIconWrap, { backgroundColor: item.iconBackground }]}>
                <Ionicons name={item.icon} size={14} color={item.iconColor} />
              </View>
              <Text style={[styles.statValue, { color: item.iconColor }]}>{item.value}</Text>
            </View>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCategoryGrid = () => (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeaderRow}>
        <View style={styles.categoryHeaderInfo}>
          <Text style={styles.categoryHeaderTitle}>Explore categories</Text>
          <Text style={styles.categoryHeaderSubtitle}>
            {showAllCategories ? 'Browse all categories' : `Top ${TOP_CATEGORY_LIMIT} categories for you`}
          </Text>
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
              onPress={() => setShowAllCategories(value => !value)}
            >
              <Text style={styles.categoryHeaderButtonText}>
                {showAllCategories ? 'View less' : 'View all'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoryGrid}>
        {visibleCategoryItems.map((category, index) => {
          const isActive = selectedCategory === category.name;
          const isTopCategory = category.count > 0 && index < 3;
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
                <Ionicons
                  name={category.icon}
                  size={18}
                  color={category.iconColor}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderCourseCard = (course: LearnCourse, options?: { enrolled?: LearnEnrolledCourse; showEnroll?: boolean }) => {
    const enrolledData = options?.enrolled;
    const isEnrolled = enrolledCourseIds.has(course.id);

    return (
      <View key={course.id} style={styles.card}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => handleCoursePress(course.id)}>
          <View style={styles.cardHeader}>
            <View style={styles.badgesRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{course.level.replace('_', ' ')}</Text>
              </View>
              {course.isFeatured && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>Featured</Text>
                </View>
              )}
            </View>
            <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
            <Text style={styles.courseDescription} numberOfLines={2}>{course.description}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.metaText}>{course.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="play-circle-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{course.lessonsCount} lessons</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{formatK(course.enrolledCount)}</Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.instructorText} numberOfLines={1}>
              {course.instructor.name}
            </Text>
            <Text style={styles.priceText}>
              {course.isFree ? 'FREE' : `$${course.price}`}
            </Text>
          </View>

          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={13} color="#6B7280" />
            <Text style={styles.durationText}>{formatDuration(course.duration)}</Text>
          </View>
        </TouchableOpacity>

        {enrolledData && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>{Math.round(enrolledData.progress)}% complete</Text>
              <Text style={styles.progressSubText}>{enrolledData.completedLessons}/{course.lessonsCount}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, enrolledData.progress))}%` }]} />
            </View>
          </View>
        )}

        {options?.showEnroll && !isEnrolled && (
          <TouchableOpacity
            style={[styles.actionButton, busyCourseId === course.id && styles.actionButtonDisabled]}
            activeOpacity={0.8}
            onPress={() => handleEnrollCourse(course.id)}
            disabled={busyCourseId === course.id}
          >
            {busyCourseId === course.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Enroll</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPathCard = (path: LearnPath) => (
    <View key={path.id} style={styles.pathCard}>
      <Text style={styles.pathTitle}>{path.title}</Text>
      <Text style={styles.pathDescription} numberOfLines={2}>{path.description}</Text>
      <View style={styles.pathMetaRow}>
        <Text style={styles.pathMetaText}>{path.coursesCount} courses</Text>
        <Text style={styles.pathMetaDot}>•</Text>
        <Text style={styles.pathMetaText}>{formatDuration(path.totalDuration)}</Text>
        <Text style={styles.pathMetaDot}>•</Text>
        <Text style={styles.pathMetaText}>{formatK(path.enrolledCount)} learners</Text>
      </View>
      <TouchableOpacity
        style={[styles.pathActionButton, (path.isEnrolled || busyPathId === path.id) && styles.pathActionButtonDisabled]}
        activeOpacity={0.8}
        onPress={() => handleEnrollPath(path.id)}
        disabled={path.isEnrolled || busyPathId === path.id}
      >
        {busyPathId === path.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.pathActionText}>{path.isEnrolled ? 'Enrolled' : 'Start Path'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = (title: string, subtitle: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={40} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );

  const renderActiveTab = () => {
    if (activeTab === 'explore') {
      return (
        <>
          {renderCategoryGrid()}
          {renderStatCards()}
          {filteredCourses.length === 0
            ? renderEmptyState('No courses found', 'Try another keyword or refresh.', 'search-outline')
            : filteredCourses.map(course => renderCourseCard(course, { showEnroll: true }))}
        </>
      );
    }

    if (activeTab === 'enrolled') {
      return filteredEnrolled.length === 0
        ? renderEmptyState('No enrolled courses', 'Enroll in a course from Explore to start learning.', 'book-outline')
        : filteredEnrolled.map(course => renderCourseCard(course, { enrolled: course }));
    }

    if (activeTab === 'created') {
      return filteredCreated.length === 0
        ? renderEmptyState('No created courses', 'Your created courses will appear here.', 'school-outline')
        : filteredCreated.map(course => renderCourseCard(course));
    }

    return filteredPaths.length === 0
      ? renderEmptyState('No learning paths', 'Learning paths will appear here soon.', 'git-branch-outline')
      : filteredPaths.map(renderPathCard);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#1A73E8" />
        <Text style={styles.loadingText}>Loading your learning hub...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconButton}>
            <Ionicons name="menu-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <StunityLogo width={108} height={30} />
          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={handleCreateCourse} style={styles.iconButton}>
              <Ionicons name="add-circle-outline" size={22} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
              <Ionicons name="refresh-outline" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#6B7280" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search courses, paths, topics..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        style={styles.tabsScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={tab.icon} size={14} color={isActive ? '#1A73E8' : '#6B7280'} />
              <Text allowFontScaling={false} style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />}
      >
        {renderActiveTab()}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSafe: {
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  tabsScroll: {
    maxHeight: 54,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabButtonActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  tabLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#1A73E8',
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  categoryHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  categoryHeaderSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryHeaderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: '52%',
  },
  categoryHeaderButton: {
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D1E4FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryHeaderButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '49%',
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  categoryCardActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#F8FBFF',
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
    color: '#1A73E8',
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 2,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 7,
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
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
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
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
    paddingHorizontal: 12,
    marginBottom: 8,
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
    color: '#0F766E',
  },
  durationRow: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
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
    backgroundColor: '#1A73E8',
  },
  actionButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 999,
    backgroundColor: '#1A73E8',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pathCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    padding: 12,
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
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    height: 40,
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
  emptyState: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 28,
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
