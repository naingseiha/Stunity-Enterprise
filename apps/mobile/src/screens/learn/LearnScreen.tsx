/**
 * Learn Hub Screen — Premium Enterprise Design
 * 
 * Matching feed design language:
 * - Indigo gradient hero learning progress card
 * - Search bar with rounded styling
 * - Circular category filters with gradient active rings
 * - Featured course carousel
 * - Premium course card list
 * - Decorative circles, soft purple background
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';

import StunityLogo from '../../../assets/Stunity.svg';

import { CourseCard } from '@/components/learn';
import { useAuthStore } from '@/stores';
import { Course, LearningPath } from '@/types';
import { LearnStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = LearnStackScreenProps<'LearnHub'>['navigation'];
type TabType = 'explore' | 'enrolled' | 'created' | 'paths';

const TABS: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { id: 'explore', label: 'Explore', icon: 'compass', color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'enrolled', label: 'My Courses', icon: 'book', color: '#3B82F6', bg: '#DBEAFE' },
  { id: 'created', label: 'Created', icon: 'create', color: '#10B981', bg: '#D1FAE5' },
  { id: 'paths', label: 'Paths', icon: 'git-branch', color: '#0EA5E9', bg: '#E0F2FE' },
];

// Category filters with gradient rings
const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps' as const, color: '#0EA5E9', bg: '#E0F2FE', gradient: ['#7DD3FC', '#0EA5E9'] as [string, string] },
  { id: 'dev', name: 'Dev', icon: 'code-slash' as const, color: '#3B82F6', bg: '#DBEAFE', gradient: ['#60A5FA', '#3B82F6'] as [string, string] },
  { id: 'design', name: 'Design', icon: 'color-palette' as const, color: '#EC4899', bg: '#FCE7F3', gradient: ['#F472B6', '#EC4899'] as [string, string] },
  { id: 'data', name: 'Data', icon: 'analytics' as const, color: '#10B981', bg: '#D1FAE5', gradient: ['#34D399', '#10B981'] as [string, string] },
  { id: 'business', name: 'Business', icon: 'briefcase' as const, color: '#0EA5E9', bg: '#E0F2FE', gradient: ['#7DD3FC', '#0EA5E9'] as [string, string] },
  { id: 'language', name: 'Language', icon: 'globe' as const, color: '#8B5CF6', bg: '#EDE9FE', gradient: ['#A78BFA', '#8B5CF6'] as [string, string] },
];

// Mock data
const MOCK_COURSES: Course[] = [
  {
    id: '1',
    title: 'Complete React Native Development',
    description: 'Build mobile apps with React Native from scratch',
    level: 'BEGINNER',
    category: 'Development',
    enrollmentCount: 12500,
    rating: 4.8,
    totalLessons: 42,
    duration: 480,
    price: 0,
    currency: 'USD',
    reviewCount: 850,
    isPublished: true,
    tags: ['react-native', 'mobile'],
    requirements: [],
    learningOutcomes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructor: {
      id: '1', firstName: 'John', lastName: 'Doe', username: 'johndoe', email: 'john@example.com',
      role: 'TEACHER', isVerified: true, isOnline: false, languages: [], interests: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  },
  {
    id: '2',
    title: 'Machine Learning Fundamentals',
    description: 'Introduction to ML concepts and algorithms',
    level: 'INTERMEDIATE',
    category: 'Data Science',
    enrollmentCount: 8300,
    rating: 4.6,
    totalLessons: 35,
    duration: 360,
    price: 49.99,
    currency: 'USD',
    reviewCount: 520,
    isPublished: true,
    tags: ['machine-learning', 'python'],
    requirements: [],
    learningOutcomes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructor: {
      id: '2', firstName: 'Jane', lastName: 'Smith', username: 'janesmith', email: 'jane@example.com',
      role: 'TEACHER', isVerified: true, isOnline: false, languages: [], interests: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  },
  {
    id: '3',
    title: 'Advanced TypeScript Patterns',
    description: 'Master advanced TypeScript features',
    level: 'ADVANCED',
    category: 'Development',
    enrollmentCount: 5600,
    rating: 4.9,
    totalLessons: 28,
    duration: 240,
    price: 0,
    currency: 'USD',
    reviewCount: 340,
    isPublished: true,
    tags: ['typescript', 'javascript'],
    requirements: [],
    learningOutcomes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructor: {
      id: '1', firstName: 'John', lastName: 'Doe', username: 'johndoe', email: 'john@example.com',
      role: 'TEACHER', isVerified: true, isOnline: false, languages: [], interests: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  },
  {
    id: '4',
    title: 'UX Design Masterclass',
    description: 'Create stunning user interfaces and experiences',
    level: 'INTERMEDIATE',
    category: 'Design',
    enrollmentCount: 6700,
    rating: 4.7,
    totalLessons: 38,
    duration: 420,
    price: 39.99,
    currency: 'USD',
    reviewCount: 410,
    isPublished: true,
    tags: ['design', 'ux', 'figma'],
    requirements: [],
    learningOutcomes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructor: {
      id: '3', firstName: 'Emily', lastName: 'Chen', username: 'emilychen', email: 'emily@example.com',
      role: 'TEACHER', isVerified: true, isOnline: true, languages: [], interests: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  },
];

const MOCK_PATHS: LearningPath[] = [
  {
    id: '1', title: 'Full Stack Developer',
    description: 'Complete path to becoming a full stack developer with React, Node.js, and databases',
    courseIds: ['1', '3'], level: 'BEGINNER', estimatedDuration: 720,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: '2', title: 'Data Science Professional',
    description: 'From Python basics to machine learning and data visualization',
    courseIds: ['2'], level: 'INTERMEDIATE', estimatedDuration: 600,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: '3', title: 'Mobile App Expert',
    description: 'Master cross-platform mobile development with React Native and Flutter',
    courseIds: ['1', '4'], level: 'ADVANCED', estimatedDuration: 900,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const PATH_GRADIENTS: [string, string, string][] = [
  ['#7DD3FC', '#0EA5E9', '#0284C7'],
  ['#F472B6', '#EC4899', '#DB2777'],
  ['#34D399', '#10B981', '#059669'],
];

const PATH_ICONS: (keyof typeof Ionicons.glyphMap)[] = ['code-slash', 'bar-chart', 'phone-portrait'];

// Time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function LearnScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { openSidebar } = useNavigationContext();

  const [activeTab, setActiveTab] = useState<TabType>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [courses] = useState<Course[]>(MOCK_COURSES);
  const [paths] = useState<LearningPath[]>(MOCK_PATHS);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleCoursePress = useCallback((course: Course) => {
    navigation.navigate('CourseDetail', { courseId: course.id });
  }, [navigation]);

  const handleCreateCourse = useCallback(() => {
    navigation.navigate('CreateCourse' as any);
  }, [navigation]);

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedCategory === 'All' || course.category === selectedCategory)
  );

  // ── Hero Learning Progress Card ──
  const renderHeroCard = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.heroCardWrapper}>
      <TouchableOpacity activeOpacity={0.9}>
        <LinearGradient
          colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroLeft}>
            <Text style={styles.heroGreeting}>{getGreeting()}, {user?.firstName || 'Learner'}!</Text>
            <Text style={styles.heroTitle}>Continue Learning 📚</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>3</Text>
                <Text style={styles.heroStatLabel}>In Progress</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>24h</Text>
                <Text style={styles.heroStatLabel}>Learned</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>5</Text>
                <Text style={styles.heroStatLabel}>Completed</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.heroCTA} activeOpacity={0.8}>
              <Text style={styles.heroCTAText}>View Progress</Text>
              <Ionicons name="arrow-forward" size={14} color="#0284C7" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroRight}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="school" size={40} color="rgba(255,255,255,0.9)" />
            </View>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, { top: -25, right: -15, width: 90, height: 90 }]} />
          <View style={[styles.decorCircle, { bottom: -15, left: -10, width: 65, height: 65 }]} />
          <View style={[styles.decorCircle, { top: 30, right: 50, width: 30, height: 30 }]} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Tab Circles (scrollable inside content, not fixed) ──
  const renderTabCircles = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.tabCirclesSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabCirclesScroll}
      >
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <Animated.View key={tab.id} entering={FadeInRight.delay(50 * index).duration(300)}>
              <TouchableOpacity
                style={styles.tabCircleItem}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.tabCircleIcon,
                  { backgroundColor: tab.bg },
                  isActive && styles.tabCircleIconActive,
                ]}>
                  <Ionicons name={tab.icon} size={24} color={isActive ? '#fff' : tab.color} />
                </View>
                <Text style={[
                  styles.tabCircleLabel,
                  isActive && { color: tab.color, fontWeight: '700' },
                ]}>{tab.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );

  // ── Search Bar — Flat Design ──
  const renderSearchBar = () => (
    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.searchWrapper}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={22} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses, topics..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  // ── Category Filters with Gradient Active Ring ──
  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {CATEGORIES.map((cat, index) => {
          const isSelected = selectedCategory === cat.name || (cat.name === 'All' && selectedCategory === 'All');
          return (
            <Animated.View key={cat.id} entering={FadeInRight.delay(50 * index).duration(300)}>
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => setSelectedCategory(cat.name === 'All' ? 'All' : cat.name)}
                activeOpacity={0.7}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={cat.gradient}
                    style={styles.categoryActiveRing}
                  >
                    <View style={styles.categoryIconInner}>
                      <Ionicons name={cat.icon} size={22} color={cat.color} />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={[styles.categoryIconCircle, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon} size={22} color={cat.color} />
                  </View>
                )}
                <Text style={[styles.categoryLabel, isSelected && { color: cat.color, fontWeight: '700' }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Featured Courses Carousel ──
  const renderFeaturedCourses = () => (
    <View style={styles.featuredSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🔥 Trending Courses</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredScroll}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH * 0.72 + 12}
      >
        {courses.slice(0, 3).map((course, index) => (
          <Animated.View
            key={course.id}
            entering={FadeInRight.delay(80 * index).duration(400)}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleCoursePress(course)}
              style={styles.featuredCard}
            >
              <LinearGradient
                colors={PATH_GRADIENTS[index % PATH_GRADIENTS.length]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featuredGradient}
              >
                <View style={styles.featuredBadgeRow}>
                  <View style={styles.featuredLevelBadge}>
                    <Text style={styles.featuredLevelText}>{course.level}</Text>
                  </View>
                  <View style={styles.featuredRatingBadge}>
                    <Ionicons name="star" size={12} color="#0EA5E9" />
                    <Text style={styles.featuredRatingText}>{course.rating?.toFixed(1)}</Text>
                  </View>
                </View>

                <Text style={styles.featuredTitle} numberOfLines={2}>{course.title}</Text>
                <Text style={styles.featuredDescription} numberOfLines={2}>{course.description}</Text>

                <View style={styles.featuredBottom}>
                  <View style={styles.featuredInstructor}>
                    <View style={styles.featuredAvatarCircle}>
                      <Text style={styles.featuredAvatarText}>
                        {course.instructor?.firstName?.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.featuredInstructorName}>
                      {course.instructor?.firstName} {course.instructor?.lastName}
                    </Text>
                  </View>
                  <View style={styles.featuredEnrollBtn}>
                    <Text style={styles.featuredEnrollText}>
                      {course.price && course.price > 0 ? `$${course.price}` : 'FREE'}
                    </Text>
                  </View>
                </View>

                {/* Decorative */}
                <View style={[styles.decorCircle, { top: -20, right: -15, width: 70, height: 70 }]} />
                <View style={[styles.decorCircle, { bottom: -10, left: -10, width: 50, height: 50 }]} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );

  // ── Course List Section ──
  const renderExploreCourses = () => (
    <View style={styles.coursesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📖 Popular Courses</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {filteredCourses.map((course, index) => (
        <Animated.View
          key={course.id}
          entering={FadeInDown.delay(50 * Math.min(index, 3)).duration(300)}
        >
          <CourseCard course={course} onPress={() => handleCoursePress(course)} />
        </Animated.View>
      ))}
    </View>
  );

  // ── Learning Paths ──
  const renderLearningPaths = () => (
    <View style={styles.pathsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🛤️ Learning Paths</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>Browse All</Text>
        </TouchableOpacity>
      </View>

      {paths.map((path, index) => (
        <Animated.View key={path.id} entering={FadeInDown.delay(80 * index).duration(400)}>
          <TouchableOpacity activeOpacity={0.9} style={styles.pathCardWrapper}>
            <LinearGradient
              colors={PATH_GRADIENTS[index % PATH_GRADIENTS.length]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pathCard}
            >
              <View style={styles.pathHeader}>
                <View style={styles.pathIconCircle}>
                  <Ionicons name={PATH_ICONS[index % PATH_ICONS.length]} size={22} color="rgba(255,255,255,0.95)" />
                </View>
                <View style={styles.pathLevelBadge}>
                  <Text style={styles.pathLevelText}>{path.level}</Text>
                </View>
              </View>

              <Text style={styles.pathTitle}>{path.title}</Text>
              <Text style={styles.pathDescription} numberOfLines={2}>{path.description}</Text>

              <View style={styles.pathStats}>
                <View style={styles.pathStat}>
                  <Ionicons name="book-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.pathStatText}>{path.courseIds.length} courses</Text>
                </View>
                <View style={styles.pathStat}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.pathStatText}>{Math.floor(path.estimatedDuration / 60)}h</Text>
                </View>
                <View style={styles.pathStartBtn}>
                  <Text style={styles.pathStartText}>Start Path</Text>
                  <Ionicons name="arrow-forward" size={14} color="#0284C7" />
                </View>
              </View>

              {/* Decorative circles */}
              <View style={[styles.decorCircle, { top: -20, right: -15, width: 80, height: 80 }]} />
              <View style={[styles.decorCircle, { bottom: -10, left: -10, width: 60, height: 60 }]} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );

  // ── Empty State ──
  const renderEmptyState = (message: string, icon: keyof typeof Ionicons.glyphMap, subtitle?: string) => (
    <Animated.View entering={FadeIn.duration(500)} style={styles.emptyState}>
      <LinearGradient
        colors={['#EEF2FF', '#E0E7FF']}
        style={styles.emptyIconBg}
      >
        <Ionicons name={icon} size={40} color="#0284C7" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>{message}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </Animated.View>
  );

  // ── Tab Content ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'explore':
        return (
          <>
            {renderTabCircles()}
            {renderSearchBar()}
            {renderHeroCard()}
            {renderCategories()}
            {renderFeaturedCourses()}
            {renderExploreCourses()}
          </>
        );
      case 'enrolled':
        return (
          <>
            {renderTabCircles()}
            {renderSearchBar()}
            {renderHeroCard()}
            {renderEmptyState('No enrolled courses', 'book-outline', 'Start learning by enrolling in courses')}
          </>
        );
      case 'created':
        return (
          <>
            {renderTabCircles()}
            {renderSearchBar()}
            <View style={styles.createdSection}>
              <Animated.View entering={FadeInDown.duration(400)}>
                <TouchableOpacity
                  style={styles.createCourseBtn}
                  onPress={handleCreateCourse}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createGradient}
                  >
                    <View style={styles.createIconCircle}>
                      <Ionicons name="add" size={28} color="#0284C7" />
                    </View>
                    <View style={styles.createTextContainer}>
                      <Text style={styles.createCourseTitle}>Create New Course</Text>
                      <Text style={styles.createCourseSubtitle}>Share your knowledge with the world</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />

                    {/* Decorative circles */}
                    <View style={[styles.decorCircle, { top: -15, right: -10, width: 60, height: 60 }]} />
                    <View style={[styles.decorCircle, { bottom: -8, left: 20, width: 40, height: 40 }]} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              {renderEmptyState('No courses created yet', 'create-outline', 'Share your knowledge by creating courses')}
            </View>
          </>
        );
      case 'paths':
        return (
          <>
            {renderTabCircles()}
            {renderSearchBar()}
            {renderLearningPaths()}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header — matching Feed */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#374151" />
          </TouchableOpacity>
          <StunityLogo width={110} height={30} />
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="search-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerDivider} />
      </SafeAreaView>



      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0EA5E9"
            colors={['#0EA5E9']}
          />
        }
      >
        {renderTabContent()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Header ──
  headerSafe: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#EDE9FE',
  },
  headerLogo: {
    height: 30,
    width: 110,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tab Circles ──
  tabCirclesSection: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  tabCirclesScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  tabCircleItem: {
    alignItems: 'center',
    width: 72,
  },
  tabCircleIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tabCircleIconActive: {
    backgroundColor: '#0EA5E9',
    shadowColor: '#0284C7',
    
    shadowOpacity: 0.3,
    
    
  },
  tabCircleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },

  // ── Hero Learning Card ──
  heroCardWrapper: {
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 22,
    overflow: 'hidden',
  },
  heroCard: {
    flexDirection: 'row',
    padding: 22,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroGreeting: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 14,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 6,
  },
  heroCTAText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  heroRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Decorative Circles ──
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Search Bar — Flat ──
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },

  // ── Categories ──
  categoriesSection: {
    paddingTop: 16,
    paddingBottom: 6,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
  },
  categoryActiveRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  categoryIconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  // ── Featured Courses ──
  featuredSection: {
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    color: '#0284C7',
    fontWeight: '600',
  },
  featuredScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredCard: {
    width: SCREEN_WIDTH * 0.72,
    borderRadius: 14,
    overflow: 'hidden',
  },
  featuredGradient: {
    padding: 20,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 200,
    justifyContent: 'space-between',
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  featuredLevelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredLevelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  featuredRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 6,
  },
  featuredDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: 16,
  },
  featuredBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredInstructor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  featuredInstructorName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  featuredEnrollBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featuredEnrollText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },

  // ── Courses Section ──
  coursesSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },

  // ── Learning Paths ──
  pathsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pathCardWrapper: {
    marginTop: 14,
    borderRadius: 22,
    overflow: 'hidden',
  },
  pathCard: {
    padding: 22,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pathIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathLevelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pathLevelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pathTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  pathDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 19,
    marginBottom: 16,
  },
  pathStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pathStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pathStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  pathStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    marginLeft: 'auto',
  },
  pathStartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Created Section ──
  createdSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  createCourseBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  createIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTextContainer: {
    flex: 1,
  },
  createCourseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  createCourseSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});
