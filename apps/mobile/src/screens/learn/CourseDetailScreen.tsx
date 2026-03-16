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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course.title}</Text>
        <TouchableOpacity style={styles.headerIconButton} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

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
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{course.lessonsCount}</Text>
                <Text style={styles.statLabel}>Lessons</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{completedLessonsCount}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{course.enrollment?.progress ? `${Math.round(course.enrollment.progress)}%` : '0%'}</Text>
                <Text style={styles.statLabel}>Progress</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{course.isFree ? 'FREE' : `$${course.price}`}</Text>
                <Text style={styles.statLabel}>Price</Text>
              </View>
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
                style={[styles.lessonRow, lesson.isLocked && styles.lessonRowLocked]}
                activeOpacity={lesson.isLocked ? 1 : 0.8}
                onPress={() => handleOpenLesson(lesson.id, lesson.isLocked)}
              >
                <View style={styles.lessonIndex}>
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
            style={styles.primaryButton}
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
    </SafeAreaView>
  );
}

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
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    width: '48%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7280',
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lessonRowLocked: {
    opacity: 0.65,
  },
  lessonIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
  },
  lessonIndexText: {
    color: '#fff',
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
    color: '#6B7280',
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
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1A73E8',
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
