/**
 * PracticeSessionScreen — one-question-at-a-time practice for a Learn unit.
 * Immediate right/wrong feedback + explanation per question; answers flow
 * through the reels interaction pipeline (XP, combo, SM-2 recall) via
 * learnPathService.submitAnswer. Ends with a session summary.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { learnPathService, PracticeQuestion } from '@/services/learnPath.service';
import { LearnStackScreenProps } from '@/navigation/types';

type Props = LearnStackScreenProps<'PracticeSession'>;

export function PracticeSessionScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { topicId, title } = route.params;

  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    learnPathService
      .getPractice(topicId)
      .then(setQuestions)
      .catch(() => setQuestions([]));
  }, [topicId]);

  const question = questions?.[index] ?? null;

  const choose = useCallback(
    (optionIndex: number) => {
      if (!question || revealed) return;
      const correct = optionIndex === question.correctIndex;
      setChosen(optionIndex);
      setRevealed(true);
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
      if (correct) setCorrectCount((c) => c + 1);

      // Fire-and-forget: reward/persistence must never block the UI.
      learnPathService
        .submitAnswer(question, optionIndex)
        .then((result) => {
          const earned = (result.xpEarned ?? 0) + (result.comboBonus ?? 0);
          if (earned > 0) setXpTotal((xp) => xp + earned);
        })
        .catch((err) => console.warn('[Practice] submit failed', err));
    },
    [question, revealed],
  );

  const next = useCallback(() => {
    if (!questions) return;
    Haptics.selectionAsync();
    if (index + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
      setChosen(null);
      setRevealed(false);
    }
  }, [questions, index]);

  const progressPct = questions && questions.length > 0 ? ((index + (revealed ? 1 : 0)) / questions.length) * 100 : 0;

  // ── Option style per state ────────────────────────────────
  const optionStyle = (i: number) => {
    if (!revealed) return [styles.option];
    if (question && i === question.correctIndex) return [styles.option, styles.optionCorrect];
    if (i === chosen) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionFaded];
  };
  const optionTextStyle = (i: number) => {
    if (!revealed) return [styles.optionText];
    if (question && i === question.correctIndex) return [styles.optionText, styles.optionTextOn];
    if (i === chosen) return [styles.optionText, styles.optionTextOn];
    return [styles.optionText, { color: colors.textTertiary }];
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <View style={styles.xpPill}>
          <Ionicons name="flash" size={13} color="#F59E0B" />
          <Text style={styles.xpPillText}>{xpTotal}</Text>
        </View>
      </View>

      {!questions && <ActivityIndicator style={{ marginTop: 60 }} color={colors.textSecondary} />}

      {questions && questions.length === 0 && (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>{t('learn.path.practiceEmpty')}</Text>
        </View>
      )}

      {finished && (
        <View style={styles.centerBox}>
          <Ionicons
            name={correctCount === questions!.length ? 'trophy' : 'ribbon'}
            size={56}
            color={correctCount === questions!.length ? '#F59E0B' : '#0EA5E9'}
          />
          <Text style={styles.doneTitle}>{t('learn.path.sessionDone')}</Text>
          <Text style={styles.doneStats}>
            {t('learn.path.sessionStats', { correct: correctCount, total: questions!.length })}
          </Text>
          {xpTotal > 0 && <Text style={styles.doneXp}>+{xpTotal} XP</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>{t('learn.path.backToPath')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!finished && question && (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.unitLabel} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.questionText}>{question.text}</Text>

          <View style={styles.optionsList}>
            {question.options.map((opt, i) => (
              <TouchableOpacity
                key={`${question.id}-${i}`}
                style={optionStyle(i)}
                onPress={() => choose(i)}
                disabled={revealed}
                activeOpacity={0.8}
              >
                <Text style={optionTextStyle(i)}>{opt}</Text>
                {revealed && i === question.correctIndex && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                )}
                {revealed && i === chosen && i !== question.correctIndex && (
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {revealed && (
            <View
              style={[
                styles.feedbackBox,
                chosen === question.correctIndex ? styles.feedbackCorrect : styles.feedbackWrong,
              ]}
            >
              <Text style={styles.feedbackTitle}>
                {chosen === question.correctIndex
                  ? t('learn.path.correct')
                  : t('learn.path.incorrect')}
              </Text>
              {!!question.explanation && (
                <Text style={styles.feedbackText}>{question.explanation}</Text>
              )}
            </View>
          )}

          {revealed && (
            <TouchableOpacity style={styles.primaryButton} onPress={next}>
              <Text style={styles.primaryButtonText}>
                {index + 1 >= (questions?.length ?? 0)
                  ? t('learn.path.finish')
                  : t('learn.path.continue')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    progressTrack: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      backgroundColor: isDark ? colors.surfaceVariant : colors.border,
      overflow: 'hidden',
    },
    progressFill: { height: 10, borderRadius: 5, backgroundColor: '#10B981' },
    xpPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
    },
    xpPillText: { fontSize: 13, fontWeight: '700', color: colors.text },
    body: { padding: 20, paddingBottom: 48 },
    unitLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    questionText: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 28, marginBottom: 24 },
    optionsList: { gap: 12 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    optionCorrect: { backgroundColor: '#10B981', borderColor: '#10B981' },
    optionWrong: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    optionFaded: { opacity: 0.5 },
    optionText: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
    optionTextOn: { color: '#FFFFFF' },
    feedbackBox: { marginTop: 20, borderRadius: 14, padding: 14 },
    feedbackCorrect: { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' },
    feedbackWrong: { backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2' },
    feedbackTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    feedbackText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
    primaryButton: {
      marginTop: 20,
      paddingVertical: 15,
      borderRadius: 16,
      backgroundColor: '#0EA5E9',
      alignItems: 'center',
    },
    primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    doneTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8 },
    doneStats: { fontSize: 15, color: colors.textSecondary },
    doneXp: { fontSize: 17, fontWeight: '800', color: '#F59E0B' },
  });
