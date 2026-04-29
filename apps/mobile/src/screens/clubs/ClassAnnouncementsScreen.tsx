import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClassHubStore } from '@/stores/classHubStore';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  primaryDark: '#06A8CC',
};

export default function ClassAnnouncementsScreen() {
  const { t, i18n } = useTranslation();
  const isKhmer = i18n.language?.startsWith('km');
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const classId = route.params?.classId;
  const isTeacher = user?.role === 'TEACHER';

  const { announcements, loading, error, fetchAnnouncements, createAnnouncement } = useClassHubStore();
  const data = announcements[classId] || [];
  const isLoading = loading[`announcements_${classId}`];
  const errorMessage = error[`announcements_${classId}`];

  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  
  // Discussion State
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (classId) {
      fetchAnnouncements(classId);
    }
  }, [classId, fetchAnnouncements]);

  const onRefresh = () => {
    if (classId) fetchAnnouncements(classId, true);
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    try {
      setPosting(true);
      await createAnnouncement(classId, content);
      setContent('');
      setShowModal(false);
      Alert.alert(t('common.success'), t('announcements.postSuccess'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('announcements.postFailed'));
    } finally {
      setPosting(false);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    // Mock local update for discussion
    const newComment = {
      id: Math.random().toString(),
      content: commentText,
      author: user,
      createdAt: new Date().toISOString(),
    };
    
    // In a real app, we would call an API here.
    // For now, we'll just update the local state if possible or show success.
    Alert.alert(t('announcements.replied'), t('announcements.replyPosted'));
    setCommentText('');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.author?.firstName?.[0] || 'A'}</Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author?.firstName} {item.author?.lastName}</Text>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        {item.isPinned && <Ionicons name="pin" size={16} color="#F59E0B" />}
      </View>
      <Text style={styles.content}>{item.content}</Text>
      
      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => setSelectedAnnouncement(item)}
        >
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.textSecondary} />
          <Text style={[styles.actionText, isKhmer && styles.khmerInlineText]}>{t('announcements.discuss')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-outline" size={18} color={COLORS.textSecondary} />
          <Text style={[styles.actionText, isKhmer && styles.khmerInlineText]}>{t('common.share')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, isKhmer && styles.khmerInlineText]}>{t('announcements.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {isLoading && data.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primaryDark} />
      ) : errorMessage && data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.error}>{errorMessage}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={[styles.empty, isKhmer && styles.khmerInlineText]}>{t('announcements.empty')}</Text>}
          />
          
          {isTeacher && (
            <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
              <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* DISCUSSION MODAL */}
      <Modal visible={!!selectedAnnouncement} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isKhmer && styles.khmerInlineText]}>{t('announcements.discussion')}</Text>
              <TouchableOpacity onPress={() => setSelectedAnnouncement(null)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }}>
              <View style={styles.originalPost}>
                <Text style={styles.originalContent}>{selectedAnnouncement?.content}</Text>
                <Text style={styles.originalAuthor}>— {selectedAnnouncement?.author?.firstName}</Text>
              </View>
              
              <View style={styles.commentPlaceholder}>
                <Ionicons name="chatbubbles" size={48} color="#E2E8F0" />
                <Text style={[styles.commentPlaceholderText, isKhmer && styles.khmerInlineText]}>{t('announcements.privateDiscussion')}</Text>
              </View>
            </ScrollView>

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder={t('announcements.replyPlaceholder')}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendBtn, !commentText.trim() && { opacity: 0.5 }]} 
                onPress={handleAddComment}
                disabled={!commentText.trim()}
              >
                <Ionicons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* CREATE MODAL */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isKhmer && styles.khmerInlineText]}>{t('announcements.new')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('announcements.classPlaceholder')}
                multiline
                value={content}
                onChangeText={setContent}
                autoFocus
                placeholderTextColor="#94A3B8"
              />
              <Text style={[styles.charCount, isKhmer && styles.khmerInlineText]}>{t('announcements.characterCount', { count: content.length })}</Text>
            </View>

            <View style={styles.tipsBox}>
              <Ionicons name="bulb-outline" size={18} color="#0EA5E9" />
              <Text style={[styles.tipsText, isKhmer && styles.khmerInlineText]}>{t('announcements.classTip')}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.postBtn, (!content.trim() || posting) && { opacity: 0.6 }]}
              onPress={handlePost}
              disabled={!content.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[styles.postBtnText, isKhmer && styles.khmerInlineText]}>{t('announcements.post')}</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  loader: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  error: { color: 'red', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 100, gap: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  dateText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  content: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary },
  
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 12,
    paddingTop: 8,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  khmerInlineText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  originalPost: {
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginBottom: 20,
  },
  originalContent: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  originalAuthor: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'right',
  },
  commentPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
    opacity: 0.6,
  },
  commentPlaceholderText: {
    textAlign: 'center',
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  inputContainer: {
    flex: 1,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 8,
  },
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: '#0EA5E9',
    lineHeight: 18,
  },
  postBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  postBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
