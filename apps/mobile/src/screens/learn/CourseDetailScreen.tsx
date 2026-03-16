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
import { SafeAreaView } from 'react-native-safe-area-context';
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
    return course.lessons.find(lesson => !lesson.isCompleted && !lesson.isLocked) || course.lessons[0];
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
        icon: 'library-outline',
        iconColor: '#2563EB',
        iconBackground: '#DBEAFE',
        cardBackground: '#F8FBFF',
        borderColor: '#BFDBFE',
      },
      {
        key: 'completed',
        label: 'Completed',
        value: `${completedLessonsCount}`,
        icon: 'checkmark-circle-outline',
        iconColor: '#059669',
        iconBackground: '#D1FAE5',
        cardBackground: '#ECFDF5',
        borderColor: '#A7F3D0',
      },
      {
        key: 'duration',
        label: 'Duration',
        value: formatDuration(totalDuration || course.duration),
        icon: 'time-outline',
        iconColor: '#D97706',
        iconBackground: '#FDE68A',
        cardBackground: '#FFFBEB',
        borderColor: '#FCD34D',
      },
      {
        key: 'access',
        label: 'Access',
        value: course.isFree ? 'FREE' : `$${course.price}`,
        icon: course.isFree ? 'gift-outline' : 'pricetag-outline',
        iconColor: course.isFree ? '#7C3AED' : '#0F766E',
        iconBackground: course.isFree ? '#EDE9FE' : '#CCFBF1',
        cardBackground: course.isFree ? '#F5F3FF' : '#F0FDFA',
        borderColor: course.isFree ? '#DDD6FE' : '#99F6E4',
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
        <ActivityIndicator size="large" color="#1A73E8" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Ionicons name="book-outline" size={38} color="#9CA3AF" />
        <Text style={styles.loadingText}>Course not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{course.title}</Text>
          <TouchableOpacity style={styles.headerIconButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color="#334155" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.levelPill}>{course.level.replace('_', ' ')}</Text>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseDescription}>{course.description}</Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.heroMetaText}>{course.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons name="people-outline" size={14} color="#6B7280" />
              <Text style={styles.heroMetaText}>{course.enrolledCount}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons name="play-circle-outline" size={14} color="#6B7280" />
              <Text style={styles.heroMetaText}>{course.lessonsCount} lessons</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.heroMetaText}>{formatDuration(totalDuration || course.duration)}</Text>
            </View>
          </View>

          <Text style={styles.instructorText}>By {course.instructor.name}</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.tabButtonTextActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'curriculum' && styles.tabButtonActive]}
            onPress={() => setActiveTab('curriculum')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'curriculum' && styles.tabButtonTextActive]}>Curriculum</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && (
          <View style={styles.section}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={styles.progressIconWrap}>
                  <Ionicons name="trending-up-outline" size={16} color="#1D4ED8" />
                </View>
                <View style={styles.progressTextWrap}>
                  <Text style={styles.progressTitle}>Course progress</Text>
                  <Text style={styles.progressSubtitle}>
                    {course.isEnrolled
                      ? `${completedLessonsCount}/${course.lessonsCount} lessons completed`
                      : 'Enroll to start tracking your progress'}
                  </Text>
                </View>
                <Text style={styles.progressValue}>{Math.round(progressPercentage)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
              </View>
            </View>

            <View style={styles.statGrid}>
              {overviewStats.map((item) => (
                <View
                  key={item.key}
                  style={[styles.statItem, { backgroundColor: item.cardBackground, borderColor: item.borderColor }]}
                >
                  <View style={styles.statItemTopRow}>
                    <View style={[styles.statIconWrap, { backgroundColor: item.iconBackground }]}>
                      <Ionicons name={item.icon} size={14} color={item.iconColor} />
                    </View>
                    <Text style={[styles.statValue, { color: item.iconColor }]}>{item.value}</Text>
                  </View>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.tagsContainer}>
              {course.tags.length === 0 ? (
                <Text style={styles.mutedText}>No tags available for this course yet.</Text>
              ) : (
                course.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'curriculum' && (
          <View style={styles.section}>
            {course.lessons.map((lesson, index) => (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonRow,
                  lesson.isCompleted && styles.lessonRowCompleted,
                  lesson.isLocked && styles.lessonRowLocked,
                ]}
                activeOpacity={lesson.isLocked ? 1 : 0.8}
                onPress={() => handleOpenLesson(lesson.id, lesson.isLocked)}
              >
                <View
                  style={[
                    styles.lessonIndex,
                    lesson.isCompleted && styles.lessonIndexCompleted,
                    lesson.isLocked && styles.lessonIndexLocked,
                  ]}
                >
                  {lesson.isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : lesson.isLocked ? (
                    <Ionicons name="lock-closed" size={13} color="#fff" />
                  ) : (
                    <Text style={styles.lessonIndexText}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.lessonBody}>
                  <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
                  <View style={styles.lessonMeta}>
                    <Text style={styles.lessonMetaText}>{formatDuration(lesson.duration)}</Text>
                    {lesson.isFree && <Text style={styles.previewBadge}>Preview</Text>}
                    {lesson.isCompleted && <Text style={styles.completedBadge}>Completed</Text>}
                    {lesson.isLocked && <Text style={styles.lockedBadge}>Locked</Text>}
                  </View>
                </View>
                {!lesson.isLocked && <Ionicons name="chevron-forward" size={16} color="#6B7280" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {course.isEnrolled ? (
          <TouchableOpacity
            style={[styles.primaryButton, !nextLesson && styles.primaryButtonDisabled]}
            onPress={() => {
              if (nextLesson) {
                navigation.navigate('LessonViewer', { courseId, lessonId: nextLesson.id });
              }
            }}
            disabled={!nextLesson}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Continue Learning</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, enrolling && styles.primaryButtonDisabled]}
            onPress={handleEnroll}
            disabled={enrolling}
          >
            {enrolling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={styles.primaryButtonText}>Enroll Now</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  backButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1A73E8',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  header: {
    height: 52,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  headerTitle: {
    flex: 1,
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  levelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    color: '#4338CA',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  courseDescription: {
    marginTop: 6,
    color: '#6B7280',
    lineHeight: 19,
    fontSize: 13,
  },
  heroMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  instructorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  tabRow: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#EFF6FF',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#1D4ED8',
  },
  section: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  progressCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FBFF',
    padding: 10,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  progressTextWrap: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressSubtitle: {
    marginTop: 1,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E0E7FF',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '49%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  statItemTopRow: {
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
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 7,
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  tagsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
  },
  tagText: {
    fontSize: 11,
    color: '#4338CA',
    fontWeight: '700',
  },
  mutedText: {
    color: '#6B7280',
    fontSize: 12,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  lessonRowCompleted: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  lessonRowLocked: {
    opacity: 0.75,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  lessonIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  lessonIndexCompleted: {
    backgroundColor: '#10B981',
  },
  lessonIndexLocked: {
    backgroundColor: '#94A3B8',
  },
  lessonIndexText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  lessonBody: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  lessonMeta: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lessonMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  previewBadge: {
    fontSize: 10,
    color: '#047857',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  completedBadge: {
    fontSize: 10,
    color: '#047857',
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  lockedBadge: {
    fontSize: 10,
    color: '#475569',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1A73E8',
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
