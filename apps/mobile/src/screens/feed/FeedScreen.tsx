/**
 * Feed Screen
 * 
 * Clean modern feed matching v1 app design:
 * - White cards with subtle shadows (shadow-card)
 * - Minimal clean design
 * - rounded-2xl cards
 * - Simple author info with avatar
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PostCard, StoryCircles } from '@/components/feed';
import { Avatar, PostSkeleton } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useFeedStore, useAuthStore } from '@/stores';
import { Post } from '@/types';
import { FeedStackScreenProps } from '@/navigation/types';

type NavigationProp = FeedStackScreenProps<'Feed'>['navigation'];

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

  const [refreshing, setRefreshing] = React.useState(false);

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

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Stories */}
      <StoryCircles
        storyGroups={storyGroups}
        onStoryPress={handleStoryPress}
        onCreateStory={handleCreateStory}
        currentUserId={user?.id}
      />

      {/* Create Post Card - Clean v1 style */}
      <View style={styles.createPostCard}>
        <Avatar
          uri={user?.profilePictureUrl}
          name={user ? `${user.firstName} ${user.lastName}` : 'User'}
          size="md"
        />
        <TouchableOpacity onPress={handleCreatePost} style={styles.createPostInput}>
          <Text style={styles.createPostPlaceholder}>
            What's on your mind?
          </Text>
        </TouchableOpacity>
        <View style={styles.createPostActions}>
          <TouchableOpacity style={styles.createPostAction}>
            <View style={[styles.actionIconBg, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="image" size={18} color="#10B981" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createPostAction}>
            <View style={[styles.actionIconBg, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="videocam" size={18} color="#3B82F6" />
            </View>
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
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptyText}>
          Be the first to share something!
        </Text>
        <TouchableOpacity onPress={handleCreatePost} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Create Post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Clean Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Ionicons name="school" size={18} color="#6366F1" />
            </View>
            <Text style={styles.logoName}>Stunity</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Search' as any)}
            >
              <Ionicons name="search" size={22} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={22} color="#374151" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

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

      {/* FAB - Clean style */}
      <TouchableOpacity style={styles.fab} onPress={handleCreatePost}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerSafe: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
    paddingTop: 8,
  },
  postWrapper: {
    marginBottom: 4,
  },
  createPostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadows.sm,
  },
  createPostInput: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  createPostPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  createPostActions: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 4,
  },
  createPostAction: {
    padding: 2,
  },
  actionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
});
