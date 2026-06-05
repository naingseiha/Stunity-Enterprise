import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { feedApi } from '@/api/client';
import { track } from '@/services/analytics';
import { captureException } from '@/services/monitoring';
import type { Post } from '@/types';

interface RepostComposerProps {
  visible: boolean;
  post: Post;
  onClose: () => void;
  onReposted?: () => void;
}

const MAX_LEN = 500;

export const RepostComposer: React.FC<RepostComposerProps> = ({ visible, post, onClose, onReposted }) => {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authorName = post.author
    ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim()
    : t('common.unknown');

  const close = () => {
    if (submitting) return;
    setComment('');
    onClose();
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await feedApi.post(`/posts/${post.id}/repost`, { comment: comment.trim() });
      if (res.data?.success) {
        track('repost_created', { quoted: comment.trim().length > 0 });
        // Refresh feed so the new repost appears at the top.
        const { fetchPosts } = require('@/stores').useFeedStore.getState();
        fetchPosts(true);
        setComment('');
        onReposted?.();
        onClose();
      }
    } catch (e) {
      // Keep the modal open so the user can retry; still report — a failed
      // repost POST is a backend error worth surfacing.
      captureException(e, { feature: 'repost_create', postId: post.id });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={close} hitSlop={8}>
              <Text style={[styles.cancel, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>{t('feed.repost')}</Text>
            <Pressable
              onPress={submit}
              disabled={submitting}
              hitSlop={8}
              style={[styles.repostBtn, { opacity: submitting ? 0.6 : 1 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.repostBtnText}>{t('feed.repost')}</Text>
              )}
            </Pressable>
          </View>

          {/* Comment input */}
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t('feed.repostCommentPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            value={comment}
            onChangeText={(v) => v.length <= MAX_LEN && setComment(v)}
            multiline
            autoFocus
            maxLength={MAX_LEN}
          />

          {/* Quoted original post preview */}
          <View style={[styles.quote, { borderColor: colors.border, backgroundColor: isDark ? '#ffffff08' : '#00000004' }]}>
            <View style={styles.quoteHeader}>
              <Ionicons name="repeat" size={14} color={colors.textSecondary} />
              <Text style={[styles.quoteAuthor, { color: colors.text }]} numberOfLines={1}>
                {authorName}
              </Text>
            </View>
            {!!post.title && (
              <Text style={[styles.quoteTitle, { color: colors.text }]} numberOfLines={1}>{post.title}</Text>
            )}
            <Text style={[styles.quoteContent, { color: colors.textSecondary }]} numberOfLines={3}>
              {post.content}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 28, maxHeight: '80%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cancel: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800' },
  repostBtn: { backgroundColor: '#00BA7C', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999, minWidth: 76, alignItems: 'center' },
  repostBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  input: { paddingHorizontal: 16, paddingTop: 14, fontSize: 16, minHeight: 90, textAlignVertical: 'top' },
  quote: { marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderRadius: 14, padding: 12 },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  quoteAuthor: { fontSize: 13, fontWeight: '700', flex: 1 },
  quoteTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  quoteContent: { fontSize: 13, lineHeight: 18 },
});
