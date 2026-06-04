import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { Haptics } from '@/services/haptics';
import { fetchQuizById } from '@/services/quiz';
import { normalizeQuiz, NormalizedQuiz } from '@/utils/quiz';
import { renderPostBodyText, renderPostTitleText } from '@/utils/renderEmojiText';

const BG = '#0F172A';
const SURFACE = '#182235';
const BORDER = 'rgba(255,255,255,0.1)';
const PRIMARY = '#8B5CF6';
const CYAN = '#38BDF8';

export function QuizDetailsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialQuiz = route.params?.quiz;

  const [quiz, setQuiz] = useState<NormalizedQuiz | null>(() => normalizeQuiz(initialQuiz));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const normalized = normalizeQuiz(initialQuiz);

    if (!normalized?.id || normalized.questions.length > 0) {
      setQuiz(normalized);
      return;
    }

    setQuiz(normalized);
    setLoading(true);
    fetchQuizById(normalized.id)
      .then((freshQuiz) => {
        if (!mounted) return;
        setQuiz(normalizeQuiz({ ...normalized, ...freshQuiz }));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [initialQuiz]);

  const questionCount = quiz?.questions.length || 0;
  const timeLabel = useMemo(() => {
    if (!quiz?.timeLimit) return t('quiz.details.noTimeLimit');
    return t('quiz.details.minutes', { count: quiz.timeLimit });
  }, [quiz?.timeLimit, t]);

  const canStart = !!quiz && questionCount > 0 && !loading;

  const handleStart = useCallback(() => {
    if (!quiz) return;
    if (!canStart) {
      Alert.alert(t('quiz.details.unavailableTitle'), t('quiz.details.unavailableBody'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('quiz.details.confirmTitle'),
      t('quiz.details.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('quiz.details.confirmStart'),
          onPress: () => navigation.navigate('TakeQuiz', { quiz }),
        },
      ]
    );
  }, [canStart, navigation, quiz, t]);

  if (!quiz) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
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
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('quiz.details.title')}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#312E81', '#1E1B4B', '#111827']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="rocket" size={30} color="#FDE68A" />
          </View>
          {renderPostTitleText(quiz.title, styles.quizTitle)}
          {!!quiz.description && (
            renderPostBodyText(quiz.description, styles.quizDescription, 4)
          )}
        </LinearGradient>

        <View style={styles.statsRow}>
          <Stat icon="document-text-outline" label={t('quiz.details.questions')} value={String(questionCount)} color="#EC4899" />
          <Stat icon="time-outline" label={t('quiz.details.time')} value={timeLabel} color={CYAN} />
          <Stat icon="star" label={t('quiz.details.points')} value={String(quiz.totalPoints || questionCount * 10)} color="#F59E0B" />
        </View>

        {!!quiz.userAttempt && (
          <TouchableOpacity
            style={styles.attemptCard}
            activeOpacity={quiz.id ? 0.8 : 1}
            disabled={!quiz.id}
            onPress={() => quiz.id && navigation.navigate('QuizHistory' as any, { quizId: quiz.id, title: quiz.title })}
            accessibilityRole="button"
            accessibilityLabel={t('quiz.history.viewHistory', { defaultValue: 'View attempt history' })}
          >
            <Ionicons
              name={quiz.userAttempt.passed ? 'checkmark-circle' : 'refresh-circle'}
              size={24}
              color={quiz.userAttempt.passed ? '#10B981' : '#F59E0B'}
            />
            <View style={styles.attemptTextWrap}>
              <Text style={styles.attemptTitle}>{t('quiz.details.previousAttempt')}</Text>
              <Text style={styles.attemptText}>
                {t('quiz.details.previousScore', { score: Math.round(quiz.userAttempt.score || 0) })}
              </Text>
            </View>
            {!!quiz.id && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
          </TouchableOpacity>
        )}

        <View style={styles.infoPanel}>
          <Text style={styles.sectionTitle}>{t('quiz.details.beforeYouStart')}</Text>
          <InfoRow icon="shield-checkmark-outline" text={t('quiz.details.ruleFocus')} />
          <InfoRow icon="timer-outline" text={quiz.timeLimit ? t('quiz.details.ruleTimer') : t('quiz.details.ruleNoTimer')} />
          <InfoRow icon="checkmark-done-outline" text={t('quiz.details.ruleReview')} />
          <InfoRow icon="cloud-upload-outline" text={t('quiz.details.ruleSubmit')} />
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.loadingText}>{t('quiz.details.loading')}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleStart}
          disabled={loading}
        >
          <Text style={styles.startButtonText}>
            {quiz.userAttempt ? t('quiz.details.retakeQuiz') : t('quiz.details.startQuiz')}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#A78BFA" />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 24,
  },
  hero: {
    minHeight: 220,
    borderRadius: 18,
    padding: 22,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
  },
  quizTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 42,
    paddingTop: 4,
    paddingBottom: 2,
  },
  quizDescription: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 26,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    minHeight: 126,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  attemptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 14,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  attemptTextWrap: {
    flex: 1,
  },
  attemptTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  attemptText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  infoPanel: {
    marginTop: 14,
    padding: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    marginTop: 16,
  },
  loadingText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: 'rgba(15,23,42,0.98)',
  },
  startButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonDisabled: {
    opacity: 0.55,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  emptyState: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 14,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  secondaryButton: {
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
});
