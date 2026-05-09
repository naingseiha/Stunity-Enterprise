import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { classesApi, gradeApi } from '@/api';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

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

const GRADE_ADMIN_MOBILE_ROLES = new Set(['ADMIN', 'STAFF', 'SUPER_ADMIN', 'SCHOOL_ADMIN']);

// Real calendar months aligned with typical academic year (starting November as per user example)
const MONTHS = [
  'November', 'December', 'January', 'February', 'March', 'April', 
  'May', 'June', 'July', 'August', 'September', 'October'
];
const MONTH_TO_NUMBER: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

const resolveAcademicYearForMonth = (monthNumber: number, now = new Date()): number => {
  const currentMonthNumber = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const academicStartYear = currentMonthNumber >= 11 ? currentYear : currentYear - 1;
  return monthNumber >= 11 ? academicStartYear : academicStartYear + 1;
};

const GRADE_ROWS_CACHE_TTL = 60_000;
const gradeRowsCache = new Map<string, { data: any[]; ts: number }>();
const gradeRowsInFlight = new Map<string, Promise<any[]>>();
const studentScoreRowsCache = new Map<string, { data: any[]; ts: number }>();
const studentScoreRowsInFlight = new Map<string, Promise<any[]>>();
const getGradeRowsCacheKey = (
  classId: string,
  month: string,
  subjectId: string,
  year?: number,
  monthNumber?: number,
) => `${classId}:${year ?? 'current'}:${monthNumber ?? ''}:${month}:${subjectId}`;
const getCachedGradeRows = (
  classId: string,
  month: string,
  subjectId: string,
  year?: number,
  monthNumber?: number,
) => {
  const cacheKey = getGradeRowsCacheKey(classId, month, subjectId, year, monthNumber);
  const cached = gradeRowsCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.ts >= GRADE_ROWS_CACHE_TTL) {
    gradeRowsCache.delete(cacheKey);
    return null;
  }

  return cached.data;
};
const buildScoreMap = (grades: any[]) =>
  grades.reduce<Record<string, string>>((acc, grade) => {
    acc[grade.studentId] = String(grade.score);
    return acc;
  }, {});

const fetchTeacherGradeRows = (
  classId: string,
  month: string,
  subjectId: string,
  year: number,
  monthNumber: number,
  force = false,
) => {
  const cacheKey = getGradeRowsCacheKey(classId, month, subjectId, year, monthNumber);

  if (!force) {
    const cached = getCachedGradeRows(classId, month, subjectId, year, monthNumber);
    if (cached) return Promise.resolve(cached);

    const inFlight = gradeRowsInFlight.get(cacheKey);
    if (inFlight) return inFlight;
  }

  const request = gradeApi
    .get(`/grades/class/${classId}`, {
      params: {
        classId,
        month,
        monthNumber,
        year,
        subjectId,
      },
    })
    .then((response) => {
      const grades = response.data || [];
      gradeRowsCache.set(cacheKey, { data: grades, ts: Date.now() });
      return grades;
    })
    .finally(() => {
      gradeRowsInFlight.delete(cacheKey);
    });

  gradeRowsInFlight.set(cacheKey, request);
  return request;
};

const getStudentScoreRowsCacheKey = (
  classId: string | undefined,
  studentId: string,
  month: string,
  year: number,
  monthNumber: number,
) => `${classId ?? 'all'}:${studentId}:${year}:${monthNumber}:${month}`;

const getCachedStudentScoreRows = (
  classId: string | undefined,
  studentId: string,
  month: string,
  year: number,
  monthNumber: number,
) => {
  const cacheKey = getStudentScoreRowsCacheKey(classId, studentId, month, year, monthNumber);
  const cached = studentScoreRowsCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.ts >= GRADE_ROWS_CACHE_TTL) {
    studentScoreRowsCache.delete(cacheKey);
    return null;
  }

  return cached.data;
};

const fetchStudentScoreRows = (
  classId: string | undefined,
  studentId: string,
  month: string,
  year: number,
  monthNumber: number,
  force = false,
) => {
  const cacheKey = getStudentScoreRowsCacheKey(classId, studentId, month, year, monthNumber);

  if (!force) {
    const cached = getCachedStudentScoreRows(classId, studentId, month, year, monthNumber);
    if (cached) return Promise.resolve(cached);

    const inFlight = studentScoreRowsInFlight.get(cacheKey);
    if (inFlight) return inFlight;
  }

  const request = gradeApi
    .get(`/grades/student/${studentId}`, {
      params: {
        classId,
        month,
        monthNumber,
        year,
      },
    })
    .then((response) => {
      const rows = Array.isArray(response.data) ? response.data : [];
      const filtered = classId ? rows.filter((row: any) => row.class?.id === classId || row.classId === classId) : rows;
      filtered.sort((a: any, b: any) => {
        const nameA = String(a.subject?.name || '');
        const nameB = String(b.subject?.name || '');
        return nameA.localeCompare(nameB);
      });
      studentScoreRowsCache.set(cacheKey, { data: filtered, ts: Date.now() });
      return filtered;
    })
    .finally(() => {
      studentScoreRowsInFlight.delete(cacheKey);
    });

  studentScoreRowsInFlight.set(cacheKey, request);
  return request;
};
const extractTeacherSubjects = (timetable: classesApi.TimetableResponse | null | undefined, linkedTeacherId?: string) => {
  const entries = timetable?.entries || [];
  const teacherSubjectsMap = new Map();

  entries.forEach((entry: any) => {
    const teacherId = entry.teacherId || entry.teacher?.id;
    if (teacherId === linkedTeacherId && entry.subject?.id) {
      teacherSubjectsMap.set(entry.subject.id, entry.subject);
    }
  });

  return Array.from(teacherSubjectsMap.values());
};

export default function ClassGradesScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { classId, className, myRole, linkedTeacherId, linkedStudentId } = route.params || {};
  const { user } = useAuthStore();
  const initialCachedStudents = useMemo(() => (
    classId ? classesApi.getCachedClassStudents(classId) || [] : []
  ), [classId]);
  const initialCachedTimetable = useMemo(() => (
    classId ? classesApi.getCachedClassTimetable(classId) : null
  ), [classId]);
  const initialCachedReport = useMemo(() => (
    classId ? classesApi.getCachedClassGradesReport(classId, { semester: 1 }) : null
  ), [classId]);

  const [loading, setLoading] = useState(() => {
    if (myRole === 'TEACHER') {
      return !(initialCachedStudents.length > 0 || initialCachedTimetable);
    }
    return !initialCachedReport;
  });
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>(initialCachedStudents);
  const [subjects, setSubjects] = useState<any[]>(() => extractTeacherSubjects(initialCachedTimetable, linkedTeacherId));
  const [selectedSubject, setSelectedSubject] = useState<any>(() => {
    const initialSubjects = extractTeacherSubjects(initialCachedTimetable, linkedTeacherId);
    return initialSubjects[0] || null;
  });
  const [classReport, setClassReport] = useState<classesApi.ClassGradesReport | null>(initialCachedReport);
  
  // Default to the current real month name
  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
  const [selectedMonth, setSelectedMonth] = useState(
    MONTHS.includes(currentMonthName) ? currentMonthName : 'November'
  );
  const selectedMonthNumber = useMemo(() => MONTH_TO_NUMBER[selectedMonth] || 1, [selectedMonth]);
  const selectedAcademicYear = useMemo(
    () => resolveAcademicYearForMonth(selectedMonthNumber),
    [selectedMonthNumber]
  );

  const [scores, setScores] = useState<Record<string, string>>({});
  const [existingGrades, setExistingGrades] = useState<any[]>([]);
  const [studentMonthlyGrades, setStudentMonthlyGrades] = useState<any[]>([]);
  const [scoreRowsLoading, setScoreRowsLoading] = useState(false);
  const [studentScoreRowsLoading, setStudentScoreRowsLoading] = useState(false);
  const [sheetStatusLoading, setSheetStatusLoading] = useState(false);
  const [monthlySheetMeta, setMonthlySheetMeta] = useState<{
    status: string;
    writableByTeacher: boolean;
  } | null>(null);
  const [sheetBusy, setSheetBusy] = useState(false);
  const teacherScoreRequestRef = useRef(0);
  const studentScoreRequestRef = useRef(0);
  const sheetStatusRequestRef = useRef(0);
  const visibleTeacherSubjectRef = useRef<string | null>(null);

  const isTeacher = myRole === 'TEACHER';
  const effectiveStudentId = linkedStudentId || (myRole === 'STUDENT' ? user?.student?.id : undefined);
  const reportStudents = classReport?.students || [];
  const reportStats = classReport?.statistics;
  const isGradePortalAdmin = useMemo(() => GRADE_ADMIN_MOBILE_ROLES.has(String(user?.role || '')), [user?.role]);
  const scoreEditingEnabled = useMemo(() => {
    if (!isTeacher) {
      return false;
    }

    if (!monthlySheetMeta) {
      return true;
    }

    return monthlySheetMeta.writableByTeacher === true;
  }, [isTeacher, monthlySheetMeta]);
  const scoreDataLoading = isTeacher ? scoreRowsLoading : studentScoreRowsLoading;

  const sheetStatusLabelKey = useMemo(() => {
    const raw = monthlySheetMeta?.status ? monthlySheetMeta.status.toLowerCase() : 'draft';
    const slug =
      raw === 'draft' || raw === 'submitted' || raw === 'locked' ? raw : 'unknown';
    return `classScreens.grades.sheet.status.${slug}`;
  }, [monthlySheetMeta?.status]);

  const loadInitialData = useCallback(async (force = false) => {
    try {
      if (!force && isTeacher && (initialCachedStudents.length > 0 || initialCachedTimetable)) {
        setStudents(initialCachedStudents);
        const initialSubjects = extractTeacherSubjects(initialCachedTimetable, linkedTeacherId);
        setSubjects(initialSubjects);
        setSelectedSubject((prev: any) => prev || initialSubjects[0] || null);
        setLoading(false);
      }

      if (!force && !isTeacher && initialCachedReport) {
        setClassReport(initialCachedReport);
        setLoading(false);
      } else if (!initialCachedReport && !(isTeacher && (initialCachedStudents.length > 0 || initialCachedTimetable))) {
        setLoading(true);
      }

      if (isTeacher) {
        const [studentsData, timetableData] = await Promise.all([
          classesApi.getClassStudents(classId, force),
          classesApi.getClassTimetable(classId, force),
        ]);

        setStudents(studentsData || []);
        const teacherSubjects = extractTeacherSubjects(timetableData, linkedTeacherId);
        setSubjects(teacherSubjects);
        setSelectedSubject((prev: any) => {
          if (prev && teacherSubjects.some((subject: any) => subject.id === prev.id)) {
            return prev;
          }
          return teacherSubjects[0] || null;
        });
      } else {
        const report = await classesApi.getClassGradesReport(classId, { semester: 1 }, force);
        setClassReport(report || null);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('classScreens.grades.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [classId, initialCachedReport, initialCachedStudents, initialCachedTimetable, isTeacher, linkedTeacherId]);

  const loadGrades = useCallback(async (force = false) => {
    if (!isTeacher) return;
    if (!selectedSubject) {
      setExistingGrades([]);
      setScores({});
      setScoreRowsLoading(false);
      return;
    }

    const requestId = teacherScoreRequestRef.current + 1;
    teacherScoreRequestRef.current = requestId;

    try {
      const cachedGrades = !force
        ? getCachedGradeRows(classId, selectedMonth, selectedSubject.id, selectedAcademicYear, selectedMonthNumber)
        : null;
      if (cachedGrades) {
        setExistingGrades(cachedGrades);
        setScores(buildScoreMap(cachedGrades));
        visibleTeacherSubjectRef.current = selectedSubject.id;
      } else if (visibleTeacherSubjectRef.current !== selectedSubject.id) {
        setExistingGrades([]);
        setScores({});
      }
      setScoreRowsLoading(true);

      const grades = await fetchTeacherGradeRows(
        classId,
        selectedMonth,
        selectedSubject.id,
        selectedAcademicYear,
        selectedMonthNumber,
        force,
      );

      if (teacherScoreRequestRef.current !== requestId) {
        return;
      }
      setExistingGrades(grades);
      setScores(buildScoreMap(grades));
      visibleTeacherSubjectRef.current = selectedSubject.id;
    } catch (error: any) {
      console.error('Failed to load grades:', error);
    } finally {
      if (teacherScoreRequestRef.current === requestId) {
        setScoreRowsLoading(false);
      }
    }
  }, [classId, isTeacher, selectedAcademicYear, selectedMonth, selectedMonthNumber, selectedSubject]);

  const loadStudentGrades = useCallback(async (force = false) => {
    if (isTeacher) return;
    if (!effectiveStudentId) {
      setStudentMonthlyGrades([]);
      setStudentScoreRowsLoading(false);
      return;
    }

    const requestId = studentScoreRequestRef.current + 1;
    studentScoreRequestRef.current = requestId;

    try {
      const cachedRows = !force
        ? getCachedStudentScoreRows(classId, effectiveStudentId, selectedMonth, selectedAcademicYear, selectedMonthNumber)
        : null;
      if (cachedRows) {
        setStudentMonthlyGrades(cachedRows);
      }
      setStudentScoreRowsLoading(true);

      const filtered = await fetchStudentScoreRows(
        classId,
        effectiveStudentId,
        selectedMonth,
        selectedAcademicYear,
        selectedMonthNumber,
        force,
      );

      if (studentScoreRequestRef.current !== requestId) {
        return;
      }
      setStudentMonthlyGrades(filtered);
    } catch (error) {
    } finally {
      if (studentScoreRequestRef.current === requestId) {
        setStudentScoreRowsLoading(false);
      }
    }
  }, [
    classId,
    effectiveStudentId,
    isTeacher,
    selectedAcademicYear,
    selectedMonth,
    selectedMonthNumber,
  ]);

  const loadMonthlySheetStatus = useCallback(async () => {
    if (!isTeacher || !selectedSubject || !classId) {
      setMonthlySheetMeta(null);
      setSheetStatusLoading(false);
      return;
    }

    const requestId = sheetStatusRequestRef.current + 1;
    sheetStatusRequestRef.current = requestId;

    try {
      setSheetStatusLoading(true);
      const response = await gradeApi.get(`/grades/monthly-sheet/status`, {
        params: {
          classId,
          subjectId: selectedSubject.id,
          month: selectedMonth,
          monthNumber: selectedMonthNumber,
          year: selectedAcademicYear,
        },
      });
      const data = response?.data || {};
      if (sheetStatusRequestRef.current !== requestId) {
        return;
      }
      setMonthlySheetMeta({
        status: String(data.status ?? 'DRAFT'),
        writableByTeacher: data.writableByTeacher !== false,
      });
    } catch {
      if (sheetStatusRequestRef.current === requestId) {
        setMonthlySheetMeta(null);
      }
    } finally {
      if (sheetStatusRequestRef.current === requestId) {
        setSheetStatusLoading(false);
      }
    }
  }, [classId, isTeacher, selectedAcademicYear, selectedMonth, selectedMonthNumber, selectedSubject]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    loadStudentGrades();
  }, [loadStudentGrades]);

  useEffect(() => {
    loadMonthlySheetStatus();
  }, [loadMonthlySheetStatus]);

  const handleSubmitMonthlyGradeSheet = useCallback(() => {
    if (!selectedSubject) return;
    Alert.alert(
      t('classScreens.grades.sheet.submitTitle'),
      t('classScreens.grades.sheet.submitMessage'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
        {
          text: t('classScreens.grades.sheet.submitAction'),
          onPress: () => {
            void (async () => {
              try {
                setSheetBusy(true);
                await gradeApi.post('/grades/monthly-sheet/submit', {
                  classId,
                  subjectId: selectedSubject.id,
                  month: selectedMonth,
                  monthNumber: selectedMonthNumber,
                  year: selectedAcademicYear,
                });
                await loadMonthlySheetStatus();
                Alert.alert(t('common.success'), t('classScreens.grades.sheet.submitSuccess'));
              } catch (error: any) {
                const payload = error?.response?.data;
                Alert.alert(
                  t('classScreens.grades.sheet.submitFailed'),
                  payload?.message || error.message || t('common.error'),
                );
              } finally {
                setSheetBusy(false);
              }
            })();
          },
        },
      ],
    );
  }, [
    classId,
    loadMonthlySheetStatus,
    selectedAcademicYear,
    selectedMonth,
    selectedMonthNumber,
    selectedSubject,
    t,
  ]);

  const handleLockMonthlyGradeSheet = useCallback(() => {
    if (!selectedSubject) return;
    Alert.alert(t('classScreens.grades.sheet.lockTitle'), t('classScreens.grades.sheet.lockMessage'), [
      { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
      {
        text: t('classScreens.grades.sheet.lockAction'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setSheetBusy(true);
              await gradeApi.post('/grades/monthly-sheet/lock', {
                classId,
                subjectId: selectedSubject.id,
                month: selectedMonth,
                monthNumber: selectedMonthNumber,
                year: selectedAcademicYear,
              });
              await loadMonthlySheetStatus();
              Alert.alert(t('common.success'), t('classScreens.grades.sheet.lockSuccess'));
            } catch (error: any) {
              const payload = error?.response?.data;
              Alert.alert(t('common.error'), payload?.message || error.message || t('common.error'));
            } finally {
              setSheetBusy(false);
            }
          })();
        },
      },
    ]);
  }, [
    classId,
    loadMonthlySheetStatus,
    selectedAcademicYear,
    selectedMonth,
    selectedMonthNumber,
    selectedSubject,
    t,
  ]);

  const handleReopenMonthlyGradeSheet = useCallback(() => {
    if (!selectedSubject) return;
    Alert.alert(t('classScreens.grades.sheet.reopenTitle'), t('classScreens.grades.sheet.reopenMessage'), [
      { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
      {
        text: t('classScreens.grades.sheet.reopenAction'),
        onPress: () => {
          void (async () => {
            try {
              setSheetBusy(true);
              await gradeApi.post('/grades/monthly-sheet/reopen', {
                classId,
                subjectId: selectedSubject.id,
                month: selectedMonth,
                monthNumber: selectedMonthNumber,
                year: selectedAcademicYear,
              });
              await loadMonthlySheetStatus();
              Alert.alert(t('common.success'), t('classScreens.grades.sheet.reopenSuccess'));
            } catch (error: any) {
              const payload = error?.response?.data;
              Alert.alert(t('common.error'), payload?.message || error.message || t('common.error'));
            } finally {
              setSheetBusy(false);
            }
          })();
        },
      },
    ]);
  }, [
    classId,
    loadMonthlySheetStatus,
    selectedAcademicYear,
    selectedMonth,
    selectedMonthNumber,
    selectedSubject,
    t,
  ]);

  const handleScoreChange = (studentId: string, value: string) => {
    if (!scoreEditingEnabled) {
      return;
    }

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
        return {
          studentId,
          subjectId: selectedSubject.id,
          classId,
          score: Number(score),
          maxScore: maxScore,
          month: selectedMonth,
          monthNumber: selectedMonthNumber,
          year: selectedAcademicYear,
        };
      });

    if (payload.length === 0) {
      Alert.alert(t('common.info'), t('classScreens.grades.applyOneScore'));
      return false;
    }

    try {
      setSaving(true);
      await gradeApi.post('/grades/batch', { grades: payload });
      classesApi.invalidateClassGradeCaches(classId);
      Alert.alert(t('common.success'), t('classScreens.grades.updated'));
      await loadGrades(true);
      await loadMonthlySheetStatus();
      return true;
    } catch (error: any) {
      const payloadMessage = error?.response?.data?.message;
      const statusCode = error?.response?.status;
      const message =
        payloadMessage ||
        error.message ||
        (statusCode === 423 ? t('classScreens.grades.sheet.lockedSheetSave') : t('classScreens.grades.saveFailed'));
      Alert.alert(t('common.error'), message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    classId,
    loadGrades,
    loadMonthlySheetStatus,
    scores,
    selectedAcademicYear,
    selectedMonth,
    selectedMonthNumber,
    selectedSubject,
    t,
  ]);

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
        t('classScreens.grades.unsavedTitle'),
        t('classScreens.grades.unsavedMessage'),
        [
          { text: t('classScreens.grades.keepEditing'), style: 'cancel', onPress: () => {} },
          {
            text: t('classScreens.grades.discard'),
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: t('classScreens.grades.saveScores'),
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
            {item.englishFirstName || item.englishLastName ? (
              <Text style={styles.englishName} numberOfLines={1}>
                {[item.englishLastName, item.englishFirstName].filter(Boolean).join(' ')}
              </Text>
            ) : null}
            <Text style={styles.studentId}>{t('classScreens.grades.idValue', { id: item.studentId || t('classScreens.grades.na') })}</Text>
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
              editable={isTeacher && scoreEditingEnabled && !saving && !scoreRowsLoading}
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

  const renderStudentSubjectScore = ({ item }: { item: any }) => {
    const maxScore = Number(item.maxScore || item.subject?.maxScore || 100);
    const score = Number(item.score || 0);
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const statusColor = percentage >= 50 ? COLORS.success : COLORS.danger;

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <View style={[styles.avatar, { backgroundColor: COLORS.primaryDark + '18' }]}>
            <Ionicons name="book-outline" size={18} color={COLORS.primaryDark} />
          </View>
          <View style={styles.studentNameContainer}>
            <Text style={styles.studentName} numberOfLines={1}>
              {item.subject?.name || t('classScreens.grades.subject')}
            </Text>
            <Text style={styles.studentId}>
              {item.subject?.code || t('classScreens.grades.na')}
            </Text>
          </View>
        </View>

        <View style={styles.readOnlyScoreWrap}>
          <Text style={styles.averageText}>{score.toFixed(1)}</Text>
          <Text style={styles.gradeLevelText}>/ {maxScore}</Text>
          <Text style={[styles.gradeLevelText, { color: statusColor, fontWeight: '800' }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
    );
  };

  const renderListHeader = () => {
    if (loading) return null;

    return (
      <View>
        {isTeacher ? (
          <View style={styles.filterSection}>
            <View style={styles.scoreHero}>
              <LinearGradient
                colors={['#0F172A', '#0E7490']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.scoreHeroGlow} />
              <View style={styles.scoreHeroIcon}>
                <Ionicons name="bar-chart" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.scoreHeroCopy}>
                <Text style={styles.scoreHeroLabel}>{className || t('classScreens.grades.classScores')}</Text>
                <Text style={styles.scoreHeroTitle}>{selectedSubject?.name || t('classScreens.grades.selectSubject')}</Text>
                <View style={styles.scoreHeroMetaRow}>
                  <Text style={styles.scoreHeroMeta}>{t('classScreens.grades.maxPts', { max: selectedSubject?.maxScore || 100 })}</Text>
                  {scoreRowsLoading ? (
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.78)" />
                  ) : null}
                </View>
              </View>
            </View>
            
            <Text style={styles.sectionLabel}>{t('classScreens.grades.selectSubject')}</Text>
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
                <Text style={styles.noSubjectsText}>{t('classScreens.grades.noSubjects')}</Text>
              )}
            </ScrollView>

            <View style={[styles.sectionLabelRow, { marginTop: 8 }]}>
              <Text style={styles.sectionLabelInline}>{t('classScreens.grades.academicMonth')}</Text>
              {scoreRowsLoading ? (
                <View style={styles.inlineLoadingBadge}>
                  <ActivityIndicator size="small" color={COLORS.primaryDark} />
                </View>
              ) : null}
            </View>
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

            {selectedSubject ? (
              <View style={styles.sheetPanel}>
                <View style={styles.sheetStatusRow}>
                  <Ionicons name="layers-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.sheetStatusText}>
                    {`${t('classScreens.grades.sheet.currentStatus')} `}
                    <Text style={styles.sheetStatusValue}>{t(sheetStatusLabelKey)}</Text>
                  </Text>
                  {sheetStatusLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primaryDark} />
                  ) : null}
                </View>

                {!scoreEditingEnabled ? (
                  <Text style={styles.sheetHint}>{t('classScreens.grades.sheet.readOnlyHint')}</Text>
                ) : null}

                <View style={styles.sheetActionRow}>
                  {!isGradePortalAdmin && monthlySheetMeta?.status?.toUpperCase() === 'DRAFT' ? (
                    <TouchableOpacity
                      style={[styles.sheetGhostBtn, sheetBusy && styles.sheetGhostBtnDisabled]}
                      onPress={handleSubmitMonthlyGradeSheet}
                      disabled={sheetBusy}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="checkmark-done-outline" size={16} color={COLORS.primaryDark} />
                      <Text style={styles.sheetGhostBtnText}>{t('classScreens.grades.sheet.submitAction')}</Text>
                    </TouchableOpacity>
                  ) : null}

                  {isGradePortalAdmin ? (
                    <>
                      <TouchableOpacity
                        style={[styles.sheetDangerBtn, sheetBusy && styles.sheetGhostBtnDisabled]}
                        onPress={handleLockMonthlyGradeSheet}
                        disabled={sheetBusy}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="lock-closed-outline" size={15} color="#FFF" />
                        <Text style={styles.sheetDangerBtnText}>{t('classScreens.grades.sheet.lockAction')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sheetGhostBtn, sheetBusy && styles.sheetGhostBtnDisabled]}
                        onPress={handleReopenMonthlyGradeSheet}
                        disabled={sheetBusy}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="lock-open-outline" size={16} color={COLORS.primaryDark} />
                        <Text style={styles.sheetGhostBtnText}>{t('classScreens.grades.sheet.reopenAction')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {sheetBusy ? (
                    <ActivityIndicator
                      style={{ marginLeft: 'auto' }}
                      size="small"
                      color={COLORS.primaryDark}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.filterSection}>
            <View style={[styles.sectionLabelRow, { marginTop: 8 }]}>
              <Text style={styles.sectionLabelInline}>{t('classScreens.grades.academicMonth')}</Text>
              {studentScoreRowsLoading ? (
                <View style={styles.inlineLoadingBadge}>
                  <ActivityIndicator size="small" color={COLORS.primaryDark} />
                </View>
              ) : null}
            </View>
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
            
            <View style={styles.readOnlySummaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('classScreens.report.average')}</Text>
                <Text style={styles.summaryValue}>
                  {studentMonthlyGrades.length > 0
                    ? (
                      studentMonthlyGrades.reduce((sum, row) => sum + Number(row.score || 0), 0) /
                      studentMonthlyGrades.length
                    ).toFixed(1)
                    : Number(reportStats?.classAverage || 0).toFixed(1)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('classScreens.grades.passRate')}</Text>
                <Text style={styles.summaryValue}>
                  {studentMonthlyGrades.length > 0
                    ? `${Math.round(
                      (studentMonthlyGrades.filter((row) => {
                        const max = Number(row.maxScore || row.subject?.maxScore || 100);
                        return max > 0 && (Number(row.score || 0) / max) * 100 >= 50;
                      }).length /
                        studentMonthlyGrades.length) * 100
                    )}%`
                    : `${Math.round(Number(reportStats?.passRate || 0))}%`}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('classScreens.grades.subjects')}</Text>
                <Text style={styles.summaryValue}>{studentMonthlyGrades.length || reportStudents.length}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>
            {isTeacher 
              ? t('classScreens.grades.studentListCount', { count: students.length })
              : t('classScreens.grades.performanceOverview')}
          </Text>
          <View style={styles.listHeaderStatus}>
            {scoreDataLoading ? (
              <ActivityIndicator size="small" color={COLORS.primaryDark} />
            ) : null}
            <Text style={styles.listHeaderSubtitle}>
              {isTeacher 
                ? t('classScreens.grades.maxPts', { max: selectedSubject?.maxScore || 100 })
                : selectedMonth}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.bgOrbPrimary} />
      <View style={styles.bgOrbSecondary} />
      <StatusBar barStyle="dark-content" />
      
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isTeacher ? t('classScreens.grades.scoreImport') : (className ? t('classScreens.grades.classScoresWithName', { className }) : t('classScreens.grades.classScores'))}</Text>
          {isTeacher ? (
            <TouchableOpacity 
              onPress={handleSave} 
              disabled={saving || scoreRowsLoading || !selectedSubject || !scoreEditingEnabled}
              style={[styles.saveBtn, (saving || scoreRowsLoading || !selectedSubject || !scoreEditingEnabled) && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>{t('classScreens.grades.loading')}</Text>
        </View>
      ) : isTeacher && subjects.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>{t('classScreens.grades.noSubjects')}</Text>
        </View>
      ) : (
        <View style={[styles.screenBody, scoreDataLoading && styles.screenBodyRefreshing]}>
          <FlatList
            data={isTeacher ? students : studentMonthlyGrades}
            keyExtractor={item => item.id}
            renderItem={isTeacher ? renderStudent : renderStudentSubjectScore}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={
              <View style={styles.center}>
                {scoreDataLoading ? (
                  <ActivityIndicator size="large" color={COLORS.primaryDark} />
                ) : (
                  <Ionicons name={isTeacher ? "people-outline" : "bar-chart-outline"} size={48} color={COLORS.border} />
                )}
                <Text style={styles.emptyText}>
                  {scoreDataLoading 
                    ? t('classScreens.grades.loading') 
                    : (isTeacher ? t('classScreens.grades.emptyStudents') : t('classScreens.grades.emptyReport'))}
                </Text>
              </View>
            }
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bgOrbPrimary: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#DFF7FF',
    opacity: 0.78,
    top: 118,
    right: -120,
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#EDE9FE',
    opacity: 0.7,
    top: 460,
    left: -100,
  },
  header: { 
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(226,232,240,0.85)',
    paddingBottom: 4,
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  saveBtn: { 
    backgroundColor: COLORS.primaryDark, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 999,
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
  scoreHero: {
    minHeight: 128,
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 18,
    padding: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0E7490',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 8,
  },
  scoreHeroGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    opacity: 0.1,
    right: -50,
    top: -70,
  },
  scoreHeroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    marginRight: 14,
  },
  scoreHeroCopy: {
    flex: 1,
  },
  scoreHeroLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  scoreHeroTitle: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  scoreHeroMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '700',
  },
  scoreHeroMetaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: COLORS.textSecondary, 
    paddingHorizontal: 16, 
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabelRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabelInline: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inlineLoadingBadge: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F7FE',
    borderWidth: 1,
    borderColor: 'rgba(6,168,204,0.18)',
  },
  filterScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  noSubjectsText: { color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic', alignSelf: 'center' },
  chip: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthChipActive: { 
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  monthChipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  monthChipTextActive: { color: '#FFF', fontWeight: '700' },
  sheetPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    gap: 10,
  },
  sheetStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetStatusText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  sheetStatusValue: { color: COLORS.textPrimary, fontWeight: '800' },
  sheetHint: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', lineHeight: 17 },
  sheetActionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  sheetGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: 'rgba(6,168,204,0.35)',
  },
  sheetGhostBtnDisabled: { opacity: 0.55 },
  sheetGhostBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark },
  sheetDangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#B91C1C',
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  sheetDangerBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  readOnlySummaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  screenBody: { flex: 1 },
  screenBodyRefreshing: { opacity: 0.92 },
  listHeaderTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  listHeaderSubtitle: { fontSize: 13, fontWeight: '600', color: COLORS.primaryDark },
  listHeaderStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  list: { paddingTop: 4, gap: 12, paddingBottom: 40 },
  studentCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: COLORS.surface,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.055,
    shadowRadius: 16,
    elevation: 3,
  },
  studentCardHighlight: {
    borderColor: COLORS.primaryDark,
    backgroundColor: '#F0F9FF',
  },
  studentRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentRankText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  
  studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { 
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  studentNameContainer: { flex: 1, paddingRight: 8 },
  studentName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 1 },
  englishName: { fontSize: 11, fontWeight: '600', color: COLORS.primaryDark, textTransform: 'uppercase', marginBottom: 2 },
  studentId: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  
  scoreSection: { flexDirection: 'row', alignItems: 'center' },
  scoreInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    height: 48,
    width: 70,
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
  maxScore: { fontSize: 13, color: COLORS.textMuted, marginLeft: 8, fontWeight: '700', width: 40 },
  readOnlyScoreWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  rankPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primaryDark + '14',
  },
  rankPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  averageText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  gradeLevelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '600' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 16, fontSize: 15, fontWeight: '500' },
});
