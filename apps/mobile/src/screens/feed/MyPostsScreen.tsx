/**
 * My Posts Screen
 * 
 * Displays user's own posts:
 * - Clean header with back button
 * - Loading states
 * - Empty state with CTA to create post
 * - Full post cards with edit/analytics options
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { PostCard, PostAnalyticsModal } from '@/components/feed';
import { useFeedStore } from '@/stores';
import { Post } from '@/types';
import { Colors, Shadows } from '@/config';

export default function MyPostsScreen() {
  const navigation = useNavigation();
  const { 
    myPosts, 
    isLoadingMyPosts, 
    fetchMyPosts,
    likePost,
    unlikePost,
    bookmarkPost,
    voteOnPoll,
    sharePost,
    trackPostView,
  } = useFeedStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsPostId, setAnalyticsPostId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchMyPosts();
  }, []);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMyPosts();
    setRefreshing(false);
  };
  
  const handleCreatePost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('CreatePost' as any);
  };
  
  const handlePostPress = (post: Post) => {
    trackPostView(post.id);
    navigation.navigate('PostDetail' as any, { postId: post.id });
  };
  
  const handleLikePost = (post: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (post.isLiked) {
      unlikePost(post.id);
    } else {
      likePost(post.id);
    }
  };
  
  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(50 * Math.min(index, 3)).duration(300)}
      style={styles.postWrapper}
    >
      <PostCard
        post={item}
        onLike={() => handleLikePost(item)}
        onComment={() => navigation.navigate('Comments' as any, { postId: item.id })}
        onShare={() => sharePost(item.id)}
        onBookmark={() => bookmarkPost(item.id)}
        onUserPress={() => navigation.navigate('UserProfile' as any, { userId: item.author.id })}
        onPress={() => handlePostPress(item)}
        onVote={(optionId) => voteOnPoll(item.id, optionId)}
        onViewAnalytics={() => setAnalyticsPostId(item.id)}
      />
    </Animated.View>
  );
  
  const renderEmpty = () => {
    if (isLoadingMyPosts) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Loading your posts...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['#F0F7FF', '#E0EFFE']}
            style={styles.emptyIconGradient}
          >
            <Ionicons name="create-outline" size={56} color="#0066FF" />
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}>No Posts Yet</Text>
        <Text style={styles.emptySubtitle}>
          Share your knowledge and thoughts with the community
        </Text>
        <TouchableOpacity 
          onPress={handleCreatePost} 
          style={styles.emptyButton}
        >
          <LinearGradient
            colors={['#0066FF', '#0052CC']}
            style={styles.emptyButtonGradient}
          >
            <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyButtonText}>Create Post</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Posts</Text>
        <TouchableOpacity 
          onPress={handleCreatePost}
          style={styles.createButton}
        >
          <Ionicons name="add-circle" size={28} color="#0066FF" />
        </TouchableOpacity>
      </View>
      
      {/* Posts List */}
      <FlatList
        data={myPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0066FF"
            colors={['#0066FF']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      
      {/* Post Analytics Modal */}
      <PostAnalyticsModal
        isOpen={!!analyticsPostId}
        onClose={() => setAnalyticsPostId(null)}
        postId={analyticsPostId || ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    ...Shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  createButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // List
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  postWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
