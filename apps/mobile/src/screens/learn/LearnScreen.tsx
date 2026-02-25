/**
 * Learn Hub Screen — Complete Redesign v2
 *
 * Clean, modern enterprise design:
 * - White top header with search
 * - Flat horizontal tab bar (no circles)
 * - Clean chip category selectors
 * - Featured cards with rich thumbnail gradients
 * - Standard course list with compact cards
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import StunityLogo from '../../../assets/Stunity.svg';
import { CourseCard } from '@/components/learn';
import { useAuthStore } from '@/stores';
import { Course, LearningPath } from '@/types';
import { LearnStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type NavigationProp = LearnStackScreenProps<'LearnHub'>['navigation'];
type TabType = 'explore' | 'enrolled' | 'created' | 'paths';

const TABS: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'explore', label: 'Explore', icon: 'compass-outline' },
  { id: 'enrolled', label: 'My Courses', icon: 'book-outline' },
  { id: 'created', label: 'Created', icon: 'create-outline' },
  { id: 'paths', label: 'Paths', icon: 'git-branch-outline' },
];

const CATEGORIES = ['All', 'Design', 'Development', 'Data Science', 'Business', 'Language'];

const FEATURED_GRADIENTS: [string, string][] = [
  ['#818CF8', '#4F46E5'],
  ['#F472B6', '#DB2777'],
  ['#34D399', '#059669'],
];

const MOCK_COURSES: Course[] = [
  {
    id: '1',
    title: 'Complete React Native Development',
    description: 'Build mobile apps with React Native from scratch. Covers navigation, state, and deployment.',
    level: 'BEGINNER', category: 'Development',
    enrollmentCount: 12500, rating: 4.8, totalLessons: 42, duration: 480,
    price: 0, currency: 'USD', reviewCount: 850, isPublished: true,
    tags: ['react-native', 'mobile'], requirements: [], learningOutcomes: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    instructor: {
      id: '1', firstName: 'John', lastName: 'Doe', username: 'johndoe', email: 'john@example.com',
      role: 'TEACHER', isVerified: true, isOnline: false, languages: [], interests: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  },
  {
    id: '2',
    title: 'Machine Learning Fundamentals',
    description: 'Introduction to ML concepts and algorithms with Python.',
    level: 'INTERMEDIATE', category: 'Data Science',
    enrollmentCount: 8300, rating: 4.6, totalLessons: 35, duration: 360,
    price: 49.99, currency: 'USD', reviewCount: 520, isPublished: true,
    tags: ['machine-learning', 'python'], requirements: [], learningOutcomes: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    instructor: {
      id: '2', firstName: 'Jane', lastName: 'Smith', username: 'janesmith', email: 'jane@example.com',
      role: 'TEACHER', isVerified: true, isOnline: false, languages: [], interests: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  },
  {
    id: '3',
    title: 'Advanced TypeScript Patterns',
    description: 'Master advanced TypeScript features and design patterns.',
    level: 'ADVANCED', category: 'Development',
    enrollmentCount: 5600, rating: 4.9, totalLessons: 28, duration: 240,
    price: 0, currency: 'USD', reviewCount: 340, isPublished: true,
    tags: ['typescript', 'javascript'], requirements: [], learningOutcomes: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    instructor: {
      id: '1', firstName: 'John', lastName: 'Doe', username: 'johndoe', email: 'john@example.com',
      role: 'TEACHER', isVerified: true, isOnline: false, languages: [], interests: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  },
  {
    id: '4',
    title: 'UX Design Masterclass',
    description: 'Create stunning user interfaces with Figma and modern design principles.',
    level: 'INTERMEDIATE', category: 'Design',
    enrollmentCount: 6700, rating: 4.7, totalLessons: 38, duration: 420,
    price: 39.99, currency: 'USD', reviewCount: 410, isPublished: true,
    tags: ['design', 'ux', 'figma'], requirements: [], learningOutcomes: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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
    description: 'From Python basics to machine learning and data visualisation',
    courseIds: ['2'], level: 'INTERMEDIATE', estimatedDuration: 600,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const PATH_ICONS: (keyof typeof Ionicons.glyphMap)[] = ['code-slash', 'bar-chart', 'phone-portrait'];

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

  // ─── Search Bar ────────────────────────────────────────────
  const renderSearchBar = () => (
    <View style={styles.searchBar}>
      <Ionicons name="search-outline" size={18} color="#9CA3AF" />
      <TextInput
        style={styles.searchInput}
        placeholder="Search courses, topics..."
        placeholderTextColor="#9CA3AF"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Hero Progress Card ────────────────────────────────────
  const renderHeroCard = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.heroWrapper}>
      <LinearGradient
        colors={['#6366F1', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        {/* Subtle decorative rings */}
        <View style={[styles.heroRing, { width: 120, height: 120, right: -30, top: -30 }]} />
        <View style={[styles.heroRing, { width: 70, height: 70, right: 50, bottom: -25 }]} />

        <View style={styles.heroLeft}>
          <Text style={styles.heroGreeting}>{getGreeting()}, {user?.firstName || 'Learner'} 👋</Text>
          <Text style={styles.heroTitle}>Continue your journey</Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>3</Text>
              <Text style={styles.heroStatLbl}>In Progress</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>5</Text>
              <Text style={styles.heroStatLbl}>Completed</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>24h</Text>
              <Text style={styles.heroStatLbl}>Learned</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.heroCTA} activeOpacity={0.85}>
            <Text style={styles.heroCTAText}>View all progress</Text>
            <Ionicons name="arrow-forward" size={13} color="#6366F1" />
          </TouchableOpacity>
        </View>
        <View style={styles.heroRight}>
          <View style={styles.heroIconBg}>
            <Ionicons name="school-outline" size={34} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  // ─── Categories (flat pills) ───────────────────────────────
  const renderCategories = () => (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ─── Featured Carousel ─────────────────────────────────────
  const renderFeatured = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Now</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredScroll}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH * 0.70 + 14}
        snapToAlignment="start"
      >
        {courses.slice(0, 3).map((course, i) => (
          <Animated.View key={course.id} entering={FadeInRight.delay(60 * i).duration(350)}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => handleCoursePress(course)}
              style={styles.featuredCard}
            >
              <LinearGradient
                colors={FEATURED_GRADIENTS[i % FEATURED_GRADIENTS.length]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featuredGradient}
              >
                {/* Decorative ring */}
                <View style={[styles.heroRing, { width: 100, height: 100, right: -25, top: -25, opacity: 0.15 }]} />

                <View style={styles.featuredTopRow}>
                  <View style={styles.featuredLevelBadge}>
                    <Text style={styles.featuredLevelText}>{course.level}</Text>
                  </View>
                  <View style={styles.featuredRatingBadge}>
                    <Ionicons name="star" size={11} color="#FCD34D" />
                    <Text style={styles.featuredRatingText}>{course.rating?.toFixed(1)}</Text>
                  </View>
                </View>

                <Text style={styles.featuredTitle} numberOfLines={2}>{course.title}</Text>
                <Text style={styles.featuredDesc} numberOfLines={2}>{course.description}</Text>

                <View style={styles.featuredBottom}>
                  <View style={styles.featuredInstructor}>
                    <View style={styles.featuredAvatar}>
                      <Text style={styles.featuredAvatarLetter}>
                        {course.instructor?.firstName?.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.featuredInstructorName}>
                      {course.instructor?.firstName} {course.instructor?.lastName}
                    </Text>
                  </View>
                  <View style={styles.featuredPriceBadge}>
                    <Text style={styles.featuredPriceText}>
                      {course.price && course.price > 0 ? `$${course.price}` : 'FREE'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );

  // ─── Course List ───────────────────────────────────────────
  const renderCourseList = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Courses</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      {filteredCourses.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No courses found</Text>
          <Text style={styles.emptySubtitle}>Try searching with different keywords</Text>
        </View>
      ) : (
        filteredCourses.map((course, i) => (
          <Animated.View key={course.id} entering={FadeInDown.delay(40 * i).duration(300)}>
            <CourseCard course={course} onPress={() => handleCoursePress(course)} />
          </Animated.View>
        ))
      )}
    </View>
  );

  // ─── Learning Paths ────────────────────────────────────────
  const renderPaths = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Learning Paths</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>Browse all</Text>
        </TouchableOpacity>
      </View>
      {paths.map((path, i) => (
        <Animated.View key={path.id} entering={FadeInDown.delay(60 * i).duration(350)}>
          <TouchableOpacity activeOpacity={0.88} style={styles.pathCard}>
            <LinearGradient
              colors={FEATURED_GRADIENTS[i % FEATURED_GRADIENTS.length]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pathGradient}
            >
              <View style={[styles.heroRing, { width: 90, height: 90, right: -20, top: -20, opacity: 0.15 }]} />
              <View style={styles.pathHeader}>
                <View style={styles.pathIconBg}>
                  <Ionicons name={PATH_ICONS[i % PATH_ICONS.length]} size={20} color="rgba(255,255,255,0.9)" />
                </View>
                <View style={styles.pathLevelBadge}>
                  <Text style={styles.pathLevelText}>{path.level}</Text>
                </View>
              </View>
              <Text style={styles.pathTitle}>{path.title}</Text>
              <Text style={styles.pathDesc} numberOfLines={2}>{path.description}</Text>
              <View style={styles.pathFooter}>
                <View style={styles.pathStat}>
                  <Ionicons name="book-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.pathStatText}>{path.courseIds.length} courses</Text>
                </View>
                <View style={styles.pathStat}>
                  <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.pathStatText}>{Math.floor(path.estimatedDuration / 60)}h</Text>
                </View>
                <View style={[styles.pathStat, { marginLeft: 'auto' }]}>
                  <Text style={styles.pathStartText}>Start Path</Text>
                  <Ionicons name="arrow-forward" size={13} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );

  // ─── Tab Content ───────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'explore':
        return (
          <>
            {renderHeroCard()}
            <View style={styles.categorySection}>
              {renderCategories()}
            </View>
            {renderFeatured()}
            {renderCourseList()}
          </>
        );
      case 'enrolled':
        return (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No enrolled courses</Text>
            <Text style={styles.emptySubtitle}>Discover and enroll in courses from the Explore tab</Text>
          </View>
        );
      case 'created':
        return (
          <>
            <TouchableOpacity style={styles.createBanner} onPress={handleCreateCourse} activeOpacity={0.88}>
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createBannerGradient}
              >
                <View style={styles.createBannerIcon}>
                  <Ionicons name="add" size={24} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.createBannerTitle}>Create New Course</Text>
                  <Text style={styles.createBannerSub}>Share your knowledge with others</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                <View style={[styles.heroRing, { width: 80, height: 80, right: -20, top: -20, opacity: 0.15 }]} />
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.emptyState}>
              <Ionicons name="create-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No courses created yet</Text>
              <Text style={styles.emptySubtitle}>Create your first course and share your expertise</Text>
            </View>
          </>
        );
      case 'paths':
        return renderPaths();
      default:
        return null;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={openSidebar} style={styles.headerBtn}>
            <Ionicons name="menu-outline" size={26} color="#374151" />
          </TouchableOpacity>
          <StunityLogo width={110} height={30} />
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="notifications-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          {renderSearchBar()}
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
          style={styles.tabBar}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                activeOpacity={0.7}
              >
                <Ionicons name={tab.icon} size={16} color={isActive ? '#6366F1' : '#9CA3AF'} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Scrollable content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
          />
        }
      >
        {renderContent()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Header ──────────────────────────────────────────────────
  headerSafe: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },

  // ── Search ──────────────────────────────────────────────────
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  // ── Tab Bar ─────────────────────────────────────────────────
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tabBarScroll: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#6366F1',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#6366F1',
  },

  content: {
    flex: 1,
  },

  // ── Hero Card ────────────────────────────────────────────────
  heroWrapper: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroCard: {
    flexDirection: 'row',
    padding: 22,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroRing: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroLeft: {
    flex: 1,
    paddingRight: 8,
  },
  heroGreeting: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 0,
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  heroCTAText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  heroRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Category Section ─────────────────────────────────────────
  categorySection: {
    marginTop: 20,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#6366F1',
  },

  // ── Section ─────────────────────────────────────────────────
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },

  // ── Featured Cards ───────────────────────────────────────────
  featuredScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  featuredCard: {
    width: SCREEN_WIDTH * 0.70,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredGradient: {
    padding: 20,
    borderRadius: 16,
    minHeight: 190,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredLevelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featuredLevelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  featuredRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  featuredDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    lineHeight: 17,
  },
  featuredBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  featuredInstructor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  featuredAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredAvatarLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  featuredInstructorName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  featuredPriceBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  featuredPriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
  },

  // ── Learning Paths ───────────────────────────────────────────
  pathCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pathGradient: {
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pathIconBg: {
    width: 42,
    height: 42,
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
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pathTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  pathDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: 16,
  },
  pathFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pathStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pathStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  pathStartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginRight: 4,
  },

  // ── Create Banner ────────────────────────────────────────────
  createBanner: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  createBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  createBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  createBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // ── Empty States ─────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
