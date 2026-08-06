/**
 * PostDetailQuizHero — Apple-style flat grouped card for quiz posts.
 * Plain surface, hairline dividers, solid system CTA. No gradients or decor.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { ScalePressable } from '@/components/common';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';

const SYSTEM_BLUE = '#007AFF';

export interface PostDetailQuizHeroProps {
  quizData: {
    id: string;
    questions?: unknown[];
    timeLimit?: number | null;
    totalPoints?: number | null;
    passingScore?: number | null;
    userAttempt?: {
      score: number;
      passed: boolean;
    } | null;
  };
  postTitle?: string;
  postContent?: string;
  gradient: [string, string];
  accentColor: string;
}

export function PostDetailQuizHero({
  quizData,
  postTitle,
  postContent,
  accentColor,
}: PostDetailQuizHeroProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const questionCount = quizData.questions?.length ?? 0;
  const timeLabel = quizData.timeLimit
    ? t('feed.sections.minutesShort', { count: quizData.timeLimit })
    : t('feed.detail.unlimitedTime', { defaultValue: 'No limit' });
  const pointsLabel = String(quizData.totalPoints ?? 100);
  const hasAttempt = !!quizData.userAttempt;
  const ctaColor = accentColor || SYSTEM_BLUE;

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('QuizDetails', {
      quiz: {
        id: quizData.id,
        title: postTitle || t('feed.postTypes.quiz'),
        description: postContent,
        questions: quizData.questions,
        timeLimit: quizData.timeLimit,
        passingScore: quizData.passingScore,
        totalPoints: quizData.totalPoints,
      },
    });
  };

  const statRows = [
    {
      key: 'questions',
      icon: 'list-outline' as const,
      label: t('feed.sections.questions'),
      value: String(questionCount),
    },
    {
      key: 'time',
      icon: 'time-outline' as const,
      label: t('feed.sections.time'),
      value: timeLabel,
    },
    {
      key: 'points',
      icon: 'star-outline' as const,
      label: t('feed.sections.points'),
      value: pointsLabel,
    },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sectionLabel}>{t('feed.postTypes.quiz')}</Text>
          <Text style={styles.heroTitle}>{t('feed.sections.testKnowledge')}</Text>
          <Text style={styles.heroSubtitle}>{t('feed.sections.completeQuiz')}</Text>
        </View>

        <View style={styles.divider} />

        {/* Stats — iOS grouped list rows */}
        <View style={styles.statsGroup}>
          {statRows.map((row, index) => (
            <View key={row.key}>
              <View style={styles.statRow}>
                <Ionicons name={row.icon} size={18} color={colors.textSecondary} style={styles.statRowIcon} />
                <Text style={styles.statRowLabel}>{row.label}</Text>
                <Text style={styles.statRowValue}>{row.value}</Text>
              </View>
              {index < statRows.length - 1 && <View style={styles.insetDivider} />}
            </View>
          ))}
        </View>

        {hasAttempt && quizData.userAttempt && (
          <>
            <View style={styles.divider} />
            <View style={styles.scoreRow}>
              <Ionicons
                name={quizData.userAttempt.passed ? 'checkmark-circle' : 'information-circle'}
                size={18}
                color={quizData.userAttempt.passed ? '#34C759' : '#FF9500'}
              />
              <Text style={styles.scoreText}>
                {t('feed.detail.lastAttempt', { score: Math.round(quizData.userAttempt.score ?? 0) })}
                {quizData.userAttempt.passed
                  ? t('feed.detail.passedSuffix')
                  : t('feed.detail.notPassedSuffix')}
              </Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* CTA */}
        <View style={styles.footer}>
          <ScalePressable
            pressScale={0.98}
            onPress={handleStart}
            style={[styles.ctaButton, { backgroundColor: ctaColor }]}
          >
            <Text style={styles.ctaText}>
              {hasAttempt ? t('feed.detail.retakeQuiz') : t('feed.detail.startQuiz')}
            </Text>
          </ScalePressable>

          {quizData.passingScore != null && (
            <Text style={styles.passHint}>
              {t('feed.detail.passingScoreHint', {
                defaultValue: 'Passing score: {{score}}%',
                score: quizData.passingScore,
              })}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
    card: {
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.25 : 0.04,
          shadowRadius: 3,
        },
        android: { elevation: 1 },
      }),
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      gap: 4,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: -0.08,
      textTransform: 'uppercase',
    } as TextStyle,
    heroTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: -0.4,
    },
    heroSubtitle: {
      fontSize: 15,
      fontWeight: '400',
      color: colors.textSecondary,
      lineHeight: 20,
      letterSpacing: -0.24,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    statsGroup: {
      paddingVertical: 2,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 16,
      minHeight: 44,
    },
    statRowIcon: {
      width: 22,
      marginRight: 12,
    },
    statRowLabel: {
      flex: 1,
      fontSize: 17,
      fontWeight: '400',
      color: colors.text,
      letterSpacing: -0.41,
    },
    statRowValue: {
      fontSize: 17,
      fontWeight: '400',
      color: colors.textSecondary,
      letterSpacing: -0.41,
    },
    insetDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 50,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
    },
    scoreText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '400',
      color: colors.textSecondary,
      letterSpacing: -0.24,
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
      gap: 10,
    },
    ctaButton: {
      borderRadius: 999,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    ctaText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: -0.41,
    },
    passHint: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '400',
      color: colors.textTertiary,
      letterSpacing: -0.08,
    },
  });

export default PostDetailQuizHero;
