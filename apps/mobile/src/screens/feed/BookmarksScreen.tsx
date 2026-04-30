import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Bookmarks Screen
 * 
 * Displays all bookmarked posts:
 * - Clean header with back button
 * - Loading states
 * - Empty state when no bookmarks
 * - Full post cards with all interactions
 */

import React, { useEffect, useCallback } from 'react';
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

import * as Haptics from 'expo-haptics';

import { PostCard } from '@/components/feed';
import { useFeedStore } from '@/stores';
import { Post } from '@/types';
import { Colors, Shadows } from '@/config';

export default function BookmarksScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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

  const navigateToFeedHome = useCallback(() => {
    const currentState = navigation.getState?.();
    if (currentState?.routeNames?.includes('Feed')) {
      navigation.navigate('Feed');
      return;
    }

    const tabNavigator = navigation.getParent?.();
    const tabRouteNames = tabNavigator?.getState?.()?.routeNames || [];
    if (tabRouteNames.includes('FeedTab')) {
      tabNavigator.navigate('FeedTab', { screen: 'Feed' });
      return;
    }

    navigation.navigate('Feed');
  }, [navigation]);

  const handleBack = useCallback(() => {
    const currentState = navigation.getState?.();
    const canPopCurrentStack =
      typeof currentState?.index === 'number' && currentState.index > 0;

    if (canPopCurrentStack) {
      navigation.goBack();
      return;
    }

    const routeNames: string[] = currentState?.routeNames || [];
    if (routeNames.includes('Profile')) {
      navigation.navigate('Profile');
      return;
    }

    if (routeNames.includes('Feed')) {
      navigation.navigate('Feed');
      return;
    }

    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigateToFeedHome();
  }, [navigation, navigateToFeedHome]);
  
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}><AutoI18nText i18nKey="auto.mobile.screens_feed_BookmarksScreen.k_975dfa7a" /></Text>
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
            <Ionicons name="bookmark-outline" size={56} color={colors.primary} />
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_BookmarksScreen.k_d0bf1974" /></Text>
        <Text style={styles.emptySubtitle}>
          <AutoI18nText i18nKey="auto.mobile.screens_feed_BookmarksScreen.k_6626eb61" />
        </Text>
        <TouchableOpacity 
          onPress={navigateToFeedHome}
          style={styles.emptyButton}
        >
          <LinearGradient
            colors={['#0066FF', '#0052CC']}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}><AutoI18nText i18nKey="auto.mobile.screens_feed_BookmarksScreen.k_6b51e6c7" /></Text>
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
          onPress={handleBack}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_BookmarksScreen.k_3da750b5" /></Text>
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
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: isDark ? colors.surfaceVariant : '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    
    borderColor: isDark ? colors.border : '#DBEAFE',
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
