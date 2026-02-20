/**
 * Bookmarks Screen
 * 
 * Displays all bookmarked posts:
 * - Clean header with back button
 * - Loading states
 * - Empty state when no bookmarks
 * - Full post cards with all interactions
 */

import React, { useEffect } from 'react';
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

import { PostCard } from '@/components/feed';
import { useFeedStore } from '@/stores';
import { Post } from '@/types';
import { Colors, Shadows } from '@/config';

export default function BookmarksScreen() {
  const navigation = useNavigation();
  const { 
    bookmarkedPosts, 
    isLoadingBookmarks, 
    fetchBookmarks,
    likePost,
    unlikePost,
    bookmarkPost,
    voteOnPoll,
    sharePost,
    trackPostView,
  } = useFeedStore();
  
  const [refreshing, setRefreshing] = React.useState(false);
  
  useEffect(() => {
    fetchBookmarks();
  }, []);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookmarks();
    setRefreshing(false);
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
      />
    </Animated.View>
  );
  
  const renderEmpty = () => {
    if (isLoadingBookmarks) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Loading bookmarks...</Text>
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
            <Ionicons name="bookmark-outline" size={56} color="#0066FF" />
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}>No Bookmarks Yet</Text>
        <Text style={styles.emptySubtitle}>
          Bookmark posts to save them for later
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.emptyButton}
        >
          <LinearGradient
            colors={['#0066FF', '#0052CC']}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}>Explore Feed</Text>
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
        <Text style={styles.headerTitle}>Saved Posts</Text>
        <View style={styles.headerRight}>
          {bookmarkedPosts.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{bookmarkedPosts.length}</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Posts List */}
      <FlatList
        data={bookmarkedPosts}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
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
    borderRadius: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    
    borderColor: '#DBEAFE',
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066FF',
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
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
