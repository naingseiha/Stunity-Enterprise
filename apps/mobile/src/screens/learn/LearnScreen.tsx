/**
 * Learn Hub Screen
 * 
 * Clean, professional design matching Feed screen
 * Features: Explore courses, My courses, Created courses, Learning paths
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

const StunityLogo = require('../../../../../Stunity.png');

import { Input, Card, Loading, Avatar } from '@/components/common';
import { CourseCard } from '@/components/learn';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
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

// Mock data with correct types
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
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'TEACHER',
      isVerified: true,
      isOnline: false,
      languages: [],
      interests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      role: 'TEACHER',
      isVerified: true,
      isOnline: false,
      languages: [],
      interests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'TEACHER',
      isVerified: true,
      isOnline: false,
      languages: [],
      interests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

const MOCK_PATHS: LearningPath[] = [
  {
    id: '1',
    title: 'Full Stack Developer',
    description: 'Complete path to becoming a full stack developer',
    courseIds: ['1', '3'],
    level: 'BEGINNER',
    estimatedDuration: 720,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Data Science Professional',
    description: 'From Python basics to machine learning',
    courseIds: ['2'],
    level: 'INTERMEDIATE',
    estimatedDuration: 600,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function LearnScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { openSidebar } = useNavigationContext();

  const [activeTab, setActiveTab] = useState<TabType>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [paths, setPaths] = useState<LearningPath[]>(MOCK_PATHS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Fetch from API
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

  // Categories with Stunity orange theme
  const renderCategories = () => {
    const categories = [
      { id: 'all', name: 'All', icon: 'apps', color: '#FFA500' },
      { id: 'dev', name: 'Development', icon: 'code-slash', color: '#6366F1' },
      { id: 'design', name: 'Design', icon: 'color-palette', color: '#EC4899' },
      { id: 'data', name: 'Data Science', icon: 'analytics', color: '#10B981' },
      { id: 'business', name: 'Business', icon: 'briefcase', color: '#F59E0B' },
    ];

    return (
      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((cat, index) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <Animated.View 
                key={cat.id} 
                entering={FadeInRight.delay(50 * index).duration(300)}
              >
                <TouchableOpacity 
                  style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                  </View>
                  <Text style={[styles.categoryName, isSelected && styles.categoryNameActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

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
        <Animated.View 
          key={path.id}
          entering={FadeInDown.delay(50 * index).duration(300)}
        >
          <TouchableOpacity activeOpacity={0.8} style={styles.pathCard}>
            <LinearGradient
              colors={['#F9FAFB', '#F3F4F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pathGradient}
            >
              <View style={styles.pathContent}>
                <View style={styles.pathHeader}>
                  <Ionicons name="school" size={24} color="#FFA500" />
                  <View style={styles.pathBadge}>
                    <Text style={styles.pathBadgeText}>{path.level}</Text>
                  </View>
                </View>
                
                <Text style={styles.pathTitle}>{path.title}</Text>
                <Text style={styles.pathDescription} numberOfLines={2}>
                  {path.description}
                </Text>
                
                <View style={styles.pathStats}>
                  <View style={styles.pathStat}>
                    <Ionicons name="book-outline" size={16} color="#6B7280" />
                    <Text style={styles.pathStatText}>
                      {path.courseIds.length} courses
                    </Text>
                  </View>
                  <View style={styles.pathStat}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.pathStatText}>
                      {Math.floor(path.estimatedDuration / 60)}h
                    </Text>
                  </View>
                  <View style={styles.pathStat}>
                    <Ionicons name="arrow-forward-circle" size={16} color="#FFA500" />
                    <Text style={styles.pathStatText}>Start Path</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );

  const renderEmptyState = (message: string, icon: keyof typeof Ionicons.glyphMap, subtitle?: string) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <Ionicons name={icon} size={48} color="#9CA3AF" />
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
              style={styles.createCourseButton}
              onPress={handleCreateCourse}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#FFA500', '#FF8C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createGradient}
              >
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
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

      {/* Header - matching Feed screen style */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          {/* Menu Button - Left */}
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#374151" />
          </TouchableOpacity>

          {/* Stunity Logo - Center */}
          <Image
            source={StunityLogo}
            style={styles.headerLogo}
            resizeMode="contain"
          />

          {/* Actions - Right */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="bookmark-outline" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="search-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerDivider} />
      </SafeAreaView>

      {/* Tabs - matching Feed filter tabs */}
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
                style={styles.tab}
                activeOpacity={0.7}
              >
                {isActive ? (
                  <LinearGradient
                    colors={['#FFA500', '#FF8C00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabGradient}
                  >
                    <Ionicons name={tab.icon} size={18} color="#fff" />
                    <Text style={styles.tabTextActive}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInner}>
                    <Ionicons name={tab.icon} size={18} color="#6B7280" />
                    <Text style={styles.tabText}>{tab.label}</Text>
                  </View>
                )}
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
            tintColor="#FFA500"
            colors={['#FFA500']}
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
  tabsContainer: {
    backgroundColor: '#fff',
    paddingBottom: 2,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  tab: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    borderRadius: 50,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    backgroundColor: '#F9FAFB',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  categoriesSection: {
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  categoryCard: {
    alignItems: 'center',
    width: 80,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  categoryCardActive: {
    backgroundColor: '#FFF9F0',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#FFA500',
    fontWeight: '600',
  },
  coursesSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '600',
  },
  pathsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pathCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    // Match Feed card shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  pathGradient: {
    padding: 20,
  },
  pathContent: {
    gap: 12,
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pathBadge: {
    backgroundColor: '#FFF9F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5B4',
  },
  pathBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFA500',
    textTransform: 'uppercase',
  },
  pathTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  pathDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  pathStats: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  pathStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pathStatText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
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
    backgroundColor: '#F3F4F6',
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
  createdSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  createCourseButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    // Match Feed card shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
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
