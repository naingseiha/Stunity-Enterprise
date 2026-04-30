import { useTranslation } from 'react-i18next';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * CommentSection Component
 * 
 * Displays comments for a post with ability to add new comments
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/common';
import { useThemeContext } from '@/contexts';
import { Comment } from '@/types';
import { formatRelativeTime } from '@/utils';

interface CommentSectionProps {
  comments: Comment[];
  isLoading: boolean;
  isSubmitting: boolean;
  onAddComment: (content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  currentUserId?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  isLoading,
  isSubmitting,
  onAddComment,
  onDeleteComment,
  currentUserId,
}) => {
    const { t: autoT } = useTranslation();
  const { colors } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const renderComment = ({ item: comment }: { item: Comment }) => {
    const isOwnComment = currentUserId === comment.author.id;

    return (
      <View style={styles.commentItem}>
        <Avatar
          uri={comment.author.profilePictureUrl || undefined}
          size="sm"
          showOnline={false}
          variant="post"
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={styles.commentAuthorRow}>
              <Text style={styles.commentAuthor}>
                {comment.author.lastName} {comment.author.firstName}
              </Text>
              <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
            </View>
            {isOwnComment && onDeleteComment && (
              <TouchableOpacity
                onPress={() => onDeleteComment(comment.id)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Comments List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0066FF" />
        </View>
      ) : comments.length > 0 ? (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.commentsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}><AutoI18nText i18nKey="auto.mobile.components_feed_CommentSection.k_d2005f61" /></Text>
        </View>
      )}

      {/* Add Comment Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={autoT("auto.mobile.components_feed_CommentSection.k_20055741")}
          placeholderTextColor={colors.textTertiary}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
          editable={!isSubmitting}
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
          style={[
            styles.sendButton,
            (!newComment.trim() || isSubmitting) && styles.sendButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="send" size={20} color={newComment.trim() ? colors.primary : colors.textTertiary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
