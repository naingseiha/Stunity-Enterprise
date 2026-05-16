import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Shadows } from '@/config';
import { QuizItem } from '@/services/quiz';

const TEAL = '#09CFF7';
const TEAL_DARK = '#06A8CC';
const GRADIENT: [string, string] = [TEAL, TEAL_DARK];

export interface QuizListCardProps {
  item: QuizItem;
  onPress: (quiz: QuizItem) => void;
  onViewResults?: (quiz: QuizItem) => void;
  isLoadingResults?: boolean;
}

function getQuestionCount(item: QuizItem): number {
  if (typeof item.questionCount === 'number') return item.questionCount;
  return item.questions?.length ?? 0;
}

export const QuizListCard = React.memo(function QuizListCard({
  item,
  onPress,
  onViewResults,
  isLoadingResults = false,
}: QuizListCardProps) {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();

  const metaColor = isDark ? '#94A3B8' : '#64748B';
  const questionCount = getQuestionCount(item);
  const attempt = item.userAttempt;
  const hasAttempt = !!attempt;
  const lastAttemptLabel =
    item.lastAttemptAt || attempt?.submittedAt
      ? formatDistanceToNow(new Date(item.lastAttemptAt || attempt!.submittedAt!), {
          addSuffix: true,
        })
      : null;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <View style={styles.cardBody}>
        <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.88}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${TEAL}18` }]}>
              <Ionicons name="rocket" size={22} color={TEAL_DARK} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              {lastAttemptLabel ? (
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={13} color={metaColor} />
                  <Text style={styles.metaTime}>{lastAttemptLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {item.description ? (
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: `${TEAL}0F` }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${TEAL}1A` }]}>
              <Ionicons name="document-text-outline" size={18} color={TEAL_DARK} />
            </View>
            <Text style={[styles.statValue, { color: TEAL_DARK }]}>{questionCount}</Text>
            <Text style={styles.statLabel}>{t('feed.sections.questions')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#0EA5E90F' }]}>
            <View style={[styles.statIconBg, { backgroundColor: '#0EA5E91A' }]}>
              <Ionicons name="time-outline" size={18} color="#0EA5E9" />
            </View>
            <Text style={[styles.statValue, { color: '#0EA5E9' }]}>
              {item.timeLimit
                ? t('feed.sections.minutesShort', { count: item.timeLimit })
                : '∞'}
            </Text>
            <Text style={styles.statLabel}>{t('feed.sections.time')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F59E0B0F' }]}>
            <View style={[styles.statIconBg, { backgroundColor: '#F59E0B1A' }]}>
              <Ionicons name="star" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {item.totalPoints || 100}
            </Text>
            <Text style={styles.statLabel}>{t('feed.sections.points')}</Text>
          </View>
        </View>

        {hasAttempt && attempt ? (
          <View style={styles.attemptedBlock}>
            <View
              style={[
                styles.scoreBar,
                {
                  backgroundColor: attempt.passed
                    ? isDark
                      ? '#064e3b'
                      : '#ECFDF5'
                    : isDark
                      ? '#450a0a'
                      : '#FEF2F2',
                },
              ]}
            >
              <Ionicons
                name={attempt.passed ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={attempt.passed ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.scoreText,
                  { color: attempt.passed ? '#10B981' : '#EF4444' },
                ]}
              >
                {t('feed.sections.scorePercent', { score: attempt.score })}
              </Text>
              <View
                style={[
                  styles.passBadge,
                  {
                    backgroundColor: attempt.passed
                      ? isDark
                        ? '#065f46'
                        : '#D1FAE5'
                      : isDark
                        ? '#7f1d1d'
                        : '#FEE2E2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.passBadgeText,
                    {
                      color: attempt.passed
                        ? isDark
                          ? '#a7f3d0'
                          : '#059669'
                        : isDark
                          ? '#fecaca'
                          : '#DC2626',
                    },
                  ]}
                >
                  {attempt.passed
                    ? t('feed.sections.passed')
                    : t('feed.sections.notPassed')}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => onViewResults?.(item)}
                disabled={!onViewResults || isLoadingResults}
                style={[styles.actionBtn, { backgroundColor: '#6366F112' }]}
                activeOpacity={0.85}
              >
                {isLoadingResults ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : (
                  <Ionicons name="eye-outline" size={16} color="#6366F1" />
                )}
                <Text style={[styles.actionBtnText, { color: '#6366F1' }]}>
                  {t('quiz.myJoined.viewResults')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onPress(item)}
                style={[styles.actionBtn, { backgroundColor: `${TEAL}12` }]}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={16} color={TEAL_DARK} />
                <Text style={[styles.actionBtnText, { color: TEAL_DARK }]}>
                  {t('quiz.dashboard.retake')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.88}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Ionicons name="play-circle" size={20} color="#fff" />
              <Text style={styles.ctaText}>{t('quiz.browse.startQuiz')}</Text>
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.85)" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const createStyles = (colors: any, isDark: boolean) => {
  const metaColor = isDark ? '#94A3B8' : '#64748B';
  const bodyColor = isDark ? '#CBD5E1' : '#475569';

  return StyleSheet.create({
    card: {
      marginHorizontal: 12,
      marginBottom: 14,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Shadows.sm,
    },
    accentBar: { height: 3, width: '100%' },
    cardBody: { padding: 16, gap: 14 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1, minWidth: 0 },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 23,
      letterSpacing: -0.2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
    },
    metaTime: {
      fontSize: 12,
      color: metaColor,
      fontWeight: '600',
    },
    description: {
      fontSize: 14,
      color: bodyColor,
      lineHeight: 22,
      marginTop: 10,
      fontWeight: '500',
    },
    statsRow: { flexDirection: 'row', gap: 8 },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 14,
      gap: 5,
    },
    statIconBg: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: { fontSize: 15, fontWeight: '800' },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: metaColor,
      textAlign: 'center',
    },
    attemptedBlock: { gap: 10 },
    scoreBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 50,
      gap: 8,
    },
    scoreText: { flex: 1, fontSize: 14, fontWeight: '700' },
    passBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 50,
    },
    passBadgeText: { fontSize: 11, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 50,
    },
    actionBtnText: { fontSize: 13, fontWeight: '700' },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 50,
      gap: 8,
    },
    ctaText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
  });
};
