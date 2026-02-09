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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

// Import actual Stunity logo
const StunityLogo = require('../../../../../Stunity.png');

import { PostCard, StoryCircles } from '@/components/feed';
import { Avatar, PostSkeleton, NetworkStatus } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore } from '@/stores';
import { Post } from '@/types';
import { FeedStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

type NavigationProp = FeedStackScreenProps<'Feed'>['navigation'];

// Post type filter tabs
const FILTER_TABS = [
  { key: 'ALL', label: 'ទាំងអស់', icon: 'radio' },
  { key: 'ARTICLE', label: 'អត្ថបទ', icon: 'document-text' },
  { key: 'COURSE', label: 'វគ្គសិក្សា', icon: 'school' },
  { key: 'PROJECT', label: 'គម្រោង', icon: 'folder' },
  { key: 'EXAM', label: 'ប្រឡង', icon: 'clipboard' },
  { key: 'QUIZ', label: 'សំណួរ', icon: 'bulb' },
];

export default function FeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { openSidebar } = useNavigationContext();
  const {
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
  } = useFeedStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    fetchPosts();
    fetchStories();
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

  // Filter tabs component
  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveFilter(tab.key)}
              style={[
                styles.filterTab,
                isActive && styles.filterTabActive,
              ]}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterTabGradient}
                >
                  <Ionicons name={tab.icon as any} size={16} color="#fff" />
                  <Text style={styles.filterTabTextActive}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterTabInner}>
                  <Ionicons name={tab.icon as any} size={16} color="#6B7280" />
                  <Text style={styles.filterTabText}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
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
        
        {/* Bottom row: Story circles */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storyScrollContent}
        >
          {/* Add Story Button */}
          <TouchableOpacity onPress={handleCreateStory} style={styles.storyItem}>
            <View style={styles.addStoryCircle}>
              <Ionicons name="add" size={24} color="#6366F1" />
            </View>
            <Text style={styles.storyName}>Add</Text>
          </TouchableOpacity>
          
          {/* Story circles */}
          {storyGroups.map((group, index) => {
            if (group.user.id === user?.id) return null;
            return (
              <TouchableOpacity
                key={group.user.id}
                onPress={() => handleStoryPress(index)}
                style={styles.storyItem}
              >
                <View style={[
                  styles.storyCircleWrapper,
                  group.hasUnviewed && styles.storyCircleUnviewed
                ]}>
                  <Avatar
                    uri={group.user.profilePictureUrl}
                    name={`${group.user.firstName} ${group.user.lastName}`}
                    size="md"
                    showBorder={false}
                  />
                </View>
                <Text style={styles.storyName} numberOfLines={1}>
                  {group.user.firstName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
        onComment={() => navigation.navigate('Comments' as any, { postId: item.id })}
        onRepost={() => {}}
        onShare={() => {}}
        onBookmark={() => bookmarkPost(item.id)}
        onUserPress={() => navigation.navigate('UserProfile', { userId: item.author.id })}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
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
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
        </View>
        <Text style={styles.emptyTitle}>មិនមានប្រកាសទេ</Text>
        <Text style={styles.emptyText}>
          ចាប់ផ្តើមចែករំលែកអ្វីមួយជាមួយសហគមន៍!
        </Text>
        <TouchableOpacity onPress={handleCreatePost} style={styles.emptyButton}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}>បង្កើតប្រកាស</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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

      {/* Filter Tabs */}
      {renderFilterTabs()}

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
  filterContainer: {
    backgroundColor: '#fff',
    paddingBottom: 2,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  filterTab: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  filterTabActive: {},
  filterTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    borderRadius: 50,
  },
  filterTabInner: {
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
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
  storyScrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 56,
  },
  addStoryCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCircleWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
    backgroundColor: '#E5E7EB',
  },
  storyCircleUnviewed: {
    backgroundColor: '#F59E0B',
  },
  storyName: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
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
});
