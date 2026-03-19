import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { learnApi } from '@/api';
import type { LearnCourseDetail } from '@/api/learn';
import { LearnStackParamList, LearnStackScreenProps } from '@/navigation/types';

type RouteParams = RouteProp<LearnStackParamList, 'CourseDetail'>;
type NavigationProp = LearnStackScreenProps<'CourseDetail'>['navigation'];
type TabType = 'overview' | 'curriculum';
type CourseOverviewStat = {
  key: string;
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  cardBackground: string;
  borderColor: string;
};

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function CourseDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { courseId } = route.params;
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [course, setCourse] = useState<LearnCourseDetail | null>(null);

  const loadCourse = useCallback(async () => {
    try {
      const data = await learnApi.getCourseDetail(courseId);
      setCourse(data);
    } catch (error: any) {
      Alert.alert('Course', error?.message || 'Unable to load course details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCourse();
  }, [loadCourse]);

  const handleEnroll = useCallback(async () => {
    try {
      setEnrolling(true);
      await learnApi.enrollInCourse(courseId);
      await loadCourse();
    } catch (error: any) {
      Alert.alert('Enrollment', error?.message || 'Unable to enroll in this course');
    } finally {
      setEnrolling(false);
    }
  }, [courseId, loadCourse]);

  const nextLesson = useMemo(() => {
    if (!course?.lessons?.length) return null;
    let fallback = course.lessons[0];
    for (const lesson of course.lessons) {
      if (!lesson.isCompleted && !lesson.isLocked) {
        return lesson;
      }
      if (!lesson.isLocked) {
        fallback = lesson;
      }
    }
    return fallback;
  }, [course?.lessons]);

  const totalDuration = useMemo(
    () => course?.lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0) || 0,
    [course?.lessons]
  );

  const completedLessonsCount = useMemo(
    () => course?.lessons.filter(lesson => lesson.isCompleted).length || 0,
    [course?.lessons]
  );

  const progressPercentage = useMemo(
    () => Math.max(0, Math.min(100, course?.enrollment?.progress ?? 0)),
    [course?.enrollment?.progress]
  );

  const overviewStats = useMemo<CourseOverviewStat[]>(() => {
    if (!course) return [];

    return [
      {
        key: 'lessons',
        label: 'Lessons',
        value: `${course.lessonsCount}`,
        icon: 'library',
        iconColor: '#0369A1',
        iconBackground: '#E0F2FE',
        cardBackground: '#FFFFFF',
        borderColor: '#E2E8F0',
      },
      {
        key: 'completed',
        label: 'Completed',
        value: `${completedLessonsCount}`,
        icon: 'checkmark-circle',
        iconColor: '#059669',
        iconBackground: '#D1FAE5',
        cardBackground: '#FFFFFF',
        borderColor: '#E2E8F0',
      },
      {
        key: 'duration',
        label: 'Duration',
        value: formatDuration(totalDuration || course.duration),
        icon: 'time',
        iconColor: '#D97706',
        iconBackground: '#FEF3C7',
        cardBackground: '#FFFFFF',
        borderColor: '#E2E8F0',
      },
      {
        key: 'access',
        label: 'Access',
        value: course.isFree ? 'FREE' : `$${course.price}`,
        icon: course.isFree ? 'gift' : 'pricetag',
        iconColor: course.isFree ? '#7C3AED' : '#0D9488',
        iconBackground: course.isFree ? '#EDE9FE' : '#CCFBF1',
        cardBackground: '#FFFFFF',
        borderColor: '#E2E8F0',
      },
    ];
  }, [completedLessonsCount, course, totalDuration]);

  const handleOpenLesson = useCallback((lessonId: string, isLocked: boolean) => {
    if (isLocked) return;
    navigation.navigate('LessonViewer', { courseId, lessonId });
  }, [courseId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Ionicons name="book-outline" size={38} color="#94A3B8" />
        <Text style={styles.loadingText}>Course not found</Text>
        <TouchableOpacity style={styles.backButtonPlaceholder} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Absolute Stick Top Nav */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topNavRow}>
          <TouchableOpacity style={styles.navIconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.navIconButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.contentWrap}
        contentContainerStyle={styles.contentScrollBox}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />}
      >
        <View style={styles.heroContent}>
          <View style={styles.levelPillWrap}>
            <Text style={styles.levelPillText}>{course.level.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseDescription}>{course.description}</Text>

          <View style={styles.heroMetaRow}>
            <View style={[styles.heroMetaItemPill, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={14} color="#D97706" />
              <Text style={[styles.heroMetaTextPill, { color: '#B45309' }]}>{course.rating.toFixed(1)}</Text>
            </View>
            <View style={[styles.heroMetaItemPill, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="people" size={14} color="#4338CA" />
              <Text style={[styles.heroMetaTextPill, { color: '#3730A3' }]}>{course.enrolledCount} learners</Text>
            </View>
            <View style={[styles.heroMetaItemPill, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="play-circle" size={14} color="#0284C7" />
              <Text style={[styles.heroMetaTextPill, { color: '#075985' }]}>{course.lessonsCount} lessons</Text>
            </View>
          </View>
          <Text style={styles.instructorText}>By {course.instructor.name}</Text>
        </View>

        {/* Segmented Control Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabActiveBtn, activeTab === 'overview' && styles.tabActiveStateBtn]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === 'overview' && styles.tabLabelActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabActiveBtn, activeTab === 'curriculum' && styles.tabActiveStateBtn]}
            onPress={() => setActiveTab('curriculum')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === 'curriculum' && styles.tabLabelActive]}>Curriculum</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && (
          <View style={styles.sectionCanvas}>
            {/* Progress Widget */}
            <View style={styles.progressWidget}>
              <View style={styles.progressHeader}>
                <View style={styles.progressIconWrap}>
                  <Ionicons name="trending-up" size={18} color="#14B8A6" />
                </View>
                <View style={styles.progressTextWrap}>
                  <Text style={styles.progressTitle}>Your Journey</Text>
                  <Text style={styles.progressSubtitle}>
                    {course.isEnrolled
                      ? `${completedLessonsCount}/${course.lessonsCount} lessons completed`
                      : 'Enroll to start tracking your progress'}
                  </Text>
                </View>
                <Text style={styles.progressValue}>{Math.round(progressPercentage)}%</Text>
              </View>
              <View style={styles.progressTrackPro}>
                <View style={[styles.progressFillPro, { width: `${progressPercentage}%` }]} />
              </View>
            </View>

            {/* High-End Stat Grid */}
            <View style={styles.statGridPro}>
              {overviewStats.map((item) => (
                <View key={item.key} style={styles.statWidget}>
                  <View style={styles.statTopRow}>
                    <View style={[styles.statIconPad, { backgroundColor: item.iconBackground }]}>
                      <Ionicons name={item.icon} size={16} color={item.iconColor} />
                    </View>
                    <Text style={[styles.statValuePro, { color: item.iconColor }]}>{item.value}</Text>
                  </View>
                  <Text style={styles.statLabelPro}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Tags section */}
            <View style={styles.tagsContainer}>
              {course.tags.length === 0 ? (
                <Text style={styles.mutedTextPro}>No tags available for this course yet.</Text>
              ) : (
                course.tags.map(tag => (
                  <View key={tag} style={styles.tagPro}>
                    <Text style={styles.tagProText}>{tag}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'curriculum' && (
          <View style={styles.sectionCanvas}>
            {course.lessons.map((lesson, index) => {
              const isCompleted = lesson.isCompleted;
              const isLocked = lesson.isLocked;
              const isAccent = isCompleted ? '#10B981' : isLocked ? '#94A3B8' : '#14B8A6';
              
              // Determine icon based on title/order for visual variety
              const isVideo = lesson.title.toLowerCase().includes('video') || index % 2 === 0;
              const iconName = isVideo ? 'play-circle' : 'book';
              const iconColor = isVideo ? '#EF4444' : '#8B5CF6';
              const iconBg = isVideo ? '#FEE2E2' : '#F5F3FF';

              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={[
                    styles.lessonIsland,
                    isLocked && styles.lessonIslandLocked,
                    { borderLeftColor: isAccent }
                  ]}
                  activeOpacity={isLocked ? 1 : 0.8}
                  onPress={() => handleOpenLesson(lesson.id, isLocked)}
                >
                  <View
                    style={[
                      styles.islandIndex,
                      isCompleted ? { backgroundColor: '#D1FAE5' } : isLocked ? { backgroundColor: '#F1F5F9' } : { backgroundColor: iconBg }
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    ) : isLocked ? (
                      <Ionicons name="lock-closed" size={16} color="#64748B" />
                    ) : (
                      <Ionicons name={iconName} size={18} color={iconColor} />
                    )}
                  </View>

                  <View style={styles.islandBody}>
                    <Text style={styles.islandTitle} numberOfLines={1}>{lesson.title}</Text>
                    <View style={styles.islandMetaRow}>
                      <Text style={styles.islandDurationText}>{formatDuration(lesson.duration)}</Text>
                      {lesson.isFree && <Text style={styles.tagPreviewPro}>Free</Text>}
                      {isCompleted && <Text style={styles.tagCompletedPro}>Done</Text>}
                      {isLocked && <Text style={styles.tagLockedPro}>Locked</Text>}
                    </View>
                  </View>
                  {!lesson.isLocked && (
                    <View style={styles.islandChevronWrap}>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Elevated Floating Action Panel */}
      <View style={[styles.floatingActionPanel, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        {course.isEnrolled ? (
          <TouchableOpacity
            style={[styles.primaryActionPill, !nextLesson && styles.primaryActionPillDisabled]}
            onPress={() => {
              if (nextLesson) {
                navigation.navigate('LessonViewer', { courseId, lessonId: nextLesson.id });
              }
            }}
            disabled={!nextLesson}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionPillText}>
              {completedLessonsCount === 0 ? "Start Learning" : "Continue Learning"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryActionPill, enrolling && styles.primaryActionPillDisabled]}
            onPress={handleEnroll}
            disabled={enrolling}
            activeOpacity={0.8}
          >
            {enrolling ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="book" size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionPillText}>Enroll Now</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Ultra Premium Genesis Pro Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  backButtonPlaceholder: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#0F172A',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  headerSafe: {
    backgroundColor: 'transparent',
  },
  heroSection: {
    backgroundColor: '#F8FAFC',
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  heroContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  levelPillWrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    marginBottom: 12,
  },
  levelPillText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  courseDescription: {
    marginTop: 12,
    color: '#475569',
    lineHeight: 26,
    fontSize: 14,
    fontWeight: '500',
  },
  heroMetaRow: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroMetaItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  heroMetaTextPill: {
    fontSize: 13,
    fontWeight: '800',
  },
  instructorText: {
    marginTop: 20,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },
  contentWrap: {
    flex: 1,
  },
  contentScrollBox: {
    paddingHorizontal: 20,
    paddingBottom: 130, // Extremely crucial for overlapping action bar
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // plush container instead of border
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tabActiveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
  },
  tabActiveStateBtn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  sectionCanvas: {
    flex: 1,
  },
  progressWidget: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  progressTextWrap: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  progressSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#14B8A6',
    letterSpacing: -0.5,
  },
  progressTrackPro: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#CCFBF1', // Crisp track background
    overflow: 'hidden',
  },
  progressFillPro: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#14B8A6',
  },
  statGridPro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statWidget: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statIconPad: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValuePro: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabelPro: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  tagsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagPro: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tagProText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  mutedTextPro: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  lessonIsland: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4, // The only accent border
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  lessonIslandLocked: {
    backgroundColor: '#FAFAFA',
    opacity: 0.85,
    shadowOpacity: 0.01,
  },
  islandIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  islandIndexText: {
    color: '#0284C7',
    fontSize: 14,
    fontWeight: '800',
  },
  islandBody: {
    flex: 1,
  },
  islandTitle: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  islandMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  islandDurationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  islandChevronWrap: {
    marginLeft: 8,
    width: 24,
    alignItems: 'center',
  },
  tagPreviewPro: {
    fontSize: 11,
    color: '#0D9488',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontWeight: '700',
    overflow: 'hidden',
  },
  tagCompletedPro: {
    fontSize: 11,
    color: '#14B8A6',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontWeight: '700',
    overflow: 'hidden',
  },
  tagLockedPro: {
    fontSize: 11,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontWeight: '700',
    overflow: 'hidden',
  },
  floatingActionPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8FAFC',
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryActionPill: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#14B8A6',
  },
  primaryActionPillDisabled: {
    opacity: 0.6,
  },
  primaryActionPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
