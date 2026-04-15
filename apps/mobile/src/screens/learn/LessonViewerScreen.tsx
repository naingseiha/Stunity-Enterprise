import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { learnApi } from '@/api';
import type { LearnCourseDetail, LearnLessonDetail } from '@/api/learn';
import { LearnStackParamList, LearnStackScreenProps } from '@/navigation/types';

type RouteParams = RouteProp<LearnStackParamList, 'LessonViewer'>;
type NavigationProp = LearnStackScreenProps<'LessonViewer'>['navigation'];

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const stripHtml = (input: string) => input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// ─── Mobile Quiz Widget ───────────────────────────────────────────────────────
function MobileQuizWidget({ 
  quiz, 
  lessonTitle,
  onPass
}: { 
  quiz: any; 
  lessonTitle: string;
  onPass: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <View style={{ backgroundColor: '#F0F9FF', padding: 20, borderRadius: 16, marginVertical: 12, alignItems: 'center' }}>
        <Ionicons name="help-circle" size={36} color="#0284C7" />
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 8 }}>Quiz Coming Soon</Text>
        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>The instructor is still building this quiz.</Text>
      </View>
    );
  }

  if (!started) {
    return (
      <View style={{ backgroundColor: '#EFF6FF', borderRadius: 20, padding: 24, marginVertical: 12, borderWidth: 1.5, borderColor: '#BFDBFE', alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Ionicons name="help-circle-outline" size={34} color="#fff" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E3A8A', marginBottom: 8, textAlign: 'center' }}>{lessonTitle}</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#2563EB' }}>{quiz.questions.length}</Text>
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Questions</Text>
          </View>
          <View style={{ width: 1, backgroundColor: '#BFDBFE' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#10B981' }}>{quiz.passingScore}%</Text>
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>To Pass</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setStarted(true)}
          style={{ backgroundColor: '#2563EB', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 16 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Start Quiz →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished) {
    const passed = score >= quiz.passingScore;
    const correct = Math.round((score / 100) * quiz.questions.length);
    return (
      <View style={{ backgroundColor: passed ? '#F0FDF4' : '#FEF2F2', borderRadius: 20, padding: 24, marginVertical: 12, borderWidth: 1.5, borderColor: passed ? '#BBF7D0' : '#FECACA', alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: passed ? '#22C55E' : '#EF4444', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Ionicons name={passed ? 'trophy' : 'refresh'} size={36} color="#fff" />
        </View>
        <Text style={{ fontSize: 40, fontWeight: '900', color: passed ? '#15803D' : '#DC2626' }}>{score}%</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 4 }}>{passed ? 'You Passed!' : `Need ${quiz.passingScore}% to pass`}</Text>
        <View style={{ flexDirection: 'row', gap: 20, marginVertical: 16 }}>
          {[{ label: 'Correct', val: correct, color: '#16A34A' }, { label: 'Incorrect', val: quiz.questions.length - correct, color: '#DC2626' }].map(({ label, val, color }) => (
            <View key={label} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color }}>{val}</Text>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => { setStarted(false); setCurrentIdx(0); setAnswers({}); setRevealed({}); setFinished(false); setScore(0); }}
          style={{ backgroundColor: '#1E293B', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Retake Quiz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const question = quiz.questions[currentIdx];
  const isRevealed = revealed[question.id ?? currentIdx];
  const selectedId = answers[question.id ?? currentIdx];
  const qKey = question.id ?? currentIdx;

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', marginVertical: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }}>
      {/* Progress */}
      <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Question {currentIdx + 1} of {quiz.questions.length}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>{Math.round((currentIdx / quiz.questions.length) * 100)}% done</Text>
        </View>
        <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 4 }}>
          <View style={{ height: 4, backgroundColor: '#2563EB', borderRadius: 4, width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` as any }} />
        </View>
      </View>

      {/* Question */}
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', lineHeight: 24, marginBottom: 20 }}>{question.question}</Text>

        {/* Options */}
        <View style={{ gap: 10 }}>
          {question.options?.map((opt: any, oIdx: number) => {
            const isSelected = selectedId === (opt.id ?? oIdx);
            const optKey = opt.id ?? oIdx;
            let bg = '#F8FAFC';
            let border = '#E2E8F0';
            let textColor = '#374151';
            if (isRevealed) {
              if (opt.isCorrect) { bg = '#F0FDF4'; border = '#22C55E'; textColor = '#15803D'; }
              else if (isSelected && !opt.isCorrect) { bg = '#FEF2F2'; border = '#EF4444'; textColor = '#DC2626'; }
              else { bg = '#F8FAFC'; border = '#E2E8F0'; textColor = '#9CA3AF'; }
            } else if (isSelected) {
              bg = '#EFF6FF'; border = '#2563EB'; textColor = '#1D4ED8';
            }
            return (
              <TouchableOpacity
                key={optKey}
                onPress={() => {
                  if (isRevealed) return;
                  setAnswers(prev => ({ ...prev, [qKey]: opt.id ?? oIdx }));
                  setTimeout(() => setRevealed(prev => ({ ...prev, [qKey]: true })), 300);
                }}
                activeOpacity={isRevealed ? 1 : 0.8}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: bg, borderWidth: 1.5, borderColor: border, gap: 12 }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isRevealed && opt.isCorrect ? '#22C55E' : isRevealed && isSelected && !opt.isCorrect ? '#EF4444' : isSelected ? '#2563EB' : '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: (isSelected || (isRevealed && opt.isCorrect)) ? '#fff' : '#64748B' }}>
                    {isRevealed && opt.isCorrect ? '✓' : isRevealed && isSelected && !opt.isCorrect ? '✗' : ['A','B','C','D','E'][oIdx]}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: textColor, lineHeight: 20 }}>{opt.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation */}
        {isRevealed && question.explanation && (
          <View style={{ marginTop: 16, backgroundColor: '#EFF6FF', padding: 14, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#2563EB' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8', marginBottom: 4, textTransform: 'uppercase' }}>Explanation</Text>
            <Text style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 20 }}>{question.explanation}</Text>
          </View>
        )}
      </View>

      {/* Navigation */}
      {isRevealed && (
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
          <TouchableOpacity
            onPress={() => {
              if (currentIdx < quiz.questions.length - 1) {
                setCurrentIdx(prev => prev + 1);
              } else {
                // Calculate score
                let correct = 0;
                quiz.questions.forEach((q: any, i: number) => {
                  const key = q.id ?? i;
                  const sel = answers[key];
                  const correctOpt = q.options?.find((o: any) => o.isCorrect);
                  if (sel && correctOpt && sel === (correctOpt.id ?? q.options.indexOf(correctOpt))) correct++;
                });
                // Add current question
                const currCorrectOpt = question.options?.find((o: any) => o.isCorrect);
                if (selectedId && currCorrectOpt && selectedId === (currCorrectOpt.id ?? question.options.indexOf(currCorrectOpt))) correct++;
                setScore(Math.round((correct / quiz.questions.length) * 100));
                setFinished(true);
                
                // Auto-mark complete if passed
                const finalScore = Math.round((correct / quiz.questions.length) * 100);
                if (finalScore >= quiz.passingScore) {
                  onPass();
                }
              }
            }}
            style={{ backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              {currentIdx < quiz.questions.length - 1 ? 'Next Question →' : 'Finish & See Results'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Mobile Assignment Widget ────────────────────────────────────────────────
function MobileAssignmentWidget({ 
  lesson, 
  courseId, 
  onSuccess 
}: { 
  lesson: LearnLessonDetail; 
  courseId: string;
  onSuccess: () => void;
}) {
  const [submissionText, setSubmissionText] = useState(lesson.assignmentSubmission?.submissionText || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const status = lesson.assignmentSubmission?.status || 'NOT_SUBMITTED';
  const assignment = lesson.assignment;

  if (!assignment) return null;

  const handleSubmit = async () => {
    if (!submissionText.trim()) {
      Alert.alert('Empty Submission', 'Please enter your work before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      await learnApi.submitAssignment(courseId, lesson.id, {
        submissionText: submissionText.trim()
      });
      Alert.alert('Success', 'Your assignment has been submitted successfully!');
      onSuccess();
    } catch (error: any) {
      Alert.alert('Submission Error', error?.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitted = status !== 'NOT_SUBMITTED';
  const isGraded = status === 'GRADED';

  return (
    <View style={{ gap: 16, marginVertical: 12 }}>
      {/* Instructions Card */}
      <View style={{ backgroundColor: '#EEF2FF', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="document-text" size={20} color="#fff" />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E1B4B' }}>Assignment Task</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6366F1', textTransform: 'uppercase' }}>Weight: {assignment.maxScore} points</Text>
          </View>
        </View>
        <Text style={{ fontSize: 14, color: '#3730A3', lineHeight: 22 }}>{assignment.instructions}</Text>
      </View>

      {/* Submission Card */}
      <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 22, borderWidth: 1.5, borderColor: isSubmitted ? '#E2E8F0' : '#4F46E5', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Your Submission</Text>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isGraded ? '#DCFCE7' : isSubmitted ? '#F1F5F9' : '#EEF2FF' }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: isGraded ? '#166534' : isSubmitted ? '#475569' : '#4F46E5' }}>
              {status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {isGraded && lesson.assignmentSubmission && (
          <View style={{ marginBottom: 20, padding: 16, backgroundColor: '#F0FDF4', borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#166534' }}>Graded: {lesson.assignmentSubmission.score}/{assignment.maxScore}</Text>
            </View>
            {lesson.assignmentSubmission.feedback && (
              <Text style={{ fontSize: 13, color: '#15803D', fontStyle: 'italic', marginTop: 4 }}>"{lesson.assignmentSubmission.feedback}"</Text>
            )}
          </View>
        )}

        {isSubmitted && !isGraded ? (
          <View style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
             <Text style={{ fontSize: 14, color: '#334155', lineHeight: 22 }}>{lesson.assignmentSubmission?.submissionText}</Text>
             <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, textAlign: 'center', fontWeight: '600' }}>Waiting for instructor to review...</Text>
          </View>
        ) : !isGraded ? (
          <>
            <TextInput
              multiline
              placeholder="Describe your work or paste links to shared documents (Google Drive, Github, etc.)..."
              value={submissionText}
              onChangeText={setSubmissionText}
              style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 14, color: '#1E293B', minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={{ backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Submit Assignment</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
           <View style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
             <Text style={{ fontSize: 14, color: '#334155', lineHeight: 22 }}>{lesson.assignmentSubmission?.submissionText}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function LessonViewerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { courseId, lessonId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [course, setCourse] = useState<LearnCourseDetail | null>(null);
  const [lesson, setLesson] = useState<LearnLessonDetail | null>(null);

  const loadLessonData = useCallback(async () => {
    try {
      const [lessonData, courseData] = await Promise.all([
        learnApi.getLessonDetail(courseId, lessonId),
        learnApi.getCourseDetail(courseId),
      ]);

      setLesson(lessonData);
      setCourse(courseData);
    } catch (error: any) {
      Alert.alert('Lesson', error?.message || 'Unable to load this lesson');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, lessonId, navigation]);

  useEffect(() => {
    loadLessonData();
  }, [loadLessonData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLessonData();
  }, [loadLessonData]);

  const flattenedLessons = useMemo(() => {
    if (!course) return [];
    if (course.sections && course.sections.length > 0) {
      return course.sections.flatMap(section => section.lessons);
    }
    return course.lessons || [];
  }, [course]);

  const currentLessonIndex = useMemo(() => {
    return flattenedLessons.findIndex(item => item.id === lessonId);
  }, [flattenedLessons, lessonId]);

  const previousLesson = useMemo(() => {
    if (currentLessonIndex <= 0) return null;
    const candidate = flattenedLessons[currentLessonIndex - 1];
    return candidate.isLocked ? null : candidate;
  }, [flattenedLessons, currentLessonIndex]);

  const nextLesson = useMemo(() => {
    if (currentLessonIndex < 0 || currentLessonIndex >= flattenedLessons.length - 1) return null;
    const candidate = flattenedLessons[currentLessonIndex + 1];
    return candidate.isLocked ? null : candidate;
  }, [flattenedLessons, currentLessonIndex]);

  const completedLessonsCount = useMemo(
    () => flattenedLessons.filter(item => item.isCompleted).length || 0,
    [flattenedLessons]
  );

  const courseProgressPercentage = useMemo(() => {
    if (!flattenedLessons.length) return 0;
    return Math.round((completedLessonsCount / flattenedLessons.length) * 100);
  }, [completedLessonsCount, flattenedLessons.length]);

  const openLesson = useCallback((targetLessonId: string) => {
    navigation.replace('LessonViewer', { courseId, lessonId: targetLessonId });
  }, [courseId, navigation]);

  const handleMarkComplete = useCallback(async () => {
    if (!lesson || lesson.isCompleted) return;

    try {
      setCompleting(true);
      const res = await learnApi.updateLessonProgress(courseId, lessonId, {
        completed: true,
        watchTime: Math.max(lesson.watchTime, lesson.duration * 60),
      });
      await loadLessonData();

      if (res?.certificateIssued) {
        (navigation as any).navigate('Certificate', { courseId });
      }
    } catch (error: any) {
      Alert.alert('Progress', error?.message || 'Unable to update lesson progress');
    } finally {
      setCompleting(false);
    }
  }, [courseId, lesson, lessonId, loadLessonData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#1A73E8" />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={36} color="#9CA3AF" />
        <Text style={styles.loadingText}>Lesson is not available.</Text>
      </SafeAreaView>
    );
  }

  const contentText = lesson.content ? stripHtml(lesson.content) : (lesson.description || 'No lesson content available.');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course?.title || 'Lesson'}
          </Text>
          <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color="#334155" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />}
      >
        <View style={styles.lessonCard}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <View style={styles.lessonMetaRow}>
            <View style={styles.lessonMetaItem}>
              <Ionicons name="time-outline" size={13} color="#6B7280" />
              <Text style={styles.lessonMetaText}>{formatDuration(lesson.duration)}</Text>
            </View>
            <View style={styles.lessonMetaItem}>
              <Ionicons name={lesson.isCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={lesson.isCompleted ? '#10B981' : '#6B7280'} />
              <Text style={styles.lessonMetaText}>{lesson.isCompleted ? 'Completed' : 'In progress'}</Text>
            </View>
          </View>
          
          {lesson.type === 'QUIZ' && (() => {
            const quiz = (lesson as any).quiz;
            // Inline Mobile Quiz Engine
            return (
              <MobileQuizWidget 
                quiz={quiz} 
                lessonTitle={lesson.title} 
                onPass={handleMarkComplete} 
              />
            );
          })()}

          {lesson.type === 'ASSIGNMENT' && (
            <MobileAssignmentWidget 
              lesson={lesson} 
              courseId={courseId} 
              onSuccess={loadLessonData} 
            />
          )}

          {lesson.type === 'EXERCISE' && (
            <View style={{ backgroundColor: '#ECFDF5', padding: 16, borderRadius: 12, marginVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="code-slash" size={24} color="#059669" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Coding Exercise</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>Open this lesson on Web to access the built-in IDE playground.</Text>
              <View style={{ backgroundColor: '#D1FAE5', padding: 8, borderRadius: 8 }}>
                <Text style={{ color: '#065F46', textAlign: 'center', fontWeight: '600', fontSize: 12 }}>Desktop viewing recommended</Text>
              </View>
            </View>
          )}

          {lesson.type === 'IMAGE' && (
            <View style={{ marginVertical: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
               <Image source={{ uri: lesson.content || '' }} style={{ width: '100%', aspectRatio: 16/9 }} resizeMode="contain" />
               <View style={{ padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                 <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{lesson.title}</Text>
                 <TouchableOpacity style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => Linking.openURL(lesson.content || '')}>
                   <Ionicons name="download-outline" size={14} color="#1A73E8" />
                   <Text style={{ fontSize: 12, color: '#1A73E8', fontWeight: '600' }}>Full resolution</Text>
                 </TouchableOpacity>
               </View>
            </View>
          )}

          {lesson.type === 'FILE' && (
            <View style={{ backgroundColor: '#F5F3FF', padding: 20, borderRadius: 16, marginVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DDD6FE' }}>
              <View style={{ width: 56, height: 56, backgroundColor: '#fff', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <Ionicons name="document" size={28} color="#7C3AED" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4, textAlign: 'center' }}>{lesson.title}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16, textAlign: 'center' }}>Downloadable Resource Attachment</Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={() => Linking.openURL(lesson.content || '')}
              >
                <Ionicons name="cloud-download" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>Download PDF/File</Text>
              </TouchableOpacity>
            </View>
          )}

          {lesson.type === 'ARTICLE' && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#4B5563', textTransform: 'uppercase' }}>Reading Lesson</Text>
              </View>
              <Text style={[styles.lessonContent, { fontSize: 16, lineHeight: 26, color: '#1F2937' }]}>{contentText}</Text>
            </View>
          )}

          {(lesson.type === 'VIDEO' || lesson.type === 'CASE_STUDY' || lesson.type === 'AUDIO') && (
            <Text style={styles.lessonContent}>{contentText}</Text>
          )}

          {lesson.videoUrl && (
            <TouchableOpacity
              style={styles.resourceRow}
              onPress={() => Linking.openURL(lesson.videoUrl!)}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle-outline" size={16} color="#1A73E8" />
              <Text style={styles.resourceText}>Open lesson media</Text>
            </TouchableOpacity>
          )}

          {lesson.resources.length > 0 && (
            <View style={styles.resourcesSection}>
              <Text style={styles.resourcesTitle}>Resources</Text>
              {lesson.resources.map(resource => (
                <TouchableOpacity
                  key={resource.id}
                  style={styles.resourceRow}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(resource.url)}
                >
                  <Ionicons name="document-attach-outline" size={16} color="#1A73E8" />
                  <Text style={styles.resourceText} numberOfLines={1}>{resource.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.qaButtonRow}
            activeOpacity={0.8}
            onPress={() => (navigation as any).navigate('CourseQA', { courseId, lessonId })}
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#F59E0B" />
            <Text style={styles.qaButtonText}>Join Lesson Discussion (Q&A)</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {course ? (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressIconWrap}>
                <Ionicons name="trending-up" size={16} color="#1D4ED8" />
              </View>
              <View style={styles.progressTextWrap}>
                <Text style={styles.progressTitle}>Course Progress</Text>
                <Text style={styles.progressSubtitle}>
                  {completedLessonsCount}/{flattenedLessons.length} lessons completed
                </Text>
              </View>
              <Text style={styles.progressValue}>{courseProgressPercentage}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${courseProgressPercentage}%` }]} />
            </View>
            <Text style={styles.progressHint}>
              Item {Math.max(1, currentLessonIndex + 1)} of {flattenedLessons.length}
            </Text>
          </View>
        ) : null}

        {course ? (
      <View style={styles.playlistCard}>
        <Text style={styles.playlistTitle}>Course Content</Text>
        {course.sections && course.sections.length > 0 ? (
          // Hierarchical Playlist
          course.sections.map((section, sIndex) => (
            <View key={section.id} style={styles.sectionEntry}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>SECTION {sIndex + 1}: {section.title.toUpperCase()}</Text>
              </View>
              {section.lessons.map((courseLesson) => {
                const isActive = courseLesson.id === lessonId;
                const isLocked = courseLesson.isLocked;
                return (
                  <TouchableOpacity
                    key={courseLesson.id}
                    style={[styles.playlistItem, isActive && styles.playlistItemActive, isLocked && styles.playlistItemLocked]}
                    activeOpacity={isLocked ? 1 : 0.8}
                    onPress={() => {
                      if (!isLocked) openLesson(courseLesson.id);
                    }}
                  >
                    <View style={[styles.playlistIndex, isActive && { backgroundColor: '#1A73E8' }, courseLesson.isCompleted && { backgroundColor: '#10B981' }]}>
                      {courseLesson.isCompleted ? (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      ) : isLocked ? (
                        <Ionicons name="lock-closed" size={11} color="#fff" />
                      ) : (
                        <Text style={styles.playlistIndexText}>{courseLesson.order + 1}</Text>
                      )}
                    </View>
                    <View style={styles.playlistBody}>
                      <Text style={[styles.playlistItemTitle, isActive && { color: '#1A73E8' }]} numberOfLines={1}>{courseLesson.title}</Text>
                      <Text style={styles.playlistMetaText}>{formatDuration(courseLesson.duration)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        ) : (
          // Legacy Flat Playlist
          course.lessons.map((courseLesson, index) => (
            <TouchableOpacity
              key={courseLesson.id}
              style={[styles.playlistItem, courseLesson.id === lessonId && styles.playlistItemActive, courseLesson.isLocked && styles.playlistItemLocked]}
              activeOpacity={courseLesson.isLocked ? 1 : 0.8}
              onPress={() => {
                if (!courseLesson.isLocked) {
                  openLesson(courseLesson.id);
                }
              }}
            >
              <View style={styles.playlistIndex}>
                {courseLesson.isCompleted ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : courseLesson.isLocked ? (
                  <Ionicons name="lock-closed" size={11} color="#fff" />
                ) : (
                  <Text style={styles.playlistIndexText}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.playlistBody}>
                <Text style={styles.playlistItemTitle} numberOfLines={1}>{courseLesson.title}</Text>
                <Text style={styles.playlistMetaText}>{formatDuration(courseLesson.duration)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.secondaryButton, !previousLesson && styles.disabledButton]}
          onPress={() => previousLesson && openLesson(previousLesson.id)}
          disabled={!previousLesson}
        >
          <Ionicons name="chevron-back" size={16} color="#fff" />
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, (lesson.isCompleted || completing) && styles.disabledButton]}
          onPress={handleMarkComplete}
          disabled={lesson.isCompleted || completing}
        >
          {completing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>{lesson.isCompleted ? 'Completed' : 'Complete'}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, !nextLesson && styles.disabledButton]}
          onPress={() => nextLesson && openLesson(nextLesson.id)}
          disabled={!nextLesson}
        >
          <Text style={styles.secondaryButtonText}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSafe: {
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    height: 52,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  headerTitle: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FBFF',
    padding: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  progressTextWrap: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressSubtitle: {
    marginTop: 1,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E0E7FF',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  progressHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  lessonTitle: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '800',
  },
  lessonMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonMetaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  lessonContent: {
    marginTop: 10,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  resourcesSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    gap: 8,
  },
  resourcesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  resourceText: {
    flex: 1,
    fontSize: 13,
    color: '#1A73E8',
    fontWeight: '600',
  },
  qaButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  qaButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600'
  },
  playlistCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  sectionEntry: {
    marginBottom: 16,
  },
  sectionHeader: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  playlistItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  playlistItemLocked: {
    opacity: 0.6,
  },
  playlistIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistIndexText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  playlistBody: {
    flex: 1,
  },
  playlistItemTitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  playlistMetaText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1.2,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A73E8',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#64748B',
    flexDirection: 'row',
    gap: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
