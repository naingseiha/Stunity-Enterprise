import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
import { useThemeContext } from '@/contexts';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator, Animated} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Haptics } from '@/services/haptics';

import { PostCard, PostAnalyticsModal } from '@/components/feed';
import { useFeedStore } from '@/stores';
import { Post } from '@/types';
import { Colors, Shadows } from '@/config';

export default function MyPostsScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}><AutoI18nText i18nKey="auto.mobile.screens_feed_MyPostsScreen.k_7c33887b" /></Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={isDark ? ['#0B1720', '#111827'] : ['#F0F7FF', '#E0EFFE']}
            style={styles.emptyIconGradient}
          >
            <Ionicons name="create-outline" size={56} color={colors.primary} />
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_MyPostsScreen.k_5d37cac7" /></Text>
        <Text style={styles.emptySubtitle}>
          <AutoI18nText i18nKey="auto.mobile.screens_feed_MyPostsScreen.k_f2e53e51" />
        </Text>
        <TouchableOpacity 
          onPress={handleCreatePost} 
          style={styles.emptyButton}
        >
          <LinearGradient
            colors={['#0066FF', '#0052CC']}
            style={styles.emptyButtonGradient}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyButtonText}><AutoI18nText i18nKey="auto.mobile.screens_feed_MyPostsScreen.k_c0365896" /></Text>
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_MyPostsScreen.k_095cd9e7" /></Text>
        <TouchableOpacity 
          onPress={handleCreatePost}
          style={styles.createButton}
        >
          <Ionicons name="add-circle" size={28} color={colors.primary} />
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
            tintColor={colors.primary}
            colors={[colors.primary]}
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

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
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
    color: colors.text,
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
    color: colors.textSecondary,
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
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
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
