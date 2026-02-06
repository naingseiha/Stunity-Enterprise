/**
 * Learn Hub Screen
 * 
 * Main learning screen with courses and paths
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { Input, Card, Loading } from '@/components/common';
import { CourseCard } from '@/components/learn';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
import { useAuthStore } from '@/stores';
import { Course, LearningPath } from '@/types';
import { LearnStackScreenProps } from '@/navigation/types';

const { width } = Dimensions.get('window');

type NavigationProp = LearnStackScreenProps<'LearnHub'>['navigation'];

type TabType = 'explore' | 'enrolled' | 'created' | 'paths';

const TABS: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'explore', label: 'Explore', icon: 'compass-outline' },
  { id: 'enrolled', label: 'My Courses', icon: 'book-outline' },
  { id: 'created', label: 'Created', icon: 'create-outline' },
  { id: 'paths', label: 'Paths', icon: 'git-branch-outline' },
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

  const [activeTab, setActiveTab] = useState<TabType>('explore');
  const [searchQuery, setSearchQuery] = useState('');
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
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCategories = () => {
    const categories = [
      { id: 'dev', name: 'Development', icon: 'code-slash', color: Colors.primary[500] },
      { id: 'design', name: 'Design', icon: 'color-palette', color: Colors.secondary[500] },
      { id: 'data', name: 'Data Science', icon: 'analytics', color: Colors.success.main },
      { id: 'business', name: 'Business', icon: 'briefcase', color: Colors.warning.main },
      { id: 'marketing', name: 'Marketing', icon: 'megaphone', color: Colors.error.main },
    ];

    return (
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((cat, index) => (
            <Animated.View 
              key={cat.id} 
              entering={FadeInRight.delay(100 * index).duration(300)}
            >
              <TouchableOpacity style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderExploreCourses = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Courses</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {filteredCourses.map((course, index) => (
        <Animated.View 
          key={course.id}
          entering={FadeInDown.delay(100 * index).duration(400)}
        >
          <CourseCard course={course} onPress={() => handleCoursePress(course)} />
        </Animated.View>
      ))}
    </View>
  );

  const renderLearningPaths = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Learning Paths</Text>
      
      {paths.map((path, index) => (
        <Animated.View 
          key={path.id}
          entering={FadeInDown.delay(100 * index).duration(400)}
        >
          <Card style={styles.pathCard}>
            <LinearGradient
              colors={[Colors.primary[500], Colors.secondary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pathGradient}
            >
              <View style={styles.pathContent}>
                <Text style={styles.pathTitle}>{path.title}</Text>
                <Text style={styles.pathDescription} numberOfLines={2}>
                  {path.description}
                </Text>
                
                <View style={styles.pathStats}>
                  <View style={styles.pathStat}>
                    <Ionicons name="book-outline" size={16} color={Colors.white} />
                    <Text style={styles.pathStatText}>
                      {path.courseIds.length} courses
                    </Text>
                  </View>
                  <View style={styles.pathStat}>
                    <Ionicons name="time-outline" size={16} color={Colors.white} />
                    <Text style={styles.pathStatText}>
                      {Math.floor(path.estimatedDuration / 60)}h
                    </Text>
                  </View>
                  <View style={styles.pathStat}>
                    <Ionicons name="trending-up-outline" size={16} color={Colors.white} />
                    <Text style={styles.pathStatText}>
                      {path.level}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Card>
        </Animated.View>
      ))}
    </View>
  );

  const renderEmptyState = (message: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={64} color={Colors.gray[300]} />
      <Text style={styles.emptyTitle}>{message}</Text>
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
        return renderEmptyState('No enrolled courses', 'book-outline');
      case 'created':
        return (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.createCourseButton}
              onPress={handleCreateCourse}
            >
              <Ionicons name="add-circle-outline" size={24} color={Colors.primary[500]} />
              <Text style={styles.createCourseText}>Create New Course</Text>
            </TouchableOpacity>
            {renderEmptyState('No courses created yet', 'create-outline')}
          </View>
        );
      case 'paths':
        return renderLearningPaths();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Learn</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="bookmark-outline" size={24} color={Colors.gray[700]} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.searchContainer}>
        <Input
          placeholder="Search courses..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
          containerStyle={styles.searchInput}
        />
      </Animated.View>

      {/* Tabs */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            >
              <Ionicons 
                name={tab.icon} 
                size={18} 
                color={activeTab === tab.id ? Colors.primary[500] : Colors.gray[500]} 
              />
              <Text style={[
                styles.tabText, 
                activeTab === tab.id && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[500]}
          />
        }
      >
        {renderTabContent()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.gray[900],
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  searchInput: {
    marginBottom: 0,
  },
  tabsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  tabsContent: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[100],
    gap: Spacing[2],
  },
  activeTab: {
    backgroundColor: Colors.primary[50],
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.primary[500],
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  categoriesContainer: {
    paddingTop: Spacing[4],
  },
  categoriesScroll: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    gap: Spacing[3],
  },
  categoryCard: {
    alignItems: 'center',
    width: 80,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[700],
    marginTop: Spacing[2],
    textAlign: 'center',
  },
  section: {
    padding: Spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.gray[900],
    paddingHorizontal: Spacing[4],
  },
  seeAll: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary[500],
    fontWeight: '500',
  },
  pathCard: {
    marginBottom: Spacing[3],
    overflow: 'hidden',
    padding: 0,
  },
  pathGradient: {
    padding: Spacing[5],
  },
  pathContent: {
    gap: Spacing[2],
  },
  pathTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  pathDescription: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  pathStats: {
    flexDirection: 'row',
    marginTop: Spacing[3],
    gap: Spacing[4],
  },
  pathStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  pathStatText: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[16],
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.gray[400],
    marginTop: Spacing[4],
  },
  createCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: Spacing[4],
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.primary[200],
    borderStyle: 'dashed',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  createCourseText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: '600',
  },
});
