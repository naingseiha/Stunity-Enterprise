import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { fetchQuizById } from '@/services/quiz';
import { normalizeQuiz, NormalizedQuiz } from '@/utils/quiz';
import { renderPostBodyText, renderPostTitleText } from '@/utils/renderEmojiText';

const PRIMARY = '#8B5CF6';

const STAT_META = [
  { icon: 'help-circle-outline' as const, label: 'Questions', color: '#EC4899', bg: '#FDF2F8', darkBg: '#2D0A1E' },
  { icon: 'time-outline' as const, label: 'Time', color: '#0EA5E9', bg: '#F0F9FF', darkBg: '#0A1E2D' },
  { icon: 'trophy-outline' as const, label: 'Points', color: '#F59E0B', bg: '#FFFBEB', darkBg: '#2D1A00' },
];

const RULES = [
  { icon: 'shield-checkmark-outline' as const, color: '#8B5CF6', key: 'ruleFocus' },
  { icon: 'timer-outline' as const, color: '#0EA5E9', key: 'ruleTimer' },
  { icon: 'checkmark-done-outline' as const, color: '#10B981', key: 'ruleReview' },
  { icon: 'cloud-upload-outline' as const, color: '#F59E0B', key: 'ruleSubmit' },
] as const;

export function QuizDetailsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = createStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const initialQuiz = route.params?.quiz;

  const [quiz, setQuiz] = useState<NormalizedQuiz | null>(() => normalizeQuiz(initialQuiz));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const normalized = normalizeQuiz(initialQuiz);
    if (!normalized?.id || normalized.questions.length > 0) { setQuiz(normalized); return; }
    setQuiz(normalized);
    setLoading(true);
    fetchQuizById(normalized.id)
      .then((f) => { if (!mounted) return; setQuiz(normalizeQuiz({ ...normalized, ...f })); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [initialQuiz]);

  const questionCount = quiz?.questions.length || 0;
  const timeLabelShort = useMemo(() => quiz?.timeLimit ? `${quiz.timeLimit}` : '∞', [quiz?.timeLimit]);
  const canStart = !!quiz && questionCount > 0 && !loading;

  const handleStart = useCallback(() => {
    if (!quiz) return;
    if (!canStart) { Alert.alert(t('quiz.details.unavailableTitle'), t('quiz.details.unavailableBody')); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('quiz.details.confirmTitle'), t('quiz.details.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('quiz.details.confirmStart'), onPress: () => navigation.navigate('TakeQuiz', { quiz }) },
    ]);
  }, [canStart, navigation, quiz, t]);

  const statValues = [String(questionCount), `${timeLabelShort} min`, String(quiz?.totalPoints || questionCount * 10)];

  if (!quiz) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}><Ionicons name="alert-circle-outline" size={40} color={PRIMARY} /></View>
          <Text style={styles.emptyTitle}>{t('quiz.details.unavailableTitle')}</Text>
          <Text style={styles.emptyText}>{t('quiz.details.unavailableBody')}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>{t('quiz.takeQuiz.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>

      {/* ── TOP: Compact gradient header ── */}
      <LinearGradient
        colors={['#5B21B6', '#7C3AED', '#A855F7', '#EC4899']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        {/* Blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        {/* Nav row */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.heroBadge}>
            <Ionicons name="rocket" size={13} color="#FDE68A" />
            <Text style={styles.heroBadgeText}>Exam</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.heroBody}>
          {renderPostTitleText(quiz.title, styles.quizTitle)}
          {!!quiz.description && renderPostBodyText(quiz.description, styles.quizDesc, 2)}
        </View>
      </LinearGradient>

      {/* ── MIDDLE: Stats + Attempt + Rules ── */}
      <View style={styles.body}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {STAT_META.map((s, i) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: isDark ? s.darkBg : s.bg }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]} numberOfLines={1} adjustsFontSizeToFit>
                {statValues[i]}
              </Text>
              <Text style={styles.statUnit}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Previous attempt banner — inline, only shown if exists */}
        {!!quiz.userAttempt && (
          <TouchableOpacity
            activeOpacity={quiz.id ? 0.8 : 1}
            disabled={!quiz.id}
            onPress={() => quiz.id && navigation.navigate('QuizHistory' as any, { quizId: quiz.id, title: quiz.title })}
            style={styles.attemptBanner}
          >
            <LinearGradient
              colors={quiz.userAttempt.passed ? ['#064E3B', '#065F46'] : ['#451A03', '#78350F']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.attemptGradient}
            >
              <Ionicons
                name={quiz.userAttempt.passed ? 'checkmark-circle' : 'refresh-circle'}
                size={26} color={quiz.userAttempt.passed ? '#34D399' : '#FBBF24'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.attemptTitle}>{t('quiz.details.previousAttempt')}</Text>
                <Text style={styles.attemptScore}>{t('quiz.details.previousScore', { score: Math.round(quiz.userAttempt.score || 0) })}</Text>
              </View>
              {!!quiz.id && <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Rules – 2×2 grid */}
        <View style={styles.rulesSection}>
          <Text style={styles.rulesSectionTitle}>{t('quiz.details.beforeYouStart')}</Text>
          <View style={styles.rulesGrid}>
            {RULES.map((rule, idx) => (
              <View key={idx} style={[styles.ruleCard, { backgroundColor: isDark ? `${rule.color}18` : `${rule.color}10` }]}>
                <View style={[styles.ruleIconWrap, { backgroundColor: `${rule.color}22` }]}>
                  <Ionicons name={rule.icon} size={16} color={rule.color} />
                </View>
                <Text style={styles.ruleText} numberOfLines={3}>
                  {rule.key === 'ruleTimer'
                    ? (quiz.timeLimit ? t('quiz.details.ruleTimer') : t('quiz.details.ruleNoTimer'))
                    : t(`quiz.details.${rule.key}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {loading && <ActivityIndicator color={PRIMARY} style={{ marginTop: 8 }} />}
      </View>

      {/* ── BOTTOM: CTA button ── */}
      <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.ctaOuter, !canStart && { opacity: 0.5 }]}
          activeOpacity={0.9}
          onPress={handleStart}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#A855F7', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>
              {quiz.userAttempt ? t('quiz.details.retakeQuiz') : t('quiz.details.startQuiz')}
            </Text>
            <View style={styles.ctaArrow}>
              <Ionicons name="arrow-forward" size={18} color="#7C3AED" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1, backgroundColor: colors.background },

  // ── Hero ──
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  heroBadgeText: { color: '#FDE68A', fontSize: 12, fontWeight: '700' },
  heroBody: { paddingTop: 4 },
  quizTitle: {
    color: '#FFFFFF', fontSize: 22, fontWeight: '900',
    lineHeight: 30, letterSpacing: -0.5,
  },
  quizDesc: {
    color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 20, marginTop: 6,
  },
  blob1: {
    position: 'absolute', top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  blob2: {
    position: 'absolute', bottom: -20, right: 60,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // ── Body ──
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.0 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  statUnit: {
    fontSize: 10, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center',
  },

  // Attempt
  attemptBanner: { borderRadius: 16, overflow: 'hidden' },
  attemptGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  attemptTitle: { color: '#F1F5F9', fontSize: 13, fontWeight: '800' },
  attemptScore: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 },

  // Rules 2×2 grid
  rulesSection: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.0 : 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rulesSectionTitle: {
    color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: -0.3,
  },
  rulesGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ruleCard: {
    width: '48%',
    flex: 1,
    minWidth: '47%',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    justifyContent: 'flex-start',
  },
  ruleIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  ruleText: {
    color: colors.textSecondary, fontSize: 12, lineHeight: 17,
  },

  // CTA
  ctaContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaOuter: { borderRadius: 24 },
  ctaBtn: {
    height: 58, borderRadius: 24,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 24, gap: 10,
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },
  ctaArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },

  // Empty
  emptyState: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#8B5CF618', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  secondaryButton: {
    marginTop: 16, paddingHorizontal: 22, paddingVertical: 13,
    borderRadius: 16, backgroundColor: '#8B5CF618',
  },
  secondaryButtonText: { color: PRIMARY, fontSize: 15, fontWeight: '800' },
});
