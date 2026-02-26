/**
 * Learn Hub Screen — Play Store Inspired Redesign
 *
 * Key features:
 * - Pill-shaped search bar with mic icon (Play Store style)
 * - 2-column "Explore Subjects" grid with colorful icons
 * - "Suggested for you" sponsored course card
 * - "You might like" 2-column quick-search grid
 * - Horizontal trending courses carousel
 * - Clean course list
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

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

// ── Subject categories with Play Store style ──────────────────────────
interface SubjectCategory {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
}

const SUBJECTS: SubjectCategory[] = [
  { id: 'design', label: 'Design', icon: 'color-palette', bgColor: '#FFF3E0', iconColor: '#FF6D00' },
  { id: 'development', label: 'Development', icon: 'code-slash', bgColor: '#E8EAF6', iconColor: '#3F51B5' },
  { id: 'data', label: 'Data Science', icon: 'analytics', bgColor: '#E0F2F1', iconColor: '#00796B' },
  { id: 'business', label: 'Business', icon: 'briefcase', bgColor: '#FBE9E7', iconColor: '#D84315' },
  { id: 'language', label: 'Language', icon: 'language', bgColor: '#F3E5F5', iconColor: '#7B1FA2' },
  { id: 'marketing', label: 'Marketing', icon: 'megaphone', bgColor: '#E8F5E9', iconColor: '#2E7D32' },
  { id: 'math', label: 'Mathematics', icon: 'calculator', bgColor: '#E3F2FD', iconColor: '#1565C0' },
  { id: 'science', label: 'Science', icon: 'flask', bgColor: '#FCE4EC', iconColor: '#C62828' },
  { id: 'ai', label: 'AI & Machine Learning', icon: 'hardware-chip', bgColor: '#E0F7FA', iconColor: '#00838F' },
  { id: 'photography', label: 'Photography', icon: 'camera', bgColor: '#FFF8E1', iconColor: '#F9A825' },
];

// ── Continue Learning mock data ──────────────────────────────────────
const CONTINUE_LEARNING = [
  { id: '1', title: 'React Native Development', progress: 68, lessonsLeft: 14, icon: 'phone-portrait-outline' as const, gradient: ['#818CF8', '#4F46E5'] as [string, string] },
  { id: '2', title: 'Machine Learning Fundamentals', progress: 32, lessonsLeft: 24, icon: 'analytics-outline' as const, gradient: ['#34D399', '#059669'] as [string, string] },
  { id: '3', title: 'UX Design Masterclass', progress: 85, lessonsLeft: 6, icon: 'color-palette-outline' as const, gradient: ['#F472B6', '#DB2777'] as [string, string] },
];

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

export default function LearnScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { openSidebar } = useNavigationContext();

  const [activeTab, setActiveTab] = useState<TabType>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [courses] = useState<Course[]>(MOCK_COURSES);
  const [paths] = useState<LearningPath[]>(MOCK_PATHS);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

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
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Search Bar (Play Store pill style) ──────────────────────
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <Ionicons name="search-outline" size={20} color="#5F6368" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses, topics..."
          placeholderTextColor="#9AA0A6"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#9AA0A6" />
          </TouchableOpacity>
        ) : (
          <View style={styles.searchDivider} />
        )}
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="mic-outline" size={20} color="#4A90D9" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Explore Subjects Grid (Play Store 2-col style) ──────────
  const renderExploreSubjects = () => {
    const rows: SubjectCategory[][] = [];
    for (let i = 0; i < SUBJECTS.length; i += 2) {
      rows.push(SUBJECTS.slice(i, i + 2));
    }

    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.subjectSection}>
        <Text style={styles.sectionTitle}>Explore subjects</Text>
        <View style={styles.subjectGrid}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.subjectRow}>
              {row.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  activeOpacity={0.75}
                  style={[
                    styles.subjectCard,
                    selectedSubject === subject.id && styles.subjectCardActive,
                  ]}
                  onPress={() => setSelectedSubject(selectedSubject === subject.id ? 'all' : subject.id)}
                >
                  <Text style={styles.subjectLabel} numberOfLines={1}>
                    {subject.label}
                  </Text>
                  <View style={[styles.subjectIconWrap, { backgroundColor: subject.bgColor }]}>
                    <Ionicons name={subject.icon} size={34} color={subject.iconColor} />
                  </View>
                </TouchableOpacity>
              ))}
              {/* Fill empty slot if row has only 1 item */}
              {!!(row.length === 1) && <View style={styles.subjectCardPlaceholder} />}
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  // ─── Suggested For You (like Play Store's sponsored card) ────
  const renderSuggestedCard = () => {
    const course = courses[1]; // Feature ML course
    return (
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.suggestedSection}>
        <View style={styles.suggestedHeader}>
          <Text style={styles.suggestedSponsored}>Featured  ·  </Text>
          <Text style={styles.sectionTitle}>Suggested for you</Text>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color="#5F6368" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleCoursePress(course)}
          style={styles.suggestedCard}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.suggestedCardThumb}
          >
            <View style={styles.suggestedThumbDecor1} />
            <View style={styles.suggestedThumbDecor2} />
            <View style={styles.suggestedIconCircle}>
              <Ionicons name="analytics" size={32} color="rgba(255,255,255,0.9)" />
            </View>
          </LinearGradient>
          <View style={styles.suggestedCardBody}>
            <Text style={styles.suggestedCardTitle} numberOfLines={1}>{course.title}</Text>
            <Text style={styles.suggestedCardSub} numberOfLines={1}>
              {course.instructor?.firstName} {course.instructor?.lastName}  •  {course.category}  •  {course.level}
            </Text>
            <View style={styles.suggestedCardMeta}>
              <Ionicons name="star" size={12} color="#F9AB00" />
              <Text style={styles.suggestedCardRating}>{course.rating?.toFixed(1)}</Text>
              <Text style={styles.suggestedCardDownloads}>  ↓  {(course.enrollmentCount! / 1000).toFixed(0)}K+</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ─── Continue Learning ────────────────────────────────────────
  const renderContinueLearning = () => (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.continueLearningSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Continue learning</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      {CONTINUE_LEARNING.map((item) => (
        <TouchableOpacity key={item.id} activeOpacity={0.8} style={styles.continueCard}>
          {/* Coloured icon box */}
          <LinearGradient
            colors={item.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueIconBox}
          >
            <Ionicons name={item.icon} size={22} color="rgba(255,255,255,0.95)" />
          </LinearGradient>

          {/* Text + progress */}
          <View style={styles.continueBody}>
            <View style={styles.continueTitleRow}>
              <Text style={styles.continueTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.continuePercent}>{item.progress}%</Text>
            </View>
            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.progress}%` as any }]} />
            </View>
            <Text style={styles.continueLessonsLeft}>{item.lessonsLeft} lessons left</Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
        </TouchableOpacity>
      ))}
    </Animated.View>
  );

  // ─── Trending Courses Carousel ───────────────────────────────
  const renderTrending = () => (
    <View style={styles.trendingSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Trending now</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendingScroll}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH * 0.62 + 12}
        snapToAlignment="start"
      >
        {courses.slice(0, 3).map((course, i) => (
          <TouchableOpacity
            key={course.id}
            activeOpacity={0.85}
            onPress={() => handleCoursePress(course)}
            style={styles.trendingCard}
          >
            <LinearGradient
              colors={FEATURED_GRADIENTS[i % FEATURED_GRADIENTS.length]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.trendingGradient}
            >
              <View style={styles.trendingDecorCircle1} />
              <View style={styles.trendingDecorCircle2} />
              <View style={styles.trendingLevelBadge}>
                <Text style={styles.trendingLevelText}>{course.level}</Text>
              </View>
              <View style={styles.trendingIconCircle}>
                <Ionicons
                  name={i === 0 ? 'phone-portrait-outline' : i === 1 ? 'analytics-outline' : 'code-slash-outline'}
                  size={28}
                  color="rgba(255,255,255,0.9)"
                />
              </View>
              <Text style={styles.trendingTitle} numberOfLines={2}>{course.title}</Text>
              <View style={styles.trendingMeta}>
                <Ionicons name="star" size={11} color="#FCD34D" />
                <Text style={styles.trendingRating}>{course.rating?.toFixed(1)}</Text>
                <Text style={styles.trendingDot}>  ·  </Text>
                <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.75)" />
                <Text style={styles.trendingStudents}>  {((course.enrollmentCount ?? 0) / 1000).toFixed(0)}K</Text>
              </View>
              <View style={styles.trendingPriceRow}>
                <Text style={styles.trendingPriceBadge}>
                  {course.price && course.price > 0 ? `$${course.price}` : 'FREE'}
                </Text>
                <Text style={styles.trendingLessons}>{course.totalLessons} lessons</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ─── Popular Courses List ─────────────────────────────────────
  const renderCourseList = () => (
    <View style={styles.courseListSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Popular courses</Text>
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
            <CourseCard course={course} onPress={() => handleCoursePress(course)} variant="row" />
          </Animated.View>
        ))
      )}
    </View>
  );

  // ─── Learning Paths ───────────────────────────────────────────
  const renderPaths = () => (
    <View style={styles.courseListSection}>
      <View style={styles.sectionHeaderRow}>
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
              <View style={styles.pathDecorCircle} />
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

  // ─── Tab Content ──────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'explore':
        return (
          <>
            {renderExploreSubjects()}
            {renderSuggestedCard()}
            {renderContinueLearning()}
            {renderTrending()}
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
                <View style={styles.createBannerDecor} />
                <View style={styles.createBannerIcon}>
                  <Ionicons name="add" size={24} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.createBannerTitle}>Create New Course</Text>
                  <Text style={styles.createBannerSub}>Share your knowledge with others</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
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

      {/* ── Sticky Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}>
            <Ionicons name="menu-outline" size={26} color="#3C4043" />
          </TouchableOpacity>
          <StunityLogo width={110} height={30} />
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color="#3C4043" />
          </TouchableOpacity>
        </View>

        {/* Search pill */}
        {renderSearchBar()}

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
                <Ionicons name={tab.icon} size={15} color={isActive ? '#1A73E8' : '#80868B'} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1A73E8"
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
    backgroundColor: '#F8F9FA',
  },

  // ── Header ─────────────────────────────────────────────────────
  headerSafe: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Search (Play Store pill) ───────────────────────────────────
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 13 : 9,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: '#1A73E8',
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#3C4043',
    fontWeight: '400',
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#DADCE0',
    marginHorizontal: 4,
  },

  // ── Tab Bar (flat chip style) ──────────────────────────────────
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
    paddingVertical: 8,
  },
  tabBarScroll: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#E8F0FE',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#80868B',
  },
  tabLabelActive: {
    color: '#1A73E8',
  },

  content: {
    flex: 1,
  },

  // ── Explore Subjects Grid ──────────────────────────────────────
  subjectSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
    letterSpacing: -0.1,
  },
  subjectGrid: {
    marginTop: 12,
    gap: 8,
  },
  subjectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subjectCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 68,
  },
  subjectCardActive: {
    backgroundColor: '#E8F0FE',
  },
  subjectCardPlaceholder: {
    flex: 1,
  },
  subjectLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginRight: 8,
  },
  subjectIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Suggested Card ─────────────────────────────────────────────
  suggestedSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestedSponsored: {
    fontSize: 12,
    color: '#80868B',
    fontWeight: '500',
  },
  moreBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  suggestedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  suggestedCardThumb: {
    width: 76,
    height: 76,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  suggestedThumbDecor1: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -20,
    right: -20,
  },
  suggestedThumbDecor2: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    bottom: -10,
    left: -10,
  },
  suggestedIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedCardBody: {
    flex: 1,
    paddingRight: 12,
    paddingVertical: 10,
  },
  suggestedCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 3,
  },
  suggestedCardSub: {
    fontSize: 12,
    color: '#5F6368',
    marginBottom: 6,
  },
  suggestedCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestedCardRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F9AB00',
    marginLeft: 3,
  },
  suggestedCardDownloads: {
    fontSize: 12,
    color: '#5F6368',
    fontWeight: '500',
  },

  // ── Continue Learning ─────────────────────────────────────────────
  continueLearningSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  continueIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  continueBody: {
    flex: 1,
    gap: 5,
  },
  continueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  continueTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
  },
  continuePercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A73E8',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E8EAED',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#1A73E8',
    borderRadius: 2,
  },
  continueLessonsLeft: {
    fontSize: 11,
    color: '#80868B',
    fontWeight: '500',
  },

  // ── Trending Carousel ──────────────────────────────────────────
  trendingSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A73E8',
  },
  trendingScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  trendingCard: {
    width: SCREEN_WIDTH * 0.60,
    borderRadius: 16,
    overflow: 'hidden',
  },
  trendingGradient: {
    padding: 18,
    minHeight: 185,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  trendingDecorCircle1: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -30,
    right: -30,
  },
  trendingDecorCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -20,
    left: 10,
  },
  trendingLevelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  trendingLevelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendingIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 4,
  },
  trendingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  trendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  trendingRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCD34D',
    marginLeft: 3,
  },
  trendingDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  trendingStudents: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  trendingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  trendingPriceBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: 'hidden',
  },
  trendingPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  trendingLessons: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },

  // ── Course List ────────────────────────────────────────────────
  courseListSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // ── Learning Paths ─────────────────────────────────────────────
  pathCard: {
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
  pathDecorCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.1)',
    right: -20,
    top: -20,
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

  // ── Create Banner ──────────────────────────────────────────────
  createBanner: {
    margin: 16,
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
  createBannerDecor: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    right: -20,
    top: -20,
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

  // ── Empty States ───────────────────────────────────────────────
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
