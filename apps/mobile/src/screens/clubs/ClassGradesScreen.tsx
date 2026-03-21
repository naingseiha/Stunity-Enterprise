import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { classesApi, gradeApi } from '@/api';
import { useAuthStore } from '@/stores';

const COLORS = {
  background: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#09CFF7',
  primaryDark: '#06A8CC',
  success: '#10B981',
  successBg: '#D1FAE5',
  danger: '#EF4444',
  inputBg: '#F8FAFC',
};

// Real calendar months aligned with typical academic year (starting November as per user example)
const MONTHS = [
  'November', 'December', 'January', 'February', 'March', 'April', 
  'May', 'June', 'July', 'August', 'September', 'October'
];

export default function ClassGradesScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { classId, className, myRole, linkedTeacherId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  
  // Default to the current real month name
  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
  const [selectedMonth, setSelectedMonth] = useState(
    MONTHS.includes(currentMonthName) ? currentMonthName : 'November'
  );

  const [scores, setScores] = useState<Record<string, string>>({});
  const [existingGrades, setExistingGrades] = useState<any[]>([]);

  const isTeacher = myRole === 'TEACHER';

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsData, timetableData] = await Promise.all([
        classesApi.getClassStudents(classId),
        classesApi.getClassTimetable(classId),
      ]);

      setStudents(studentsData || []);

      // Extract subjects for this teacher from timetable entries
      if (isTeacher && linkedTeacherId) {
        const entries = timetableData?.entries || [];
        const teacherSubjectsMap = new Map();
        
        entries.forEach((entry: any) => {
          if (entry.teacherId === linkedTeacherId && entry.subject) {
            teacherSubjectsMap.set(entry.subject.id, entry.subject);
          }
        });
        
        const teacherSubjects = Array.from(teacherSubjectsMap.values());
        setSubjects(teacherSubjects);
        if (teacherSubjects.length > 0) {
          setSelectedSubject(teacherSubjects[0]);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load class data');
    } finally {
      setLoading(false);
    }
  }, [classId, isTeacher, linkedTeacherId]);

  const loadGrades = useCallback(async () => {
    if (!selectedSubject) return;

    try {
      setLoading(true);
      const response = await gradeApi.get(`/grades/class/${classId}`, {
        params: {
          month: selectedMonth,
          subjectId: selectedSubject.id,
        }
      });

      const grades = response.data || [];
      setExistingGrades(grades);
      
      const scoreMap: Record<string, string> = {};
      grades.forEach((g: any) => {
        scoreMap[g.studentId] = String(g.score);
      });
      setScores(scoreMap);
    } catch (error: any) {
      console.error('Failed to load grades:', error);
    } finally {
      setLoading(false);
    }
  }, [classId, selectedSubject, selectedMonth]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const handleScoreChange = (studentId: string, value: string) => {
    // Only allow positive numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numericValue = Number(value);
      const maxScore = selectedSubject?.maxScore || 100;
      
      // Ensure it doesn't exceed the subject's max score
      if (numericValue <= maxScore) {
        setScores(prev => ({ ...prev, [studentId]: value }));
      }
    }
  };

  const handleSave = useCallback(async () => {
    if (!selectedSubject) return false;

    const maxScore = selectedSubject?.maxScore || 100;
    
    const payload = Object.entries(scores)
      .filter(([_, score]) => score !== '')
      .map(([studentId, score]) => {
        // Find normal calendar month number (1-12)
        const dateObj = new Date(`${selectedMonth} 1, 2026`);
        const monthNumber = dateObj.getMonth() + 1;
        
        return {
          studentId,
          subjectId: selectedSubject.id,
          classId,
          score: Number(score),
          maxScore: maxScore,
          month: selectedMonth,
          monthNumber: monthNumber,   
        };
      });

    if (payload.length === 0) {
      Alert.alert('Info', 'Apply at least one score before saving.');
      return false;
    }

    try {
      setSaving(true);
      await gradeApi.post('/grades/batch', { grades: payload });
      Alert.alert('Success', 'Grades updated successfully');
      await loadGrades();
      return true;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save grades');
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedSubject, scores, selectedMonth, classId, loadGrades]);

  const hasUnsavedChanges = Object.keys(scores).some((studentId) => {
    const currentScore = scores[studentId];
    if (currentScore === '') return false;
    const originalScore = existingGrades.find(g => g.studentId === studentId)?.score;
    return Number(currentScore) !== originalScore;
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isTeacher || !hasUnsavedChanges || saving) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      Alert.alert(
        'Unsaved Changes',
        'You have unsaved score inputs. If you leave now, your changes will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: 'Save Scores',
            onPress: () => {
              handleSave().then((success) => {
                if (success) {
                  // Wait a moment for UX, then navigate
                  setTimeout(() => navigation.dispatch(e.data.action), 300);
                }
              });
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, saving, isTeacher, handleSave]);

  const renderStudent = ({ item, index }: { item: any, index: number }) => {
    const studentId = item.id;
    const currentScore = scores[studentId] || '';
    const originalScore = existingGrades.find(g => g.studentId === studentId)?.score;
    const isModified = currentScore !== '' && Number(currentScore) !== originalScore;
    const isSaved = currentScore !== '' && Number(currentScore) === originalScore;
    const maxScore = selectedSubject?.maxScore || 100;

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentRankBadge}>
          <Text style={styles.studentRankText}>{index + 1}</Text>
        </View>
        
        <View style={styles.studentInfo}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: COLORS.primaryDark + '20' }]}>
              <Text style={[styles.avatarText, { color: COLORS.primaryDark }]}>
                {item.firstName?.[0] || 'S'}
              </Text>
            </View>
          )}
          
          <View style={styles.studentNameContainer}>
            <Text style={styles.studentName} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.studentId}>ID: {item.studentId || 'N/A'}</Text>
          </View>
        </View>
        
        <View style={styles.scoreSection}>
          <View style={[
            styles.scoreInputWrapper, 
            isModified && styles.scoreInputWrapperModified,
            isSaved && styles.scoreInputWrapperSaved
          ]}>
            <TextInput
              style={[
                styles.scoreInput,
                isSaved && styles.scoreInputSaved
              ]}
              value={currentScore}
              onChangeText={(val) => handleScoreChange(studentId, val)}
              keyboardType="decimal-pad"
              placeholder="-"
              placeholderTextColor={COLORS.textMuted}
              maxLength={5}
              editable={isTeacher && !saving}
              selectTextOnFocus
            />
            {isSaved && (
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} style={styles.saveIcon} />
            )}
            {isModified && (
              <View style={styles.modifiedDot} />
            )}
          </View>
          <Text style={styles.maxScore}>/ {maxScore}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Score Import</Text>
          {isTeacher ? (
            <TouchableOpacity 
              onPress={handleSave} 
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionLabel}>Select Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {subjects.map(subject => (
              <TouchableOpacity
                key={subject.id}
                style={[styles.chip, selectedSubject?.id === subject.id && styles.chipActive]}
                onPress={() => setSelectedSubject(subject)}
              >
                <Ionicons 
                  name={selectedSubject?.id === subject.id ? "book" : "book-outline"} 
                  size={14} 
                  color={selectedSubject?.id === subject.id ? COLORS.surface : COLORS.textSecondary} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[styles.chipText, selectedSubject?.id === subject.id && styles.chipTextActive]}>
                  {subject.name}
                </Text>
              </TouchableOpacity>
            ))}
            {subjects.length === 0 && (
              <Text style={styles.noSubjectsText}>No subjects assigned to you in this class.</Text>
            )}
          </ScrollView>

          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Academic Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {MONTHS.map(month => (
              <TouchableOpacity
                key={month}
                style={[styles.monthChip, selectedMonth === month && styles.monthChipActive]}
                onPress={() => setSelectedMonth(month)}
              >
                <Text style={[styles.monthChipText, selectedMonth === month && styles.monthChipTextActive]}>
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Loading scores...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Student List ({students.length})</Text>
            <Text style={styles.listHeaderSubtitle}>Max: {selectedSubject?.maxScore || 100} pts</Text>
          </View>
          <FlatList
            data={students}
            keyExtractor={item => item.id}
            renderItem={renderStudent}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="people-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>No students found in this class.</Text>
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
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
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
  saveBtn: { 
    backgroundColor: COLORS.primaryDark, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  filterSection: { paddingVertical: 4 },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: COLORS.textSecondary, 
    paddingHorizontal: 16, 
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  noSubjectsText: { color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic', alignSelf: 'center' },
  chip: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { 
    backgroundColor: COLORS.primaryDark, 
    borderColor: COLORS.primaryDark,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.surface, fontWeight: '700' },
  monthChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthChipActive: { 
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  monthChipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  monthChipTextActive: { color: '#FFF', fontWeight: '700' },
  
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  listHeaderTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  listHeaderSubtitle: { fontSize: 13, fontWeight: '600', color: COLORS.primaryDark },
  
  list: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 40 },
  studentCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  studentRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentRankText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  
  studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  studentNameContainer: { flex: 1, paddingRight: 8 },
  studentName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  studentId: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  
  scoreSection: { flexDirection: 'row', alignItems: 'center' },
  scoreInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 44,
    width: 64,
    paddingHorizontal: 4,
  },
  scoreInputWrapperModified: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FBFF',
  },
  scoreInputWrapperSaved: {
    borderColor: '#A7F3D0', // light emerald
    backgroundColor: '#ECFDF5', // very light emerald
  },
  scoreInput: { 
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scoreInputSaved: { color: COLORS.success },
  saveIcon: { position: 'absolute', right: -6, top: -6, backgroundColor: '#FFF', borderRadius: 8, overflow: 'hidden' },
  modifiedDot: { 
    position: 'absolute', 
    right: 4, 
    top: 4, 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: COLORS.primary 
  },
  maxScore: { fontSize: 13, color: COLORS.textMuted, marginLeft: 8, fontWeight: '600', width: 40 },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '600' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 16, fontSize: 15, fontWeight: '500' },
});
