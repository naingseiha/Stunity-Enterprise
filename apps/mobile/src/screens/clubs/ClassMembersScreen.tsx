import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import { classesApi } from '@/api';
import { useAuthStore, useMessagingStore } from '@/stores';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { useThemeContext } from '@/contexts';

import { Colors } from '@/config';
const BRAND_ACCENT = Colors.brand;

const CLASS_ADMIN_ROLES = new Set(['ADMIN', 'STAFF', 'SUPER_ADMIN', 'SCHOOL_ADMIN']);

export default function ClassMembersScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeContext();
  const genderColors = useMemo(() => ({
    maleBg: isDark ? 'rgba(2,132,199,0.2)' : '#E0F2FE',
    maleText: isDark ? '#7DD3FC' : '#0284C7',
    maleBorder: isDark ? 'rgba(125,211,252,0.35)' : '#BAE6FD',
    femaleBg: isDark ? 'rgba(219,39,119,0.2)' : '#FCE7F3',
    femaleText: isDark ? '#F9A8D4' : '#DB2777',
    femaleBorder: isDark ? 'rgba(249,168,212,0.35)' : '#FBCFE8',
    totalBg: isDark ? 'rgba(147,51,234,0.2)' : '#F3E8FF',
    totalText: isDark ? '#D8B4FE' : '#9333EA',
    totalBorder: isDark ? 'rgba(216,180,254,0.35)' : '#E9D5FF',
  }), [isDark]);
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
  const studentsLengthRef = useRef(initialCachedStudents.length);
  const hasFocusedOnceRef = useRef(false);

  useEffect(() => {
    studentsLengthRef.current = students.length;
  }, [students.length]);

  const fetchMembers = useCallback(async (force = false) => {
    try {
      if (!force) {
        const cached = classesApi.getCachedClassStudents(classId);
        if (cached?.length) {
          setStudents(cached);
          setLoading(false);
        }
      } else if (studentsLengthRef.current === 0) {
        // Only blank when there is nothing to paint (Feed/Reels SWR).
        setLoading(true);
      }

      const data = await classesApi.getClassStudents(classId, force);
      setStudents(data || []);
    } catch (e) {
      if (__DEV__) { console.error(e); }
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
      // Mount already loads once — skip first focus to avoid a double fetch
      // that previously forced a full-screen spinner on every return.
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
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
      if (__DEV__) { console.error(err); }
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

      {FEATURE_FLAGS.MESSAGING_ENABLED && user?.role === 'PARENT' && homeroomTeacherId && (
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
        <View style={[styles.statBox, { backgroundColor: genderColors.totalBg, borderColor: genderColors.totalBorder }]}>
          <Ionicons name="people" size={20} color={genderColors.totalText} />
          <Text style={[styles.statValue, { color: genderColors.totalText }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: genderColors.totalText }]}>{t('classScreens.members.total')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: genderColors.maleBg, borderColor: genderColors.maleBorder }]}>
          <Ionicons name="man" size={20} color={genderColors.maleText} />
          <Text style={[styles.statValue, { color: genderColors.maleText }]}>{stats.male}</Text>
          <Text style={[styles.statLabel, { color: genderColors.maleText }]}>{t('classScreens.members.male')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: genderColors.femaleBg, borderColor: genderColors.femaleBorder }]}>
          <Ionicons name="woman" size={20} color={genderColors.femaleText} />
          <Text style={[styles.statValue, { color: genderColors.femaleText }]}>{stats.female}</Text>
          <Text style={[styles.statLabel, { color: genderColors.femaleText }]}>{t('classScreens.members.female')}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('classScreens.members.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
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
          <Image
            source={{ uri: item.photoUrl }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            transition={150}
            recyclingKey={item.photoUrl}
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: isFemale ? genderColors.femaleBg : `${BRAND_ACCENT}20` }]}>
            <Text style={[styles.avatarText, { color: isFemale ? genderColors.femaleText : BRAND_ACCENT }]}>
              {item.firstName?.[0] || 'S'}
            </Text>
          </View>
        )}
        
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {[item.lastName, item.firstName].filter(Boolean).join(' ')}
          </Text>
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
            <View style={[styles.badge, { backgroundColor: isFemale ? genderColors.femaleBg : genderColors.maleBg }]}>
               <Text style={[styles.badgeText, { color: isFemale ? genderColors.femaleText : genderColors.maleText }]}>
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
            <Ionicons name="create-outline" size={18} color={BRAND_ACCENT} />
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
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('classScreens.members.header')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading && !refreshing && students.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={BRAND_ACCENT} />
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_ACCENT} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={colors.border} />
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

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: isDark ? 'transparent' : '#000',
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
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 7,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
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
    borderRadius: 9999,
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
    shadowColor: isDark ? 'transparent' : '#0F172A',
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: isDark ? 'transparent' : '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: colors.text,
  },

  card: { 
    backgroundColor: colors.card, 
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1, 
    borderColor: colors.border, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: isDark ? 'transparent' : '#000',
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
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  khmerName: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'System',
    marginRight: 4,
  },
  englishName: {
    fontSize: 12,
    color: BRAND_ACCENT,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(2,132,199,0.2)' : '#E0F2FE',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(125,211,252,0.35)' : '#BAE6FD',
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
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500'
  },
});
