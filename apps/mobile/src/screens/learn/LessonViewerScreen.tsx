import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { learnApi } from '@/api';
import type { LearnCourseDetail, LearnLessonDetail } from '@/api/learn';
import { LearnStackParamList, LearnStackScreenProps } from '@/navigation/types';
import i18n from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { Colors, ColorScale, Typography, Spacing, BorderRadius, Shadows } from '@/config';

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

const normalizeResourceLocale = (value: string | null | undefined) => {
  const normalized = String(value || 'en').trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return 'en';
  if (normalized === 'kh' || normalized === 'km-kh' || normalized === 'kh-kh') return 'km';
  if (normalized === 'en-us' || normalized === 'en-gb') return 'en';
  return normalized;
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  km: 'Khmer',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
};

const getLocaleLabel = (locale: string | null | undefined) => {
  const normalized = normalizeResourceLocale(locale);
  const direct = LANGUAGE_LABELS[normalized];
  if (direct) return direct;

  const base = normalized.split('-')[0];
  const fallback = LANGUAGE_LABELS[base];
  if (fallback) {
    return normalized === base ? fallback : `${fallback} (${normalized.toUpperCase()})`;
  }

  return normalized.toUpperCase();
};

const getResourceUrlPath = (url: string) => {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

const getResolvedResourceType = (resource: { type?: string | null; url?: string | null }) => {
  const normalizedType = String(resource.type || '').trim().toUpperCase();
  if (normalizedType) return normalizedType;

  const path = getResourceUrlPath(String(resource.url || ''));
  if (path.endsWith('.pdf')) return 'PDF';
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/.test(path)) return 'IMAGE';
  if (/\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/.test(path)) return 'AUDIO';
  if (/\.(mp4|mov|webm|m3u8)(\?|#|$)/.test(path)) return 'VIDEO';
  return 'FILE';
};

const getResourceTypeLabel = (type: string) => {
  switch (type) {
    case 'PDF':
      return 'PDF';
    case 'AUDIO':
      return 'Audio';
    case 'VIDEO':
      return 'Video';
    case 'LINK':
      return 'Link';
    case 'IMAGE':
      return 'Image';
    case 'DOCUMENT':
      return 'Document';
    case 'FILE':
    default:
      return 'File';
  }
};

const getResourceIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'PDF':
      return 'document-text-outline';
    case 'AUDIO':
      return 'musical-notes-outline';
    case 'VIDEO':
      return 'play-circle-outline';
    case 'LINK':
      return 'link-outline';
    case 'IMAGE':
      return 'image-outline';
    default:
      return 'document-attach-outline';
  }
};

const isInlineImageType = (type: string) => type === 'IMAGE';
const isInlinePdfType = (type: string) => type === 'PDF';
const isInlineTextType = (type: string, url: string) => {
  if (type === 'LINK' || type === 'VIDEO' || type === 'AUDIO') return false;
  const path = getResourceUrlPath(url);
  return /\.(txt|md|markdown|json|csv|tsv|log|xml|html?)(\?|#|$)/.test(path);
};
const isDocumentViewerType = (type: string, url: string) => {
  if (isInlineImageType(type) || isInlineTextType(type, url)) return false;
  return type === 'PDF' || type === 'FILE' || type === 'DOCUMENT';
};

const buildCachedResourceUri = (url: string, fileNameHint: string) => {
  const safeName = fileNameHint.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || `resource-${Date.now()}`;
  return `${FileSystem.cacheDirectory || ''}learn-resources/${safeName}`;
};

const getFileNameFromUrl = (url: string, fallback: string) => {
  try {
    const pathname = new URL(url).pathname;
    const fileName = pathname.split('/').pop();
    return fileName && fileName.trim().length > 0 ? fileName : fallback;
  } catch {
    return fallback;
  }
};

const selectLocalizedTextTrack = <T extends { locale?: string | null; isDefault?: boolean }>(
  tracks: T[],
  requestedLocale: string
) => {
  if (tracks.length === 0) return null;
  const normalizedLocale = normalizeResourceLocale(requestedLocale);
  const localeMatch = tracks.find((track) => normalizeResourceLocale(track.locale) === normalizedLocale);
  if (localeMatch) return localeMatch;
  const defaultTrack = tracks.find((track) => Boolean(track.isDefault));
  if (defaultTrack) return defaultTrack;
  return tracks[0];
};

// ─── Mobile Quiz Widget ───────────────────────────────────────────────────────
function MobileQuizWidget({ 
  quiz, 
  lessonTitle,
  onPass,
  t
}: { 
  quiz: any; 
  lessonTitle: string;
  onPass: () => void;
  t: (key: string, options?: Record<string, any>) => string;
}) {
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <View style={{ backgroundColor: ColorScale.primary[50], padding: Spacing[5], borderRadius: BorderRadius.xl, marginVertical: Spacing[3], alignItems: 'center' }}>
        <Ionicons name="help-circle" size={36} color={ColorScale.primary[600]} />
        <Text style={{ fontSize: Typography.fontSize[15], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[900], marginTop: Spacing.sm }}>{t('learn.lessonViewer.quizComingSoon')}</Text>
        <Text style={{ fontSize: Typography.fontSize[12], color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' }}>{t('learn.lessonViewer.quizBuilding')}</Text>
      </View>
    );
  }

  if (!started) {
    return (
      <View style={{ backgroundColor: ColorScale.primary[50], borderRadius: BorderRadius[20], padding: Spacing.lg, marginVertical: Spacing[3], borderWidth: 1.5, borderColor: ColorScale.primary[200], alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: BorderRadius.full, backgroundColor: ColorScale.primary[600], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md }}>
          <Ionicons name="help-circle-outline" size={34} color={Colors.white} />
        </View>
        <Text style={{ fontSize: Typography.fontSize[18], fontWeight: Typography.fontWeight.extrabold, color: ColorScale.primary[900], marginBottom: Spacing.sm, textAlign: 'center' }}>{lessonTitle}</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing[5] }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: Typography.fontSize[20], fontWeight: Typography.fontWeight.black, color: ColorScale.primary[600] }}>{quiz.questions.length}</Text>
            <Text style={{ fontSize: Typography.fontSize[11], color: Colors.textSecondary, fontWeight: Typography.fontWeight.semibold }}>{t('learn.lessonViewer.questions')}</Text>
          </View>
          <View style={{ width: 1, backgroundColor: ColorScale.primary[200] }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: Typography.fontSize[20], fontWeight: Typography.fontWeight.black, color: Colors.success.main }}>{quiz.passingScore}%</Text>
            <Text style={{ fontSize: Typography.fontSize[11], color: Colors.textSecondary, fontWeight: Typography.fontWeight.semibold }}>{t('learn.lessonViewer.toPass')}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setStarted(true)}
          style={{ backgroundColor: ColorScale.primary[600], paddingHorizontal: Spacing[10], paddingVertical: Spacing.md, borderRadius: BorderRadius.xl }}
          activeOpacity={0.85}
        >
          <Text style={{ color: Colors.white, fontWeight: Typography.fontWeight.extrabold, fontSize: Typography.fontSize[16] }}>{t('learn.lessonViewer.startQuiz')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished) {
    const passed = score >= quiz.passingScore;
    const correct = Math.round((score / 100) * quiz.questions.length);
    return (
      <View style={{ backgroundColor: passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: BorderRadius[20], padding: Spacing.lg, marginVertical: Spacing[3], borderWidth: 1.5, borderColor: passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)', alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: BorderRadius.full, backgroundColor: passed ? Colors.success.main : Colors.error, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[3] }}>
          <Ionicons name={passed ? 'trophy' : 'refresh'} size={36} color={Colors.white} />
        </View>
        <Text style={{ fontSize: Typography.fontSize[36], fontWeight: Typography.fontWeight.black, color: passed ? Colors.success.dark : Colors.error }}>{score}%</Text>
        <Text style={{ fontSize: Typography.fontSize[16], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[800], marginTop: Spacing.xs }}>{passed ? t('learn.lessonViewer.youPassed') : t('learn.lessonViewer.needToPass', { score: quiz.passingScore })}</Text>
        <View style={{ flexDirection: 'row', gap: Spacing[5], marginVertical: Spacing.md }}>
          {[{ label: t('quiz.results.correct'), val: correct, color: Colors.success.dark }, { label: t('quiz.results.incorrect'), val: quiz.questions.length - correct, color: Colors.error }].map(({ label, val, color }) => (
            <View key={label} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: Typography.fontSize[24], fontWeight: Typography.fontWeight.black, color }}>{val}</Text>
              <Text style={{ fontSize: Typography.fontSize[11], color: Colors.textSecondary, fontWeight: Typography.fontWeight.semibold }}>{label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => { setStarted(false); setCurrentIdx(0); setAnswers({}); setRevealed({}); setFinished(false); setScore(0); }}
          style={{ backgroundColor: ColorScale.gray[800], paddingHorizontal: Spacing.xl, paddingVertical: Spacing[3], borderRadius: BorderRadius.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
        >
          <Ionicons name="refresh" size={16} color={Colors.white} />
          <Text style={{ color: Colors.white, fontWeight: Typography.fontWeight.extrabold, fontSize: Typography.fontSize[14] }}>{t('quiz.dashboard.retake')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const question = quiz.questions[currentIdx];
  const isRevealed = revealed[question.id ?? currentIdx];
  const selectedId = answers[question.id ?? currentIdx];
  const qKey = question.id ?? currentIdx;

  return (
    <View style={{ backgroundColor: Colors.white, borderRadius: BorderRadius[20], borderWidth: 1.5, borderColor: ColorScale.gray[200], marginVertical: Spacing[3], overflow: 'hidden', ...Shadows.lg }}>
      {/* Progress */}
      <View style={{ backgroundColor: ColorScale.gray[50], padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: ColorScale.gray[100] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: Typography.fontSize[12], fontWeight: Typography.fontWeight.bold, color: Colors.textSecondary }}>{t('quiz.takeQuiz.questionOf', { current: currentIdx + 1, total: quiz.questions.length })}</Text>
          <Text style={{ fontSize: Typography.fontSize[12], fontWeight: Typography.fontWeight.bold, color: ColorScale.primary[600] }}>{t('learn.lessonViewer.percentDone', { percent: Math.round((currentIdx / quiz.questions.length) * 100) })}</Text>
        </View>
        <View style={{ height: 4, backgroundColor: ColorScale.gray[200], borderRadius: BorderRadius.sm }}>
          <View style={{ height: 4, backgroundColor: ColorScale.primary[600], borderRadius: BorderRadius.sm, width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` as any }} />
        </View>
      </View>

      {/* Question */}
      <View style={{ padding: Spacing[5] }}>
        <Text style={{ fontSize: Typography.fontSize[16], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[900], lineHeight: 24, marginBottom: Spacing[5] }}>{question.question}</Text>

        {/* Options */}
        <View style={{ gap: Spacing[3] }}>
          {question.options?.map((opt: any, oIdx: number) => {
            const isSelected = selectedId === (opt.id ?? oIdx);
            const optKey = opt.id ?? oIdx;
            let bg: string = ColorScale.gray[50];
            let border: string = ColorScale.gray[200];
            let textColor: string = Colors.text;
            if (isRevealed) {
              if (opt.isCorrect) { bg = 'rgba(34,197,94,0.08)'; border = Colors.success.main; textColor = Colors.success.dark; }
              else if (isSelected && !opt.isCorrect) { bg = 'rgba(239,68,68,0.08)'; border = Colors.error; textColor = Colors.error; }
              else { bg = ColorScale.gray[50]; border = ColorScale.gray[200]; textColor = Colors.textTertiary; }
            } else if (isSelected) {
              bg = ColorScale.primary[50]; border = ColorScale.primary[600]; textColor = ColorScale.primary[600];
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
                style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: bg, borderWidth: 1.5, borderColor: border, gap: Spacing[3] }}
              >
                <View style={{ width: 28, height: 28, borderRadius: BorderRadius.full, backgroundColor: isRevealed && opt.isCorrect ? Colors.success.main : isRevealed && isSelected && !opt.isCorrect ? Colors.error : isSelected ? ColorScale.primary[600] : ColorScale.gray[200], alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.black, color: (isSelected || (isRevealed && opt.isCorrect)) ? Colors.white : Colors.textSecondary }}>
                    {isRevealed && opt.isCorrect ? '✓' : isRevealed && isSelected && !opt.isCorrect ? '✗' : ['A','B','C','D','E'][oIdx]}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontSize: Typography.fontSize[14], fontWeight: Typography.fontWeight.semibold, color: textColor, lineHeight: 20 }}>{opt.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation */}
        {isRevealed && question.explanation && (
          <View style={{ marginTop: Spacing.md, backgroundColor: ColorScale.primary[50], padding: Spacing.md, borderRadius: BorderRadius.lg, borderLeftWidth: 3, borderLeftColor: ColorScale.primary[600] }}>
            <Text style={{ fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.extrabold, color: ColorScale.primary[600], marginBottom: Spacing.xs, textTransform: 'uppercase' }}>{t('quiz.results.explanation')}</Text>
            <Text style={{ fontSize: Typography.fontSize[13], color: ColorScale.primary[600], lineHeight: 20 }}>{question.explanation}</Text>
          </View>
        )}
      </View>

      {/* Navigation */}
      {isRevealed && (
        <View style={{ padding: Spacing.md, borderTopWidth: 1, borderTopColor: ColorScale.gray[100] }}>
          <TouchableOpacity
            onPress={() => {
              if (currentIdx < quiz.questions.length - 1) {
                setCurrentIdx(prev => prev + 1);
              } else {
                const correct = quiz.questions.reduce((count: number, q: any, i: number) => {
                  const key = q.id ?? i;
                  const selected = answers[key];
                  const correctOpt = q.options?.find((o: any) => o.isCorrect);
                  if (!selected || !correctOpt) return count;
                  return selected === (correctOpt.id ?? q.options.indexOf(correctOpt)) ? count + 1 : count;
                }, 0);

                setScore(Math.round((correct / quiz.questions.length) * 100));
                setFinished(true);
                
                // Auto-mark complete if passed
                const finalScore = Math.round((correct / quiz.questions.length) * 100);
                if (finalScore >= quiz.passingScore) {
                  onPass();
                }
              }
            }}
            style={{ backgroundColor: ColorScale.primary[600], paddingVertical: Spacing.md, borderRadius: BorderRadius.xl, alignItems: 'center' }}
            activeOpacity={0.85}
          >
            <Text style={{ color: Colors.white, fontWeight: Typography.fontWeight.extrabold, fontSize: Typography.fontSize[15] }}>
              {currentIdx < quiz.questions.length - 1 ? t('learn.lessonViewer.nextQuestion') : t('learn.lessonViewer.finishSeeResults')}
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
  const { t } = useTranslation();
  const [submissionText, setSubmissionText] = useState(lesson.assignmentSubmission?.submissionText || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachment, setAttachment] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size: number;
  } | null>(null);

  const status = lesson.assignmentSubmission?.status || 'NOT_SUBMITTED';
  const assignment = lesson.assignment;

  if (!assignment) return null;

  const isGraded = status === 'GRADED';
  const hasExistingSubmission = status !== 'NOT_SUBMITTED';
  const canResubmit = status === 'NOT_SUBMITTED' || status === 'RESUBMISSION_REQUIRED';
  const isAwaitingReview = status === 'SUBMITTED' || status === 'LATE';

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      });
    } catch (error: any) {
      Alert.alert(t('learn.lessonViewer.filePicker'), error?.message || t('learn.lessonViewer.unablePickFile'));
    }
  };

  const handleAddAttachment = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose File'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            void pickAttachment();
          }
        }
      );
      return;
    }

    await pickAttachment();
  };

  const handleSubmit = async () => {
    if (!submissionText.trim() && !attachment) {
      Alert.alert(t('learn.lessonViewer.emptySubmission'), t('learn.lessonViewer.enterWorkOrAttach'));
      return;
    }

    try {
      setIsSubmitting(true);

      let uploadedFile: { fileUrl: string; fileName: string } | null = null;
      if (attachment) {
        uploadedFile = await learnApi.uploadAssignmentAttachment(
          attachment.uri,
          attachment.name,
          attachment.mimeType
        );
      }

      await learnApi.submitAssignment(courseId, lesson.id, {
        submissionText: submissionText.trim() || undefined,
        fileUrl: uploadedFile?.fileUrl,
        fileName: uploadedFile?.fileName,
      });
      Alert.alert(t('common.success'), t('learn.lessonViewer.assignmentSubmitted'));
      setAttachment(null);
      onSuccess();
    } catch (error: any) {
      Alert.alert(t('learn.lessonViewer.submissionError'), error?.message || t('learn.lessonViewer.failedSubmitAssignment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ gap: Spacing.md, marginVertical: Spacing[3] }}>
      {/* Instructions Card */}
      <View style={{ backgroundColor: 'rgba(99,102,241,0.08)', padding: Spacing[5], borderRadius: BorderRadius[20], borderWidth: 1, borderColor: 'rgba(99,102,241,0.22)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[3], gap: Spacing.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: BorderRadius.full, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="document-text" size={20} color={Colors.white} />
          </View>
          <View>
            <Text style={{ fontSize: Typography.fontSize[16], fontWeight: Typography.fontWeight.extrabold, color: Colors.secondary }}>{t('learn.lessonViewer.assignmentTask')}</Text>
            <Text style={{ fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.semibold, color: Colors.secondary, textTransform: 'uppercase' }}><AutoI18nText i18nKey="auto.mobile.screens_learn_LessonViewerScreen.k_1fe2023e" /> {assignment.maxScore} <AutoI18nText i18nKey="auto.mobile.screens_learn_LessonViewerScreen.k_79b28c3f" /></Text>
          </View>
        </View>
        <Text style={{ fontSize: Typography.fontSize[14], color: Colors.secondary, lineHeight: 22 }}>{assignment.instructions}</Text>
      </View>

      {/* Submission Card */}
      <View style={{ backgroundColor: Colors.white, padding: Spacing[5], borderRadius: BorderRadius['2xl'], borderWidth: 1.5, borderColor: hasExistingSubmission ? ColorScale.gray[200] : Colors.secondary, ...Shadows.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
          <Text style={{ fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.extrabold, color: Colors.textSecondary, textTransform: 'uppercase' }}>{t('learn.lessonViewer.yourSubmission')}</Text>
          <View style={{ paddingHorizontal: Spacing[3], paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, backgroundColor: isGraded ? 'rgba(34,197,94,0.15)' : hasExistingSubmission ? ColorScale.gray[100] : 'rgba(99,102,241,0.08)' }}>
            <Text style={{ fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.black, color: isGraded ? Colors.success.dark : hasExistingSubmission ? ColorScale.gray[600] : Colors.secondary }}>
              {status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {isGraded && lesson.assignmentSubmission && (
          <View style={{ marginBottom: Spacing[5], padding: Spacing.md, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs }}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success.dark} />
              <Text style={{ fontSize: Typography.fontSize[15], fontWeight: Typography.fontWeight.extrabold, color: Colors.success.dark }}>{t('learn.lessonViewer.graded', { score: lesson.assignmentSubmission.score, maxScore: assignment.maxScore })}</Text>
            </View>
            {lesson.assignmentSubmission.feedback && (
              <Text style={{ fontSize: Typography.fontSize[13], color: Colors.success.dark, fontStyle: 'italic', marginTop: Spacing.xs }}>"{lesson.assignmentSubmission.feedback}"</Text>
            )}
            {lesson.assignmentSubmission.fileUrl && (
              <TouchableOpacity
                onPress={() => Linking.openURL(lesson.assignmentSubmission?.fileUrl || '')}
                style={{ marginTop: Spacing[3], flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
              >
                <Ionicons name="attach" size={16} color={Colors.success.dark} />
                <Text style={{ fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.bold, color: Colors.success.dark }}>
                  {lesson.assignmentSubmission.fileName || t('learn.lessonViewer.openAttachedFile')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isAwaitingReview ? (
          <View style={{ padding: Spacing.md, backgroundColor: ColorScale.gray[50], borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: ColorScale.gray[200] }}>
             {!!lesson.assignmentSubmission?.submissionText && (
               <Text style={{ fontSize: Typography.fontSize[14], color: Colors.text, lineHeight: 22 }}>{lesson.assignmentSubmission?.submissionText}</Text>
             )}
             {lesson.assignmentSubmission?.fileUrl && (
               <TouchableOpacity
                 onPress={() => Linking.openURL(lesson.assignmentSubmission?.fileUrl || '')}
                 style={{ marginTop: lesson.assignmentSubmission?.submissionText ? Spacing[3] : Spacing[0], flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
               >
                 <Ionicons name="attach" size={16} color={ColorScale.gray[600]} />
                 <Text style={{ fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[600] }}>
                   {lesson.assignmentSubmission.fileName || t('learn.lessonViewer.openAttachedFile')}
                 </Text>
               </TouchableOpacity>
             )}
             <Text style={{ fontSize: Typography.fontSize[11], color: Colors.textTertiary, marginTop: Spacing[3], textAlign: 'center', fontWeight: Typography.fontWeight.semibold }}>{t('learn.lessonViewer.waitingInstructor')}</Text>
          </View>
        ) : canResubmit ? (
          <>
            <TextInput
              multiline
              placeholder={t('learn.lessonViewer.submissionPlaceholder')}
              value={submissionText}
              onChangeText={setSubmissionText}
              style={{ backgroundColor: ColorScale.gray[50], borderRadius: BorderRadius.xl, padding: Spacing.md, fontSize: Typography.fontSize[14], color: ColorScale.gray[800], minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: ColorScale.gray[200], marginBottom: Spacing.md }}
              placeholderTextColor={Colors.textTertiary}
            />
            <View style={{ marginBottom: Spacing.md, gap: Spacing[3] }}>
              <TouchableOpacity
                onPress={handleAddAttachment}
                disabled={isSubmitting}
                style={{ borderRadius: BorderRadius.xl, paddingVertical: Spacing.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.22)' }}
              >
                <Ionicons name="attach" size={18} color={Colors.secondary} />
                <Text style={{ color: Colors.secondary, fontWeight: Typography.fontWeight.extrabold, fontSize: Typography.fontSize[15] }}>
                  {attachment ? t('learn.lessonViewer.replaceAttachment') : t('learn.lessonViewer.attachFile')}
                </Text>
              </TouchableOpacity>

              {attachment && (
                <View style={{ backgroundColor: ColorScale.gray[50], borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: ColorScale.gray[200], padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
                  <View style={{ width: 36, height: 36, borderRadius: BorderRadius.full, backgroundColor: 'rgba(99,102,241,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document" size={18} color={Colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[800] }} numberOfLines={1}>{attachment.name}</Text>
                    <Text style={{ fontSize: Typography.fontSize[12], color: Colors.textSecondary }}>{formatFileSize(attachment.size)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAttachment(null)}>
                    <Ionicons name="close-circle" size={22} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}

              {lesson.assignmentSubmission?.fileUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(lesson.assignmentSubmission?.fileUrl || '')}
                  style={{ backgroundColor: ColorScale.gray[50], borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: ColorScale.gray[200], padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
                >
                  <Ionicons name="document-text" size={18} color={ColorScale.gray[600]} />
                  <Text style={{ flex: 1, fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[600] }} numberOfLines={1}>
                    {t('learn.lessonViewer.currentAttachment')}: {lesson.assignmentSubmission.fileName || t('learn.lessonViewer.openAttachedFile')}
                  </Text>
                  <Ionicons name="open-outline" size={16} color={ColorScale.gray[600]} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={{ backgroundColor: Colors.secondary, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color={Colors.white} />
                  <Text style={{ color: Colors.white, fontWeight: Typography.fontWeight.extrabold, fontSize: Typography.fontSize[15] }}>{t('learn.lessonViewer.submitAssignment')}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
           <View style={{ padding: Spacing.md, backgroundColor: ColorScale.gray[50], borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: ColorScale.gray[200] }}>
             {!!lesson.assignmentSubmission?.submissionText && (
               <Text style={{ fontSize: Typography.fontSize[14], color: Colors.text, lineHeight: 22 }}>{lesson.assignmentSubmission?.submissionText}</Text>
             )}
             {lesson.assignmentSubmission?.fileUrl && (
               <TouchableOpacity
                 onPress={() => Linking.openURL(lesson.assignmentSubmission?.fileUrl || '')}
                 style={{ marginTop: lesson.assignmentSubmission?.submissionText ? Spacing[3] : Spacing[0], flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
               >
                 <Ionicons name="attach" size={16} color={ColorScale.gray[600]} />
                 <Text style={{ fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[600] }}>
                   {lesson.assignmentSubmission.fileName || t('learn.lessonViewer.openAttachedFile')}
                 </Text>
               </TouchableOpacity>
             )}
          </View>
        )}
      </View>
    </View>
  );
}

export default function LessonViewerScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { courseId, lessonId, contentLocale: routeContentLocale } = route.params;
  const fallbackContentLocale = normalizeResourceLocale(routeContentLocale || i18n.resolvedLanguage || i18n.language || 'en');
  const [selectedContentLocale, setSelectedContentLocale] = useState(fallbackContentLocale);

  const initialCachedCourse = useMemo(
    () => learnApi.getCachedCourseDetail(courseId, fallbackContentLocale),
    [courseId, fallbackContentLocale]
  );
  const initialCachedLesson = useMemo(
    () => learnApi.getCachedLessonDetail(courseId, lessonId, fallbackContentLocale),
    [courseId, lessonId, fallbackContentLocale]
  );
  const hasImmediateShell = Boolean(initialCachedLesson || initialCachedCourse);

  const [loading, setLoading] = useState(!hasImmediateShell);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [course, setCourse] = useState<LearnCourseDetail | null>(initialCachedCourse);
  const [lesson, setLesson] = useState<LearnLessonDetail | null>(initialCachedLesson);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSavedAt, setNoteSavedAt] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [transcriptLocalePreference, setTranscriptLocalePreference] = useState<string | null>(null);
  const [resourceActionState, setResourceActionState] = useState<Record<string, 'opening' | 'saving' | 'sharing'>>({});
  const [inlineTextPreview, setInlineTextPreview] = useState<{ resourceId: string; content: string; title: string } | null>(null);
  const [inlineTextLoadingResourceId, setInlineTextLoadingResourceId] = useState<string | null>(null);
  const hasVisibleLessonRef = useRef(Boolean(initialCachedLesson));

  useEffect(() => {
    setSelectedContentLocale(fallbackContentLocale);
  }, [fallbackContentLocale]);

  const loadLessonData = useCallback(async () => {
    try {
      // Paint from cache first; only block UI when we have nothing.
      if (!hasVisibleLessonRef.current) {
        const cachedLesson = learnApi.getCachedLessonDetail(courseId, lessonId, selectedContentLocale);
        const cachedCourse = learnApi.getCachedCourseDetail(courseId, selectedContentLocale);
        if (cachedLesson) {
          setLesson(cachedLesson);
          hasVisibleLessonRef.current = true;
          setLoading(false);
        }
        if (cachedCourse) setCourse(cachedCourse);
      }

      const [lessonData, courseData, noteData] = await Promise.all([
        learnApi.getLessonDetail(courseId, lessonId, selectedContentLocale),
        learnApi.getCourseDetail(courseId, false, selectedContentLocale),
        learnApi.getLessonNote(courseId, lessonId).catch(() => null),
      ]);

      setLesson(lessonData);
      setCourse(courseData);
      hasVisibleLessonRef.current = true;
      setNoteDraft(noteData?.content || '');
      setNoteSavedAt(noteData?.updatedAt || null);
    } catch (error: any) {
      if (!hasVisibleLessonRef.current) {
        Alert.alert(t('learn.lessonViewer.lesson'), error?.message || t('learn.lessonViewer.unableLoadLesson'));
        navigation.goBack();
      } else if (__DEV__) {
        console.warn('[LessonViewer] background refresh failed:', error?.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, lessonId, navigation, selectedContentLocale, t]);

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
    navigation.replace('LessonViewer', { courseId, lessonId: targetLessonId, contentLocale: selectedContentLocale });
  }, [courseId, navigation, selectedContentLocale]);

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
      Alert.alert(t('learn.lessonViewer.progress'), error?.message || t('learn.lessonViewer.unableUpdateProgress'));
    } finally {
      setCompleting(false);
    }
  }, [courseId, lesson, lessonId, loadLessonData]);

  const handleSaveNote = useCallback(async () => {
    try {
      setNoteSaving(true);
      const saved = await learnApi.saveLessonNote(courseId, lessonId, { content: noteDraft });
      setNoteSavedAt(saved?.updatedAt || null);
      if (!saved && !noteDraft.trim()) {
        setNoteSavedAt(null);
      }
    } catch (error: any) {
      Alert.alert(t('learn.lessonViewer.notes'), error?.message || t('learn.lessonViewer.unableSaveNote'));
    } finally {
      setNoteSaving(false);
    }
  }, [courseId, lessonId, noteDraft]);

  useEffect(() => {
    setTranscriptLocalePreference(null);
  }, [lessonId, selectedContentLocale]);

  const setResourceAction = useCallback((resourceId: string, state: 'opening' | 'saving' | 'sharing' | null) => {
    setResourceActionState((previous) => {
      if (!state) {
        const next = { ...previous };
        delete next[resourceId];
        return next;
      }

      return {
        ...previous,
        [resourceId]: state,
      };
    });
  }, []);

  const ensureCachedResource = useCallback(async (resourceUrl: string, resourceTitle: string) => {
    const resourcesDirectory = `${FileSystem.cacheDirectory || ''}learn-resources/`;
    const dirInfo = await FileSystem.getInfoAsync(resourcesDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(resourcesDirectory, { intermediates: true });
    }

    const fileName = getFileNameFromUrl(resourceUrl, resourceTitle || `resource-${Date.now()}`);
    const targetUri = buildCachedResourceUri(resourceUrl, fileName);
    const existing = await FileSystem.getInfoAsync(targetUri);
    if (existing.exists) {
      return targetUri;
    }

    const downloadResult = await FileSystem.downloadAsync(resourceUrl, targetUri);
    return downloadResult.uri;
  }, []);

  const openResourceUrl = useCallback(async (resourceUrl: string) => {
    const supported = await Linking.canOpenURL(resourceUrl);
    if (!supported) {
      throw new Error(t('learn.lessonViewer.fileCannotOpen'));
    }

    await Linking.openURL(resourceUrl);
  }, []);

  const handleOpenResource = useCallback(async (resource: { id: string; title: string; url: string }) => {
    try {
      const resourceType = getResolvedResourceType(resource);
      if (isDocumentViewerType(resourceType, resource.url)) {
        navigation.navigate('DocumentViewer', {
          title: resource.title,
          url: resource.url,
          resourceType,
          contentLocale: selectedContentLocale,
        });
        return;
      }

      setResourceAction(resource.id, 'opening');
      await openResourceUrl(resource.url);
    } catch (error: any) {
      Alert.alert(t('learn.lessonViewer.resource'), error?.message || t('learn.lessonViewer.unableOpenResource'));
    } finally {
      setResourceAction(resource.id, null);
    }
  }, [navigation, openResourceUrl, selectedContentLocale, setResourceAction]);

  const handleSaveCopy = useCallback(async (resource: { id: string; title: string; url: string }) => {
    try {
      setResourceAction(resource.id, 'saving');
      const localUri = await ensureCachedResource(resource.url, resource.title);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          dialogTitle: resource.title || t('learn.lessonViewer.shareResource'),
        });
      } else {
        await Linking.openURL(localUri);
      }
    } catch (error: any) {
      Alert.alert(t('learn.lessonViewer.saveCopy'), error?.message || t('learn.lessonViewer.unableSaveCopy'));
    } finally {
      setResourceAction(resource.id, null);
    }
  }, [ensureCachedResource, setResourceAction]);

  const handleShareResourceLink = useCallback(async (resource: { id: string; title: string; url: string }) => {
    try {
      setResourceAction(resource.id, 'sharing');
      if (await Sharing.isAvailableAsync()) {
        const localUri = await ensureCachedResource(resource.url, resource.title);
        await Sharing.shareAsync(localUri, {
          dialogTitle: resource.title || t('learn.lessonViewer.shareResource'),
        });
      } else {
        await openResourceUrl(resource.url);
      }
    } catch (error: any) {
      Alert.alert(t('learn.lessonViewer.shareResource'), error?.message || t('learn.lessonViewer.unableShareResource'));
    } finally {
      setResourceAction(resource.id, null);
    }
  }, [ensureCachedResource, openResourceUrl, setResourceAction]);

  const handleLoadInlineTextPreview = useCallback(async (resource: { id: string; title: string; url: string }) => {
    try {
      setInlineTextLoadingResourceId(resource.id);
      const response = await fetch(resource.url);
      if (!response.ok) {
        throw new Error(t('learn.lessonViewer.unableLoadTextPreview'));
      }

      const text = await response.text();
      const normalized = text.replace(/\r\n/g, '\n').trim();
      setInlineTextPreview({
        resourceId: resource.id,
        title: resource.title || t('learn.lessonViewer.documentPreview'),
        content: normalized || t('learn.lessonViewer.fileEmpty'),
      });
    } catch (error: any) {
      Alert.alert(t('learn.lessonViewer.preview'), error?.message || t('learn.lessonViewer.unableInlinePreview'));
    } finally {
      setInlineTextLoadingResourceId(null);
    }
  }, []);

  // Only blank when we have no lesson shell to paint.
  if (loading && !lesson) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={ColorScale.primary[600]} />
        <Text style={styles.loadingText}>{t('learn.lessonViewer.loadingLesson')}</Text>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={36} color={Colors.textTertiary} />
        <Text style={styles.loadingText}>{t('learn.lessonViewer.lessonNotAvailable')}</Text>
      </SafeAreaView>
    );
  }

  const contentText = lesson.content ? stripHtml(lesson.content) : (lesson.description || t('learn.lessonViewer.noLessonContent'));
  const resourceLocale = normalizeResourceLocale(selectedContentLocale);
  const visibleResources = (() => {
    const matching = lesson.resources.filter((resource) => normalizeResourceLocale(resource.locale) === resourceLocale);
    if (matching.length > 0) return matching;

    const defaults = lesson.resources.filter((resource) => resource.isDefault);
    if (defaults.length > 0) return defaults;

    return lesson.resources;
  })();
  const transcriptTracks = lesson.textTracks.filter((track) => track.kind === 'TRANSCRIPT' && Boolean(track.content));
  const activeTranscriptTrack = selectLocalizedTextTrack(
    transcriptTracks,
    transcriptLocalePreference || selectedContentLocale
  );
  const primaryLessonResourceUrl = visibleResources[0]?.url || lesson.content || '';
  const primaryVisibleResource = visibleResources[0] || null;
  const primaryVisibleResourceType = primaryVisibleResource ? getResolvedResourceType(primaryVisibleResource) : '';
  const canPreviewPrimaryImage = Boolean(primaryVisibleResource?.url) && isInlineImageType(primaryVisibleResourceType);
  const canPreviewPrimaryText = Boolean(primaryVisibleResource?.url) && isInlineTextType(primaryVisibleResourceType, primaryVisibleResource.url);
  const canPreviewPrimaryPdf = Boolean(primaryVisibleResource?.url) && isInlinePdfType(primaryVisibleResourceType);
  const supportedContentLocales = Array.from(new Set(
    (course?.supportedLocales || [])
      .map((locale) => normalizeResourceLocale(locale))
      .filter(Boolean)
  ));
  const documentGuideText = lesson.description || contentText || t('learn.lessonViewer.documentGuideFallback');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course?.title || t('learn.lessonViewer.lesson')}
          </Text>
          <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ColorScale.primary[600]} />}
      >
        <View style={styles.lessonCard}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <View style={styles.lessonMetaRow}>
            <View style={styles.lessonMetaItem}>
              <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.lessonMetaText}>{formatDuration(lesson.duration)}</Text>
            </View>
            <View style={styles.lessonMetaItem}>
              <Ionicons name={lesson.isCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={lesson.isCompleted ? Colors.success.main : Colors.textSecondary} />
              <Text style={styles.lessonMetaText}>{lesson.isCompleted ? t('learn.courseDetail.doneTag') : t('learn.lessonViewer.inProgress')}</Text>
            </View>
          </View>

          {supportedContentLocales.length > 1 && (
            <View style={styles.localeSection}>
              <Text style={styles.localeSectionLabel}>{t('learn.courseDetail.contentLanguage')}</Text>
              <View style={styles.localeChipRow}>
                {supportedContentLocales.map((localeKey) => {
                  const active = selectedContentLocale === localeKey;
                  return (
                    <TouchableOpacity
                      key={localeKey}
                      onPress={() => setSelectedContentLocale(localeKey)}
                      style={[styles.localeChip, active && styles.localeChipActive]}
                    >
                      <Text style={[styles.localeChipText, active && styles.localeChipTextActive]}>
                        {getLocaleLabel(localeKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          
          {lesson.type === 'QUIZ' && (() => {
            const quiz = (lesson as any).quiz;
            // Inline Mobile Quiz Engine
            return (
              <MobileQuizWidget 
                quiz={quiz} 
                lessonTitle={lesson.title} 
                onPass={handleMarkComplete}
                t={t}
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
            <View style={{ backgroundColor: 'rgba(34,197,94,0.08)', padding: Spacing.md, borderRadius: BorderRadius.lg, marginVertical: Spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                <Ionicons name="code-slash" size={24} color={Colors.success.dark} style={{ marginRight: Spacing.sm }} />
                <Text style={{ fontSize: Typography.fontSize[16], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[900] }}>{t('learn.lessonViewer.codingExercise')}</Text>
              </View>
              <Text style={{ fontSize: Typography.fontSize[13], color: ColorScale.gray[600], marginBottom: Spacing[3] }}>{t('learn.lessonViewer.openOnWebIde')}</Text>
              <View style={{ backgroundColor: 'rgba(34,197,94,0.15)', padding: Spacing.sm, borderRadius: BorderRadius.md }}>
                <Text style={{ color: Colors.success.dark, textAlign: 'center', fontWeight: Typography.fontWeight.semibold, fontSize: Typography.fontSize[12] }}>{t('learn.lessonViewer.desktopRecommended')}</Text>
              </View>
            </View>
          )}

          {lesson.type === 'IMAGE' && (
            <View style={{ marginVertical: Spacing[3], borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: ColorScale.gray[100] }}>
               <Image
                 source={{ uri: lesson.content || '' }}
                 style={{ width: '100%', aspectRatio: 16/9 }}
                 contentFit="contain"
                 cachePolicy="memory-disk"
                 transition={150}
                 recyclingKey={lesson.content || undefined}
               />
               <View style={{ padding: Spacing[3], backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: ColorScale.gray[200] }}>
                 <Text style={{ fontSize: Typography.fontSize[14], fontWeight: Typography.fontWeight.bold, color: ColorScale.gray[800] }}>{lesson.title}</Text>
                 <TouchableOpacity style={{ marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }} onPress={() => Linking.openURL(lesson.content || '')}>
                   <Ionicons name="download-outline" size={14} color={ColorScale.primary[600]} />
                   <Text style={{ fontSize: Typography.fontSize[12], color: ColorScale.primary[600], fontWeight: Typography.fontWeight.semibold }}>{t('learn.lessonViewer.fullResolution')}</Text>
                 </TouchableOpacity>
               </View>
            </View>
          )}

          {(lesson.type === 'DOCUMENT' || lesson.type === 'PDF' || lesson.type === 'FILE') && (
            <View style={styles.documentLessonCard}>
              <View style={styles.documentHero}>
                <View style={styles.documentHeroIcon}>
                  <Ionicons name="document-text-outline" size={28} color={Colors.secondary} />
                </View>
                <Text style={styles.documentHeroTitle}>{lesson.title}</Text>
                <Text style={styles.documentHeroSubtitle}>
                  {lesson.type === 'PDF' ? 'PDF learning resource' : 'Document-first lesson'}
                </Text>
              </View>

              <View style={styles.documentGuideCard}>
                <Text style={styles.documentGuideEyebrow}>{t('learn.lessonViewer.lessonGuide')}</Text>
                <Text style={styles.documentGuideText}>{documentGuideText}</Text>
              </View>

              {canPreviewPrimaryImage && primaryVisibleResource?.url ? (
                <View style={styles.inlinePreviewCard}>
                  <View style={styles.inlinePreviewHeader}>
                    <Text style={styles.inlinePreviewTitle}>{t('learn.lessonViewer.inlinePreview')}</Text>
                    <Text style={styles.inlinePreviewHint}>{t('learn.lessonViewer.imageAttachment')}</Text>
                  </View>
                  <Image
                    source={{ uri: primaryVisibleResource.url }}
                    style={styles.inlinePreviewImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={150}
                    recyclingKey={primaryVisibleResource.url}
                  />
                </View>
              ) : null}

              {canPreviewPrimaryText && primaryVisibleResource?.url ? (
                <View style={styles.inlinePreviewCard}>
                  <View style={styles.inlinePreviewHeader}>
                    <Text style={styles.inlinePreviewTitle}>{t('learn.lessonViewer.inlinePreview')}</Text>
                    <Text style={styles.inlinePreviewHint}>{t('learn.lessonViewer.textDocument')}</Text>
                  </View>
                  {inlineTextPreview?.resourceId === primaryVisibleResource.id ? (
                    <Text style={styles.inlinePreviewText}>{inlineTextPreview.content}</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.inlinePreviewButton}
                      onPress={() => handleLoadInlineTextPreview(primaryVisibleResource)}
                      disabled={inlineTextLoadingResourceId === primaryVisibleResource.id}
                    >
                      {inlineTextLoadingResourceId === primaryVisibleResource.id ? (
                        <ActivityIndicator size="small" color={Colors.secondary} />
                      ) : (
                        <>
                          <Ionicons name="document-text-outline" size={16} color={Colors.secondary} />
                          <Text style={styles.inlinePreviewButtonText}>{t('learn.lessonViewer.loadTextPreview')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {canPreviewPrimaryPdf ? (
                <View style={styles.inlinePreviewCard}>
                  <View style={styles.inlinePreviewHeader}>
                    <Text style={styles.inlinePreviewTitle}>{t('learn.lessonViewer.pdfHandling')}</Text>
                    <Text style={styles.inlinePreviewHint}>{t('learn.lessonViewer.pdfPagesUnavailable')}</Text>
                  </View>
                  <Text style={styles.inlinePreviewText}>
                    {t('learn.lessonViewer.pdfHelpText')}
                  </Text>
                </View>
              ) : null}

              {primaryVisibleResource ? (
                <View style={styles.documentActionGrid}>
                  <TouchableOpacity
                    style={styles.documentActionButton}
                    onPress={() => handleOpenResource(primaryVisibleResource)}
                    disabled={resourceActionState[primaryVisibleResource.id] === 'opening'}
                  >
                    {resourceActionState[primaryVisibleResource.id] === 'opening' ? (
                      <ActivityIndicator size="small" color={Colors.secondary} />
                    ) : (
                      <>
                        <Ionicons name="open-outline" size={16} color={Colors.secondary} />
                        <Text style={styles.documentActionText}>{t('common.open')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentActionButton}
                    onPress={() => handleSaveCopy(primaryVisibleResource)}
                    disabled={resourceActionState[primaryVisibleResource.id] === 'saving'}
                  >
                    {resourceActionState[primaryVisibleResource.id] === 'saving' ? (
                      <ActivityIndicator size="small" color={Colors.secondary} />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={16} color={Colors.secondary} />
                        <Text style={styles.documentActionText}>{t('learn.lessonViewer.saveCopy')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentActionButton}
                    onPress={() => handleShareResourceLink(primaryVisibleResource)}
                    disabled={resourceActionState[primaryVisibleResource.id] === 'sharing'}
                  >
                    {resourceActionState[primaryVisibleResource.id] === 'sharing' ? (
                      <ActivityIndicator size="small" color={Colors.secondary} />
                    ) : (
                      <>
                        <Ionicons name="share-social-outline" size={16} color={Colors.secondary} />
                        <Text style={styles.documentActionText}>{t('common.share')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : primaryLessonResourceUrl ? (
                <TouchableOpacity 
                  style={styles.documentPrimaryButton}
                  onPress={() => openResourceUrl(primaryLessonResourceUrl)}
                >
                  <Ionicons name="open-outline" size={18} color={Colors.white} />
                  <Text style={styles.documentPrimaryButtonText}>{t('learn.lessonViewer.openPrimaryResource')}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.documentFallbackText}>{t('learn.lessonViewer.noFileAttached')}</Text>
              )}

              <View style={styles.documentMetaRow}>
                <View style={styles.documentMetaCard}>
                  <Text style={styles.documentMetaLabel}>{t('common.language')}</Text>
                  <Text style={styles.documentMetaValue}>{getLocaleLabel(selectedContentLocale)}</Text>
                </View>
                <View style={styles.documentMetaCard}>
                  <Text style={styles.documentMetaLabel}>{t('learn.lessonViewer.attachments')}</Text>
                  <Text style={styles.documentMetaValue}>{visibleResources.length}</Text>
                </View>
              </View>
            </View>
          )}

          {(lesson.type === 'ARTICLE' || lesson.type === 'PRACTICE') && (
            <View style={{ marginBottom: Spacing.md }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: ColorScale.gray[100], paddingHorizontal: Spacing[3], paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, marginBottom: Spacing[3] }}>
                <Text style={{ fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.extrabold, color: ColorScale.gray[600], textTransform: 'uppercase' }}>{lesson.type === 'PRACTICE' ? t('learn.lessonViewer.practiceLesson') : t('learn.lessonViewer.readingLesson')}</Text>
              </View>
              <Text style={[styles.lessonContent, { fontSize: Typography.fontSize[16], lineHeight: 26, color: ColorScale.gray[800] }]}>{contentText}</Text>
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
              <Ionicons name="play-circle-outline" size={16} color={ColorScale.primary[600]} />
              <Text style={styles.resourceText}>{t('learn.lessonViewer.openLessonMedia')}</Text>
            </TouchableOpacity>
          )}

          {lesson.textTracks?.filter(track => track.kind !== 'TRANSCRIPT' && track.url).map((track) => (
            <TouchableOpacity
              key={`${track.kind}-${track.locale}-${track.url}`}
              style={styles.resourceRow}
              onPress={() => track.url && Linking.openURL(track.url)}
              activeOpacity={0.8}
            >
              <Ionicons name="text-outline" size={16} color={ColorScale.primary[600]} />
              <Text style={styles.resourceText}>{t('learn.lessonViewer.captionsForLanguage', { language: track.label || getLocaleLabel(track.locale) })}</Text>
            </TouchableOpacity>
          ))}

          {activeTranscriptTrack?.content && (
            <View style={{ backgroundColor: ColorScale.gray[50], borderWidth: 1, borderColor: ColorScale.gray[200], borderRadius: BorderRadius.xl, padding: Spacing.md, marginTop: Spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                <Ionicons name="reader-outline" size={18} color={ColorScale.gray[600]} style={{ marginRight: Spacing.sm }} />
                <Text style={{ fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.extrabold, color: Colors.text, textTransform: 'uppercase' }}>{t('learn.lessonViewer.transcript')}</Text>
              </View>
              {transcriptTracks.length > 1 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing[3] }}>
                  {transcriptTracks.map((track) => {
                    const isActive = activeTranscriptTrack.id === track.id;
                    return (
                      <TouchableOpacity
                        key={track.id}
                        onPress={() => setTranscriptLocalePreference(track.locale)}
                        style={{
                          paddingHorizontal: Spacing[3],
                          paddingVertical: Spacing.xs,
                          borderRadius: BorderRadius.full,
                          borderWidth: 1,
                          borderColor: isActive ? ColorScale.primary[600] : ColorScale.gray[300],
                          backgroundColor: isActive ? ColorScale.primary[100] : Colors.white,
                        }}
                      >
                        <Text style={{ fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.bold, color: isActive ? ColorScale.primary[700] : Colors.textSecondary }}>
                          {track.label || getLocaleLabel(track.locale)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={{ fontSize: Typography.fontSize[14], lineHeight: 22, color: Colors.text }}>
                {activeTranscriptTrack.content}
              </Text>
            </View>
          )}

          {visibleResources.length > 0 && (
            <View style={styles.resourcesSection}>
              <Text style={styles.resourcesTitle}>{t('feed.postTypes.resource')}</Text>
              {visibleResources.map(resource => (
                <View key={resource.id} style={styles.resourceCard}>
                  <View style={styles.resourceRow}>
                    <Ionicons name={getResourceIcon(getResolvedResourceType(resource))} size={16} color={ColorScale.primary[600]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resourceText} numberOfLines={1}>
                        {resource.title}
                      </Text>
                      <Text style={styles.resourceMetaInline} numberOfLines={1}>
                        {getResourceTypeLabel(getResolvedResourceType(resource))}
                        {resource.locale ? ` • ${getLocaleLabel(resource.locale)}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.resourceActionRow}>
                    <TouchableOpacity
                      style={styles.resourceMiniAction}
                      activeOpacity={0.8}
                      onPress={() => handleOpenResource(resource)}
                    >
                      <Ionicons name="open-outline" size={14} color={ColorScale.primary[600]} />
                      <Text style={styles.resourceMiniActionText}>{t('common.open')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resourceMiniAction}
                      activeOpacity={0.8}
                      onPress={() => handleSaveCopy(resource)}
                    >
                      <Ionicons name="download-outline" size={14} color={ColorScale.primary[600]} />
                      <Text style={styles.resourceMiniActionText}>{t('common.save')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resourceMiniAction}
                      activeOpacity={0.8}
                      onPress={() => handleShareResourceLink(resource)}
                    >
                      <Ionicons name="share-social-outline" size={14} color={ColorScale.primary[600]} />
                      <Text style={styles.resourceMiniActionText}>{t('common.share')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.resourcesSection, { marginTop: Spacing.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[3] }}>
              <Text style={styles.resourcesTitle}>{t('learn.lessonViewer.myNotes')}</Text>
              <Text style={{ fontSize: Typography.fontSize[11], color: Colors.textSecondary }}>
                {noteSavedAt ? t('learn.lessonViewer.savedAt', { time: new Date(noteSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }) : t('learn.lessonViewer.notSavedYet')}
              </Text>
            </View>
            <View style={{ backgroundColor: Colors.white, borderWidth: 1, borderColor: ColorScale.gray[200], borderRadius: BorderRadius.xl, padding: Spacing[3] }}>
              <TextInput
                value={noteDraft}
                onChangeText={setNoteDraft}
                placeholder={t('learn.lessonViewer.notesPlaceholder')}
                placeholderTextColor={Colors.textTertiary}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 130, fontSize: Typography.fontSize[14], lineHeight: 22, color: ColorScale.gray[900] }}
              />
              <View style={{ marginTop: Spacing[3], flexDirection: 'row', justifyContent: 'space-between', gap: Spacing[3] }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing[3], borderRadius: BorderRadius.lg, backgroundColor: ColorScale.gray[100] }}
                  onPress={() => setNoteDraft('')}
                  disabled={noteSaving}
                >
                  <Text style={{ color: ColorScale.gray[600], fontWeight: Typography.fontWeight.bold }}>{t('common.clear')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing[3], borderRadius: BorderRadius.lg, backgroundColor: ColorScale.primary[600], minWidth: 104, alignItems: 'center' }}
                  onPress={handleSaveNote}
                  disabled={noteSaving}
                >
                  {noteSaving ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={{ color: Colors.white, fontWeight: Typography.fontWeight.extrabold }}>{t('learn.lessonViewer.saveNote')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.qaButtonRow}
            activeOpacity={0.8}
            onPress={() => (navigation as any).navigate('CourseQA', { courseId, lessonId })}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={Colors.warning.main} />
            <Text style={styles.qaButtonText}>{t('learn.lessonViewer.joinDiscussion')}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {course ? (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressIconWrap}>
                <Ionicons name="trending-up" size={16} color={ColorScale.primary[600]} />
              </View>
              <View style={styles.progressTextWrap}>
                <Text style={styles.progressTitle}>{t('learn.lessonViewer.courseProgress')}</Text>
                <Text style={styles.progressSubtitle}>
                  {t('learn.lessonViewer.lessonsCompletedCount', { completed: completedLessonsCount, total: flattenedLessons.length })}
                </Text>
              </View>
              <Text style={styles.progressValue}>{courseProgressPercentage}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${courseProgressPercentage}%` }]} />
            </View>
            <Text style={styles.progressHint}>
              {t('learn.lessonViewer.itemOf', { item: Math.max(1, currentLessonIndex + 1), total: flattenedLessons.length })}
            </Text>
          </View>
        ) : null}

        {course ? (
      <View style={styles.playlistCard}>
        <Text style={styles.playlistTitle}>{t('learn.lessonViewer.courseContent')}</Text>
        {course.sections && course.sections.length > 0 ? (
          // Hierarchical Playlist
          course.sections.map((section, sIndex) => (
            <View key={section.id} style={styles.sectionEntry}>
              <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{t('learn.lessonViewer.sectionTitle', { index: sIndex + 1, title: section.title.toUpperCase() })}</Text>
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
                    <View style={[styles.playlistIndex, isActive && { backgroundColor: ColorScale.primary[600] }, courseLesson.isCompleted && { backgroundColor: Colors.success.main }]}>
                      {courseLesson.isCompleted ? (
                        <Ionicons name="checkmark" size={12} color={Colors.white} />
                      ) : isLocked ? (
                        <Ionicons name="lock-closed" size={11} color={Colors.white} />
                      ) : (
                        <Text style={styles.playlistIndexText}>{courseLesson.order + 1}</Text>
                      )}
                    </View>
                    <View style={styles.playlistBody}>
                      <Text style={[styles.playlistItemTitle, isActive && { color: ColorScale.primary[600] }]} numberOfLines={1}>{courseLesson.title}</Text>
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
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                ) : courseLesson.isLocked ? (
                  <Ionicons name="lock-closed" size={11} color={Colors.white} />
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
          <Ionicons name="chevron-back" size={16} color={Colors.white} />
          <Text style={styles.secondaryButtonText}>{t('learn.lessonViewer.previous')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, (lesson.isCompleted || completing) && styles.disabledButton]}
          onPress={handleMarkComplete}
          disabled={lesson.isCompleted || completing}
        >
          {completing ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.white} />
              <Text style={styles.primaryButtonText}>{lesson.isCompleted ? t('learn.courseDetail.doneTag') : t('learn.lessonViewer.complete')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, !nextLesson && styles.disabledButton]}
          onPress={() => nextLesson && openLesson(nextLesson.id)}
          disabled={!nextLesson}
        >
          <Text style={styles.secondaryButtonText}>{t('learn.lessonViewer.next')}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSafe: {
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize[15],
    lineHeight: 22,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  header: {
    height: 52,
    backgroundColor: colors.card,
    paddingHorizontal: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: Typography.fontSize[15],
    lineHeight: 22,
    fontWeight: Typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing[3],
  },
  lessonCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing[3],
    ...Shadows.lg,
    shadowColor: isDark ? 'transparent' : ColorScale.gray[900],
  },
  progressCard: {
    marginTop: Spacing[3],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
    padding: Spacing[3],
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressIconWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.xl,
    backgroundColor: isDark ? 'rgba(29,155,240,0.18)' : ColorScale.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  progressTextWrap: {
    flex: 1,
  },
  progressTitle: {
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
  },
  progressSubtitle: {
    marginTop: Spacing[0],
    fontSize: Typography.fontSize[11],
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  progressValue: {
    fontSize: Typography.fontSize[18],
    fontWeight: Typography.fontWeight.bold,
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: isDark ? 'rgba(29,155,240,0.22)' : ColorScale.primary[100],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primary,
  },
  progressHint: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize[11],
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  lessonTitle: {
    fontSize: Typography.fontSize[18],
    color: colors.text,
    fontWeight: Typography.fontWeight.bold,
  },
  lessonMetaRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  lessonMetaText: {
    fontSize: Typography.fontSize[12],
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  localeSection: {
    marginTop: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  localeSectionLabel: {
    fontSize: Typography.fontSize[12],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  localeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  localeChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  localeChipActive: {
    borderColor: colors.primary,
    backgroundColor: isDark ? 'rgba(29,155,240,0.18)' : ColorScale.primary[100],
  },
  localeChipText: {
    fontSize: Typography.fontSize[12],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  localeChipTextActive: {
    color: colors.primary,
  },
  lessonContent: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize[14],
    color: colors.text,
    lineHeight: 22,
  },
  documentLessonCard: {
    marginVertical: Spacing[3],
    borderRadius: BorderRadius[20],
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99,102,241,0.34)' : 'rgba(99,102,241,0.2)',
    backgroundColor: isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.06)',
    padding: Spacing.md,
  },
  documentHero: {
    alignItems: 'center',
  },
  documentHeroIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    shadowColor: isDark ? 'transparent' : Colors.black,
  },
  documentHeroTitle: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize[17],
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.text,
    textAlign: 'center',
  },
  documentHeroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize[12],
    color: colors.textSecondary,
    textAlign: 'center',
  },
  documentGuideCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99,102,241,0.34)' : 'rgba(99,102,241,0.16)',
    padding: Spacing.md,
  },
  documentGuideEyebrow: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.secondary,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  documentGuideText: {
    fontSize: Typography.fontSize[13],
    lineHeight: 21,
    color: colors.textSecondary,
  },
  inlinePreviewCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99,102,241,0.34)' : 'rgba(99,102,241,0.16)',
    padding: Spacing.md,
    gap: Spacing[3],
  },
  inlinePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  inlinePreviewTitle: {
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.text,
  },
  inlinePreviewHint: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondary,
  },
  inlinePreviewImage: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.surfaceVariant,
  },
  inlinePreviewText: {
    fontSize: Typography.fontSize[13],
    lineHeight: 21,
    color: colors.textSecondary,
  },
  inlinePreviewButton: {
    minHeight: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99,102,241,0.34)' : 'rgba(99,102,241,0.2)',
    backgroundColor: isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing[3],
  },
  inlinePreviewButtonText: {
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondary,
  },
  documentPrimaryButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  documentPrimaryButtonText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.extrabold,
    fontSize: Typography.fontSize[14],
  },
  documentFallbackText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize[12],
    color: colors.textSecondary,
    textAlign: 'center',
  },
  documentActionGrid: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  documentActionButton: {
    flex: 1,
    minWidth: 96,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99,102,241,0.34)' : 'rgba(99,102,241,0.2)',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing[3],
  },
  documentActionText: {
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.secondary,
  },
  documentMetaRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    gap: Spacing[3],
  },
  documentMetaCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99,102,241,0.34)' : 'rgba(99,102,241,0.16)',
    padding: Spacing[3],
  },
  documentMetaLabel: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondary,
    textTransform: 'uppercase',
  },
  documentMetaValue: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize[14],
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.text,
  },
  resourcesSection: {
    marginTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Spacing[3],
    gap: Spacing.sm,
  },
  resourcesTitle: {
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
  },
  resourceCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: Spacing[3],
    gap: Spacing.sm,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  resourceText: {
    fontSize: Typography.fontSize[13],
    color: ColorScale.primary[600],
    fontWeight: Typography.fontWeight.semibold,
  },
  resourceMetaInline: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize[11],
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  resourceActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  resourceMiniAction: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resourceMiniActionText: {
    fontSize: Typography.fontSize[12],
    fontWeight: Typography.fontWeight.bold,
    color: ColorScale.primary[600],
  },
  qaButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  qaButtonText: {
    fontSize: Typography.fontSize[14],
    color: colors.text,
    fontWeight: Typography.fontWeight.semibold
  },
  playlistCard: {
    marginTop: Spacing[3],
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing[3],
  },
  playlistTitle: {
    fontSize: Typography.fontSize[14],
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.text,
    marginBottom: Spacing.sm,
  },
  sectionEntry: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: Spacing.sm,
  },
  sectionHeaderText: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.sm,
  },
  playlistItemActive: {
    backgroundColor: isDark ? 'rgba(29,155,240,0.16)' : ColorScale.primary[50],
    borderColor: colors.primary,
  },
  playlistItemLocked: {
    opacity: 0.6,
  },
  playlistIndex: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.lg,
    backgroundColor: ColorScale.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistIndexText: {
    fontSize: Typography.fontSize[11],
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  playlistBody: {
    flex: 1,
  },
  playlistItemTitle: {
    fontSize: Typography.fontSize[13],
    color: colors.text,
    fontWeight: Typography.fontWeight.bold,
  },
  playlistMetaText: {
    fontSize: Typography.fontSize[11],
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 1.2,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ColorScale.primary[600],
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadows.lg,
    shadowColor: ColorScale.primary[600],
  },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textSecondary,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize[13],
  },
  secondaryButtonText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize[12],
  },
});
