import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { classesApi } from '@/api';
import { useAuthStore, useMessagingStore } from '@/stores';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  primaryDark: '#06A8CC',
};

export default function ClassMembersScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const classId = route.params?.classId;
  const homeroomTeacherId = route.params?.homeroomTeacherId;
  const startConversation = useMessagingStore((state) => state.startConversation);

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMembers = async () => {
    try {
      const data = await classesApi.getClassStudents(classId);
      setStudents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (classId) fetchMembers();
  }, [classId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMembers();
  };

  const handleMessage = async (participantId: string, displayName: string) => {
    try {
      setLoading(true);
      const conversation = await startConversation([participantId]);
      if (conversation) {
        navigation.navigate('MessagesStack', {
          screen: 'Chat',
          params: {
            conversationId: conversation.id,
            displayName: displayName,
          }
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageTeacher = () => {
    if (!homeroomTeacherId) return;
    handleMessage(homeroomTeacherId, 'Homeroom Teacher');
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.firstName?.[0] || 'S'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.role}>Student</Text>
      </View>
      {user?.role === 'TEACHER' && (
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => handleMessage(item.id, `${item.firstName} ${item.lastName}`)}
        >
          <Ionicons name="chatbubble" size={18} color={COLORS.primaryDark} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Class Members</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {user?.role === 'PARENT' && (
        <TouchableOpacity style={styles.msgTeacherBanner} onPress={handleMessageTeacher}>
          <View style={styles.bannerIcon}>
            <Ionicons name="chatbubbles" size={24} color="#FFF" />
          </View>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>Message Teacher</Text>
            <Text style={styles.bannerSub}>Start a direct secure conversation</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primaryDark} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No members found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  role: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' },
  msgTeacherBanner: { margin: 16, marginBottom: 0, backgroundColor: '#3B82F6', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  bannerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bannerInfo: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary },
});
