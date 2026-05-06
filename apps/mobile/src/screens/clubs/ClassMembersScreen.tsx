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
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

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

const CLASS_ADMIN_ROLES = new Set(['ADMIN', 'STAFF', 'SUPER_ADMIN', 'SCHOOL_ADMIN']);

export default function ClassMembersScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  
  const classId = route.params?.classId;
  const homeroomTeacherId = route.params?.homeroomTeacherId;
  const myRole = String(route.params?.myRole || '').toUpperCase();
  const startConversation = useMessagingStore((state) => state.startConversation);
  const canManageRecords = CLASS_ADMIN_ROLES.has(myRole);
  const initialCachedStudents = useMemo(
    () => (classId ? classesApi.getCachedClassStudents(classId) || [] : []),
    [classId]
  );

  const [students, setStudents] = useState<any[]>(initialCachedStudents);
  const [loading, setLoading] = useState(initialCachedStudents.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMembers = useCallback(async (force = false) => {
    try {
      if (!force) {
        const cached = classesApi.getCachedClassStudents(classId);
        if (cached) {
          setStudents(cached);
          setLoading(false);
        }
      } else {
        setLoading(true);
      }

      const data = await classesApi.getClassStudents(classId, force);
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

  useFocusEffect(
    useCallback(() => {
      if (classId) {
        fetchMembers(true);
      }
    }, [classId, fetchMembers])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers(true);
  }, [fetchMembers]);

  const handleMessage = async (participantId: string, displayName: string) => {
    try {
      setLoading(true);
      const conversation = await startConversation([participantId]);
      if (conversation) {
        navigation.navigate('Messages', {
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

  const handleEditStudent = useCallback((studentId: string) => {
    if (!canManageRecords) return;
    navigation.navigate('EditStudent', {
      studentId,
      classId,
    });
  }, [canManageRecords, classId, navigation]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(s => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const englishName = `${s.englishLastName || ''} ${s.englishFirstName || ''}`.toLowerCase();
      const englishNameLegacy = `${s.englishFirstName || ''} ${s.englishLastName || ''}`.toLowerCase();
      const khmerName = (s.nameKh || '').toLowerCase();
      const stId = (s.studentId || '').toLowerCase();
      return fullName.includes(query) || englishName.includes(query) || englishNameLegacy.includes(query) || khmerName.includes(query) || stId.includes(query);
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
      <View style={styles.membersHero}>
        <LinearGradient
          colors={['#0EA5E9', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroBubble} />
        <View style={styles.heroIconWrap}>
          <Ionicons name="people" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>{t('classScreens.members.header')}</Text>
          <Text style={styles.heroCount}>{stats.total}</Text>
        </View>
        <View style={styles.heroSplit}>
          <Text style={styles.heroSplitText}>{stats.male} {t('classScreens.members.male')}</Text>
          <Text style={styles.heroSplitText}>{stats.female} {t('classScreens.members.female')}</Text>
        </View>
      </View>

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
            <Text style={styles.bannerTitle}>{t('classScreens.members.messageTeacher')}</Text>
            <Text style={styles.bannerSub}>{t('classScreens.members.messageTeacherSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Statistics Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: COLORS.totalBg, borderColor: '#E9D5FF' }]}>
          <Ionicons name="people" size={20} color={COLORS.totalText} />
          <Text style={[styles.statValue, { color: COLORS.totalText }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: COLORS.totalText }]}>{t('classScreens.members.total')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: COLORS.maleBg, borderColor: '#BAE6FD' }]}>
          <Ionicons name="man" size={20} color={COLORS.maleText} />
          <Text style={[styles.statValue, { color: COLORS.maleText }]}>{stats.male}</Text>
          <Text style={[styles.statLabel, { color: COLORS.maleText }]}>{t('classScreens.members.male')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: COLORS.femaleBg, borderColor: '#FBCFE8' }]}>
          <Ionicons name="woman" size={20} color={COLORS.femaleText} />
          <Text style={[styles.statValue, { color: COLORS.femaleText }]}>{stats.female}</Text>
          <Text style={[styles.statLabel, { color: COLORS.femaleText }]}>{t('classScreens.members.female')}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('classScreens.members.searchPlaceholder')}
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
          {item.englishFirstName || item.englishLastName ? (
            <Text style={styles.englishName} numberOfLines={1}>
              {[item.englishLastName, item.englishFirstName].filter(Boolean).join(' ')}
            </Text>
          ) : null}
          
          <View style={styles.metaRow}>
            {item.nameKh ? (
               <Text style={styles.khmerName}>{item.nameKh}</Text>
            ) : null}
            {item.studentId ? (
               <View style={styles.badge}>
                 <Text style={styles.badgeText}>{t('classScreens.members.idValue', { id: item.studentId })}</Text>
               </View>
            ) : null}
            <View style={[styles.badge, { backgroundColor: isFemale ? COLORS.femaleBg : COLORS.maleBg }]}>
               <Text style={[styles.badgeText, { color: isFemale ? COLORS.femaleText : COLORS.maleText }]}>
                 {isFemale ? 'F' : 'M'}
               </Text>
            </View>
          </View>
        </View>

        {canManageRecords ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleEditStudent(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.primaryDark} />
          </TouchableOpacity>
        ) : null}
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
          <Text style={styles.headerTitle}>{t('classScreens.members.header')}</Text>
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
                  {searchQuery ? t('classScreens.members.emptySearch') : t('classScreens.members.emptyClass')}
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(226,232,240,0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    paddingLeft: 7,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  list: { padding: 16, paddingBottom: 48 },
  listHeader: { marginBottom: 18 },
  membersHero: {
    minHeight: 132,
    borderRadius: 28,
    overflow: 'hidden',
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  heroBubble: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    opacity: 0.12,
    right: -48,
    top: -58,
  },
  heroIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroCount: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  heroSplit: {
    gap: 8,
  },
  heroSplitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    textAlign: 'center',
  },
  
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
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
    borderColor: 'rgba(226,232,240,0.95)',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1, 
    borderColor: COLORS.border, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
  },
  avatar: { 
    width: 54,
    height: 54,
    borderRadius: 18,
    marginRight: 12 
  },
  avatarFallback: { 
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  
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
  englishName: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  
  actionBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
