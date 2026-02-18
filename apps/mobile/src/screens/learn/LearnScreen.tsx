/**
 * Learn Hub Screen
 * 
 * Premium e-learning course hub — matching feed design language
 * Indigo gradients, colored icon circles, clean card design
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const StunityLogo = require('../../../../../Stunity.png');

import { CourseCard } from '@/components/learn';
import { useAuthStore } from '@/stores';
import { Course, LearningPath } from '@/types';
import { LearnStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

const { width } = Dimensions.get('window');

type NavigationProp = LearnStackScreenProps<'LearnHub'>['navigation'];
type TabType = 'explore' | 'enrolled' | 'created' | 'paths';

const TABS: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'explore', label: 'Explore', icon: 'compass' },
  { id: 'enrolled', label: 'My Courses', icon: 'book' },
  { id: 'created', label: 'Created', icon: 'create' },
  { id: 'paths', label: 'Paths', icon: 'git-branch' },
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
];

const MOCK_PATHS: LearningPath[] = [
  {
    id: '1', title: 'Full Stack Developer',
    description: 'Complete path to becoming a full stack developer',
    courseIds: ['1', '3'], level: 'BEGINNER', estimatedDuration: 720,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: '2', title: 'Data Science Professional',
    description: 'From Python basics to machine learning',
    courseIds: ['2'], level: 'INTERMEDIATE', estimatedDuration: 600,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const PATH_GRADIENTS: [string, string, string][] = [
  ['#818CF8', '#6366F1', '#4F46E5'],
  ['#F472B6', '#EC4899', '#DB2777'],
  ['#34D399', '#10B981', '#059669'],
];

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

  const categories = [
    { id: 'all', name: 'All', icon: 'apps', color: '#6366F1', bg: '#EEF2FF' },
    { id: 'dev', name: 'Dev', icon: 'code-slash', color: '#3B82F6', bg: '#DBEAFE' },
    { id: 'design', name: 'Design', icon: 'color-palette', color: '#EC4899', bg: '#FCE7F3' },
    { id: 'data', name: 'Data', icon: 'analytics', color: '#10B981', bg: '#D1FAE5' },
    { id: 'business', name: 'Business', icon: 'briefcase', color: '#F59E0B', bg: '#FEF3C7' },
    { id: 'language', name: 'Language', icon: 'globe', color: '#8B5CF6', bg: '#EDE9FE' },
  ];

  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((cat, index) => {
          const isSelected = selectedCategory === cat.name || (cat.name === 'All' && selectedCategory === 'All');
          return (
            <Animated.View key={cat.id} entering={FadeInRight.delay(50 * index).duration(300)}>
              <TouchableOpacity
                style={styles.categoryPill}
                onPress={() => setSelectedCategory(cat.name === 'All' ? 'All' : cat.name)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: isSelected ? cat.color : cat.bg }]}>
                  <Ionicons name={cat.icon as any} size={18} color={isSelected ? '#fff' : cat.color} />
                </View>
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

  const renderExploreCourses = () => (
    <View style={styles.coursesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Courses</Text>
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

  const renderLearningPaths = () => (
    <View style={styles.pathsSection}>
      <Text style={styles.sectionTitle}>Learning Paths</Text>

      {paths.map((path, index) => (
        <Animated.View key={path.id} entering={FadeInDown.delay(50 * index).duration(300)}>
          <TouchableOpacity activeOpacity={0.9} style={styles.pathCardWrapper}>
            <LinearGradient
              colors={PATH_GRADIENTS[index % PATH_GRADIENTS.length]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pathCard}
            >
              <View style={styles.pathHeader}>
                <Ionicons name="school" size={22} color="rgba(255,255,255,0.9)" />
                <View style={styles.pathLevelBadge}>
                  <Text style={styles.pathLevelText}>{path.level}</Text>
                </View>
              </View>

              <Text style={styles.pathTitle}>{path.title}</Text>
              <Text style={styles.pathDescription} numberOfLines={2}>{path.description}</Text>

              <View style={styles.pathStats}>
                <View style={styles.pathStat}>
                  <Ionicons name="book-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.pathStatText}>{path.courseIds.length} courses</Text>
                </View>
                <View style={styles.pathStat}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.pathStatText}>{Math.floor(path.estimatedDuration / 60)}h</Text>
                </View>
                <View style={styles.pathStartBtn}>
                  <Text style={styles.pathStartText}>Start Path</Text>
                  <Ionicons name="arrow-forward" size={14} color="#6366F1" />
                </View>
              </View>

              {/* Decorative circles */}
              <View style={[styles.pathDecor, { top: -20, right: -15, width: 80, height: 80 }]} />
              <View style={[styles.pathDecor, { bottom: -10, left: -10, width: 60, height: 60 }]} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );

  const renderEmptyState = (message: string, icon: keyof typeof Ionicons.glyphMap, subtitle?: string) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <Ionicons name={icon} size={40} color="#6366F1" />
      </View>
      <Text style={styles.emptyTitle}>{message}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'explore':
        return (
          <>
            {renderCategories()}
            {renderExploreCourses()}
          </>
        );
      case 'enrolled':
        return renderEmptyState('No enrolled courses', 'book-outline', 'Start learning by enrolling in courses');
      case 'created':
        return (
          <View style={styles.createdSection}>
            <TouchableOpacity
              style={styles.createCourseBtn}
              onPress={handleCreateCourse}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#818CF8', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createGradient}
              >
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.createCourseText}>Create New Course</Text>
              </LinearGradient>
            </TouchableOpacity>
            {renderEmptyState('No courses created yet', 'create-outline', 'Share your knowledge by creating courses')}
          </View>
        );
      case 'paths':
        return renderLearningPaths();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#374151" />
          </TouchableOpacity>
          <Image source={StunityLogo} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="search-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerDivider} />
      </SafeAreaView>

      {/* Tabs — Indigo pill style matching feed */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, isActive && styles.tabActive]}
                activeOpacity={0.7}
              >
                <Ionicons name={tab.icon} size={16} color={isActive ? '#fff' : '#6B7280'} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
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
    backgroundColor: '#F8F7FC',
  },
  headerSafe: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  headerLogo: {
    height: 32,
    width: 120,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tabs ──
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 50,
  },
  tabActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },

  // ── Categories ──
  categoriesSection: {
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  categoryPill: {
    alignItems: 'center',
    width: 60,
  },
  categoryIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Courses Section ──
  coursesSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },

  // ── Learning Paths ──
  pathsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pathCardWrapper: {
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  pathCard: {
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pathLevelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pathLevelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  pathTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  pathDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: 14,
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
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  pathStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    marginLeft: 'auto',
  },
  pathStartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  pathDecor: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  createCourseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
