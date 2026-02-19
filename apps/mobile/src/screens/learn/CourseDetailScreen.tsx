/**
 * Course Detail Screen — Premium Enterprise Design
 * 
 * Features:
 * - Immersive Hero Header with rich gradient overlay
 * - Pill-style tab navigation matching LearnScreen
 * - Modern accordion curriculum with gradient section numbers
 * - Premium instructor card with gradient accents
 * - Glassmorphic bottom bar with gradient enroll button
 * - Colored info grid icons
 * - Gradient avatar review cards
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { Avatar } from '@/components/common';
import { LearnStackParamList } from '@/navigation/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 340;

// Mock Data
const SAMPLE_COURSE = {
  id: '1',
  title: 'Mastering React Native Animation',
  subtitle: 'Build 60FPS animations with Reanimated 3',
  description: 'Unlock the power of React Native Reanimated to build silky smooth 60FPS animations. This course takes you from the basics of shared values to complex gesture-based interactions, layout animations, and shared element transitions.',
  thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
  instructor: {
    id: '1',
    name: 'Sarah Wilson',
    avatar: 'https://i.pravatar.cc/150?img=5',
    title: 'Senior Mobile Engineer @ TechCorp',
    bio: 'Sarah is a React Native contributor and has been building mobile apps for over 8 years. She specializes in performance and animations.',
    rating: 4.9,
    students: 15420,
    courses: 12,
  },
  rating: 4.9,
  reviewCount: 842,
  enrolledCount: 12500,
  duration: '8h 45m',
  lessons: 42,
  level: 'Advanced',
  price: 89.99,
  currency: '$',
  isFree: false,
  isEnrolled: false,
  tags: ['Animation', 'Mobile', 'Reanimated', 'Gesture Handler'],
  lastUpdated: 'Feb 2026',
  curriculum: [
    {
      id: '1',
      title: 'Animation Fundamentals',
      duration: '1h 15m',
      lessons: [
        { id: '1-1', title: 'Understanding the UI Thread', duration: '15:00', isFree: true, type: 'video' },
        { id: '1-2', title: 'Shared Values & Styles', duration: '22:30', isFree: true, type: 'video' },
        { id: '1-3', title: 'Interpolation Basics', duration: '18:45', isFree: false, type: 'video' },
      ],
    },
    {
      id: '2',
      title: 'Gesture Interactions',
      duration: '2h 30m',
      lessons: [
        { id: '2-1', title: 'Pan Gesture Handler', duration: '25:10', isFree: false, type: 'video' },
        { id: '2-2', title: 'Swipe to Delete', duration: '32:00', isFree: false, type: 'project' },
        { id: '2-3', title: 'Drag and Drop List', duration: '45:20', isFree: false, type: 'project' },
      ],
    },
    {
      id: '3',
      title: 'Advanced Layout Transitions',
      duration: '1h 45m',
      lessons: [
        { id: '3-1', title: 'Layout Animations', duration: '20:15', isFree: false, type: 'video' },
        { id: '3-2', title: 'Shared Element Transitions', duration: '35:40', isFree: false, type: 'video' },
      ],
    },
  ],
  reviews: [
    { id: '1', user: 'Alex M.', rating: 5, comment: 'Best animation course I\'ve ever taken. The explanations are crystal clear and the projects are incredibly practical.', date: '2 days ago' },
    { id: '2', user: 'Jamie L.', rating: 4, comment: 'Great content, but I wish there were more TypeScript examples. Overall highly recommended.', date: '1 week ago' },
    { id: '3', user: 'Chris T.', rating: 5, comment: 'Sarah is an amazing instructor. The gesture handler section alone is worth the price.', date: '3 days ago' },
  ],
};

// Review avatar gradient colors
const AVATAR_GRADIENTS: [string, string][] = [
  ['#818CF8', '#6366F1'],
  ['#F472B6', '#EC4899'],
  ['#34D399', '#10B981'],
  ['#38BDF8', '#0EA5E9'],
  ['#60A5FA', '#3B82F6'],
];

type RouteParams = RouteProp<LearnStackParamList, 'CourseDetail'>;
type TabType = 'about' | 'curriculum' | 'reviews';

export default function CourseDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [expandedSections, setExpandedSections] = useState<string[]>(['1']);
  const [isFavorited, setIsFavorited] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, HEADER_HEIGHT], [HEADER_HEIGHT, insets.top + 60], Extrapolate.CLAMP),
  }));

  const imageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT / 2], [1, 0], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [-100, 0], [1.2, 1], Extrapolate.CLAMP) },
    ],
  }));

  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HEADER_HEIGHT - 100, HEADER_HEIGHT - 50], [0, 1], Extrapolate.CLAMP),
  }));

  const handleBack = () => navigation.goBack();

  const handleEnroll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleSection = (id: string) => {
    Haptics.selectionAsync();
    setExpandedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleFavorite = () => {
    Haptics.selectionAsync();
    setIsFavorited(!isFavorited);
  };

  // ── Tab Bar — Pill style ──
  const renderTabs = () => (
    <View style={styles.tabBar}>
      {(['about', 'curriculum', 'reviews'] as TabType[]).map((tab) => {
        const isActive = activeTab === tab;
        const icons: Record<TabType, keyof typeof Ionicons.glyphMap> = {
          about: 'information-circle',
          curriculum: 'list',
          reviews: 'star',
        };
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabPill, isActive && styles.tabPillActive]}
            activeOpacity={0.7}
          >
            <Ionicons name={icons[tab]} size={15} color={isActive ? '#fff' : '#6B7280'} />
            <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── About Tab ──
  const renderAbout = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.tabContent}>
      {/* Quick Stats Row */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <View style={[styles.quickStatIconBg, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="people" size={18} color="#6366F1" />
            </View>
            <Text style={styles.quickStatValue}>{SAMPLE_COURSE.enrolledCount.toLocaleString()}</Text>
            <Text style={styles.quickStatLabel}>Students</Text>
          </View>
          <View style={styles.quickStat}>
            <View style={[styles.quickStatIconBg, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="star" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.quickStatValue}>{SAMPLE_COURSE.rating}</Text>
            <Text style={styles.quickStatLabel}>Rating</Text>
          </View>
          <View style={styles.quickStat}>
            <View style={[styles.quickStatIconBg, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="play-circle" size={18} color="#10B981" />
            </View>
            <Text style={styles.quickStatValue}>{SAMPLE_COURSE.lessons}</Text>
            <Text style={styles.quickStatLabel}>Lessons</Text>
          </View>
          <View style={styles.quickStat}>
            <View style={[styles.quickStatIconBg, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="time" size={18} color="#EC4899" />
            </View>
            <Text style={styles.quickStatValue}>{SAMPLE_COURSE.duration}</Text>
            <Text style={styles.quickStatLabel}>Duration</Text>
          </View>
        </View>
      </Animated.View>

      {/* Description */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you'll learn</Text>
          <Text style={styles.description}>{SAMPLE_COURSE.description}</Text>

          <View style={styles.tagsContainer}>
            {SAMPLE_COURSE.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Instructor */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructor</Text>
          <View style={styles.instructorCard}>
            <View style={styles.instructorGradientAccent} />
            <View style={styles.instructorHeader}>
              <Image source={{ uri: SAMPLE_COURSE.instructor.avatar }} style={styles.instructorAvatar} />
              <View style={styles.instructorInfo}>
                <View style={styles.instructorNameRow}>
                  <Text style={styles.instructorName}>{SAMPLE_COURSE.instructor.name}</Text>
                  <View style={styles.verifiedBadge}>
                    <LinearGradient
                      colors={['#818CF8', '#6366F1']}
                      style={styles.verifiedGradient}
                    >
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </LinearGradient>
                  </View>
                </View>
                <Text style={styles.instructorTitle}>{SAMPLE_COURSE.instructor.title}</Text>
                <View style={styles.instructorStats}>
                  <View style={styles.instructorStat}>
                    <Ionicons name="star" size={12} color="#0EA5E9" />
                    <Text style={styles.instructorStatText}>{SAMPLE_COURSE.instructor.rating}</Text>
                  </View>
                  <View style={styles.instructorStatDot} />
                  <View style={styles.instructorStat}>
                    <Ionicons name="people" size={12} color="#6366F1" />
                    <Text style={styles.instructorStatText}>{SAMPLE_COURSE.instructor.students.toLocaleString()} Students</Text>
                  </View>
                  <View style={styles.instructorStatDot} />
                  <View style={styles.instructorStat}>
                    <Ionicons name="book" size={12} color="#10B981" />
                    <Text style={styles.instructorStatText}>{SAMPLE_COURSE.instructor.courses} Courses</Text>
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.instructorBio}>{SAMPLE_COURSE.instructor.bio}</Text>
            <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['#818CF8', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.followBtnGradient}
              >
                <Ionicons name="person-add-outline" size={14} color="#fff" />
                <Text style={styles.followBtnText}>Follow</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Course Info Grid */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <View style={[styles.infoIconBg, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="layers-outline" size={22} color="#6366F1" />
            </View>
            <Text style={styles.infoLabel}>Level</Text>
            <Text style={styles.infoValue}>{SAMPLE_COURSE.level}</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.infoIconBg, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="time-outline" size={22} color="#0EA5E9" />
            </View>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{SAMPLE_COURSE.duration}</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.infoIconBg, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="calendar-outline" size={22} color="#10B981" />
            </View>
            <Text style={styles.infoLabel}>Updated</Text>
            <Text style={styles.infoValue}>{SAMPLE_COURSE.lastUpdated}</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );

  // ── Curriculum Tab ──
  const renderCurriculum = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.tabContent}>
      <View style={styles.curriculumHeader}>
        <View style={styles.curriculumStatsRow}>
          <View style={[styles.curriculumStatBadge, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="folder-open" size={14} color="#6366F1" />
            <Text style={[styles.curriculumStatText, { color: '#6366F1' }]}>
              {SAMPLE_COURSE.curriculum.length} Sections
            </Text>
          </View>
          <View style={[styles.curriculumStatBadge, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="play-circle" size={14} color="#10B981" />
            <Text style={[styles.curriculumStatText, { color: '#10B981' }]}>
              {SAMPLE_COURSE.lessons} Lessons
            </Text>
          </View>
          <View style={[styles.curriculumStatBadge, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="time" size={14} color="#0EA5E9" />
            <Text style={[styles.curriculumStatText, { color: '#0EA5E9' }]}>
              {SAMPLE_COURSE.duration}
            </Text>
          </View>
        </View>
      </View>

      {SAMPLE_COURSE.curriculum.map((section, index) => {
        const isExpanded = expandedSections.includes(section.id);
        return (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(80 * index).duration(400)}
          >
            <View style={styles.accordionItem}>
              <TouchableOpacity
                onPress={() => toggleSection(section.id)}
                style={[styles.accordionHeader, isExpanded && styles.accordionHeaderExpanded]}
                activeOpacity={0.7}
              >
                <View style={styles.accordionLeft}>
                  <LinearGradient
                    colors={['#818CF8', '#6366F1']}
                    style={styles.sectionIndex}
                  >
                    <Text style={styles.sectionIndexText}>{index + 1}</Text>
                  </LinearGradient>
                  <View style={styles.sectionTextContainer}>
                    <Text style={styles.sectionTitleText}>{section.title}</Text>
                    <Text style={styles.sectionDurationText}>{section.duration} • {section.lessons.length} lessons</Text>
                  </View>
                </View>
                <View style={[styles.chevronCircle, isExpanded && styles.chevronCircleExpanded]}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={isExpanded ? '#6366F1' : '#9CA3AF'}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.lessonsList}>
                  {section.lessons.map((lesson, lessonIndex) => (
                    <TouchableOpacity key={lesson.id} style={styles.lessonRow} activeOpacity={0.6}>
                      <View style={styles.lessonIconContainer}>
                        {lesson.type === 'video' ? (
                          <View style={[styles.lessonIconBg, {
                            backgroundColor: lesson.isFree ? '#EEF2FF' : '#F3F4F6'
                          }]}>
                            <Ionicons
                              name="play"
                              size={14}
                              color={lesson.isFree ? '#6366F1' : '#9CA3AF'}
                            />
                          </View>
                        ) : (
                          <View style={[styles.lessonIconBg, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="code-slash" size={14} color="#10B981" />
                          </View>
                        )}
                      </View>
                      <View style={styles.lessonInfo}>
                        <Text style={[styles.lessonTitle, !lesson.isFree && styles.lessonTitleLocked]}>
                          {lesson.title}
                        </Text>
                        <View style={styles.lessonMeta}>
                          <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                          {lesson.isFree && (
                            <View style={styles.freeTag}>
                              <Text style={styles.freeTagText}>Preview</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {!lesson.isFree && (
                        <View style={styles.lockIconBg}>
                          <Ionicons name="lock-closed" size={12} color="#D1D5DB" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        );
      })}
    </Animated.View>
  );

  // ── Reviews Tab ──
  const renderReviews = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.tabContent}>
      {/* Review Summary */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <View style={styles.reviewSummary}>
          <View style={styles.reviewScoreContainer}>
            <Text style={styles.reviewScore}>{SAMPLE_COURSE.rating}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Ionicons key={i} name="star" size={16} color="#0EA5E9" />
              ))}
            </View>
          </View>
          <View style={styles.reviewSummaryRight}>
            <Text style={styles.reviewCountText}>{SAMPLE_COURSE.reviewCount} Reviews</Text>
            <Text style={styles.reviewSubtext}>from verified students</Text>
          </View>
        </View>
      </Animated.View>

      {/* Review Cards */}
      {SAMPLE_COURSE.reviews.map((review, index) => (
        <Animated.View
          key={review.id}
          entering={FadeInDown.delay(150 + 80 * index).duration(400)}
        >
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewUser}>
                <LinearGradient
                  colors={AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]}
                  style={styles.reviewAvatar}
                >
                  <Text style={styles.reviewAvatarText}>{review.user.charAt(0)}</Text>
                </LinearGradient>
                <View>
                  <Text style={styles.reviewName}>{review.user}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
              </View>
              <View style={styles.reviewRating}>
                <View style={styles.reviewRatingBadge}>
                  <Ionicons name="star" size={12} color="#0EA5E9" />
                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Animated Sticky Header */}
      <Animated.View style={[styles.stickyHeader, headerStyle]}>
        <Animated.View style={[styles.stickyHeaderImageContainer, imageStyle]}>
          <Image source={{ uri: SAMPLE_COURSE.thumbnail }} style={styles.stickyHeaderImage} contentFit="cover" />
          <LinearGradient
            colors={['rgba(79,70,229,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.5, 1]}
            style={styles.gradientOverlay}
          />
        </Animated.View>

        {/* Safe Area Header Controls */}
        <SafeAreaView edges={['top']} style={styles.headerControls}>
          <TouchableOpacity onPress={handleBack} style={styles.iconButtonBlur}>
            <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>

          <Animated.Text style={[styles.headerTitle, headerTitleStyle]} numberOfLines={1}>
            {SAMPLE_COURSE.title}
          </Animated.Text>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButtonBlur}>
              <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
                <Ionicons name="share-outline" size={22} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButtonBlur} onPress={toggleFavorite}>
              <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
                <Ionicons
                  name={isFavorited ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorited ? '#F87171' : '#FFFFFF'}
                />
              </BlurView>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Hero Content */}
        <Animated.View style={[styles.heroContent, imageStyle]}>
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.levelBadge}
            >
              <Ionicons name="flame" size={12} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.levelBadgeText}>{SAMPLE_COURSE.level}</Text>
            </LinearGradient>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#0EA5E9" style={{ marginRight: 4 }} />
              <Text style={styles.ratingBadgeText}>{SAMPLE_COURSE.rating} ({SAMPLE_COURSE.reviewCount})</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{SAMPLE_COURSE.title}</Text>
          <Text style={styles.heroSubtitle}>{SAMPLE_COURSE.subtitle}</Text>
        </Animated.View>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {renderTabs()}
          {activeTab === 'about' && renderAbout()}
          {activeTab === 'curriculum' && renderCurriculum()}
          {activeTab === 'reviews' && renderReviews()}
          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total Price</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceSymbol}>{SAMPLE_COURSE.currency}</Text>
            <Text style={styles.priceValue}>{SAMPLE_COURSE.price}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.enrollButton} onPress={handleEnroll} activeOpacity={0.8}>
          <LinearGradient
            colors={['#818CF8', '#6366F1', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.enrollButtonGradient}
          >
            <Text style={styles.enrollButtonText}>Enroll Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },

  // ── Sticky Header ──
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  stickyHeaderImageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  stickyHeaderImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 101,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButtonBlur: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Hero Content ──
  heroContent: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    zIndex: 90,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 32,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    lineHeight: 22,
  },

  // ── Content Container ──
  contentContainer: {
    backgroundColor: '#F5F3FF',
    minHeight: SCREEN_HEIGHT - HEADER_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 8,
  },

  // ── Tab Bar — Pill Style ──
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  tabPillActive: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // ── Quick Stats ──
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  quickStat: {
    alignItems: 'center',
    gap: 6,
  },
  quickStatIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  // ── Sections ──
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
  },
  tagText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },

  // ── Instructor ──
  instructorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  instructorGradientAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#6366F1',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  instructorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  instructorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginRight: 14,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  verifiedBadge: {
    borderRadius: 9,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  verifiedGradient: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 6,
  },
  instructorStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  instructorStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructorStatDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  instructorStatText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  instructorBio: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 14,
  },
  followBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  followBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 6,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Info Grid ──
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  infoItem: {
    alignItems: 'center',
    gap: 8,
  },
  infoIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  // ── Curriculum ──
  curriculumHeader: {
    marginBottom: 16,
  },
  curriculumStatsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  curriculumStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  curriculumStatText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accordionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accordionHeaderExpanded: {
    backgroundColor: '#FAFAFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIndexText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionTextContainer: {
    flex: 1,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  sectionDurationText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronCircleExpanded: {
    backgroundColor: '#EEF2FF',
  },
  lessonsList: {
    backgroundColor: '#FFFFFF',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  lessonIconContainer: {
    width: 36,
    alignItems: 'center',
  },
  lessonIconBg: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonInfo: {
    flex: 1,
    marginLeft: 10,
  },
  lessonTitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 3,
  },
  lessonTitleLocked: {
    color: '#9CA3AF',
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonDuration: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  freeTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  freeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  lockIconBg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Reviews ──
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  reviewScoreContainer: {
    alignItems: 'center',
    gap: 6,
  },
  reviewScore: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewSummaryRight: {
    flex: 1,
  },
  reviewCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  reviewSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  reviewRating: {},
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
  },

  // ── Bottom Bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDE9FE',
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  priceContainer: {},
  priceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  priceSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  enrollButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  enrollButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  enrollButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
