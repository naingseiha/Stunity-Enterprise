import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import type { LearnCourseDetail, LearnLessonDetail } from '@/api/learn';
import { LearnStackParamList, LearnStackScreenProps } from '@/navigation/types';

type RouteParams = RouteProp<LearnStackParamList, 'LessonViewer'>;
type NavigationProp = LearnStackScreenProps<'LessonViewer'>['navigation'];

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const stripHtml = (input: string) => input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export default function LessonViewerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { courseId, lessonId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [course, setCourse] = useState<LearnCourseDetail | null>(null);
  const [lesson, setLesson] = useState<LearnLessonDetail | null>(null);

  const loadLessonData = useCallback(async () => {
    try {
      const [lessonData, courseData] = await Promise.all([
        learnApi.getLessonDetail(courseId, lessonId),
        learnApi.getCourseDetail(courseId),
      ]);

      setLesson(lessonData);
      setCourse(courseData);
    } catch (error: any) {
      Alert.alert('Lesson', error?.message || 'Unable to load this lesson');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, lessonId, navigation]);

  useEffect(() => {
    loadLessonData();
  }, [loadLessonData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLessonData();
  }, [loadLessonData]);

  const currentLessonIndex = useMemo(() => {
    if (!course?.lessons?.length) return -1;
    return course.lessons.findIndex(item => item.id === lessonId);
  }, [course?.lessons, lessonId]);

  const previousLesson = useMemo(() => {
    if (!course?.lessons || currentLessonIndex <= 0) return null;
    const candidate = course.lessons[currentLessonIndex - 1];
    return candidate.isLocked ? null : candidate;
  }, [course?.lessons, currentLessonIndex]);

  const nextLesson = useMemo(() => {
    if (!course?.lessons || currentLessonIndex < 0 || currentLessonIndex >= course.lessons.length - 1) return null;
    const candidate = course.lessons[currentLessonIndex + 1];
    return candidate.isLocked ? null : candidate;
  }, [course?.lessons, currentLessonIndex]);

  const completedLessonsCount = useMemo(
    () => course?.lessons.filter(item => item.isCompleted).length || 0,
    [course?.lessons]
  );

  const courseProgressPercentage = useMemo(() => {
    if (!course?.lessons?.length) return 0;
    return Math.round((completedLessonsCount / course.lessons.length) * 100);
  }, [completedLessonsCount, course?.lessons]);

  const openLesson = useCallback((targetLessonId: string) => {
    navigation.replace('LessonViewer', { courseId, lessonId: targetLessonId });
  }, [courseId, navigation]);

  const handleMarkComplete = useCallback(async () => {
    if (!lesson || lesson.isCompleted) return;

    try {
      setCompleting(true);
      await learnApi.updateLessonProgress(courseId, lessonId, {
        completed: true,
        watchTime: Math.max(lesson.watchTime, lesson.duration * 60),
      });
      await loadLessonData();
    } catch (error: any) {
      Alert.alert('Progress', error?.message || 'Unable to update lesson progress');
    } finally {
      setCompleting(false);
    }
  }, [courseId, lesson, lessonId, loadLessonData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#1A73E8" />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={36} color="#9CA3AF" />
        <Text style={styles.loadingText}>Lesson is not available.</Text>
      </SafeAreaView>
    );
  }

  const contentText = lesson.content ? stripHtml(lesson.content) : (lesson.description || 'No lesson content available.');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course?.title || 'Lesson'}
          </Text>
          <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color="#334155" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />}
      >
        <View style={styles.lessonCard}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <View style={styles.lessonMetaRow}>
            <View style={styles.lessonMetaItem}>
              <Ionicons name="time-outline" size={13} color="#6B7280" />
              <Text style={styles.lessonMetaText}>{formatDuration(lesson.duration)}</Text>
            </View>
            <View style={styles.lessonMetaItem}>
              <Ionicons name={lesson.isCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={lesson.isCompleted ? '#10B981' : '#6B7280'} />
              <Text style={styles.lessonMetaText}>{lesson.isCompleted ? 'Completed' : 'In progress'}</Text>
            </View>
          </View>
          <Text style={styles.lessonContent}>{contentText}</Text>

          {lesson.videoUrl && (
            <TouchableOpacity
              style={styles.resourceRow}
              onPress={() => Linking.openURL(lesson.videoUrl!)}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle-outline" size={16} color="#1A73E8" />
              <Text style={styles.resourceText}>Open lesson video</Text>
            </TouchableOpacity>
          )}

          {lesson.resources.length > 0 && (
            <View style={styles.resourcesSection}>
              <Text style={styles.resourcesTitle}>Resources</Text>
              {lesson.resources.map(resource => (
                <TouchableOpacity
                  key={resource.id}
                  style={styles.resourceRow}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(resource.url)}
                >
                  <Ionicons name="document-attach-outline" size={16} color="#1A73E8" />
                  <Text style={styles.resourceText} numberOfLines={1}>{resource.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {course?.lessons?.length ? (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressIconWrap}>
                <Ionicons name="analytics-outline" size={16} color="#1D4ED8" />
              </View>
              <View style={styles.progressTextWrap}>
                <Text style={styles.progressTitle}>Course progress</Text>
                <Text style={styles.progressSubtitle}>
                  {completedLessonsCount}/{course.lessons.length} lessons completed
                </Text>
              </View>
              <Text style={styles.progressValue}>{courseProgressPercentage}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${courseProgressPercentage}%` }]} />
            </View>
            <Text style={styles.progressHint}>
              Lesson {Math.max(1, currentLessonIndex + 1)} of {course.lessons.length}
            </Text>
          </View>
        ) : null}

        {course?.lessons?.length ? (
          <View style={styles.playlistCard}>
            <Text style={styles.playlistTitle}>Course lessons</Text>
            {course.lessons.map((courseLesson, index) => (
              <TouchableOpacity
                key={courseLesson.id}
                style={[styles.playlistItem, courseLesson.id === lessonId && styles.playlistItemActive, courseLesson.isLocked && styles.playlistItemLocked]}
                activeOpacity={courseLesson.isLocked ? 1 : 0.8}
                onPress={() => {
                  if (!courseLesson.isLocked) {
                    openLesson(courseLesson.id);
                  }
                }}
              >
                <View style={styles.playlistIndex}>
                  {courseLesson.isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : courseLesson.isLocked ? (
                    <Ionicons name="lock-closed" size={11} color="#fff" />
                  ) : (
                    <Text style={styles.playlistIndexText}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.playlistBody}>
                  <Text style={styles.playlistItemTitle} numberOfLines={1}>{courseLesson.title}</Text>
                  <Text style={styles.playlistMetaText}>{formatDuration(courseLesson.duration)}</Text>
                </View>
                {courseLesson.id === lessonId && (
                  <Ionicons name="radio-button-on" size={14} color="#1A73E8" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.secondaryButton, !previousLesson && styles.disabledButton]}
          onPress={() => previousLesson && openLesson(previousLesson.id)}
          disabled={!previousLesson}
        >
          <Ionicons name="chevron-back" size={16} color="#fff" />
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, (lesson.isCompleted || completing) && styles.disabledButton]}
          onPress={handleMarkComplete}
          disabled={lesson.isCompleted || completing}
        >
          {completing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>{lesson.isCompleted ? 'Completed' : 'Complete'}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, !nextLesson && styles.disabledButton]}
          onPress={() => nextLesson && openLesson(nextLesson.id)}
          disabled={!nextLesson}
        >
          <Text style={styles.secondaryButtonText}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
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
    fontSize: 14,
    color: '#6B7280',
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
  headerButton: {
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
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  lessonCard: {
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
  progressCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FBFF',
    padding: 10,
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
  progressHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  lessonTitle: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '800',
  },
  lessonMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonMetaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  lessonContent: {
    marginTop: 10,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  resourcesSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    gap: 8,
  },
  resourcesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  resourceText: {
    flex: 1,
    fontSize: 13,
    color: '#1A73E8',
    fontWeight: '600',
  },
  playlistCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  playlistItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  playlistItemLocked: {
    opacity: 0.6,
  },
  playlistIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistIndexText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  playlistBody: {
    flex: 1,
  },
  playlistItemTitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  playlistMetaText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1.2,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#64748B',
    flexDirection: 'row',
    gap: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
