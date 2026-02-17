/**
 * Feed Screen
 * 
 * V1 App Design:
 * - Header: Profile left, Stunity logo center, bell/search right
 * - Horizontal filter tabs with purple active
 * - Clean cards with proper shadows
 * - CTA section per post type
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

// Import actual Stunity logo
const StunityLogo = require('../../../../../Stunity.png');

import {
  PostCard,
  StoryCircles,
  PostAnalyticsModal,
  SubjectFilters,
  FloatingActionButton,
  EducationalValueModal,
  type EducationalValue,
} from '@/components/feed';
import { Avatar, PostSkeleton, NetworkStatus, EmptyState } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore } from '@/stores';
import { feedApi } from '@/api/client';
import { Post } from '@/types';
import { FeedStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

type NavigationProp = FeedStackScreenProps<'Feed'>['navigation'];

export default function FeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { openSidebar } = useNavigationContext();
  const {
    feedMode,
    toggleFeedMode,
    posts,
    storyGroups,
    isLoadingPosts,
    isLoadingStories,
    hasMorePosts,
    fetchPosts,
    fetchStories,
    likePost,
    unlikePost,
    bookmarkPost,
    setActiveStoryGroup,
    voteOnPoll,
    sharePost,
    trackPostView,
    initializeRecommendations,
  } = useFeedStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('ALL');
  const [analyticsPostId, setAnalyticsPostId] = useState<string | null>(null);
  const [valuePostId, setValuePostId] = useState<string | null>(null);
  const [valuePostData, setValuePostData] = useState<{ postType: string; authorName: string } | null>(null);

  useEffect(() => {
    fetchPosts();
    fetchStories();
    initializeRecommendations();
  }, []);

  // Refresh posts when screen comes into focus (e.g., after creating a post)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we have posts (screen has been loaded before)
      if (posts.length > 0) {
        fetchPosts(true);
      }
    }, [posts.length, fetchPosts])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(true), fetchStories()]);
    setRefreshing(false);
  }, [fetchPosts, fetchStories]);

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

  const handleSharePost = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      // Use native share if available
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { Share } = await import('react-native');
        await Share.share({
          message: `Check out this ${post.postType.toLowerCase()} on Stunity:\n\n${post.content}\n\n#Stunity #Education`,
          title: `${post.author.firstName}'s ${post.postType}`,
          url: `https://stunity.com/posts/${postId}`, // Future: deep link
        });
      }

      // Track share
      await sharePost(postId);
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [posts, sharePost]);

  const handleValuePost = useCallback((post: Post) => {
    setValuePostId(post.id);
    setValuePostData({
      postType: post.postType,
      authorName: post.author.name || `${post.author.firstName} ${post.author.lastName}`,
    });
  }, []);

  const handleSubmitValue = useCallback(async (value: EducationalValue) => {
    if (!valuePostId) return;

    try {
      // Send to backend
      const response = await feedApi.post(`/posts/${valuePostId}/value`, {
        accuracy: value.accuracy,
        helpfulness: value.helpfulness,
        clarity: value.clarity,
        depth: value.depth,
        difficulty: value.difficulty,
        wouldRecommend: value.wouldRecommend,
      });

      console.log('✅ Educational Value submitted:', {
        postId: valuePostId,
        averageRating: response.data.averageRating,
        value,
      });

      // Close modal
      setValuePostId(null);
      setValuePostData(null);

      // Show success feedback
      Alert.alert(
        'Thank You! 🎉',
        'Your feedback helps improve learning for everyone in the community.',
        [{ text: 'Got it' }]
      );
    } catch (error: any) {
      console.error('❌ Failed to submit value:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
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

  const handleStoryPress = useCallback((index: number) => {
    setActiveStoryGroup(index);
    navigation.navigate('StoryViewer' as any, { groupIndex: index });
  }, [setActiveStoryGroup, navigation]);

  const handleCreateStory = useCallback(() => {
    navigation.navigate('CreateStory' as any);
  }, [navigation]);

  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreatePost' as any);
  }, [navigation]);

  // Quick action handlers
  const handleAskQuestion = useCallback(() => {
    // Navigate to CreatePost with question type pre-selected
    navigation.navigate('CreatePost' as any, { postType: 'QUESTION' });
  }, [navigation]);

  const handleFindStudyBuddy = useCallback(() => {
    // TODO: Navigate to Study Buddy finder screen when implemented
    console.log('Find Study Buddy pressed');
  }, []);

  const handleDailyChallenge = useCallback(() => {
    // TODO: Navigate to Daily Challenge screen when implemented
    console.log('Daily Challenge pressed');
  }, []);

  const handleSubjectFilterChange = useCallback(async (filterKey: string) => {
    setActiveSubjectFilter(filterKey);

    // Refresh feed with subject filter
    await fetchPosts(true, filterKey);
  }, [fetchPosts]);

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Feed Tabs */}
      <View style={styles.feedTabsContainer}>
        <View style={styles.feedTabs}>
          <TouchableOpacity
            style={[styles.feedTab, feedMode === 'FOR_YOU' && styles.feedTabActive]}
            onPress={() => toggleFeedMode('FOR_YOU')}
          >
            <Text style={[styles.feedTabText, feedMode === 'FOR_YOU' && styles.feedTabTextActive]}>For You</Text>
            {feedMode === 'FOR_YOU' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedTab, feedMode === 'FOLLOWING' && styles.feedTabActive]}
            onPress={() => toggleFeedMode('FOLLOWING')}
          >
            <Text style={[styles.feedTabText, feedMode === 'FOLLOWING' && styles.feedTabTextActive]}>Following</Text>
            {feedMode === 'FOLLOWING' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Post Card with integrated Stories */}
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
          <Text style={styles.createPostPlaceholder}>
            តើអ្នកកំពុងគិតអ្វី {user?.firstName || ''}?
          </Text>
          <View style={styles.createPostMediaButton}>
            <Ionicons name="images-outline" size={22} color="#6366F1" />
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.storyDivider} />

        {/* Quick Action Bar - Integrated in Create Post Card */}
        <View style={styles.quickActionsInCard}>
          <TouchableOpacity
            onPress={handleAskQuestion}
            activeOpacity={0.7}
            style={styles.inCardAction}
          >
            <Ionicons name="help-circle" size={24} color="#6366F1" />
            <Text style={styles.inCardActionText}>Ask Question</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            onPress={handleFindStudyBuddy}
            activeOpacity={0.7}
            style={styles.inCardAction}
          >
            <Ionicons name="people" size={24} color="#EC4899" />
            <Text style={styles.inCardActionText}>Study Buddy</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            onPress={handleDailyChallenge}
            activeOpacity={0.7}
            style={styles.inCardAction}
          >
            <Ionicons name="trophy" size={24} color="#F59E0B" />
            <Text style={styles.inCardActionText}>Daily Challenge</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(50 * Math.min(index, 3)).duration(300)}
      style={styles.postWrapper}
    >
      <PostCard
        post={item}
        onLike={() => handleLikePost(item)}
        onComment={() => navigation.navigate('Comments', { postId: item.id })}
        onRepost={() => { }}
        onShare={() => handleSharePost(item.id)}
        onBookmark={() => bookmarkPost(item.id)}
        onValue={() => handleValuePost(item)}
        onUserPress={() => navigation.navigate('UserProfile', { userId: item.author.id })}
        onPress={() => handlePostPress(item)}
        onVote={(optionId) => handleVoteOnPoll(item.id, optionId)}
        onViewAnalytics={() => setAnalyticsPostId(item.id)}
      />
    </Animated.View>
  );

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
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View style={styles.notificationBadge} />
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

      {/* Subject Filters - Fixed under app bar */}
      <SubjectFilters
        activeFilter={activeSubjectFilter}
        onFilterChange={handleSubjectFilterChange}
      />

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        style={styles.list}
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
    backgroundColor: '#F8F7FC', // Light purple background for card separation
  },
  headerSafe: {
    backgroundColor: '#fff',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingTop: 12,
    paddingBottom: 0,
  },
  postWrapper: {
    marginBottom: 0,
  },
  createPostCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginBottom: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 16,
    // Subtle shadow matching PostCard
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  createPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  createPostPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },
  createPostMediaButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },
  quickActionsInCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  inCardAction: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  inCardActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  actionDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
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
    backgroundColor: '#F3F4F6',
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
  // Feed Tabs
  feedTabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  feedTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  feedTab: {
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center',
  },
  feedTabActive: {
    // 
  },
  feedTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  feedTabTextActive: {
    color: '#111827',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 3,
    backgroundColor: '#6366F1',
    borderRadius: 1.5,
  },
});
