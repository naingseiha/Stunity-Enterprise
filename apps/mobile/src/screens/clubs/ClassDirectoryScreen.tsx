import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute } from '@react-navigation/native';

import { classesApi } from '@/api';
import { MyClassSummary } from '@/api/classes';
import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';
import { SchoolClassCard } from '@/components/clubs/SchoolClassCard';
import { getClassGenderCounts, getSafeStudentCount } from '@/utils/classGenderCounts';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#09CFF7',
  primaryDark: '#06A8CC',
};

const CLASS_THEMES = [
  { accent: '#06A8CC', soft: '#E0F9FD', icon: 'school-outline'      as const }, // Brand Teal
  { accent: '#6366F1', soft: '#EEF2FF', icon: 'library-outline'     as const }, // Indigo
  { accent: '#F59E0B', soft: '#FEF3C7', icon: 'ribbon-outline'      as const }, // Amber
  { accent: '#22C55E', soft: '#F0FDF4', icon: 'school-outline'      as const }, // Green
  { accent: '#EC4899', soft: '#FDF2F8', icon: 'star-outline'        as const }, // Pink
  { accent: '#8B5CF6', soft: '#F3E8FF', icon: 'extension-puzzle-outline' as const }, // Violet
];

const CLASS_ADMIN_ROLES = new Set(['ADMIN', 'STAFF', 'SUPER_ADMIN', 'SCHOOL_ADMIN']);

const getClassCacheScopeKey = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  user?.id || `${user?.role || 'anonymous'}:${user?.schoolId || 'no-school'}`;

const getCurrentRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => date.toISOString().split('T')[0];
  return { startDate: format(start), endDate: format(end) };
};

const getCurrentMonthLabel = (): string => {
  return new Date().toLocaleString('default', { month: 'long' });
};

const formatTeacherDisplayName = (
  teacher?: MyClassSummary['homeroomTeacher'] | null,
  preferEnglish = false
): string => {
  if (!teacher) return '';

  // Standardize to Last Name + First Name for enterprise consistency
  const nativeName = [teacher.lastName, teacher.firstName].filter(Boolean).join(' ').trim();
  const englishName = [teacher.englishLastName, teacher.englishFirstName].filter(Boolean).join(' ').trim();

  return (preferEnglish ? englishName || nativeName : nativeName || englishName) || '';
};

type ClassDirSection = {
  title: string;
  data: MyClassSummary[];
  teacherAccess?: 'teaching' | 'other';
};


export default function ClassDirectoryScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const isKhmer = i18n.language?.startsWith('km');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teacherSectionFilter = route.params?.teacherSectionFilter as 'teaching' | 'other' | undefined;
  const user = useAuthStore((state) => state.user);
  const isAdminOrStaff = CLASS_ADMIN_ROLES.has(String(user?.role || '').toUpperCase());
  const hasLinkedTeacherProfile = Boolean(user?.teacherId || user?.teacher?.id);
  /** Admin/staff linked to a Teacher row uses timetable-scoped lists like TEACHER (not full-school getClasses). */
  const useTeacherDirectoryMode =
    user?.role === 'TEACHER' || (isAdminOrStaff && hasLinkedTeacherProfile);
  const classCacheScopeKey = getClassCacheScopeKey(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<MyClassSummary[]>([]);
  const [teacherMyClasses, setTeacherMyClasses] = useState<MyClassSummary[]>([]);
  const [teacherAllClasses, setTeacherAllClasses] = useState<MyClassSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const directoryTitle = useMemo(() => {
    if (useTeacherDirectoryMode && teacherSectionFilter === 'teaching') {
      return t('clubs.screen.teacherSectionTeaching');
    }
    if (useTeacherDirectoryMode && teacherSectionFilter === 'other') {
      return t('clubs.screen.teacherSectionOther');
    }
    return t('classes.directory.title');
  }, [t, teacherSectionFilter, useTeacherDirectoryMode]);

  const listSections = useMemo((): ClassDirSection[] => {
    if (isAdminOrStaff && !useTeacherDirectoryMode) {
      return [{ title: t('classes.directory.sectionAll'), data: classes }];
    }
    if (useTeacherDirectoryMode) {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const filterByQuery = (rows: MyClassSummary[]) => {
        if (!normalizedQuery) return rows;
        return rows.filter((item) => {
          const haystack = [
            item.name,
            item.grade,
            item.section,
            item.track,
            formatTeacherDisplayName(item.homeroomTeacher),
            formatTeacherDisplayName(item.homeroomTeacher, true),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        });
      };

      const teaching = filterByQuery(teacherMyClasses).filter((c) => c.hasTimetableAssignment === true);
      const teachingIds = new Set(teaching.map((c) => c.id));
      const other = filterByQuery(teacherAllClasses).filter((c) => !teachingIds.has(c.id));

      if (teacherSectionFilter === 'teaching') {
        return [
          {
            title: t('clubs.screen.teacherSectionTeaching'),
            data: teaching,
            teacherAccess: 'teaching',
          },
        ];
      }
      if (teacherSectionFilter === 'other') {
        return [
          {
            title: t('clubs.screen.teacherSectionOther'),
            data: other,
            teacherAccess: 'other',
          },
        ];
      }

      const sections: ClassDirSection[] = [];
      if (teaching.length > 0) {
        sections.push({
          title: t('clubs.screen.teacherSectionTeaching'),
          data: teaching,
          teacherAccess: 'teaching',
        });
      }
      if (other.length > 0) {
        sections.push({
          title: t('clubs.screen.teacherSectionOther'),
          data: other,
          teacherAccess: 'other',
        });
      }
      return sections.length > 0 ? sections : [{ title: t('clubs.screen.schoolClasses'), data: classes }];
    }
    return [{ title: t('clubs.screen.myClassesSection'), data: classes }];
  }, [
    classes,
    isAdminOrStaff,
    searchQuery,
    teacherAllClasses,
    teacherMyClasses,
    teacherSectionFilter,
    t,
    useTeacherDirectoryMode,
  ]);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const data = await classesApi.getAcademicYears();
      setAcademicYears(data);
      const current = data.find(y => y.isCurrent);
      if (current) setSelectedYearId(current.id);
    } catch (err) {
      console.error('Failed to fetch academic years', err);
    }
  }, []);

  const fetchClasses = useCallback(async (query = '', yearId = selectedYearId) => {
    try {
      setLoading(true);
      setError(null);
      if (isAdminOrStaff && !useTeacherDirectoryMode) {
        const data = await classesApi.getClasses({
          search: query,
          academicYearId: yearId || undefined,
        });
        setClasses(data);
        return;
      }

      if (useTeacherDirectoryMode) {
        const [myRows, allRows] = await Promise.all([
          classesApi.getMyClasses({
            academicYearId: yearId || undefined,
            scopeKey: classCacheScopeKey,
          }),
          classesApi.getClassesLightweight({
            academicYearId: yearId || undefined,
            asRole: 'TEACHER',
          }),
        ]);
        setTeacherMyClasses(Array.isArray(myRows) ? myRows : []);
        setTeacherAllClasses(Array.isArray(allRows) ? allRows : []);
        // Keep `classes` populated for non-filter fallback/empty states.
        setClasses(Array.isArray(myRows) ? myRows : []);
        return;
      }

      const data = await classesApi.getMyClasses({
        academicYearId: yearId || undefined,
        scopeKey: classCacheScopeKey,
      });
      const normalizedQuery = query.trim().toLowerCase();
      const scopedClasses = normalizedQuery
        ? data.filter((item) => {
            const haystack = [
              item.name,
              item.grade,
              item.section,
              item.track,
              formatTeacherDisplayName(item.homeroomTeacher),
              formatTeacherDisplayName(item.homeroomTeacher, true),
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return haystack.includes(normalizedQuery);
          })
        : data;
      setClasses(scopedClasses);
    } catch (err: any) {
      setError(err?.message || t('classes.directory.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    classCacheScopeKey,
    isAdminOrStaff,
    selectedYearId,
    t,
    useTeacherDirectoryMode,
    user?.role,
    user?.teacherId,
    user?.teacher?.id,
  ]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (!isAdminOrStaff || hasLinkedTeacherProfile) {
      classesApi.invalidateMyClassesCache();
    }
    fetchClasses(searchQuery, selectedYearId);
  }, [fetchClasses, hasLinkedTeacherProfile, isAdminOrStaff, searchQuery, selectedYearId]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Real-time search with minor debounce-like behavior if needed, 
    // but for directory simple fetch is fine
    fetchClasses(text, selectedYearId);
  };

  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    fetchClasses(searchQuery, yearId);
  };

  const handleClassPress = (item: MyClassSummary, teacherAccess?: 'teaching' | 'other') => {
    const { startDate, endDate } = getCurrentRange();
    const effectiveRole = item.myRole || (isAdminOrStaff ? user?.role : undefined) || 'STUDENT';
    classesApi.prefetchClassDetailBundle({
      classId: item.id,
      myRole: effectiveRole as MyClassSummary['myRole'],
      linkedStudentId: item.linkedStudentId,
      linkedTeacherId: item.linkedTeacherId,
      startDate,
      endDate,
      semester: 1,
      monthLabel: effectiveRole === 'STUDENT' || effectiveRole === 'PARENT' ? getCurrentMonthLabel() : undefined,
    });

    navigation.navigate('ClassDetails', {
      classId: item.id,
      className: item.name,
      myRole: effectiveRole,
      linkedStudentId: item.linkedStudentId,
      linkedTeacherId: item.linkedTeacherId,
      homeroomTeacherId: item.homeroomTeacher?.id,
      teacherClassAccess: useTeacherDirectoryMode ? teacherAccess : undefined,
      initialSummary: {
        id: item.id,
        name: item.name,
        grade: item.grade,
        section: item.section,
        track: item.track,
        studentCount: item.studentCount,
        myRole: effectiveRole,
        linkedStudentId: item.linkedStudentId,
        linkedTeacherId: item.linkedTeacherId,
        homeroomTeacher: item.homeroomTeacher,
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap} pointerEvents="none">
            <Text style={[styles.headerTitle, isKhmer ? styles.khmerHeaderTitle : undefined]}>
              {directoryTitle}
            </Text>
          </View>
          <View style={styles.rightSlot} />
        </View>
        
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('classes.directory.searchPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          
          {academicYears.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearScroll}
            >
              {academicYears.map((year) => (
                <TouchableOpacity
                  key={year.id}
                  onPress={() => handleYearChange(year.id)}
                  style={[
                    styles.yearPill,
                    selectedYearId === year.id && styles.yearPillActive
                  ]}
                >
                  <Text style={[
                    styles.yearPillText,
                    selectedYearId === year.id && styles.yearPillTextActive
                  ]}>
                    {year.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <LinearGradient
          colors={
            isDark
              ? ["#000000", "#061512", "#000000"]
              : ["#FFFFFF", "#F5F0FF", "#EEF7FF"]
          }
          style={StyleSheet.absoluteFill}
        />
        {loading && !refreshing ? (
          <ScrollView style={styles.skeletonContainer} showsVerticalScrollIndicator={false}>
            {[1, 2, 3, 4, 5].map((key) => (
              <View key={key} style={styles.skeletonCard}>
                <View style={styles.skeletonMainRow}>
                  <View style={styles.skeletonBadge} />
                  <View style={styles.skeletonTextCol}>
                    <View style={styles.skeletonTitle} />
                    <View style={styles.skeletonSubTitle} />
                  </View>
                  <View style={styles.skeletonSquare} />
                </View>
                <View style={styles.skeletonFooter}>
                  <View style={styles.skeletonChip} />
                  <View style={styles.skeletonChip} />
                </View>
              </View>
            ))}
            <View style={styles.loadingOverlay}>
              <BlurView
                intensity={isDark ? 20 : 30}
                tint={isDark ? 'dark' : 'light'}
                style={styles.loadingOverlayContent}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {t('classes.directory.fetching')}
                </Text>
              </BlurView>
            </View>
          </ScrollView>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={[styles.retryText, isKhmer && styles.khmerInlineText]}>{t('common.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={listSections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={
              teacherSectionFilter
                ? () => null
                : ({ section }) => (
                    <View style={styles.sectionHeading}>
                      <Text style={[styles.sectionHeadingText, isKhmer && styles.khmerInlineText]}>{section.title}</Text>
                    </View>
                  )
            }
            renderItem={({ item, index, section }) => (
              <SchoolClassCard
                item={item}
                index={index}
                orderNumber={index + 1}
                onPress={(row) => handleClassPress(row, section.teacherAccess)}
              />
            )}
            ListHeaderComponent={
              useTeacherDirectoryMode && !teacherSectionFilter ? (
                <Text style={[styles.dirFootnote, isKhmer && styles.khmerInlineText]}>
                  {t('classes.directory.footnoteTeacher')}
                </Text>
              ) : null
            }
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryDark} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="school-outline" size={64} color={COLORS.border} />
                <Text style={[styles.emptyTitle, isKhmer && styles.khmerInlineText]}>{t('classes.directory.emptyTitle')}</Text>
                <Text style={[styles.emptySub, isKhmer && styles.khmerInlineText]}>{t('classes.directory.emptySubtitle')}</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerSafe: { 
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  topBar: { 
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  rightSlot: { width: 44, height: 44 },
  titleWrap: { flex: 1, paddingHorizontal: 8, justifyContent: 'center', minWidth: 0 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 28,
    textAlign: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  khmerHeaderTitle: {
    includeFontPadding: true,
    textAlignVertical: 'center',
    lineHeight: 32,
  },
  
  searchSection: { paddingHorizontal: 12, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  yearScroll: { gap: 8 },
  yearPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearPillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  yearPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  yearPillTextActive: { color: '#FFF' },

  content: { flex: 1 },
  list: { paddingVertical: 12, paddingBottom: 40 },
  dirFootnote: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionHeading: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionHeadingText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  classCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  classMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  classTextCenter: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleWithGrade: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  gradePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gradePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  genderStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  genderStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  genderStatText: {
    fontSize: 10,
    fontWeight: '800',
  },
  genderStatValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  classIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerChipsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  chevronWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  skeletonContainer: { padding: 12 },
  skeletonCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },
  skeletonMainRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  skeletonBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0' },
  skeletonTextCol: { flex: 1, gap: 8 },
  skeletonTitle: { width: '70%', height: 18, borderRadius: 4, backgroundColor: '#F1F5F9' },
  skeletonSubTitle: { width: '40%', height: 12, borderRadius: 4, backgroundColor: '#F8FAFC' },
  skeletonSquare: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9' },
  skeletonFooter: { flexDirection: 'row', gap: 8 },
  skeletonChip: { width: 100, height: 28, borderRadius: 10, backgroundColor: '#F1F5F9' },
  
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    fontWeight: '800', 
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  errorText: { marginTop: 12, fontSize: 14, color: '#EF4444', textAlign: 'center' },
  retryBtn: { 
    marginTop: 16, 
    backgroundColor: COLORS.primaryDark, 
    paddingHorizontal: 24, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center' 
  },
  retryText: { color: '#FFF', fontWeight: '700' },
  khmerInlineText: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 20,
  },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 15, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
});

// End of file
