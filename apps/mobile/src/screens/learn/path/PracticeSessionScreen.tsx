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
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { learnPathService, PracticeQuestion } from '@/services/learnPath.service';
import { LearnStackScreenProps } from '@/navigation/types';

type OptionButtonProps = {
  children: React.ReactNode;
  onPress: () => void;
  style: any;
  disabled: boolean;
  activeOpacity: number;
};

function OptionButton({
  children,
  onPress,
  style,
  disabled,
  activeOpacity,
}: OptionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
        disabled={disabled}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

type Props = LearnStackScreenProps<'PracticeSession'>;

export function PracticeSessionScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { topicId, title, grade, subjectName, subjectNameKh } = route.params;
  const insets = useSafeAreaInsets();

  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [finished, setFinished] = useState(false);

  const translateY = useSharedValue(500);

  const loadQuestions = useCallback(() => {
    setLoadError(false);
    setQuestions(null);
    learnPathService
      .getPractice(topicId)
      .then(setQuestions)
      .catch(() => {
        setQuestions(null);
        setLoadError(true);
      });
  }, [topicId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const question = questions?.[index] ?? null;

  useEffect(() => {
    if (revealed) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    } else {
      translateY.value = 500;
    }
  }, [revealed, translateY]);

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

  // Runs on the JS thread — must be a named JS-scope function so runOnJS can
  // reference it (an arrow created inside the worklet has no JS reference and
  // would throw / silently fail to advance).
  const advance = useCallback(() => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
      setChosen(null);
      setRevealed(false);
    }
  }, [questions, index]);

  const next = useCallback(() => {
    if (!questions) return;
    Haptics.selectionAsync();

    // Slide the feedback sheet down, then advance on the JS thread.
    translateY.value = withTiming(500, { duration: 250 }, (done) => {
      if (done) runOnJS(advance)();
    });
  }, [questions, translateY, advance]);

  const progressPct = questions && questions.length > 0 ? ((index + (revealed ? 1 : 0)) / questions.length) * 100 : 0;

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

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
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            Haptics.selectionAsync();
            navigation.navigate('TutorChat', { topicId, title, grade, subjectName, subjectNameKh });
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      {!questions && !loadError && <ActivityIndicator style={{ marginTop: 60 }} color={colors.textSecondary} />}

      {loadError && (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t('learn.path.loadError')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQuestions}>
            <Text style={styles.retryButtonText}>{t('learn.path.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

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
        <>
          <ScrollView
            contentContainerStyle={[
              styles.body,
              { paddingBottom: revealed ? 240 + insets.bottom : 48 }
            ]}
          >
            <Text style={styles.unitLabel} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.questionText}>{question.text}</Text>

            <View style={styles.optionsList}>
              {question.options.map((opt, i) => (
                <OptionButton
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
                </OptionButton>
              ))}
            </View>
          </ScrollView>

          {revealed && (
            <Animated.View
              style={[
                styles.bottomSheet,
                chosen === question.correctIndex ? styles.sheetCorrect : styles.sheetWrong,
                animatedSheetStyle,
              ]}
            >
              <View style={styles.sheetHeader}>
                <Ionicons
                  name={chosen === question.correctIndex ? 'checkmark-circle' : 'close-circle'}
                  size={28}
                  color={chosen === question.correctIndex ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: chosen === question.correctIndex ? (isDark ? '#34D399' : '#065F46') : (isDark ? '#FCA5A5' : '#991B1B') }
                  ]}
                >
                  {chosen === question.correctIndex
                    ? t('learn.path.correct')
                    : t('learn.path.incorrect')}
                </Text>
              </View>

              {!!question.explanation && (
                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  <Text
                    style={[
                      styles.sheetExplanation,
                      { color: chosen === question.correctIndex ? (isDark ? '#A7F3D0' : '#047857') : (isDark ? '#FECACA' : '#B91C1C') }
                    ]}
                  >
                    {question.explanation}
                  </Text>
                </ScrollView>
              )}

              <TouchableOpacity
                style={[
                  styles.sheetButton,
                  chosen === question.correctIndex ? styles.sheetButtonCorrect : styles.sheetButtonWrong
                ]}
                onPress={next}
                activeOpacity={0.85}
              >
                <Text style={styles.sheetButtonText}>
                  {index + 1 >= (questions?.length ?? 0)
                    ? t('learn.path.finish')
                    : t('learn.path.continue')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
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
    retryButton: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: '#0EA5E9',
    },
    retryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
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

    // Bottom Sheet Styles
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 2,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 24,
    },
    sheetCorrect: {
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      borderColor: isDark ? '#059669' : '#A7F3D0',
    },
    sheetWrong: {
      backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2',
      borderColor: isDark ? '#DC2626' : '#FCA5A5',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '800',
    },
    sheetScroll: {
      maxHeight: 90,
      marginBottom: 14,
    },
    sheetScrollContent: {
      paddingRight: 8,
    },
    sheetExplanation: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    sheetButton: {
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    sheetButtonCorrect: {
      backgroundColor: '#10B981',
    },
    sheetButtonWrong: {
      backgroundColor: '#EF4444',
    },
    sheetButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
