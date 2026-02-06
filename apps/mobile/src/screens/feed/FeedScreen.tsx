/**
 * Feed Screen
 * 
 * Main social feed with posts and stories
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
    <View>
      {/* Stories */}
      <StoryCircles
        storyGroups={storyGroups}
        onStoryPress={handleStoryPress}
        onCreateStory={handleCreateStory}
        currentUserId={user?.id}
      />

      {/* Create Post Card */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <TouchableOpacity onPress={handleCreatePost} style={styles.createPostCard}>
          <Avatar
            uri={user?.profilePictureUrl}
            name={user ? `${user.firstName} ${user.lastName}` : 'User'}
            size="md"
          />
          <View style={styles.createPostInput}>
            <Text style={styles.createPostPlaceholder}>
              What's on your mind?
            </Text>
          </View>
          <View style={styles.createPostActions}>
            <TouchableOpacity style={styles.createPostAction}>
              <Ionicons name="image-outline" size={22} color={Colors.success.main} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.createPostAction}>
              <Ionicons name="videocam-outline" size={22} color={Colors.error.main} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <Animated.View entering={FadeInDown.delay(100 * Math.min(index, 5)).duration(400)}>
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
        <Ionicons name="newspaper-outline" size={64} color={Colors.gray[300]} />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptyText}>
          Follow some people or create your first post!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Stunity</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Search' as any)}
          >
            <Ionicons name="search-outline" size={24} color={Colors.gray[700]} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.gray[700]} />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

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
            tintColor={Colors.primary[500]}
            colors={[Colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreatePost}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  logo: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.primary[500],
    letterSpacing: 1,
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
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  listContent: {
    paddingBottom: 100,
  },
  createPostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing[3],
    padding: Spacing[4],
    borderRadius: 16,
    ...Shadows.sm,
  },
  createPostInput: {
    flex: 1,
    marginLeft: Spacing[3],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    backgroundColor: Colors.gray[100],
    borderRadius: 20,
  },
  createPostPlaceholder: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[400],
  },
  createPostActions: {
    flexDirection: 'row',
    marginLeft: Spacing[2],
    gap: Spacing[1],
  },
  createPostAction: {
    padding: Spacing[2],
  },
  footer: {
    paddingHorizontal: Spacing[3],
  },
  skeletonContainer: {
    paddingHorizontal: Spacing[3],
    paddingTop: Spacing[3],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[16],
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '600',
    color: Colors.gray[700],
    marginTop: Spacing[4],
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[8],
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: Spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
});
