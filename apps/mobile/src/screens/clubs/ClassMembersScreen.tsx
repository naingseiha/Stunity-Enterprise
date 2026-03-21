import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  TextInput,
  Image
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import { classesApi } from '@/api';
import { useAuthStore, useMessagingStore } from '@/stores';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#09CFF7',
  primaryDark: '#06A8CC',
  maleBg: '#E0F2FE',
  maleText: '#0284C7',
  femaleBg: '#FCE7F3',
  femaleText: '#DB2777',
  totalBg: '#F3E8FF',
  totalText: '#9333EA',
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
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const data = await classesApi.getClassStudents(classId);
      setStudents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId]);

  useEffect(() => {
    if (classId) fetchMembers();
  }, [classId, fetchMembers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
  }, [fetchMembers]);

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

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(s => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const khmerName = (s.nameKh || '').toLowerCase();
      const stId = (s.studentId || '').toLowerCase();
      return fullName.includes(query) || khmerName.includes(query) || stId.includes(query);
    });
  }, [students, searchQuery]);

  const stats = useMemo(() => {
    let male = 0;
    let female = 0;
    students.forEach(s => {
      const g = (s.gender || '').toUpperCase();
      if (g === 'MALE' || g === 'M') male++;
      else if (g === 'FEMALE' || g === 'F') female++;
    });
    return { total: students.length, male, female };
  }, [students]);

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {user?.role === 'PARENT' && homeroomTeacherId && (
        <TouchableOpacity 
          style={styles.msgTeacherBanner} 
          onPress={() => handleMessage(homeroomTeacherId, 'Homeroom Teacher')}
          activeOpacity={0.8}
        >
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

      {/* Statistics Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: COLORS.totalBg }]}>
          <Ionicons name="people" size={20} color={COLORS.totalText} />
          <Text style={[styles.statValue, { color: COLORS.totalText }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: COLORS.totalText }]}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: COLORS.maleBg }]}>
          <Ionicons name="man" size={20} color={COLORS.maleText} />
          <Text style={[styles.statValue, { color: COLORS.maleText }]}>{stats.male}</Text>
          <Text style={[styles.statLabel, { color: COLORS.maleText }]}>Male</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: COLORS.femaleBg }]}>
          <Ionicons name="woman" size={20} color={COLORS.femaleText} />
          <Text style={[styles.statValue, { color: COLORS.femaleText }]}>{stats.female}</Text>
          <Text style={[styles.statLabel, { color: COLORS.femaleText }]}>Female</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isFemale = item.gender?.toUpperCase() === 'FEMALE' || item.gender?.toUpperCase() === 'F';
    
    return (
      <View style={styles.card}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: isFemale ? COLORS.femaleBg : COLORS.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: isFemale ? COLORS.femaleText : COLORS.primaryDark }]}>
              {item.firstName?.[0] || 'S'}
            </Text>
          </View>
        )}
        
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
          
          <View style={styles.metaRow}>
            {item.nameKh ? (
               <Text style={styles.khmerName}>{item.nameKh}</Text>
            ) : null}
            {item.studentId ? (
               <View style={styles.badge}>
                 <Text style={styles.badgeText}>ID: {item.studentId}</Text>
               </View>
            ) : null}
            <View style={[styles.badge, { backgroundColor: isFemale ? COLORS.femaleBg : COLORS.maleBg }]}>
               <Text style={[styles.badgeText, { color: isFemale ? COLORS.femaleText : COLORS.maleText }]}>
                 {isFemale ? 'F' : 'M'}
               </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

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

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={filteredMembers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            estimatedItemSize={76}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryDark} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No members match your search.' : 'No members found in this class.'}
                </Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    backgroundColor: COLORS.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  list: { padding: 16, paddingBottom: 40 },
  listHeader: { marginBottom: 16 },
  
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 16, 
    padding: 12, 
    marginBottom: 10,
    borderWidth: 1, 
    borderColor: COLORS.border, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    marginRight: 12 
  },
  avatarFallback: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  khmerName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'System',
    marginRight: 4,
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  
  actionBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#F0FBFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 10,
  },
  
  msgTeacherBanner: { 
    marginBottom: 16, 
    backgroundColor: '#3B82F6', 
    borderRadius: 16, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  bannerIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  bannerInfo: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 60 
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 16, 
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500'
  },
});
