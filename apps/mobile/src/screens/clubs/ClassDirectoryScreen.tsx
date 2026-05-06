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
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute } from '@react-navigation/native';

import { classesApi } from '@/api';
import { MyClassSummary } from '@/api/classes';
import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';

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

const CLASS_COLORS = [
  { bg: '#EEF2FF', text: '#4338CA', iconBg: '#DBEAFE', accent: '#3730A3' },
  { bg: '#F5F3FF', text: '#6D28D9', iconBg: '#EDE9FE', accent: '#5B21B6' },
  { bg: '#FFF7ED', text: '#C2410C', iconBg: '#FFEDD5', accent: '#9A3412' },
  { bg: '#F0FDF4', text: '#15803D', iconBg: '#DCFCE7', accent: '#166534' },
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

type ClassDirSection = {
  title: string;
  data: MyClassSummary[];
  teacherAccess?: 'teaching' | 'other';
};

const SchoolClassCard = React.memo(
  ({
    item,
    index,
    onPress,
    orderNumber,
    accent,
  }: {
    item: MyClassSummary;
    index: number;
    onPress: (item: MyClassSummary) => void;
    orderNumber?: number;
    accent?: 'teaching' | 'other';
  }) => {
    const { t, i18n } = useTranslation();
    const isKhmer = i18n.language?.startsWith('km');
    const colorStyle = CLASS_COLORS[index % CLASS_COLORS.length];
    const borderColor =
      accent === 'teaching' ? '#22C55E' : accent === 'other' ? '#F59E0B' : COLORS.border;

    return (
      <TouchableOpacity
        style={[styles.classCard, { borderColor }]}
        onPress={() => onPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.classMainRow}>
          <View style={[styles.orderBadge, { backgroundColor: borderColor }]}>
            <Text style={[styles.orderBadgeText, isKhmer && styles.khmerInlineText]}>
              {orderNumber != null ? orderNumber : '#'}
            </Text>
          </View>
          <View style={styles.classContent}>
            <View style={styles.titleRow}>
              <Text style={styles.className} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.gradeChip, { backgroundColor: colorStyle.bg }]}>
                <Text style={[styles.gradeChipText, isKhmer && styles.khmerInlineText]}>
                  {t('classes.directory.gradeShort', { grade: item.grade })}
                </Text>
              </View>
            </View>
            <Text style={styles.classMeta} numberOfLines={1}>
              {item.section ? t('classes.directory.section', { section: item.section }) : t('classes.directory.sectionAll')}
            </Text>
          </View>
          <View style={[styles.classIconWrap, { backgroundColor: colorStyle.iconBg }]}>
            <Ionicons name="school" size={22} color={colorStyle.text} />
          </View>
        </View>
        <View style={styles.classFooterRow}>
          <View style={styles.statPill}>
            <Ionicons name="people-outline" size={13} color={COLORS.textSecondary} />
            <Text style={[styles.statText, isKhmer && styles.khmerInlineText]}>
              {t('classes.directory.studentCount', { count: item.studentCount })}
            </Text>
          </View>
          {item.homeroomTeacher ? (
            <View style={styles.statPill}>
              <Ionicons name="person-outline" size={13} color={COLORS.textSecondary} />
              <Text style={[styles.statText, isKhmer && styles.khmerInlineText]} numberOfLines={1}>
                {item.homeroomTeacher.firstName}
              </Text>
            </View>
          ) : null}
          <View style={styles.classArrowWrap}>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

export default function ClassDirectoryScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const isKhmer = i18n.language?.startsWith('km');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teacherSectionFilter = route.params?.teacherSectionFilter as 'teaching' | 'other' | undefined;
  const user = useAuthStore((state) => state.user);
  const isAdminOrStaff = CLASS_ADMIN_ROLES.has(String(user?.role || '').toUpperCase());
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
    if (user?.role === 'TEACHER' && teacherSectionFilter === 'teaching') {
      return t('clubs.screen.teacherSectionTeaching');
    }
    if (user?.role === 'TEACHER' && teacherSectionFilter === 'other') {
      return t('clubs.screen.teacherSectionOther');
    }
    return t('classes.directory.title');
  }, [t, teacherSectionFilter, user?.role]);

  const listSections = useMemo((): ClassDirSection[] => {
    if (isAdminOrStaff) {
      return [{ title: t('classes.directory.sectionAll'), data: classes }];
    }
    if (user?.role === 'TEACHER') {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const filterByQuery = (rows: MyClassSummary[]) => {
        if (!normalizedQuery) return rows;
        return rows.filter((item) => {
          const haystack = [
            item.name,
            item.grade,
            item.section,
            item.track,
            item.homeroomTeacher?.firstName,
            item.homeroomTeacher?.lastName,
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
  }, [classes, isAdminOrStaff, searchQuery, teacherAllClasses, teacherMyClasses, teacherSectionFilter, t, user?.role]);

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
      if (isAdminOrStaff) {
        const data = await classesApi.getClasses({
          search: query,
          academicYearId: yearId || undefined,
        });
        setClasses(data);
        return;
      }

      if (user?.role === 'TEACHER') {
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
              item.homeroomTeacher?.firstName,
              item.homeroomTeacher?.lastName,
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
  }, [classCacheScopeKey, isAdminOrStaff, selectedYearId, t, user?.role]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (!isAdminOrStaff) {
      classesApi.invalidateMyClassesCache();
    }
    fetchClasses(searchQuery, selectedYearId);
  }, [fetchClasses, isAdminOrStaff, searchQuery, selectedYearId]);

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
      teacherClassAccess:
        user?.role === 'TEACHER' && !isAdminOrStaff ? teacherAccess : undefined,
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
        {loading && !refreshing ? (
          <View style={styles.center}>
            <BlurView
              intensity={isDark ? 42 : 72}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.loadingBlurCard,
                {
                  backgroundColor: isDark ? 'rgba(2,6,23,0.55)' : 'rgba(255,255,255,0.7)',
                  borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.18)',
                },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }, isKhmer && styles.khmerInlineText]}>
                {t('classes.directory.fetching')}
              </Text>
            </BlurView>
          </View>
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
                accent={section.teacherAccess}
                onPress={(row) => handleClassPress(row, section.teacherAccess)}
              />
            )}
            ListHeaderComponent={
              user?.role === 'TEACHER' && !isAdminOrStaff && !teacherSectionFilter ? (
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
  
  searchSection: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
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
  list: { padding: 16, paddingBottom: 40 },
  dirFootnote: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionHeading: {
    paddingHorizontal: 4,
    paddingTop: 8,
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
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  classMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  orderBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  orderBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  classContent: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  className: { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  gradeChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gradeChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  classMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, fontWeight: '600' },
  classFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
    maxWidth: '44%',
  },
  statText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  classIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  classArrowWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginLeft: 'auto',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingBlurCard: {
    minWidth: 220,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  loadingText: { marginTop: 12, fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
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
