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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Import actual Stunity logo
const StunityLogo = require('../../../../../Stunity.png');

import { PostCard } from '@/components/feed';
import { Avatar, PostSkeleton } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore } from '@/stores';
import { Post } from '@/types';
import { FeedStackScreenProps } from '@/navigation/types';

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
      {/* Create Post Card - Clean V1 style matching reference */}
      <TouchableOpacity 
        onPress={handleCreatePost} 
        activeOpacity={0.8}
        style={styles.createPostCard}
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
      
      {/* V1 Header - Profile left, Logo center, Actions right */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          {/* Profile Picture - Left */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile' as any)}>
            <Avatar
              uri={user?.profilePictureUrl}
              name={user ? `${user.firstName} ${user.lastName}` : 'User'}
              size="md"
              showBorder={true}
              borderColor="#F59E0B"
            />
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
  headerLogo: {
    height: 32,
    width: 120,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 14,
    // Soft neutral shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
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
