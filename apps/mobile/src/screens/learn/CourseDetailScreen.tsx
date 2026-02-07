/**
 * Course Detail Screen
 * 
 * Displays course details, curriculum, and enrollment options
 * Matching v1 app clean design style
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Avatar } from '@/components/common';
import { LearnStackParamList } from '@/navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sample course data (replace with API call)
const SAMPLE_COURSE = {
  id: '1',
  title: 'Introduction to React Native',
  description: 'Learn how to build beautiful mobile apps with React Native. This comprehensive course covers everything from the basics to advanced topics like animations and performance optimization.',
  thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
  instructor: {
    id: '1',
    name: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    title: 'Senior Software Engineer',
  },
  rating: 4.8,
  reviewCount: 1250,
  enrolledCount: 8430,
  duration: '12 hours',
  lessons: 48,
  level: 'Intermediate',
  price: 49.99,
  isFree: false,
  isEnrolled: false,
  progress: 0,
  tags: ['React Native', 'Mobile', 'JavaScript'],
  curriculum: [
    {
      id: '1',
      title: 'Getting Started',
      lessons: [
        { id: '1-1', title: 'Course Introduction', duration: '5:30', isCompleted: false, isFree: true },
        { id: '1-2', title: 'Setting Up Your Environment', duration: '12:45', isCompleted: false, isFree: true },
        { id: '1-3', title: 'Creating Your First App', duration: '15:20', isCompleted: false, isFree: false },
      ],
    },
    {
      id: '2',
      title: 'Core Concepts',
      lessons: [
        { id: '2-1', title: 'Components & Props', duration: '18:30', isCompleted: false, isFree: false },
        { id: '2-2', title: 'State Management', duration: '22:15', isCompleted: false, isFree: false },
        { id: '2-3', title: 'Styling & Layout', duration: '16:40', isCompleted: false, isFree: false },
      ],
    },
    {
      id: '3',
      title: 'Navigation',
      lessons: [
        { id: '3-1', title: 'React Navigation Setup', duration: '14:20', isCompleted: false, isFree: false },
        { id: '3-2', title: 'Stack Navigator', duration: '11:55', isCompleted: false, isFree: false },
        { id: '3-3', title: 'Tab Navigator', duration: '13:30', isCompleted: false, isFree: false },
      ],
    },
  ],
};

type RouteParams = RouteProp<LearnStackParamList, 'CourseDetail'>;

export default function CourseDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const courseId = route.params?.courseId;

  const [course, setCourse] = useState(SAMPLE_COURSE);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['1']);

  useEffect(() => {
    // TODO: Fetch course details from API
    // fetchCourseDetails(courseId);
  }, [courseId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEnroll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement enrollment
  }, []);

  const handleShare = useCallback(() => {
    Haptics.selectionAsync();
    // TODO: Implement share
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    Haptics.selectionAsync();
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  const handleLessonPress = useCallback((lessonId: string, isFree: boolean) => {
    if (!course.isEnrolled && !isFree) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Show enroll prompt
      return;
    }
    Haptics.selectionAsync();
    navigation.navigate('LessonViewer' as any, { lessonId });
  }, [course.isEnrolled, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: course.thumbnail }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.heroGradient}
          />
          
          {/* Back Button */}
          <SafeAreaView edges={['top']} style={styles.headerOverlay}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
                <Ionicons name="share-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerAction}>
                <Ionicons name="bookmark-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Course Info Overlay */}
          <View style={styles.heroContent}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{course.level}</Text>
            </View>
            <Text style={styles.heroTitle}>{course.title}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Stats Row */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.statsRow}>
            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Ionicons name="star" size={14} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{course.rating}</Text>
              <Text style={styles.statLabel}>({course.reviewCount})</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Ionicons name="people" size={14} color="#6366F1" />
              </View>
              <Text style={styles.statValue}>{(course.enrolledCount / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>enrolled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Ionicons name="time" size={14} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{course.duration}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Ionicons name="play-circle" size={14} color="#EC4899" />
              </View>
              <Text style={styles.statValue}>{course.lessons}</Text>
              <Text style={styles.statLabel}>lessons</Text>
            </View>
          </Animated.View>

          {/* Instructor */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.instructorCard}>
            <Avatar
              uri={course.instructor.avatar}
              name={course.instructor.name}
              size="md"
            />
            <View style={styles.instructorInfo}>
              <Text style={styles.instructorName}>{course.instructor.name}</Text>
              <Text style={styles.instructorTitle}>{course.instructor.title}</Text>
            </View>
            <TouchableOpacity style={styles.viewProfileButton}>
              <Text style={styles.viewProfileText}>View Profile</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>About This Course</Text>
            <Text style={styles.description}>{course.description}</Text>
            
            {/* Tags */}
            <View style={styles.tagsRow}>
              {course.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Curriculum */}
          <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
            <Text style={styles.sectionTitle}>Curriculum</Text>
            
            {course.curriculum.map((section, sectionIndex) => (
              <View key={section.id} style={styles.curriculumSection}>
                <TouchableOpacity
                  onPress={() => toggleSection(section.id)}
                  style={styles.curriculumHeader}
                >
                  <View style={styles.curriculumHeaderLeft}>
                    <View style={styles.sectionNumber}>
                      <Text style={styles.sectionNumberText}>{sectionIndex + 1}</Text>
                    </View>
                    <View>
                      <Text style={styles.curriculumTitle}>{section.title}</Text>
                      <Text style={styles.curriculumSubtitle}>
                        {section.lessons.length} lessons
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={expandedSections.includes(section.id) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {expandedSections.includes(section.id) && (
                  <View style={styles.lessonsList}>
                    {section.lessons.map((lesson, lessonIndex) => (
                      <TouchableOpacity
                        key={lesson.id}
                        onPress={() => handleLessonPress(lesson.id, lesson.isFree)}
                        style={styles.lessonItem}
                      >
                        <View style={styles.lessonLeft}>
                          <View style={[
                            styles.lessonIcon,
                            lesson.isCompleted && styles.lessonIconCompleted,
                          ]}>
                            {lesson.isCompleted ? (
                              <Ionicons name="checkmark" size={14} color="#fff" />
                            ) : (
                              <Ionicons name="play" size={12} color="#6366F1" />
                            )}
                          </View>
                          <View style={styles.lessonInfo}>
                            <Text style={styles.lessonTitle}>{lesson.title}</Text>
                            <View style={styles.lessonMeta}>
                              <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                              <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                              {lesson.isFree && (
                                <View style={styles.freeBadge}>
                                  <Text style={styles.freeBadgeText}>FREE</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        {!course.isEnrolled && !lesson.isFree && (
                          <Ionicons name="lock-closed" size={16} color="#D1D5DB" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Bottom padding for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.priceSection}>
          {course.isFree ? (
            <Text style={styles.freeText}>Free</Text>
          ) : (
            <>
              <Text style={styles.price}>${course.price}</Text>
              <Text style={styles.priceOriginal}>$99.99</Text>
            </>
          )}
        </View>
        <TouchableOpacity onPress={handleEnroll} style={styles.enrollButton}>
          <Text style={styles.enrollButtonText}>
            {course.isEnrolled ? 'Continue Learning' : 'Enroll Now'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  heroSection: {
    height: 280,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  levelBadge: {
    backgroundColor: 'rgba(99,102,241,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    marginRight: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 20,
  },
  instructorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  instructorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  instructorTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  viewProfileButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366F1',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366F1',
  },
  curriculumSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  curriculumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  curriculumHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  curriculumTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  curriculumSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  lessonsList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lessonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lessonIconCompleted: {
    backgroundColor: '#10B981',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  lessonDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  freeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  priceOriginal: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  freeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  enrollButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  enrollButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
