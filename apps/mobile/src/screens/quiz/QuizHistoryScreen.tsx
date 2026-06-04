/**
 * QuizHistoryScreen (WI5)
 *
 * A per-quiz progress surface: attempt timeline, best/latest/average score,
 * pass-rate + trend, and per-question accuracy (weak questions highlighted),
 * with explicit Retake / Review-results entry points. Paginated + uses the
 * cached-friendly /quizzes/:id/history endpoint (no per-attempt calls).
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { track } from '@/services/analytics';
import {
  getQuizHistory,
  getLatestQuizAttempt,
  QuizHistory,
  QuizHistoryAttempt,
} from '@/services/quiz';

type QuizHistoryRoute = RouteProp<{ QuizHistory: { quizId: string; title?: string } }, 'QuizHistory'>;

const PAGE_SIZE = 20;
// Per-question accuracy at/below this is surfaced as a "weak" topic to review.
const WEAK_ACCURACY = 60;

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · ' +
        d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

export default function QuizHistoryScreen() {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<QuizHistoryRoute>();
  const { quizId, title } = route.params;

  const [history, setHistory] = useState<QuizHistory | null>(null);
  const [timeline, setTimeline] = useState<QuizHistoryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'more') setLoadingMore(true);
      else if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const data = await getQuizHistory(quizId, targetPage, PAGE_SIZE);
        if (data) {
          setHistory(data);
          setTimeline((prev) => (targetPage === 1 ? data.timeline : [...prev, ...data.timeline]));
          setPage(targetPage);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [quizId],
  );

  useFocusEffect(
    useCallback(() => {
      track('quiz_history_open', { quizId });
      load(1, 'initial');
    }, [load, quizId]),
  );

  const onRefresh = useCallback(() => load(1, 'refresh'), [load]);

  const onEndReached = useCallback(() => {
    if (loadingMore || !history) return;
    if (page >= history.pagination.pages) return;
    load(page + 1, 'more');
  }, [loadingMore, history, page, load]);

  const handleRetake = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    track('quiz_history_retake', { quizId });
    navigation.navigate('QuizDetails', { quiz: { id: quizId, title: title || history?.quiz.title } });
  }, [navigation, quizId, title, history]);

  const handleReviewLatest = useCallback(async () => {
    if (reviewing) return;
    setReviewing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    track('quiz_history_review', { quizId });
    try {
      const attempt = await getLatestQuizAttempt(quizId);
      if (!attempt) {
        navigation.navigate('QuizDetails', { quiz: { id: quizId, title: title || history?.quiz.title } });
        return;
      }
      navigation.navigate('QuizResults', {
        quiz: { id: quizId, title: title || history?.quiz.title, passingScore: history?.quiz.passingScore },
        viewMode: true,
        score: attempt.score,
        passed: attempt.passed,
        pointsEarned: attempt.pointsEarned,
        results: attempt.results,
        answers: attempt.answers,
      });
    } finally {
      setReviewing(false);
    }
  }, [navigation, quizId, title, history, reviewing]);

  const agg = history?.aggregates;
  const trendIcon = agg?.trend === 'up' ? 'trending-up' : agg?.trend === 'down' ? 'trending-down' : 'remove';
  const trendColor = agg?.trend === 'up' ? '#10B981' : agg?.trend === 'down' ? '#EF4444' : colors.textTertiary;
  const weakQuestions = (agg?.perQuestionAccuracy ?? []).filter((q) => q.total > 0 && q.accuracy <= WEAK_ACCURACY);

  const renderHeader = () => {
    if (!agg) return null;
    return (
      <View>
        {/* Score summary */}
        <View style={styles.statsGrid}>
          <StatCard styles={styles} label={t('quiz.history.best', { defaultValue: 'Best' })} value={`${agg.bestScore}%`} accent="#10B981" />
          <StatCard styles={styles} label={t('quiz.history.latest', { defaultValue: 'Latest' })} value={`${agg.latestScore}%`} accent={colors.primary} />
          <StatCard styles={styles} label={t('quiz.history.average', { defaultValue: 'Average' })} value={`${agg.averageScore}%`} accent="#F59E0B" />
        </View>
        <View style={styles.statsGrid}>
          <StatCard styles={styles} label={t('quiz.history.attempts', { defaultValue: 'Attempts' })} value={String(agg.attemptCount)} accent={colors.textSecondary} />
          <StatCard styles={styles} label={t('quiz.history.passRate', { defaultValue: 'Pass rate' })} value={`${agg.passRate}%`} accent="#10B981" />
          <View style={[styles.statCard, { borderColor: colors.border }]}>
            <View style={styles.trendRow}>
              <Ionicons name={trendIcon as any} size={20} color={trendColor} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('quiz.history.trend', { defaultValue: 'Trend' })}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.retakeBtn]}
            onPress={handleRetake}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('quiz.history.retake', { defaultValue: 'Retake quiz' })}
          >
            <Ionicons name="refresh" size={18} color="#FFF" />
            <Text style={styles.retakeBtnText}>{t('quiz.history.retake', { defaultValue: 'Retake quiz' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.reviewBtn, { borderColor: colors.border }]}
            onPress={handleReviewLatest}
            disabled={reviewing}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('quiz.history.reviewLatest', { defaultValue: 'Review latest' })}
          >
            {reviewing ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="eye-outline" size={18} color={colors.text} />
            )}
            <Text style={[styles.reviewBtnText, { color: colors.text }]}>{t('quiz.history.reviewLatest', { defaultValue: 'Review latest' })}</Text>
          </TouchableOpacity>
        </View>

        {/* Weak questions */}
        {weakQuestions.length > 0 && (
          <View style={[styles.weakCard, { borderColor: colors.border }]}>
            <View style={styles.weakHeader}>
              <Ionicons name="alert-circle" size={16} color="#F59E0B" />
              <Text style={[styles.weakTitle, { color: colors.text }]}>
                {t('quiz.history.weakTopics', { defaultValue: 'Questions to review' })}
              </Text>
            </View>
            {weakQuestions.map((q, i) => (
              <View key={q.questionId} style={styles.weakRow}>
                <Text style={[styles.weakQLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {t('quiz.history.questionN', { number: i + 1, defaultValue: `Question ${i + 1}` })}
                </Text>
                <View style={styles.accuracyTrack}>
                  <View style={[styles.accuracyFill, { width: `${q.accuracy}%`, backgroundColor: q.accuracy <= 40 ? '#EF4444' : '#F59E0B' }]} />
                </View>
                <Text style={[styles.weakPct, { color: colors.textTertiary }]}>{q.accuracy}%</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          {t('quiz.history.timeline', { defaultValue: 'Attempt history' })}
        </Text>
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: QuizHistoryAttempt; index: number }) => {
      const attemptNo = (history?.pagination.total ?? timeline.length) - index;
      return (
        <View style={[styles.attemptRow, { borderColor: colors.border }]}>
          <View style={[styles.attemptBadge, { backgroundColor: item.passed ? '#10B98122' : '#EF444422' }]}>
            <Ionicons
              name={item.passed ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={item.passed ? '#10B981' : '#EF4444'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.attemptTitle, { color: colors.text }]}>
              {t('quiz.history.attemptN', { number: attemptNo, defaultValue: `Attempt ${attemptNo}` })}
            </Text>
            <Text style={[styles.attemptDate, { color: colors.textTertiary }]}>{fmtDate(item.submittedAt)}</Text>
          </View>
          <View style={styles.attemptScoreWrap}>
            <Text style={[styles.attemptScore, { color: item.passed ? '#10B981' : '#EF4444' }]}>{item.score}%</Text>
            <Text style={[styles.attemptStatus, { color: colors.textTertiary }]}>
              {item.passed ? t('quiz.history.passed', { defaultValue: 'Passed' }) : t('quiz.history.failed', { defaultValue: 'Failed' })}
            </Text>
          </View>
        </View>
      );
    },
    [styles, colors, history, timeline.length, t],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title || history?.quiz.title || t('quiz.history.title', { defaultValue: 'Quiz history' })}
        </Text>
        <View style={styles.backButton} />
      </View>

      {loading && timeline.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !agg || agg.attemptCount === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('quiz.history.empty', { defaultValue: 'No attempts yet. Take the quiz to start your history.' })}
          </Text>
          <TouchableOpacity style={[styles.actionBtn, styles.retakeBtn, { marginTop: 16 }]} onPress={handleRetake} activeOpacity={0.85}>
            <Ionicons name="rocket" size={18} color="#FFF" />
            <Text style={styles.retakeBtnText}>{t('quiz.history.startQuiz', { defaultValue: 'Take quiz' })}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={timeline}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          estimatedItemSize={72}
          contentContainerStyle={styles.listContent}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const StatCard = ({ styles, label, value, accent }: { styles: any; label: string; value: string; accent: string }) => (
  <View style={[styles.statCard, { borderColor: accent + '40' }]}>
    <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const createStyles = (colors: any, _isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
    listContent: { padding: 16, paddingBottom: 40 },
    statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 64,
    },
    statValue: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, color: colors.textTertiary },
    trendRow: { height: 24, alignItems: 'center', justifyContent: 'center' },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 18 },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 12,
    },
    retakeBtn: { backgroundColor: colors.primary },
    retakeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    reviewBtn: { borderWidth: 1, backgroundColor: 'transparent' },
    reviewBtnText: { fontWeight: '700', fontSize: 15 },
    weakCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 18 },
    weakHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    weakTitle: { fontSize: 14, fontWeight: '700' },
    weakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    weakQLabel: { width: 92, fontSize: 13, fontWeight: '600' },
    accuracyTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceVariant ?? '#0001', overflow: 'hidden' },
    accuracyFill: { height: '100%', borderRadius: 4 },
    weakPct: { width: 40, textAlign: 'right', fontSize: 12, fontWeight: '700' },
    sectionHeader: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    attemptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    attemptBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    attemptTitle: { fontSize: 15, fontWeight: '700' },
    attemptDate: { fontSize: 12, marginTop: 2 },
    attemptScoreWrap: { alignItems: 'flex-end' },
    attemptScore: { fontSize: 18, fontWeight: '800' },
    attemptStatus: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  });
