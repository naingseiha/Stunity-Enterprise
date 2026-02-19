/**
 * Feed Screen — Enterprise E-Learning Social Feed
 * 
 * V2 Premium Design:
 * - Performance card with streak + XP stats
 * - Featured categories with icon grid
 * - E-learning focused create post card
 * - Subject filter chips with clear active states
 */

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  Alert,
  AppState,
  Dimensions,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Import actual Stunity logo
const StunityLogo = require('../../../../../Stunity.png');

import {
  PostCard,
  PostAnalyticsModal,
  SubjectFilters,
  FloatingActionButton,
  EducationalValueModal,
  type EducationalValue,
} from '@/components/feed';
import { Avatar, PostSkeleton, NetworkStatus, EmptyState } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore, useNotificationStore } from '@/stores';
import { feedApi } from '@/api/client';
import { Post } from '@/types';
import { transformPosts } from '@/utils/transformPost';
import { FeedStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

type NavigationProp = FeedStackScreenProps<'Feed'>['navigation'];

export default function FeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { openSidebar } = useNavigationContext();

  // Animated tab indicator
  const tabIndicatorX = useSharedValue(0);
  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));
  const {
    feedMode,
    toggleFeedMode,
    posts,
    isLoadingPosts,
    hasMorePosts,
    fetchPosts,
    // Real-time
    subscribeToFeed,
    unsubscribeFromFeed,
    pendingPosts,
    applyPendingPosts,
    // Post actions
    likePost,
    unlikePost,
    bookmarkPost,
    voteOnPoll,
    sharePost,
    trackPostView,
    initializeRecommendations,
    seedFeed,
  } = useFeedStore();
  const unreadNotifications = useNotificationStore(state => state.unreadCount);

  const [refreshing, setRefreshing] = useState(false);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('ALL');
  const [analyticsPostId, setAnalyticsPostId] = useState<string | null>(null);
  const [valuePostId, setValuePostId] = useState<string | null>(null);
  const [valuePostData, setValuePostData] = useState<{ postType: string; authorName: string } | null>(null);
  const [valuedPostIds, setValuedPostIds] = useState<Set<string>>(new Set());
  const [isValueSubmitting, setIsValueSubmitting] = useState(false);

  // Learning stats for performance card
  const [learningStats, setLearningStats] = useState({
    currentStreak: 0,
    totalPoints: 0,
    completedLessons: 0,
    level: 1,
  });

  // Refs for stable polling (avoid re-creating interval on every posts change)
  const flatListRef = React.useRef<FlashListRef<Post>>(null);
  const postsRef = useRef(posts);
  const pendingPostsRef = useRef(pendingPosts);
  postsRef.current = posts;
  pendingPostsRef.current = pendingPosts;

  // Track whether initial load animation has played
  const hasAnimatedRef = useRef(false);

  // Stable key extractor for FlatList
  const keyExtractor = useCallback((item: Post) => item.id, []);

  // Tab mode uses direct toggle instead of horizontal ScrollView pager
  const TAB_WIDTH = (SCREEN_WIDTH - 32) / 2; // Each tab half of container minus padding
  const handleTabPress = useCallback((mode: 'FOR_YOU' | 'FOLLOWING') => {
    if (feedMode !== mode) {
      toggleFeedMode(mode);
      fetchPosts(true);
    }
    tabIndicatorX.value = withTiming(
      mode === 'FOR_YOU' ? 0 : TAB_WIDTH,
      { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) }
    );
  }, [feedMode, toggleFeedMode, fetchPosts, tabIndicatorX]);

  // Set initial indicator position based on current feedMode
  useEffect(() => {
    tabIndicatorX.value = feedMode === 'FOR_YOU' ? 0 : TAB_WIDTH;
  }, []);

  useEffect(() => {
    fetchPosts();
    initializeRecommendations();

    // Fetch learning stats for performance card
    feedApi.get('/courses/stats/my-learning').then(res => {
      if (res.data) {
        setLearningStats({
          currentStreak: res.data.currentStreak || 0,
          totalPoints: res.data.totalPoints || 0,
          completedLessons: res.data.completedLessons || 0,
          level: res.data.level || 1,
        });
      }
    }).catch(() => { /* Silent — card shows 0s on failure */ });
  }, []);

  // No useFocusEffect re-fetch — polling + realtime handle freshness

  // Real-time subscription
  useEffect(() => {
    subscribeToFeed();
    return () => unsubscribeFromFeed();
  }, []);

  // Foreground refresh: check for new posts when app returns from background
  // Replaces the old 30s polling — at scale, polling wastes 333+ req/s
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // App came to foreground — check for new posts
        const { lastFeedTimestamp, posts: currentPosts, pendingPosts: currentPending } = useFeedStore.getState();
        const latestCreatedAt = lastFeedTimestamp || currentPosts[0]?.createdAt;
        if (!latestCreatedAt) return;

        feedApi.get('/posts/feed', {
          params: { mode: 'RECENT', limit: 5, page: 1 },
        }).then((response) => {
          if (response.data?.success && response.data.data) {
            const existingIds = new Set([
              ...currentPosts.map(p => p.id),
              ...currentPending.map(p => p.id),
            ]);

            const newPosts = response.data.data.filter(
              (p: any) => new Date(p.createdAt) > new Date(latestCreatedAt) &&
                !existingIds.has(p.id)
            );

            if (newPosts.length > 0) {
              const transformed = transformPosts(newPosts);
              useFeedStore.setState(state => ({
                pendingPosts: [...transformed, ...state.pendingPosts],
              }));
            }
          }
        }).catch(() => {
          // Silent fail — foreground refresh is a convenience, not critical
        });
      }
    });

    return () => subscription.remove();
  }, []);

  // Memory pressure: reduce in-memory posts when iOS warns about low memory
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const memSub = AppState.addEventListener('memoryWarning', () => {
      const currentPosts = postsRef.current;
      if (currentPosts.length > 20) {
        useFeedStore.setState({ posts: currentPosts.slice(0, 20) });
        if (__DEV__) {
          console.log('⚠️ [FeedScreen] Memory pressure — trimmed posts to 20');
        }
      }
    });

    return () => memSub.remove();
  }, []);

  // ── Viewport-based view tracking ──
  // Track which posts are visible and for how long
  const visiblePostTimers = React.useRef<Map<string, number>>(new Map());
  const trackedViews = React.useRef<Set<string>>(new Set()); // Dedup: track each post only once

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50, // post must be 50% visible
    minimumViewTime: 1000,           // must be visible for 1+ second
  }).current;

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems, changed }: { viewableItems: any[]; changed: any[] }) => {
      const timers = visiblePostTimers.current;
      const tracked = trackedViews.current;

      // Posts that became visible → start timer
      changed.forEach(({ item, isViewable }) => {
        if (isViewable && item?.id) {
          if (!timers.has(item.id)) {
            timers.set(item.id, Date.now());
          }
        } else if (!isViewable && item?.id && timers.has(item.id)) {
          // Post left viewport → send view with duration
          const startTime = timers.get(item.id)!;
          const durationSec = Math.round((Date.now() - startTime) / 1000);
          timers.delete(item.id);

          // Only count views of 2+ seconds AND only once per post per session
          if (durationSec >= 2 && !tracked.has(item.id)) {
            tracked.add(item.id);
            trackPostView(item.id);
          }
        }
      });
    }
  ).current;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(true);
    setRefreshing(false);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingPosts && hasMorePosts) {
      fetchPosts();
    }
  }, [isLoadingPosts, hasMorePosts, fetchPosts]);

  const handleLikePost = useCallback((post: Post) => {
    if (post.isLiked) {
      unlikePost(post.id);
    } else {
      likePost(post.id);
    }
  }, [likePost, unlikePost]);

  const handleSharePost = useCallback(async (post: Post) => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { Share } = await import('react-native');
        await Share.share({
          message: `Check out this ${post.postType.toLowerCase()} on Stunity:\n\n${post.content}\n\n#Stunity #Education`,
          title: `${post.author.firstName}'s ${post.postType}`,
          url: `https://stunity.com/posts/${post.id}`,
        });
      }
      await sharePost(post.id);
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [sharePost]);

  const handleValuePost = useCallback((post: Post) => {
    setValuePostId(post.id);
    setValuePostData({
      postType: post.postType,
      authorName: post.author.name || `${post.author.firstName} ${post.author.lastName}`,
    });
  }, []);

  const handleSubmitValue = useCallback(async (value: EducationalValue) => {
    if (!valuePostId) return;

    setIsValueSubmitting(true);
    try {
      // Send to backend — map 'recommend' → 'wouldRecommend' to match API
      await feedApi.post(`/posts/${valuePostId}/value`, {
        accuracy: value.accuracy,
        helpfulness: value.helpfulness,
        clarity: value.clarity,
        depth: value.depth,
        difficulty: value.difficulty,
        wouldRecommend: value.recommend,
      });

      // Mark post as valued
      setValuedPostIds(prev => new Set(prev).add(valuePostId));

      // Close modal
      setValuePostId(null);
      setValuePostData(null);
    } catch (error: any) {
      console.error('❌ Failed to submit value:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsValueSubmitting(false);
    }
  }, [valuePostId]);

  const handleVoteOnPoll = useCallback((postId: string, optionId: string) => {
    voteOnPoll(postId, optionId);
  }, [voteOnPoll]);

  const handlePostPress = useCallback((post: Post) => {
    // Track view when post detail is opened
    trackPostView(post.id);
    navigation.navigate('PostDetail', { postId: post.id });
  }, [trackPostView, navigation]);



  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreatePost' as any);
  }, [navigation]);

  // Quick action handlers
  const handleAskQuestion = useCallback(() => {
    // Navigate to CreatePost with question type pre-selected
    navigation.navigate('CreatePost' as any, { postType: 'QUESTION' });
  }, [navigation]);

  const handleCreateQuiz = useCallback(() => {
    navigation.navigate('CreatePost' as any, { postType: 'QUIZ' });
  }, [navigation]);

  const handleCreatePoll = useCallback(() => {
    navigation.navigate('CreatePost' as any, { postType: 'POLL' });
  }, [navigation]);

  const handleCreateResource = useCallback(() => {
    navigation.navigate('CreatePost' as any, { postType: 'RESOURCE' });
  }, [navigation]);

  const handleSubjectFilterChange = useCallback(async (filterKey: string) => {
    setActiveSubjectFilter(filterKey);

    // Refresh feed with subject filter
    await fetchPosts(true, filterKey);
  }, [fetchPosts]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerSection}>
      {/* Performance / Trophy Card — E-Learning focus */}
      <TouchableOpacity activeOpacity={0.9} style={styles.performanceCardWrapper} onPress={() => navigation.navigate('Profile' as any)}>
        <LinearGradient
          colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.performanceCard}
        >
          {/* Left side: Text info */}
          <View style={styles.performanceLeft}>
            <Text style={styles.performanceGreeting}>{getGreeting()}, {user?.firstName || 'Learner'}!</Text>
            <Text style={styles.performanceTitle}>
              {learningStats.currentStreak > 0
                ? `Keep up your streak! 🔥`
                : `Start your learning journey! 📚`}
            </Text>

            {/* Stats row */}
            <View style={styles.performanceStats}>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>{learningStats.currentStreak}</Text>
                <Text style={styles.performanceStatLabel}>Day Streak</Text>
              </View>
              <View style={styles.performanceStatDivider} />
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>
                  {learningStats.totalPoints >= 1000
                    ? `${(learningStats.totalPoints / 1000).toFixed(1)}k`
                    : learningStats.totalPoints}
                </Text>
                <Text style={styles.performanceStatLabel}>Total XP</Text>
              </View>
              <View style={styles.performanceStatDivider} />
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatValue}>{learningStats.completedLessons}</Text>
                <Text style={styles.performanceStatLabel}>Completed</Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity style={styles.performanceCTA} activeOpacity={0.8} onPress={() => navigation.navigate('Profile' as any)}>
              <Text style={styles.performanceCTAText}>View Progress</Text>
              <Ionicons name="arrow-forward" size={14} color="#0284C7" />
            </TouchableOpacity>
          </View>

          {/* Right side: User Avatar */}
          <View style={styles.performanceRight}>
            <View style={styles.performanceAvatarLarge}>
              <Avatar
                uri={user?.profilePictureUrl}
                name={user ? `${user.firstName} ${user.lastName}` : 'User'}
                size="xl"
                showBorder={false}
                gradientBorder="none"
              />
            </View>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Featured Categories */}
      <View style={styles.categoriesSection}>
        <SubjectFilters
          activeFilter={activeSubjectFilter}
          onFilterChange={handleSubjectFilterChange}
        />
      </View>


      {/* Create Post Card — E-Learning Focused */}
      <View style={styles.createPostCard}>
        {/* Top row: Create post input */}
        <TouchableOpacity
          onPress={handleCreatePost}
          activeOpacity={0.8}
          style={styles.createPostRow}
        >
          <Avatar
            uri={user?.profilePictureUrl}
            name={user ? `${user.firstName} ${user.lastName}` : 'User'}
            size="md"
            variant="post"
          />
          <View style={styles.createPostInputFake}>
            <Text style={styles.createPostPlaceholder}>
              Share your learning...
            </Text>
          </View>
          <TouchableOpacity onPress={handleCreatePost} style={styles.createPostMediaButton}>
            <Ionicons name="images-outline" size={20} color="#0284C7" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Gradient Divider */}
        <LinearGradient
          colors={['transparent', '#E5E7EB', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.storyDivider}
        />

        {/* Quick Action Bar */}
        <View style={styles.quickActionsInCard}>
          <TouchableOpacity
            onPress={handleAskQuestion}
            activeOpacity={0.7}
            style={styles.inCardAction}
          >
            <LinearGradient colors={['#7DD3FC', '#0EA5E9']} style={styles.quickActionIcon}>
              <Ionicons name="help-circle" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.inCardActionText}>Ask</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateQuiz}
            activeOpacity={0.7}
            style={styles.inCardAction}
          >
            <LinearGradient colors={['#34D399', '#10B981']} style={styles.quickActionIcon}>
              <Ionicons name="bulb" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.inCardActionText}>Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreatePoll}
            activeOpacity={0.7}
            style={styles.inCardAction}
          >
            <LinearGradient colors={['#7DD3FC', '#0EA5E9']} style={styles.quickActionIcon}>
              <Ionicons name="bar-chart" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.inCardActionText}>Poll</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateResource}
            activeOpacity={0.7}
            style={styles.inCardAction}
          >
            <LinearGradient colors={['#F472B6', '#EC4899']} style={styles.quickActionIcon}>
              <Ionicons name="book" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.inCardActionText}>Resource</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [handleCreatePost, user, handleAskQuestion, handleCreateQuiz, handleCreatePoll, handleCreateResource, activeSubjectFilter, handleSubjectFilterChange]);

  const renderPost = useCallback(({ item, index }: { item: Post; index: number }) => {
    // Only animate the first 3 posts on initial load, never on subsequent scrolls
    const shouldAnimate = !hasAnimatedRef.current && index < 3;
    if (index === 2) hasAnimatedRef.current = true;

    const card = (
      <PostCard
        post={item}
        onLike={() => handleLikePost(item)}
        onComment={() => navigation.navigate('Comments', { postId: item.id })}
        onRepost={() => handleSharePost(item)}
        onShare={() => handleSharePost(item)}
        onBookmark={() => bookmarkPost(item.id)}
        onValue={() => handleValuePost(item)}
        isValued={valuedPostIds.has(item.id)}
        onUserPress={() => navigation.navigate('UserProfile', { userId: item.author.id })}
        onPress={() => handlePostPress(item)}
        onVote={(optionId) => handleVoteOnPoll(item.id, optionId)}
        onViewAnalytics={() => setAnalyticsPostId(item.id)}
      />
    );

    if (shouldAnimate) {
      return (
        <Animated.View
          entering={FadeInDown.delay(50 * index).duration(300)}
          style={styles.postWrapper}
        >
          {card}
        </Animated.View>
      );
    }

    return <View style={styles.postWrapper}>{card}</View>;
  }, [handleLikePost, handleSharePost, handleValuePost, handlePostPress, handleVoteOnPoll, bookmarkPost, navigation, valuedPostIds]);

  const renderFooter = () => {
    if (!isLoadingPosts) return null;
    return (
      <View style={styles.footer}>
        <PostSkeleton />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoadingPosts) {
      return (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </View>
      );
    }

    return (
      <EmptyState
        type="posts"
        title="No Posts Yet"
        message="Be the first to share something with the community!"
        actionLabel="Create Post"
        onAction={handleCreatePost}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Network Status Banner */}
      <NetworkStatus onRetry={handleRefresh} />

      {/* V1 Header - Profile left, Logo center, Actions right */}
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
            {/* DEV: Mock Data Seed Button */}
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: '#EEF2FF', width: 'auto', paddingHorizontal: 12 }]}
                onPress={() => {
                  Alert.alert(
                    'Seed Database',
                    'This will populate your feed with sample posts, quizzes, and stories. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Seed',
                        onPress: async () => {
                          try {
                            await seedFeed();
                            Alert.alert('Success', 'Database seeded! Pull to refresh.');
                          } catch (e) {
                            Alert.alert('Error', 'Failed to seed database');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={{ color: '#0284C7', fontWeight: '600', fontSize: 12 }}>Seed</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Search' as any)}
            >
              <Ionicons name="search-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Header Divider */}
        <View style={styles.headerDivider} />
      </SafeAreaView>

      {/* New Posts Pill */}
      {pendingPosts.length > 0 && (
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOutUp}
          style={styles.newPostsPillContainer}
        >
          <TouchableOpacity
            style={[styles.newPostsPill, Shadows.md]}
            onPress={() => {
              const newCount = applyPendingPosts();
              if (newCount > 0) {
                // Scroll to first data item (index 0) — this is the first new post,
                // positioned right after the ListHeaderComponent
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: 0,
                    animated: true,
                    viewPosition: 0, // Align to top of viewport
                  });
                }, 100); // Small delay to let FlashList re-render with new data
              }
            }}
          >
            <Ionicons name="arrow-up" size={16} color="#fff" />
            <Text style={styles.newPostsText}>
              {pendingPosts.length === 1
                ? '1 New Post'
                : `${pendingPosts.length} New Posts`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FlashList — cell recycling for smooth 60fps scrolling */}
      <FlashList
        ref={flatListRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0EA5E9"
            colors={['#0EA5E9']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // ── FlashList performance props ──
        drawDistance={250}
        getItemType={(item) => {
          // Type-bucketed recycling — cells of similar height are reused together
          if (item.postType === 'QUIZ') return 'quiz';
          if (item.postType === 'POLL') return 'poll';
          if (item.mediaUrls && item.mediaUrls.length > 0) return 'media';
          return 'text';
        }}
      />

      {/* Post Analytics Modal */}
      <PostAnalyticsModal
        isOpen={!!analyticsPostId}
        onClose={() => setAnalyticsPostId(null)}
        postId={analyticsPostId || ''}
      />

      {/* Educational Value Modal */}
      <EducationalValueModal
        visible={!!valuePostId}
        onClose={() => {
          setValuePostId(null);
          setValuePostData(null);
        }}
        onSubmit={handleSubmitValue}
        isSubmitting={isValueSubmitting}
        postType={valuePostData?.postType || 'POST'}
        authorName={valuePostData?.authorName || 'Unknown'}
      />

      {/* Floating Action Button */}
      <FloatingActionButton onPress={handleCreatePost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF', // Soft purple-tinted background
  },
  headerSafe: {
    backgroundColor: '#FFFFFF',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#EDE9FE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  postWrapper: {
    marginBottom: 0,
  },

  // ── Performance / Trophy Card ──
  performanceCardWrapper: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  performanceCard: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 22,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  performanceLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  performanceGreeting: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  performanceTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  performanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  performanceStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  performanceStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 14,
  },
  performanceCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  performanceCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  performanceRight: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  performanceAvatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle1: {
    width: 120,
    height: 120,
    top: -30,
    right: -20,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -15,
  },

  // ── Featured Categories Section ──
  categoriesSection: {
    marginTop: 16,
  },
  categoriesSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  // ── Create Post Card ──
  createPostCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 12,
    paddingTop: 16,
    paddingBottom: 8,
    borderRadius: 18,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  createPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  createPostInputFake: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  createPostPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  createPostMediaButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyDivider: {
    height: 1,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  quickActionsInCard: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 4,
  },
  inCardAction: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 12,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inCardActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    letterSpacing: 0.1,
  },
  footer: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyContainer: {
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
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
  },
  emptyButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // ── New Posts Pill ──
  newPostsPillContainer: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  newPostsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newPostsText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
