import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getQAThreads, createQAThread, getQAThreadDetail, postQAAnswer, QAThread } from '../../api/learn';

type RootStackParamList = {
  CourseQA: { courseId: string; lessonId?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'CourseQA'>;

export default function CourseQAScreen({ route, navigation }: Props) {
  const { courseId, lessonId } = route.params;

  const [threads, setThreads] = useState<QAThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<QAThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [answerBody, setAnswerBody] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, [courseId, lessonId]);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const data = await getQAThreads(courseId, lessonId);
      setThreads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (t: QAThread) => {
    setSelectedThread(t);
    try {
      const detailed = await getQAThreadDetail(t.id);
      setSelectedThread(detailed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    try {
      setPosting(true);
      await createQAThread(courseId, newTitle, newBody, lessonId);
      setNewTitle('');
      setNewBody('');
      setIsCreating(false);
      fetchThreads();
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handlePostAnswer = async () => {
    if (!answerBody.trim() || !selectedThread) return;
    try {
      setPosting(true);
      await postQAAnswer(selectedThread.id, answerBody);
      setAnswerBody('');
      // Refresh thread
      loadThread(selectedThread);
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  if (loading && !selectedThread) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  // ─── THREAD DETAIL VIEW ───
  if (selectedThread) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedThread(null)} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discussion</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.threadCard}>
              <Text style={styles.threadTitle}>{selectedThread.title}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
                <Text style={styles.metaText}>{selectedThread.user?.firstName} {selectedThread.user?.lastName}</Text>
                <Text style={styles.metaText}>•</Text>
                <Text style={styles.metaText}>{new Date(selectedThread.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.threadBody}>{selectedThread.body}</Text>
            </View>

            <Text style={styles.sectionHeader}>{selectedThread.answers?.length || 0} Answers</Text>

            {selectedThread.answers?.map(ans => (
              <View key={ans.id} style={styles.answerCard}>
                <View style={styles.metaRow}>
                  <Ionicons name="person-circle" size={20} color={ans.isInstructor ? '#F59E0B' : '#9CA3AF'} />
                  <Text style={[styles.metaText, { fontWeight: '600', color: '#1F2937' }]}>
                    {ans.user?.firstName} {ans.user?.lastName}
                  </Text>
                  {ans.isInstructor && (
                    <View style={styles.instructorBadge}>
                      <Text style={styles.instructorText}>Instructor</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.answerBody}>{ans.body}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputField}
              placeholder="Write an answer..."
              value={answerBody}
              onChangeText={setAnswerBody}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, (!answerBody.trim() || posting) && { opacity: 0.5 }]}
              onPress={handlePostAnswer}
              disabled={!answerBody.trim() || posting}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── THREADS LIST VIEW ───
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Q&A ({threads.length})</Text>
        <TouchableOpacity onPress={() => setIsCreating(!isCreating)} style={styles.iconBtn}>
          <Ionicons name={isCreating ? "close-circle" : "add-circle"} size={26} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      {isCreating && (
        <View style={styles.createBox}>
          <TextInput
            style={styles.textInput}
            placeholder="Question Title"
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <TextInput
            style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Provide details..."
            value={newBody}
            onChangeText={setNewBody}
            multiline
          />
          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleCreate}
            disabled={posting}
          >
            <Text style={styles.submitBtnText}>{posting ? 'Posting...' : 'Ask Question'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.listContent}>
        {threads.length === 0 && !isCreating ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No questions asked yet.</Text>
          </View>
        ) : (
          threads.map(t => (
            <TouchableOpacity key={t.id} style={styles.listItem} onPress={() => loadThread(t)}>
              <Text style={styles.listTitle} numberOfLines={1}>{t.title}</Text>
              <Text style={styles.listBody} numberOfLines={2}>{t.body}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={12} color="#6B7280" />
                <Text style={styles.metaText}>{t.user?.firstName}</Text>
                <View style={{flex:1}}/>
                <Ionicons name="chatbubble-outline" size={12} color="#6B7280" />
                <Text style={styles.metaText}>{t._count?.answers || 0}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  createBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  listContent: { padding: 16 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#6B7280', marginTop: 12, fontSize: 15 },
  listItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  listBody: { fontSize: 14, color: '#4B5563', marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 13, color: '#6B7280' },
  
  // Detail
  scrollContent: { padding: 16 },
  threadCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  threadTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  threadBody: { fontSize: 15, color: '#374151', lineHeight: 24, marginTop: 10 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  answerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  answerBody: { fontSize: 15, color: '#4B5563', lineHeight: 22, marginTop: 4 },
  instructorBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  instructorText: { color: '#B45309', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 12
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
