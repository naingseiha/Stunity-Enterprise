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
  Image,
  Share,
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
import { MarkdownMathView } from '@/components/learn/MarkdownMathView';

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
  const { topicId, subjectId, title, grade, subjectName, subjectNameKh, minDifficulty, maxDifficulty } = route.params;
  const insets = useSafeAreaInsets();

  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [finished, setFinished] = useState(false);

  // Mistake-review round: missed questions are replayed once before the
  // session ends. sessionTotal/everMissed are captured separately from
  // `questions` so the results screen's "X/Y" and "perfect" state still
  // reflect the original session length once `questions` gets swapped to
  // the (shorter) review round.
  const [wrongQuestions, setWrongQuestions] = useState<PracticeQuestion[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [everMissed, setEverMissed] = useState(false);
  const [sessionTotal, setSessionTotal] = useState(0);

  const translateY = useSharedValue(500);

  const loadQuestions = useCallback(() => {
    setLoadError(false);
    setQuestions(null);
    setWrongQuestions([]);
    setReviewMode(false);
    setEverMissed(false);
    learnPathService
      .getPractice({ topicId, subjectId }, 10, { minDifficulty, maxDifficulty })
      .then((qs) => {
        setQuestions(qs);
        setSessionTotal(qs.length);
      })
      .catch(() => {
        setQuestions(null);
        setLoadError(true);
      });
  }, [topicId, subjectId, minDifficulty, maxDifficulty]);

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
      if (correct) {
        setCorrectCount((c) => c + 1);
      } else {
        setEverMissed(true);
        // Only queue for review the first time it's missed — during the
        // review round itself, a repeat miss just stays missed for this pass.
        if (!reviewMode) setWrongQuestions((w) => [...w, question]);
      }

      // Fire-and-forget: reward/persistence must never block the UI.
      learnPathService
        .submitAnswer(question, optionIndex)
        .then((result) => {
          const earned = (result.xpEarned ?? 0) + (result.comboBonus ?? 0);
          if (earned > 0) setXpTotal((xp) => xp + earned);
        })
        .catch((err) => console.warn('[Practice] submit failed', err));
    },
    [question, revealed, reviewMode],
  );

  // Runs on the JS thread — must be a named JS-scope function so runOnJS can
  // reference it (an arrow created inside the worklet has no JS reference and
  // would throw / silently fail to advance).
  const advance = useCallback(() => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      if (!reviewMode && wrongQuestions.length > 0) {
        // One review pass through everything missed this round, then finish.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setReviewMode(true);
        setQuestions(wrongQuestions);
        setWrongQuestions([]);
        setIndex(0);
        setChosen(null);
        setRevealed(false);
      } else {
        setFinished(true);
      }
    } else {
      setIndex(index + 1);
      setChosen(null);
      setRevealed(false);
    }
  }, [questions, index, reviewMode, wrongQuestions]);

  const next = useCallback(() => {
    if (!questions) return;
    Haptics.selectionAsync();

    // Slide the feedback sheet down, then advance on the JS thread.
    translateY.value = withTiming(500, { duration: 250 }, (done) => {
      if (done) runOnJS(advance)();
    });
  }, [questions, translateY, advance]);

  const shareResults = useCallback(async () => {
    try {
      await Share.share({
        message: t('quiz.result.shareMessage', {
          defaultValue: 'I scored {{score}}/{{total}} on "{{title}}" and earned {{xp}} XP on Stunity!',
          score: correctCount,
          total: sessionTotal,
          title,
          xp: xpTotal,
        }),
      });
    } catch (err) {
      console.warn('[Practice] share failed', err);
    }
  }, [sessionTotal, correctCount, xpTotal, title, t]);

  const retakeQuiz = useCallback(() => {
    setIndex(0);
    setChosen(null);
    setRevealed(false);
    setCorrectCount(0);
    setXpTotal(0);
    setFinished(false);
    loadQuestions();
  }, [loadQuestions]);

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
    <SafeAreaView style={[styles.safe, finished && { backgroundColor: '#1B1E38' }]} edges={['top']}>
      {!finished && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerSubjectTitle}>
                {reviewMode
                  ? t('learn.path.reviewingMistakes', 'Reviewing Mistakes')
                  : (subjectNameKh || subjectName || t('quiz.takeQuiz.practice', 'Practice'))}
              </Text>
              {questions && questions.length > 0 && (
                <Text style={styles.questionCounterText}>
                  {t('quiz.takeQuiz.question', 'Question')}{' '}
                  <Text style={styles.questionCounterHighlight}>{String(index + 1).padStart(2, '0')}</Text>
                  /{String(questions.length).padStart(2, '0')}
                </Text>
              )}
            </View>
            <View style={styles.xpPill}>
              <Ionicons name="flash" size={14} color="#F59E0B" />
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

          {/* Segmented Progress Row */}
          {questions && questions.length > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                {questions.map((_, qIdx) => {
                  const isActive = qIdx === index;
                  const isCompleted = qIdx < index;
                  return (
                    <View
                      key={qIdx}
                      style={[
                        styles.progressSegment,
                        isCompleted && styles.progressSegmentCompleted,
                        isActive && styles.progressSegmentActive,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}

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
        <View style={[styles.resultFullContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Confetti Background */}
          <View style={styles.confettiContainer}>
            <View style={[styles.vectorConfettiCircle, { top: '10%', left: '15%', backgroundColor: '#F59E0B', width: 10, height: 10 }]} />
            <View style={[styles.vectorConfettiPill, { top: '20%', right: '18%', backgroundColor: '#0EA5E9', transform: [{ rotate: '25deg' }] }]} />
            <View style={[styles.vectorConfettiDiamond, { top: '35%', left: '22%', backgroundColor: '#10B981', transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.vectorConfettiCircle, { top: '50%', right: '25%', backgroundColor: '#EC4899', width: 8, height: 8 }]} />
            <View style={[styles.vectorConfettiPill, { top: '60%', left: '12%', backgroundColor: '#8B5CF6', transform: [{ rotate: '-30deg' }] }]} />
            <View style={[styles.vectorConfettiDiamond, { top: '75%', right: '15%', backgroundColor: '#F59E0B', transform: [{ rotate: '15deg' }] }]} />
            <View style={[styles.vectorConfettiCircle, { top: '85%', left: '28%', backgroundColor: '#0EA5E9', width: 12, height: 12 }]} />
            
            <View style={[styles.vectorConfettiCircle, { top: '25%', left: '35%', backgroundColor: '#F59E0B', width: 8, height: 8 }]} />
            <View style={[styles.vectorConfettiDiamond, { top: '15%', right: '35%', backgroundColor: '#EC4899', transform: [{ rotate: '15deg' }] }]} />
            <View style={[styles.vectorConfettiPill, { top: '45%', right: '10%', backgroundColor: '#F59E0B', transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.vectorConfettiCircle, { top: '80%', left: '8%', backgroundColor: '#10B981', width: 10, height: 10 }]} />
            <View style={[styles.vectorConfettiPill, { top: '30%', right: '5%', backgroundColor: '#8B5CF6', transform: [{ rotate: '60deg' }] }]} />
          </View>
          
          <View style={styles.resultHeaderDark}>
            <Text style={styles.resultHeaderDarkText}>{t('quiz.result.title', 'Quiz Result')}</Text>
          </View>

          <View style={styles.badgeContainerDark}>
            <Image 
              source={require('../../../../assets/award.png')} 
              style={{ width: 220, height: 220 }} 
              resizeMode="contain" 
            />
          </View>

          <View style={styles.resultMiddleSectionDark}>
            <Text style={styles.resultMainTitleDark}>
              {!everMissed
                ? t('quiz.result.perfectTitle', { defaultValue: 'Congratulations!' })
                : t('quiz.result.doneTitle', { defaultValue: 'Milestone Unlocked!' })}
            </Text>
            <Text style={styles.resultDescTextDark}>
              {!everMissed
                ? t('quiz.result.perfectDesc', { defaultValue: "You've successfully reached your learning goal. Every little step added up to something great!" })
                : t('quiz.result.doneDesc', { defaultValue: "You've successfully completed this practice session. Every little step added up to something great!" })}
            </Text>
          </View>

          <View style={styles.scoreSectionDark}>
            <Text style={styles.scoreLabelDark}>{t('quiz.result.yourScore', 'YOUR SCORE')}</Text>
            <View style={styles.scoreValueRowDark}>
              <Text style={styles.scoreValueHighlightDark}>{correctCount}</Text>
              <Text style={styles.scoreValueBaseDark}> / {sessionTotal}</Text>
            </View>

            <Text style={[styles.scoreLabelDark, { marginTop: 32 }]}>{t('quiz.result.earnedCoins', 'EARNED COINS')}</Text>
            <View style={styles.xpValueRowDark}>
              <Ionicons name="server" size={26} color="#F59E0B" />
              <Text style={styles.xpValueBaseDark}>{xpTotal}</Text>
            </View>
          </View>

          <View style={styles.footerButtonsRowDark}>
            <TouchableOpacity
              style={styles.btnShareDark}
              onPress={() => {
                Haptics.selectionAsync();
                shareResults();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social" size={20} color="#1E293B" style={{ marginRight: 8 }} />
              <Text style={styles.btnShareTextDark}>
                {t('quiz.result.shareResults', 'Share Results')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnTakeNewDark}
              onPress={() => {
                Haptics.selectionAsync();
                retakeQuiz();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnTakeNewTextDark}>
                {t('quiz.takeQuiz.takeNew', 'Take New Quiz')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.closeBtnWrapperDark}>
             <TouchableOpacity style={styles.btnCloseCircleDark} onPress={() => navigation.goBack()} activeOpacity={0.7}>
               <Ionicons name="close" size={22} color="#FFFFFF" />
             </TouchableOpacity>
          </View>
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
            <View style={{ marginBottom: 20 }}>
              <MarkdownMathView text={question.text} colors={colors} isDark={isDark} minHeight={50} />
            </View>

            <View style={styles.optionsList}>
              {question.options.map((opt, i) => {
                const isMath = /(\$|\\|\^|_)/.test(opt);
                const displayOpt = opt === 'TRUE' ? t('quiz.takeQuiz.true', 'True / ពិត') : opt === 'FALSE' ? t('quiz.takeQuiz.false', 'False / មិនពិត') : opt;
                return (
                  <OptionButton
                    key={`${question.id}-${i}`}
                    style={optionStyle(i)}
                    onPress={() => choose(i)}
                    disabled={revealed}
                    activeOpacity={0.85}
                  >
                    {isMath ? (
                      <View style={{ flex: 1, pointerEvents: 'none' }}>
                        <MarkdownMathView text={opt} colors={colors} isDark={isDark} minHeight={35} />
                      </View>
                    ) : (
                      <Text style={optionTextStyle(i)}>{displayOpt}</Text>
                    )}
                    
                    {/* Modern Radio Indicator */}
                    {!revealed && (
                      <View style={styles.optionRadio} />
                    )}
                    {revealed && i === question.correctIndex && (
                      <View style={[styles.optionRadio, styles.optionRadioCorrect]}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                    {revealed && i === chosen && i !== question.correctIndex && (
                      <View style={[styles.optionRadio, styles.optionRadioWrong]}>
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </View>
                    )}
                    {revealed && i !== chosen && i !== question.correctIndex && (
                      <View style={[styles.optionRadio, { opacity: 0.3 }]} />
                    )}
                  </OptionButton>
                );
              })}
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
                  <View style={{ pointerEvents: 'none' }}>
                    <MarkdownMathView text={question.explanation} colors={colors} isDark={isDark} minHeight={45} />
                  </View>
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
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F8FAFC',
    },
    headerTitleContainer: {
      alignItems: 'center',
      flex: 1,
      marginHorizontal: 12,
    },
    headerSubjectTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    questionCounterText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 2,
    },
    questionCounterHighlight: {
      color: '#0EA5E9',
      fontWeight: '800',
    },
    xpPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
    },
    xpPillText: { fontSize: 13, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706' },
    
    // Segmented Progress Bar
    progressContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    progressTrack: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 6,
    },
    progressSegment: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
    },
    progressSegmentActive: {
      backgroundColor: '#0EA5E9',
    },
    progressSegmentCompleted: {
      backgroundColor: '#10B981',
    },

    body: { padding: 20, paddingBottom: 48 },
    unitLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
    questionText: { fontSize: 20, fontWeight: '800', color: colors.text, lineHeight: 28, marginBottom: 24 },
    optionsList: { gap: 12 },
    
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    },
    optionCorrect: {
      borderColor: '#10B981',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#E6F4EA',
    },
    optionWrong: {
      borderColor: '#EF4444',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FCE8E6',
    },
    optionFaded: {
      opacity: 0.4,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    },
    optionText: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: colors.text, flex: 1 },
    optionTextOn: { color: colors.text },
    
    optionRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.24)' : '#CBD5E1',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    optionRadioCorrect: {
      borderColor: '#10B981',
      backgroundColor: '#10B981',
    },
    optionRadioWrong: {
      borderColor: '#EF4444',
      backgroundColor: '#EF4444',
    },

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
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    
    // Quiz Result Screen Styles (Dark Mode Custom Layout)
    resultFullContainer: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 24,
      paddingTop: 16,
      justifyContent: 'space-between',
      backgroundColor: '#1B1E38',
    },
    confettiContainer: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
      pointerEvents: 'none',
      opacity: 0.5,
    },
    vectorConfettiCircle: { position: 'absolute', borderRadius: 100 },
    vectorConfettiPill: { position: 'absolute', width: 16, height: 6, borderRadius: 3 },
    vectorConfettiDiamond: { position: 'absolute', width: 10, height: 10, borderRadius: 2 },
    
    resultHeaderDark: {
      alignItems: 'center',
      marginBottom: 20,
    },
    resultHeaderDarkText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    badgeContainerDark: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 10,
    },
    resultMiddleSectionDark: {
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    resultMainTitleDark: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: 12,
    },
    resultDescTextDark: {
      fontSize: 14,
      lineHeight: 22,
      color: '#94A3B8',
      textAlign: 'center',
    },
    scoreSectionDark: {
      alignItems: 'center',
      marginVertical: 16,
    },
    scoreLabelDark: {
      fontSize: 12,
      fontWeight: '700',
      color: '#64748B',
      letterSpacing: 2,
      marginBottom: 8,
    },
    scoreValueRowDark: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
    },
    scoreValueHighlightDark: {
      fontSize: 48,
      fontWeight: '800',
      color: '#00D09C',
    },
    scoreValueBaseDark: {
      fontSize: 40,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    xpValueRowDark: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    xpValueBaseDark: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFFFFF',
      marginLeft: 8,
    },
    footerButtonsRowDark: {
      flexDirection: 'row',
      width: '100%',
      gap: 12,
      marginBottom: 20,
    },
    btnShareDark: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnShareTextDark: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1E293B',
    },
    btnTakeNewDark: {
      flex: 1,
      backgroundColor: '#00D09C',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnTakeNewTextDark: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    closeBtnWrapperDark: {
      alignItems: 'center',
      marginBottom: 10,
    },
    btnCloseCircleDark: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerPillSecondaryText: {
      fontSize: 15,
      fontWeight: '700',
    },

    // Bottom Sheet Styles
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
      paddingHorizontal: 24,
      paddingTop: 22,
      paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    sheetCorrect: {
      backgroundColor: isDark ? '#022C22' : '#F0FDF4',
      borderColor: isDark ? '#059669' : '#BBF7D0',
    },
    sheetWrong: {
      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
      borderColor: isDark ? '#DC2626' : '#FEE2E2',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: '800',
    },
    sheetScroll: {
      maxHeight: 120,
      marginBottom: 16,
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
      paddingVertical: 16,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
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
