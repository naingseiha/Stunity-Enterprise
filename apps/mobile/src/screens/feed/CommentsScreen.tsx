import { useTranslation } from 'react-i18next';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
  TextInput,
  ActivityIndicator,
  ScrollView, Animated} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Haptics } from '@/services/haptics';
import { track } from '@/services/analytics';


import { Avatar } from '@/components/common';
import { useFeedStore, feedStore, useAuthStore } from '@/stores';
import { Comment } from '@/types';
import { formatRelativeTime } from '@/utils';
import { Colors, Shadows } from '@/config';
import { supabase } from '@/lib/supabase';
import { createKeyedDebouncer } from '@/utils/debounce';
import { useThemeContext } from '@/contexts';
import { renderPostBodyText } from '@/utils/renderEmojiText';

const scheduleCommentRefresh = createKeyedDebouncer(600);

type CommentsScreenRouteProp = RouteProp<{ Comments: { postId: string; postType?: string } }, 'Comments'>;

export default function CommentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<CommentsScreenRouteProp>();
  const { postId } = route.params;
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const {
    feedItems,
    comments,
    isLoadingComments,
    isSubmittingComment,
    fetchComments,
    addComment,
    deleteComment,
  } = useFeedStore();

  const [newComment, setNewComment] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const postItem = feedItems.find((p) => p.type === 'POST' && p.data.id === postId) as { type: 'POST', data: any } | undefined;
  const post = postItem?.data;
  // QUESTION posts reframe the whole surface as Q&A (answers, not generic
  // comments). Prefer the route param so it's correct even when the post isn't
  // in the feed store (e.g. opened from a reel), falling back to the loaded post.
  const isQuestion = (route.params.postType ?? post?.postType) === 'QUESTION';
  const postComments = comments[postId] || [];
  const isLoading = isLoadingComments[postId] || false;
  const isSubmitting = isSubmittingComment[postId] || false;

  // Fetch comments + subscribe to realtime
  useEffect(() => {
    fetchComments(postId);

    // Subscribe to real-time comment updates for this post
    const channel = supabase
      .channel(`comments:post:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `postId=eq.${postId}`,
        },
        (payload) => {
          const incoming = payload.new as any;
          // Skip own comments — addComment() already optimistically added them to state
          if (incoming?.authorId === user?.id) return;
          if (__DEV__) { console.log('💬 [Comments] New comment from other user:', incoming?.id); }
          scheduleCommentRefresh(postId, () => fetchComments(postId));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `postId=eq.${postId}`,
        },
        (payload) => {
          // Handle DELETE directly in state — no round-trip needed
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            feedStore.setState((state) => ({
              comments: {
                ...state.comments,
                [postId]: (state.comments[postId] || []).filter(c => c.id !== deletedId),
              },
            }));
          }
        }
      )
      .subscribe((status) => {
        if (__DEV__) { console.log('💬 [Comments] Subscription:', status); }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await addComment(postId, newComment.trim());
    if (success) {
      track(isQuestion ? 'question_answer_submit' : 'comment_submit', { postId });
      setNewComment('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeletingCommentId(commentId);
    await deleteComment(commentId, postId);
    setDeletingCommentId(null);
  };

  const handleVerifyAnswer = async (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await feedStore.getState().verifyAnswer(postId, commentId);
  };

  const renderComment = ({ item: comment, index }: { item: Comment; index: number }) => {
    const isOwnComment = user?.id === comment.author.id;
    const isPostAuthor = user?.id === post?.author.id;
    const isTeacher = user?.role === 'TEACHER';
    const canVerify = (isPostAuthor || isTeacher) && post?.postType === 'QUESTION' && !post.learningMeta?.isAnswered;
    const isDeleting = deletingCommentId === comment.id;

    return (
      <Animated.View
        style={styles.commentWrapper}
      >
        <View style={styles.commentItem}>
          <Avatar
            uri={comment.author.profilePictureUrl || undefined}
            name={`${comment.author.lastName || ''} ${comment.author.firstName || ''}`.trim()}
            size="md"
            variant="post"
          />

          <View style={styles.commentBubbleContainer}>
            <View style={[
              styles.commentBubble,
              isOwnComment && styles.ownCommentBubble,
              comment.isVerifiedAnswer && styles.verifiedAnswerBubble
            ]}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>
                  {comment.author.lastName} {comment.author.firstName}
                </Text>
                {comment.author.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
                {comment.author.role === 'TEACHER' && (
                  <View style={styles.teacherBadge}>
                    <Text style={styles.teacherBadgeText}>{t('common.teacher')}</Text>
                  </View>
                )}

                {/* Golden Checkmark for Verified Answers */}
                {comment.isVerifiedAnswer && (
                  <View style={styles.goldenCheckmarkContainer}>
                    <Ionicons name="checkmark-circle" size={16} color="#F59E0B" />
                    <Text style={styles.goldenCheckmarkText}>{t('feed.sections.verifiedAnswer')}</Text>
                  </View>
                )}
              </View>

              {renderPostBodyText(comment.content, styles.commentText)}

              <View style={styles.commentFooter}>
                <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {canVerify && !isOwnComment && (
                    <TouchableOpacity
                      onPress={() => handleVerifyAnswer(comment.id)}
                      style={styles.verifyButton}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                      <Text style={styles.verifyText}>{t('feed.sections.verifyAnswer')}</Text>
                    </TouchableOpacity>
                  )}
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
                          <Text style={styles.deleteText}>{t('feed.sections.delete')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
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
    <Animated.View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <View style={styles.emptyIconGradient}>
          <Ionicons name={isQuestion ? 'help-circle-outline' : 'chatbubbles-outline'} size={44} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>
        {isQuestion ? t('feed.sections.noAnswers', { defaultValue: 'No answers yet' }) : t('feed.sections.noComments')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isQuestion ? t('feed.sections.beFirstAnswer', { defaultValue: 'Be the first to answer' }) : t('feed.sections.beFirst')}
      </Text>
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
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {isQuestion ? t('feed.sections.answers', { defaultValue: 'Answers' }) : t('feed.sections.comments')}
              </Text>
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

      <View style={styles.mainContent}>
        {/* Post Preview Card */}
        {post && (
          <Animated.View style={styles.postPreviewCardWrapper}>
          <LinearGradient
            colors={isQuestion ? ['#312E81', '#1E1B4B', '#111827'] : (isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC'])}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.postPreviewCard}
          >
            <View style={styles.postPreviewHeader}>
              <Avatar
                uri={post.author.profilePictureUrl || undefined}
                name={`${post.author.lastName || ''} ${post.author.firstName || ''}`.trim()}
                size="sm"
                variant="post"
              />
              <View style={styles.postAuthorInfo}>
                <Text style={[styles.postAuthor, isQuestion ? { color: '#FFFFFF' } : { color: colors.text }]}>
                  {post.author.lastName} {post.author.firstName}
                </Text>
                <Text style={[styles.postTime, isQuestion ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textSecondary }]}>
                  {formatRelativeTime(post.createdAt)}
                </Text>
              </View>
              {isQuestion && (
                <View style={styles.questionBadge}>
                  <Ionicons name="help-circle" size={14} color="#FDE047" />
                  <Text style={styles.questionBadgeText}>{t('feed.sections.question', { defaultValue: 'Question' })}</Text>
                </View>
              )}
            </View>
            {renderPostBodyText(
              post.content,
              [styles.postContent, isQuestion ? { color: '#F8FAFC', fontSize: 16, fontWeight: '600', lineHeight: 24 } : { color: colors.text }],
              3
            )}
          </LinearGradient>
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
            <FlashList
              data={postComments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              estimatedItemSize={80}
              contentContainerStyle={styles.commentsList}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Input Area */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <Avatar
                uri={user?.profilePictureUrl || undefined}
                name={user ? `${user.lastName} ${user.firstName}` : 'You'}
                size="sm"
                gradientBorder="blue"
              />

            <View style={styles.inputField}>
              <TextInput
                style={styles.input}
                placeholder={isQuestion ? t('feed.sections.writeAnswer', { defaultValue: 'Write your answer…' }) : t("feed.sections.writeComment")}
                placeholderTextColor={isDark ? '#6B7280' : '#A3A3A3'}
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
              <LinearGradient
                colors={newComment.trim() ? [colors.primary, '#4F46E5'] : (isDark ? ['#27272A', '#27272A'] : ['#F4F4F5', '#F4F5F6'])}
                style={styles.sendButtonGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={newComment.trim() ? '#fff' : (isDark ? '#52525B' : '#A1A1AA')}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header Styles - Clean and Professional
  headerWrapper: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Shadows.sm,
  },
  headerGradient: {
    paddingBottom: 16,
    backgroundColor: colors.card,
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
    borderRadius: 14,
    backgroundColor: colors.card,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
  },
  commentCountBadge: {
    backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(14,165,233,0.3)' : '#DBEAFE',
  },
  commentCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  headerRight: {
    width: 40,
  },

  // Post Preview Card - Rich and Elegant
  postPreviewCardWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    ...Shadows.md,
  },
  postPreviewCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
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
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(253,224,71,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253,224,71,0.3)',
  },
  questionBadgeText: {
    color: '#FDE047',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  postContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },

  // Content Area
  content: {
    flex: 1,
  },

  // Comments List - Clean and Readable
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120, // Space for floating input
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
    backgroundColor: colors.card,
    borderRadius: 22,
    borderTopLeftRadius: 6,
    padding: 14,
    shadowColor: isDark ? '#000' : '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ownCommentBubble: {
    backgroundColor: colors.card,
    borderColor: isDark ? colors.primary + '60' : '#E3F2FD',
  },
  verifiedAnswerBubble: {
    backgroundColor: isDark ? '#1E1B4B' : '#FFFBEB',
    borderColor: isDark ? '#312E81' : '#FDE68A',
    borderWidth: 1,
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
    color: colors.text,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherBadge: {
    backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : '#FFF4E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderColor: isDark ? 'rgba(14,165,233,0.3)' : '#FFE4C4',
  },
  teacherBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  goldenCheckmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
    marginLeft: 'auto',
  },
  goldenCheckmarkText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
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
    color: colors.textSecondary,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
  },
  verifyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2',
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
    borderRadius: 14,
    backgroundColor: colors.skeleton,
  },
  skeletonBubble: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: colors.skeleton,
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
    backgroundColor: isDark ? colors.surfaceVariant : '#EFF6FF',
    borderWidth: 2,
    borderColor: isDark ? colors.border : '#EFF6FF',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Input Area - Floating Pill
  inputWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingLeft: 6,
    paddingRight: 2,
  },
  inputField: {
    flex: 1,
  },
  input: {
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
});
