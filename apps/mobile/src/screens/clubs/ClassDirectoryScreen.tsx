import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';

import { classesApi } from '@/api';
import { MyClassSummary } from '@/api/classes';

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

const getCurrentRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => date.toISOString().split('T')[0];
  return { startDate: format(start), endDate: format(end) };
};

const SchoolClassCard = React.memo(
  ({ item, index, onPress }: { item: MyClassSummary; index: number; onPress: (item: MyClassSummary) => void }) => {
    const colorStyle = CLASS_COLORS[index % CLASS_COLORS.length];
    
    return (
      <TouchableOpacity 
        style={styles.classCard} 
        onPress={() => onPress(item)} 
        activeOpacity={0.8}
      >
        <View style={styles.classContent}>
          <Text style={styles.className} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.classMeta} numberOfLines={1}>
            Grade {item.grade}{item.section ? ` • Section ${item.section}` : ''}
          </Text>
          <View style={styles.statsRow}>
             <View style={styles.statPill}>
                <Ionicons name="people-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{item.studentCount} Students</Text>
             </View>
             {item.homeroomTeacher && (
               <View style={styles.statPill}>
                  <Ionicons name="person-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.statText} numberOfLines={1}>
                    {item.homeroomTeacher.firstName}
                  </Text>
               </View>
             )}
          </View>
        </View>

        <View style={[styles.classIconWrap, { backgroundColor: colorStyle.iconBg }]}>
          <Ionicons name="school" size={24} color={colorStyle.text} />
        </View>
      </TouchableOpacity>
    );
  }
);

export default function ClassDirectoryScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<MyClassSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const data = await classesApi.getClasses({ 
        search: query, 
        academicYearId: yearId || undefined 
      });
      setClasses(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load class directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYearId]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClasses(searchQuery, selectedYearId);
  }, [fetchClasses, searchQuery, selectedYearId]);

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

  const handleClassPress = (item: MyClassSummary) => {
    const { startDate, endDate } = getCurrentRange();
    classesApi.prefetchClassDetailBundle({
      classId: item.id,
      myRole: 'ADMIN',
      startDate,
      endDate,
      semester: 1,
    });

    navigation.navigate('ClassDetails', {
      classId: item.id,
      className: item.name,
      myRole: 'ADMIN',
      homeroomTeacherId: item.homeroomTeacher?.id,
      initialSummary: {
        id: item.id,
        name: item.name,
        grade: item.grade,
        section: item.section,
        track: item.track,
        studentCount: item.studentCount,
        myRole: 'ADMIN',
        homeroomTeacher: item.homeroomTeacher,
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>School Directory</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search classes, grades, sections..."
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
            <ActivityIndicator size="large" color={COLORS.primaryDark} />
            <Text style={styles.loadingText}>Fetching directory...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlashList
            data={classes}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <SchoolClassCard item={item} index={index} onPress={handleClassPress} />
            )}
            estimatedItemSize={100}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryDark} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="school-outline" size={64} color={COLORS.border} />
                <Text style={styles.emptyTitle}>No Classes Found</Text>
                <Text style={styles.emptySub}>Try adjusting your search or year filter.</Text>
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
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12 
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  
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
  classCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  classContent: { flex: 1 },
  className: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  classMeta: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  classIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
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

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 15, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
});

// End of file
