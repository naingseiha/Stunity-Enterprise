/**
 * Comments Screen
 * 
 * Clean and professional full-screen view for post comments:
 * - Clean white header with subtle shadows
 * - Smooth entrance animations
 * - Readable comment bubbles with soft colors
 * - Blue accent color for interactive elements
 * - Loading skeletons
 * - Empty state illustration
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
} from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { useFeedStore, useAuthStore } from '@/stores';
import { Comment } from '@/types';
import { formatRelativeTime } from '@/utils';
import { Colors, Shadows } from '@/config';

type CommentsScreenRouteProp = RouteProp<{ Comments: { postId: string } }, 'Comments'>;

export default function CommentsScreen() {
  const navigation = useNavigation();
  const route = useRoute<CommentsScreenRouteProp>();
  const { postId } = route.params;
  const { user } = useAuthStore();

  const {
    posts,
    comments,
    isLoadingComments,
    isSubmittingComment,
    fetchComments,
    addComment,
    deleteComment,
  } = useFeedStore();

  const [newComment, setNewComment] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const post = posts.find((p) => p.id === postId);
  const postComments = comments[postId] || [];
  const isLoading = isLoadingComments[postId] || false;
  const isSubmitting = isSubmittingComment[postId] || false;

  useEffect(() => {
    fetchComments(postId);
  }, [postId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await addComment(postId, newComment.trim());
    if (success) {
      setNewComment('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeletingCommentId(commentId);
    await deleteComment(commentId, postId);
    setDeletingCommentId(null);
  };

  const renderComment = ({ item: comment, index }: { item: Comment; index: number }) => {
    const isOwnComment = user?.id === comment.author.id;
    const isDeleting = deletingCommentId === comment.id;

    return (
      <Animated.View
        entering={FadeInDown.delay(50 * Math.min(index, 5)).duration(400)}
        exiting={FadeOut.duration(200)}
        layout={Layout.springify()}
        style={styles.commentWrapper}
      >
        <View style={styles.commentItem}>
          <Avatar
            uri={comment.author.profilePictureUrl || undefined}
            name={`${comment.author.firstName} ${comment.author.lastName}`}
            size="md"
            variant="post"
          />

          <View style={styles.commentBubbleContainer}>
            <View style={[styles.commentBubble, isOwnComment && styles.ownCommentBubble]}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>
                  {comment.author.firstName} {comment.author.lastName}
                </Text>
                {comment.author.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
                {comment.author.role === 'TEACHER' && (
                  <View style={styles.teacherBadge}>
                    <Text style={styles.teacherBadgeText}>Teacher</Text>
                  </View>
                )}
              </View>

              <Text style={styles.commentText}>{comment.content}</Text>

              <View style={styles.commentFooter}>
                <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
                {isOwnComment && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment.id)}
                    style={styles.deleteButton}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text style={styles.deleteText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderLoadingSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(i * 100)}
          style={styles.skeletonComment}
        >
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonBubble}>
            <View style={[styles.skeletonLine, { width: '70%' }]} />
            <View style={[styles.skeletonLine, { width: '90%' }]} />
            <View style={[styles.skeletonLine, { width: '60%' }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <Animated.View entering={FadeIn.duration(500)} style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <View style={styles.emptyIconGradient}>
          <Ionicons name="chatbubbles-outline" size={44} color="#0066FF" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No comments yet</Text>
      <Text style={styles.emptySubtitle}>Be the first to share your thoughts!</Text>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Clean White Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color="#262626" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Comments</Text>
              {postComments.length > 0 && (
                <View style={styles.commentCountBadge}>
                  <Text style={styles.commentCountText}>{postComments.length}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight} />
          </View>
        </View>
      </View>

      {/* Post Preview Card */}
      {post && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.postPreviewCard}>
          <View style={styles.postPreviewHeader}>
            <Avatar
              uri={post.author.profilePictureUrl || undefined}
              name={`${post.author.firstName} ${post.author.lastName}`}
              size="sm"
              variant="post"
            />
            <View style={styles.postAuthorInfo}>
              <Text style={styles.postAuthor}>
                {post.author.firstName} {post.author.lastName}
              </Text>
              <Text style={styles.postTime}>{formatRelativeTime(post.createdAt)}</Text>
            </View>
          </View>
          <Text style={styles.postContent} numberOfLines={3}>
            {post.content}
          </Text>
        </Animated.View>
      )}

      {/* Comments List */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          renderLoadingSkeleton()
        ) : postComments.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={postComments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.commentsList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Area */}
        <View style={styles.inputWrapper}>
          <View style={[styles.inputContainer, Shadows.md]}>
            <Avatar
              uri={user?.profilePictureUrl || undefined}
              name={user ? `${user.firstName} ${user.lastName}` : 'You'}
              size="sm"
              gradientBorder="blue"
            />

            <View style={styles.inputField}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor="#A3A3A3"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
                editable={!isSubmitting}
              />
            </View>

            <TouchableOpacity
              onPress={handleAddComment}
              disabled={!newComment.trim() || isSubmitting}
              style={[
                styles.sendButton,
                (!newComment.trim() || isSubmitting) && styles.sendButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0066FF" />
              ) : (
                <LinearGradient
                  colors={newComment.trim() ? ['#0066FF', '#0052CC'] : ['#E8E8E8', '#D4D4D4']}
                  style={styles.sendButtonGradient}
                >
                  <Ionicons
                    name="send"
                    size={16}
                    color={newComment.trim() ? '#fff' : '#A3A3A3'}
                  />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header Styles - Clean and Professional
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    ...Shadows.sm,
  },
  headerGradient: {
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    letterSpacing: 0.2,
  },
  commentCountBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  commentCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066FF',
  },
  headerRight: {
    width: 40,
  },

  // Post Preview Card - Soft and Elegant
  postPreviewCard: {
    backgroundColor: '#FAFAFA',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  postPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  postContent: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },

  // Content Area
  content: {
    flex: 1,
  },

  // Comments List - Clean and Readable
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100, // Space for input
  },
  commentWrapper: {
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  commentBubbleContainer: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  ownCommentBubble: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3F2FD',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherBadge: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE4C4',
  },
  teacherBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  commentText: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
    marginBottom: 6,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Loading Skeleton
  skeletonContainer: {
    padding: 16,
  },
  skeletonComment: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  skeletonBubble: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },

  // Empty State - Inviting and Clean
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Input Area - Clean and Modern
  inputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Shadows.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 22,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  inputField: {
    flex: 1,
  },
  input: {
    fontSize: 15,
    color: '#262626',
    maxHeight: 100,
    paddingVertical: 6,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
