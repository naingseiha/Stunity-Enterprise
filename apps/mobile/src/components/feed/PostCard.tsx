/**
 * PostCard Component
 * 
 * Reusable post card for the social feed
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { Avatar, Card } from '@/components/common';
import { Colors, Typography, Spacing, BorderRadius } from '@/config';
import { Post } from '@/types';
import { formatRelativeTime, formatNumber } from '@/utils';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  onUserPress?: () => void;
  onPress?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onUserPress,
  onPress,
}) => {
  const [liked, setLiked] = useState(post.isLiked);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked);
  const [likeCount, setLikeCount] = useState(post.likes);

  const likeScale = useSharedValue(1);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeScale.value = withSequence(
      withSpring(1.3, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );

    if (liked) {
      setLikeCount((prev) => prev - 1);
    } else {
      setLikeCount((prev) => prev + 1);
    }
    setLiked(!liked);
    onLike?.();
  };

  const handleBookmark = () => {
    Haptics.selectionAsync();
    setBookmarked(!bookmarked);
    onBookmark?.();
  };

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
    }
  };

  return (
    <Card style={styles.container} pressable onPress={onPress}>
      {/* Header */}
      <TouchableOpacity onPress={onUserPress} style={styles.header}>
        <Avatar
          uri={post.author.profilePictureUrl}
          name={`${post.author.firstName} ${post.author.lastName}`}
          size="md"
          showOnline
          isOnline={post.author.isOnline}
        />
        <View style={styles.headerText}>
          <Text style={styles.authorName}>
            {post.author.firstName} {post.author.lastName}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {post.author.headline || post.author.professionalTitle || 'Member'}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {formatRelativeTime(post.createdAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.gray[500]} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleDoubleTap}>
        <Text style={styles.content}>{post.content}</Text>

        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <View style={styles.mediaContainer}>
            {post.mediaUrls.length === 1 ? (
              <Image
                source={{ uri: post.mediaUrls[0] }}
                style={styles.singleImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.imageGrid}>
                {post.mediaUrls.slice(0, 4).map((url, index) => (
                  <View
                    key={index}
                    style={[
                      styles.gridImage,
                      post.mediaUrls.length === 2 && styles.gridImage2,
                      post.mediaUrls.length === 3 && index === 0 && styles.gridImage3First,
                    ]}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.gridImageInner}
                      contentFit="cover"
                      transition={200}
                    />
                    {index === 3 && post.mediaUrls.length > 4 && (
                      <View style={styles.moreImages}>
                        <Text style={styles.moreImagesText}>
                          +{post.mediaUrls.length - 4}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {post.tags.slice(0, 3).map((tag) => (
            <TouchableOpacity key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.likesIcon}>
            <Ionicons name="heart" size={12} color={Colors.white} />
          </View>
          <Text style={styles.statText}>{formatNumber(likeCount)}</Text>
        </View>
        <Text style={styles.statText}>
          {formatNumber(post.comments)} comments • {formatNumber(post.shares)} shares
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Animated.View style={likeAnimatedStyle}>
          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? Colors.error.main : Colors.gray[600]}
            />
            <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
              Like
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={onComment} style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={22} color={Colors.gray[600]} />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onShare} style={styles.actionButton}>
          <Ionicons name="share-outline" size={22} color={Colors.gray[600]} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleBookmark} style={styles.actionButton}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? Colors.primary[500] : Colors.gray[600]}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[3],
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    paddingBottom: Spacing[2],
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing[3],
  },
  authorName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[500],
  },
  metaDot: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[400],
    marginHorizontal: 4,
  },
  moreButton: {
    padding: Spacing[2],
  },
  content: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[800],
    lineHeight: 22,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  mediaContainer: {
    marginTop: Spacing[2],
  },
  singleImage: {
    width: '100%',
    height: 300,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridImage: {
    width: (width - 34) / 2,
    height: 150,
  },
  gridImage2: {
    height: 200,
  },
  gridImage3First: {
    width: width - 32,
    height: 200,
  },
  gridImageInner: {
    width: '100%',
    height: '100%',
  },
  moreImages: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.white,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    gap: Spacing[2],
  },
  tag: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[1],
  },
  statText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[500],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray[100],
    marginHorizontal: Spacing[4],
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    gap: Spacing[2],
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  actionTextLiked: {
    color: Colors.error.main,
  },
});

export default PostCard;
