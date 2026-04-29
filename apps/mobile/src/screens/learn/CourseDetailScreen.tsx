import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { learnApi } from '@/api';
import type { LearnCourseAnnouncement, LearnCourseDetail } from '@/api/learn';
import {
  getCourseLanguageLabel,
  normalizeCourseLocale,
  normalizeCourseLocaleList,
} from '@/lib/courseLocales';
import i18n from '@/lib/i18n';
import { LearnStackParamList, LearnStackScreenProps } from '@/navigation/types';
import { CourseDetailSkeleton } from '@/components/common/Loading';

type RouteParams = RouteProp<LearnStackParamList, 'CourseDetail'>;
type NavigationProp = LearnStackScreenProps<'CourseDetail'>['navigation'];
type TabType = 'overview' | 'curriculum' | 'announcements';
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
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { courseId } = route.params;
  const insets = useSafeAreaInsets();
  const defaultContentLocale = useMemo(
    () => normalizeCourseLocale(i18n.resolvedLanguage || i18n.language || 'en'),
    []
  );
  const [selectedContentLocale, setSelectedContentLocale] = useState(defaultContentLocale);
  const initialCachedCourse = useMemo(
    () => learnApi.getCachedCourseDetail(courseId, selectedContentLocale),
    [courseId, selectedContentLocale]
  );

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(!initialCachedCourse);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [course, setCourse] = useState<LearnCourseDetail | null>(initialCachedCourse);
  const [announcements, setAnnouncements] = useState<LearnCourseAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const courseRef = useRef<LearnCourseDetail | null>(initialCachedCourse);

  useEffect(() => {
    courseRef.current = course;
  }, [course]);

  const availableContentLocales = useMemo(
    () => normalizeCourseLocaleList(course?.supportedLocales || [], course?.sourceLocale || selectedContentLocale),
    [course?.sourceLocale, course?.supportedLocales, selectedContentLocale]
  );
  const selectedContentLocaleLabel = useMemo(
    () => getCourseLanguageLabel(selectedContentLocale),
    [selectedContentLocale]
  );

  useEffect(() => {
    if (!availableContentLocales.includes(selectedContentLocale)) {
      setSelectedContentLocale(availableContentLocales[0]);
    }
  }, [availableContentLocales, selectedContentLocale]);

  const loadCourse = useCallback(async (options?: { force?: boolean; preserveVisibleContent?: boolean }) => {
    const force = options?.force ?? false;
    const preserveVisibleContent = options?.preserveVisibleContent ?? false;
    const hasVisibleCourse = !!courseRef.current;

    if (preserveVisibleContent && hasVisibleCourse) {
      setBackgroundRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (force) {
        learnApi.invalidateCourseDetailCache(courseId);
      }

      const data = await learnApi.getCourseDetail(courseId, force, selectedContentLocale);
      setCourse(data);

      if (data.isEnrolled || data.isInstructor) {
        setAnnouncementsLoading(true);
        setAnnouncementsError(null);

        try {
          const announcementData = await learnApi.getCourseAnnouncements(courseId);
          setAnnouncements(announcementData.announcements);
        } catch (announcementError: any) {
          setAnnouncements([]);
          setAnnouncementsError(announcementError?.message || t('learn.courseDetail.unableLoadAnnouncements'));
        } finally {
          setAnnouncementsLoading(false);
        }
      } else {
        setAnnouncements([]);
        setAnnouncementsError(null);
        setAnnouncementsLoading(false);
      }
    } catch (error: any) {
      if (!hasVisibleCourse || force) {
        Alert.alert(t('learn.courseDetail.course'), error?.message || t('learn.courseDetail.unableLoadCourse'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setBackgroundRefreshing(false);
    }
  }, [courseId, selectedContentLocale]);

  useEffect(() => {
    if (initialCachedCourse) {
      loadCourse({ preserveVisibleContent: true });
      return;
    }

    loadCourse();
  }, [initialCachedCourse, loadCourse]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCourse({ force: true, preserveVisibleContent: true });
  }, [loadCourse]);

  const handleEnroll = useCallback(async () => {
    try {
      setEnrolling(true);
      await learnApi.enrollInCourse(courseId);
      await loadCourse({ force: true, preserveVisibleContent: true });
    } catch (error: any) {
      Alert.alert(t('learn.courseDetail.enrollment'), error?.message || t('learn.errors.enrollFailed'));
    } finally {
      setEnrolling(false);
    }
  }, [courseId, loadCourse]);

  const handlePostAnnouncement = useCallback(async () => {
    const title = announcementTitle.trim();
    const body = announcementBody.trim();

    if (!title || !body) {
      Alert.alert(t('learn.courseDetail.announcement'), t('learn.courseDetail.enterTitleMessage'));
      return;
    }

    try {
      setPostingAnnouncement(true);
      setAnnouncementsError(null);
      const created = await learnApi.createCourseAnnouncement(courseId, { title, body });
      setAnnouncements((current) => [created, ...current]);
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setActiveTab('announcements');
    } catch (error: any) {
      const message = error?.message || t('learn.courseDetail.unablePostAnnouncement');
      setAnnouncementsError(message);
      Alert.alert(t('learn.courseDetail.announcement'), message);
    } finally {
      setPostingAnnouncement(false);
    }
  }, [announcementBody, announcementTitle, courseId]);

  const nextLesson = useMemo(() => {
    // Check hierarchical sections first
    if (course?.sections?.length) {
      let firstAvailable = null;
      for (const section of course.sections) {
        for (const lesson of section.lessons) {
          if (!lesson.isCompleted && !lesson.isLocked) return lesson;
          if (!lesson.isLocked && !firstAvailable) firstAvailable = lesson;
        }
      }
      return firstAvailable;
    }

    // Fallback to flat lessons
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
  }, [course?.sections, course?.lessons]);

  const totalDuration = useMemo(() => {
    if (course?.sections?.length) {
      return course.sections.reduce((acc, section) => 
        acc + section.lessons.reduce((lAcc, lesson) => lAcc + (lesson.duration || 0), 0), 0);
    }
    return course?.lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0) || 0;
  }, [course?.sections, course?.lessons]);

  const completedLessonsCount = useMemo(() => {
    if (course?.sections?.length) {
      return course.sections.reduce((acc, section) => 
        acc + section.lessons.filter(l => l.isCompleted).length, 0);
    }
    return course?.lessons.filter(lesson => lesson.isCompleted).length || 0;
  }, [course?.sections, course?.lessons]);

  const progressPercentage = useMemo(
    () => Math.max(0, Math.min(100, course?.enrollment?.progress ?? 0)),
    [course?.enrollment?.progress]
  );
  const canViewAnnouncements = Boolean(course?.isEnrolled || course?.isInstructor);

  const overviewStats = useMemo<CourseOverviewStat[]>(() => {
    if (!course) return [];

    return [
      {
        key: 'lessons',
        label: t('learn.courseDetail.lessons'),
        value: `${course.lessonsCount}`,
        icon: 'library',
        iconColor: '#0369A1',
        iconBackground: '#E0F2FE',
        cardBackground: '#FFFFFF',
        borderColor: '#E2E8F0',
      },
      {
        key: 'completed',
        label: t('learn.courseDetail.completed'),
        value: `${completedLessonsCount}`,
        icon: 'checkmark-circle',
        iconColor: '#059669',
        iconBackground: '#D1FAE5',
        cardBackground: '#FFFFFF',
        borderColor: '#E2E8F0',
      },
      {
        key: 'duration',
        label: t('learn.courseDetail.duration'),
        value: formatDuration(totalDuration || course.duration),
        icon: 'time',
        iconColor: '#D97706',
        iconBackground: '#FEF3C7',
        cardBackground: '#FFFFFF',
        borderColor: '#E2E8F0',
      },
      {
        key: 'access',
        label: t('learn.courseDetail.access'),
        value: course.isFree ? t('learn.free') : `$${course.price}`,
        icon: course.isFree ? 'gift' : 'pricetag',
        iconColor: course.isFree ? '#7C3AED' : '#0D9488',
        iconBackground: course.isFree ? '#EDE9FE' : '#CCFBF1',
        cardBackground: '#FFFFFF',
        borderColor: '#E2E8F0',
      },
    ];
  }, [completedLessonsCount, course, t, totalDuration]);

  const handleOpenLesson = useCallback((lessonId: string, isLocked: boolean) => {
    if (isLocked) return;
    navigation.navigate('LessonViewer', { courseId, lessonId, contentLocale: selectedContentLocale });
  }, [courseId, navigation, selectedContentLocale]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <CourseDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Ionicons name="book-outline" size={38} color="#94A3B8" />
        <Text style={styles.loadingText}>{t('learn.courseDetail.notFound')}</Text>
        <TouchableOpacity style={styles.backButtonPlaceholder} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('quiz.takeQuiz.goBack')}</Text>
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
            {refreshing || backgroundRefreshing ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Ionicons name="refresh" size={20} color="#0F172A" />
            )}
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
              <Text style={[styles.heroMetaTextPill, { color: '#3730A3' }]}>{t('learn.courseDetail.learnersCount', { count: course.enrolledCount })}</Text>
            </View>
            <View style={[styles.heroMetaItemPill, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="play-circle" size={14} color="#0284C7" />
              <Text style={[styles.heroMetaTextPill, { color: '#075985' }]}>{t('learn.lessonCount', { count: course.lessonsCount })}</Text>
            </View>
          </View>
          <Text style={styles.instructorText}>{t('learn.courseDetail.byInstructor', { name: course.instructor.name })}</Text>

          {availableContentLocales.length > 1 && (
            <View style={styles.languageCard}>
              <View style={styles.languageCardHeader}>
                <View style={styles.languageCardIcon}>
                  <Ionicons name="language-outline" size={16} color="#0369A1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.languageCardTitle}>{t('learn.courseDetail.contentLanguage')}</Text>
                  <Text style={styles.languageCardSubtitle}>
                    {t('learn.courseDetail.learnersViewing', { language: selectedContentLocaleLabel })}
                  </Text>
                </View>
              </View>
              <View style={styles.languageChipRow}>
                {availableContentLocales.map((localeKey) => {
                  const active = selectedContentLocale === localeKey;
                  return (
                    <TouchableOpacity
                      key={localeKey}
                      style={[styles.languageChip, active && styles.languageChipActive]}
                      onPress={() => setSelectedContentLocale(localeKey)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.languageChipText, active && styles.languageChipTextActive]}>
                        {getCourseLanguageLabel(localeKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Segmented Control Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabActiveBtn, activeTab === 'overview' && styles.tabActiveStateBtn]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === 'overview' && styles.tabLabelActive]}>{t('learn.courseDetail.tabs.overview')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabActiveBtn, activeTab === 'curriculum' && styles.tabActiveStateBtn]}
            onPress={() => setActiveTab('curriculum')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === 'curriculum' && styles.tabLabelActive]}>{t('learn.courseDetail.tabs.curriculum')}</Text>
          </TouchableOpacity>
          {canViewAnnouncements && (
            <TouchableOpacity
              style={[styles.tabActiveBtn, activeTab === 'announcements' && styles.tabActiveStateBtn]}
              onPress={() => setActiveTab('announcements')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, activeTab === 'announcements' && styles.tabLabelActive]}>{t('learn.courseDetail.tabs.updates')}</Text>
            </TouchableOpacity>
          )}
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
                  <Text style={styles.progressTitle}>{t('learn.courseDetail.yourJourney')}</Text>
                  <Text style={styles.progressSubtitle}>
                    {course.isEnrolled
                      ? t('learn.courseDetail.lessonsCompletedCount', { completed: completedLessonsCount, total: course.lessonsCount })
                      : t('learn.courseDetail.enrollTrackProgress')}
                  </Text>
                </View>
                <Text style={styles.progressValue}>{Math.round(progressPercentage)}%</Text>
              </View>
              {availableContentLocales.length > 1 && (
                <Text style={styles.progressLocaleText}>{t('learn.courseDetail.contentLocale', { language: selectedContentLocaleLabel })}</Text>
              )}
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
                <Text style={styles.mutedTextPro}>{t('learn.courseDetail.noTags')}</Text>
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
            {course.sections && course.sections.length > 0 ? (
              // Hierarchical View
              course.sections.map((section, sIndex) => (
                <View key={section.id} style={styles.sectionEntry}>
                  <View style={styles.sectionHeaderPro}>
                    <Text style={styles.sectionHeaderText}>SECTION {sIndex + 1}: {section.title.toUpperCase()}</Text>
                  </View>
                  {section.lessons.map((lesson, lIndex) => {
                    const isCompleted = lesson.isCompleted;
                    const isLocked = lesson.isLocked;
                    const isAccent = isCompleted ? '#10B981' : isLocked ? '#94A3B8' : '#14B8A6';
                    
                    let iconName: keyof typeof Ionicons.glyphMap = 'play-circle';
                    let iconColor = '#0EA5E9';
                    let iconBg = '#E0F2FE';
                    
                    if (lesson.type === 'ARTICLE') { iconName = 'book'; iconColor = '#8B5CF6'; iconBg = '#F5F3FF'; }
                    else if (lesson.type === 'DOCUMENT' || lesson.type === 'PDF' || lesson.type === 'FILE') { iconName = 'document-attach'; iconColor = '#6366F1'; iconBg = '#E0E7FF'; }
                    else if (lesson.type === 'IMAGE') { iconName = 'image'; iconColor = '#EC4899'; iconBg = '#FCE7F3'; }
                    else if (lesson.type === 'QUIZ') { iconName = 'help-circle'; iconColor = '#3B82F6'; iconBg = '#DBEAFE'; }
                    else if (lesson.type === 'ASSIGNMENT') { iconName = 'document-text'; iconColor = '#6366F1'; iconBg = '#E0E7FF'; }
                    else if (lesson.type === 'EXERCISE') { iconName = 'code-slash'; iconColor = '#10B981'; iconBg = '#D1FAE5'; }
                    else if (lesson.type === 'CASE_STUDY') { iconName = 'briefcase'; iconColor = '#F59E0B'; iconBg = '#FEF3C7'; }
                    else if (lesson.type === 'PRACTICE') { iconName = 'checkmark-done'; iconColor = '#059669'; iconBg = '#D1FAE5'; }
                    else if (lesson.type === 'AUDIO') { iconName = 'musical-notes'; iconColor = '#0891B2'; iconBg = '#CFFAFE'; }

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
                            {lesson.isFree && <Text style={styles.tagPreviewPro}>{t('learn.courseDetail.freeTag')}</Text>}
                            {isCompleted && <Text style={styles.tagCompletedPro}>{t('learn.courseDetail.doneTag')}</Text>}
                            {isLocked && <Text style={styles.tagLockedPro}>{t('learn.courseDetail.lockedTag')}</Text>}
                          </View>
                        </View>
                        {!lesson.isLocked && (
                          <View style={styles.islandChevronWrap}>
                            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            ) : (
              // Legacy Flat View
              course.lessons.map((lesson, index) => {
                const isCompleted = lesson.isCompleted;
                const isLocked = lesson.isLocked;
                const isAccent = isCompleted ? '#10B981' : isLocked ? '#94A3B8' : '#14B8A6';
                
                let iconName: keyof typeof Ionicons.glyphMap = 'play-circle';
                let iconColor = '#0EA5E9';
                let iconBg = '#E0F2FE';
                
                if (lesson.type === 'ARTICLE') { iconName = 'book'; iconColor = '#8B5CF6'; iconBg = '#F5F3FF'; }
                else if (lesson.type === 'DOCUMENT' || lesson.type === 'PDF' || lesson.type === 'FILE') { iconName = 'document-attach'; iconColor = '#6366F1'; iconBg = '#E0E7FF'; }
                else if (lesson.type === 'IMAGE') { iconName = 'image'; iconColor = '#EC4899'; iconBg = '#FCE7F3'; }
                else if (lesson.type === 'QUIZ') { iconName = 'help-circle'; iconColor = '#3B82F6'; iconBg = '#DBEAFE'; }
                else if (lesson.type === 'ASSIGNMENT') { iconName = 'document-text'; iconColor = '#6366F1'; iconBg = '#E0E7FF'; }
                else if (lesson.type === 'EXERCISE') { iconName = 'code-slash'; iconColor = '#10B981'; iconBg = '#D1FAE5'; }
                else if (lesson.type === 'CASE_STUDY') { iconName = 'briefcase'; iconColor = '#F59E0B'; iconBg = '#FEF3C7'; }
                else if (lesson.type === 'PRACTICE') { iconName = 'checkmark-done'; iconColor = '#059669'; iconBg = '#D1FAE5'; }
                else if (lesson.type === 'AUDIO') { iconName = 'musical-notes'; iconColor = '#0891B2'; iconBg = '#CFFAFE'; }

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
                        {lesson.isFree && <Text style={styles.tagPreviewPro}>{t('learn.courseDetail.freeTag')}</Text>}
                        {isCompleted && <Text style={styles.tagCompletedPro}>{t('learn.courseDetail.doneTag')}</Text>}
                        {isLocked && <Text style={styles.tagLockedPro}>{t('learn.courseDetail.lockedTag')}</Text>}
                      </View>
                    </View>
                    {!lesson.isLocked && (
                      <View style={styles.islandChevronWrap}>
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        )}

        {activeTab === 'announcements' && canViewAnnouncements && (
          <View style={styles.sectionCanvas}>
            {course?.isInstructor && (
              <View style={styles.announcementComposerCard}>
                <View style={styles.announcementComposerHeader}>
                  <View style={styles.announcementComposerIconWrap}>
                    <Ionicons name="megaphone" size={18} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.announcementComposerTitle}>{t('learn.courseDetail.postAnnouncement')}</Text>
                    <Text style={styles.announcementComposerSubtitle}>{t('learn.courseDetail.shareUpdates')}</Text>
                  </View>
                </View>

                <TextInput
                  value={announcementTitle}
                  onChangeText={setAnnouncementTitle}
                  placeholder={t('learn.courseDetail.announcementTitle')}
                  placeholderTextColor="#94A3B8"
                  style={styles.announcementInput}
                />
                <TextInput
                  value={announcementBody}
                  onChangeText={setAnnouncementBody}
                  placeholder={t('learn.courseDetail.announcementPrompt')}
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  style={styles.announcementTextarea}
                />
                <TouchableOpacity
                  style={[styles.announcementSubmitButton, postingAnnouncement && styles.primaryActionPillDisabled]}
                  onPress={handlePostAnnouncement}
                  disabled={postingAnnouncement}
                  activeOpacity={0.85}
                >
                  {postingAnnouncement ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                      <Text style={styles.announcementSubmitButtonText}>{t('learn.courseDetail.postUpdate')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {announcementsError ? (
              <View style={styles.announcementErrorCard}>
                <Text style={styles.announcementErrorText}>{announcementsError}</Text>
              </View>
            ) : null}

            {announcementsLoading ? (
              <View style={styles.announcementEmptyCard}>
                <ActivityIndicator size="small" color="#14B8A6" />
                <Text style={styles.announcementEmptyText}>{t('learn.courseDetail.loadingAnnouncements')}</Text>
              </View>
            ) : announcements.length === 0 ? (
              <View style={styles.announcementEmptyCard}>
                <Ionicons name="notifications-off-outline" size={20} color="#94A3B8" />
                <Text style={styles.announcementEmptyText}>{t('learn.courseDetail.noAnnouncements')}</Text>
              </View>
            ) : (
              announcements.map((announcement) => (
                <View key={announcement.id} style={styles.announcementCard}>
                  <View style={styles.announcementCardHeader}>
                    <View style={styles.announcementBadge}>
                      <Ionicons name="megaphone" size={14} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.announcementCardTitle}>{announcement.title}</Text>
                      <Text style={styles.announcementMetaText}>
                        {(announcement.author?.name || course?.instructor.name || t('learn.qa.instructor'))} • {new Date(announcement.sentAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.announcementBodyText}>{announcement.body}</Text>
                </View>
              ))
            )}
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
                navigation.navigate('LessonViewer', { courseId, lessonId: nextLesson.id, contentLocale: selectedContentLocale });
              }
            }}
            disabled={!nextLesson}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionPillText}>
              {completedLessonsCount === 0 ? t('learn.start') : t('learn.continue')}
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
                <Text style={styles.primaryActionPillText}>{t('learn.enroll')}</Text>
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
  languageCard: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FBFF',
    padding: 14,
    gap: 12,
  },
  languageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  languageCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
  },
  languageCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  languageCardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  languageChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageChipActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  languageChipTextActive: {
    color: '#0369A1',
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
  announcementComposerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FBD38D',
    padding: 18,
    marginBottom: 16,
    gap: 14,
  },
  announcementComposerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  announcementComposerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementComposerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  announcementComposerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  announcementInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  announcementTextarea: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 22,
  },
  announcementSubmitButton: {
    backgroundColor: '#EA580C',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  announcementSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  announcementErrorCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 14,
    marginBottom: 12,
  },
  announcementErrorText: {
    color: '#BE123C',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  announcementEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  announcementEmptyText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 14,
  },
  announcementCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  announcementBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  announcementMetaText: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  announcementBodyText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
  },
  progressWidget: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  sectionEntry: {
    marginBottom: 24,
  },
  sectionHeaderPro: {
    marginBottom: 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.2,
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
  progressLocaleText: {
    marginBottom: 10,
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '700',
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
