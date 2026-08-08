import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { fetchMasteryTree } from '@/api/recall';
import { useFeatureFlag } from '@/config/featureFlags';
import type { Streak, UserStats as QuizUserStats } from '@/services/stats';

const ACCENT = '#0EA5E9';

type ActionKind = 'streak' | 'recall' | 'xp' | 'quiz' | 'freeze';

interface NextAction {
  kind: ActionKind;
  title: string;
  subtitle: string;
  cta: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface NextActionCardProps {
  streak: Streak | null;
  quizStats: QuizUserStats | null;
  level: number;
  onUseStreakFreeze?: () => void;
  isFreezingStreak?: boolean;
}

export function NextActionCard({
  streak,
  quizStats,
  level,
  onUseStreakFreeze,
  isFreezingStreak = false,
}: NextActionCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const navigation = useNavigation<any>();
  const masteryEnabled = useFeatureFlag('mastery_tree');
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    if (!masteryEnabled) return;
    let cancelled = false;
    fetchMasteryTree()
      .then((subjects) => {
        if (cancelled) return;
        setDueCount(subjects.reduce((n, s) => n + (s.dueCount || 0), 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [masteryEnabled]);

  const goQuiz = () => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate('QuizTab', { screen: 'BrowseQuizzes' });
      return;
    }
    navigation.navigate('BrowseQuizzes' as any);
  };

  const goLearn = () => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate('LearnTab');
      return;
    }
    navigation.navigate('LearnTab' as any);
  };

  const action = useMemo<NextAction | null>(() => {
    const studiedToday = streak?.studiedToday === true;
    const atRisk = streak?.streakAtRisk === true && !studiedToday;
    const freezes = streak?.freezesAvailable ?? 0;
    const xp = quizStats?.xpProgress ?? 0;
    const xpToNext = quizStats?.xpToNextLevel ?? 0;
    const xpLeft = Math.max(0, xpToNext - xp);
    const currentLevel = quizStats?.level ?? level ?? 1;

    if (atRisk && freezes > 0 && onUseStreakFreeze) {
      return {
        kind: 'freeze',
        title: t('profile.performance.nextAction.protectStreak', 'Protect your streak'),
        subtitle: t(
          'profile.performance.nextAction.protectStreakSub',
          'Your streak is at risk. Use a freeze or study now.',
        ),
        cta: isFreezingStreak
          ? t('common.loading', 'Loading…')
          : t('profile.performance.useStreakFreeze', 'Use streak freeze'),
        icon: 'snow-outline',
        onPress: onUseStreakFreeze,
      };
    }

    if (atRisk || (!studiedToday && (streak?.currentStreak ?? 0) > 0)) {
      return {
        kind: 'streak',
        title: t('profile.performance.nextAction.studyToday', 'Study today'),
        subtitle: t(
          'profile.performance.nextAction.studyTodaySub',
          'Complete a quiz to keep your {{count}}-day streak.',
          { count: streak?.currentStreak ?? 0 },
        ),
        cta: t('profile.performance.nextAction.takeQuiz', 'Take a quiz'),
        icon: 'flame-outline',
        onPress: goQuiz,
      };
    }

    if (dueCount > 0) {
      return {
        kind: 'recall',
        title: t('profile.performance.nextAction.reviewDue', 'Review due cards'),
        subtitle: t(
          'profile.performance.nextAction.reviewDueSub',
          '{{count}} cards are ready for spaced review.',
          { count: dueCount },
        ),
        cta: t('profile.performance.nextAction.reviewNow', 'Review now'),
        icon: 'refresh-outline',
        onPress: goLearn,
      };
    }

    if (xpToNext > 0 && xpLeft > 0 && xpLeft <= Math.max(120, xpToNext * 0.25)) {
      return {
        kind: 'xp',
        title: t('profile.performance.nextAction.levelUp', 'Almost level {{level}}', {
          level: currentLevel + 1,
        }),
        subtitle: t(
          'profile.performance.nextAction.levelUpSub',
          '{{xp}} XP left to reach the next level.',
          { xp: xpLeft.toLocaleString() },
        ),
        cta: t('profile.performance.nextAction.earnXp', 'Earn XP'),
        icon: 'trending-up-outline',
        onPress: goQuiz,
      };
    }

    return {
      kind: 'quiz',
      title: t('profile.performance.nextAction.keepLearning', 'Keep learning'),
      subtitle: t(
        'profile.performance.nextAction.keepLearningSub',
        'Take a short quiz to build mastery and XP.',
      ),
      cta: t('profile.performance.nextAction.takeQuiz', 'Take a quiz'),
      icon: 'school-outline',
      onPress: goQuiz,
    };
  }, [
    streak,
    quizStats,
    level,
    dueCount,
    onUseStreakFreeze,
    isFreezingStreak,
    t,
  ]);

  if (!action) return null;

  const muted = colors.textSecondary;
  const track = isDark ? colors.surfaceVariant : '#F8FAFC';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: track }]}>
          <Ionicons name={action.icon} size={18} color={ACCENT} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: muted }]}>
            {t('profile.performance.nextAction.label', 'Next action')}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{action.title}</Text>
          <Text style={[styles.subtitle, { color: muted }]} numberOfLines={2}>
            {action.subtitle}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={action.onPress}
        disabled={action.kind === 'freeze' && isFreezingStreak}
        style={({ pressed }) => [
          styles.cta,
          { opacity: pressed || (action.kind === 'freeze' && isFreezingStreak) ? 0.7 : 1 },
        ]}
      >
        <Text style={styles.ctaText}>{action.cta}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  top: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  cta: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
