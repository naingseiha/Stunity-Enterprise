/**
 * RecallCardItem — designed to feel like a native post in your feed.
 *
 * No outer card border / radius / shadow — full-bleed, sits flush with the
 * other LinkedIn-style posts above and below. Internal structure mirrors
 * PostHeader → body → soft CTA pill → type chip → bottom hairline.
 *
 *   - Header row: 40 icon wrap + name + status badge + meta row (matches PostHeader)
 *   - Question = post body text
 *   - "Reveal answer →" pill (matches "Read Article →" pattern: soft tint bg, accent text)
 *   - Bottom row: subject type chip + skip / shield
 *   - Hairline separator at bottom (matches inter-post divider)
 *
 *   - Completed state: big +XP number + memory strength bar (mirrors profile
 *     card's level number + XP progress bar)
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import type { RecallCard, RecallCardSubject } from '@/types';

type Grade = 'again' | 'good' | 'easy';

interface SubjectVisual {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentDeep: string;
  accentSoft: string;
  accentSoftDark: string;
}

const SUBJECT_CONFIG: Record<RecallCardSubject, SubjectVisual> = {
  biology:         { icon: 'leaf',        accent: '#16A34A', accentDeep: '#15803D', accentSoft: '#DCFCE7', accentSoftDark: 'rgba(34,197,94,0.18)' },
  mathematics:     { icon: 'calculator',  accent: '#0284C7', accentDeep: '#0369A1', accentSoft: '#E0F2FE', accentSoftDark: 'rgba(14,165,233,0.18)' },
  physics:         { icon: 'planet',      accent: '#4F46E5', accentDeep: '#4338CA', accentSoft: '#E0E7FF', accentSoftDark: 'rgba(99,102,241,0.18)' },
  chemistry:       { icon: 'flask',       accent: '#9333EA', accentDeep: '#7E22CE', accentSoft: '#F3E8FF', accentSoftDark: 'rgba(168,85,247,0.18)' },
  english:         { icon: 'book',        accent: '#EA580C', accentDeep: '#C2410C', accentSoft: '#FFEDD5', accentSoftDark: 'rgba(249,115,22,0.18)' },
  history:         { icon: 'time',        accent: '#CA8A04', accentDeep: '#A16207', accentSoft: '#FEF9C3', accentSoftDark: 'rgba(234,179,8,0.18)' },
  geography:       { icon: 'globe',       accent: '#0D9488', accentDeep: '#0F766E', accentSoft: '#CCFBF1', accentSoftDark: 'rgba(20,184,166,0.18)' },
  computerScience: { icon: 'code-slash',  accent: '#DB2777', accentDeep: '#BE185D', accentSoft: '#FCE7F3', accentSoftDark: 'rgba(236,72,153,0.18)' },
};

const AnimatedView = Animated.createAnimatedComponent(View);

interface Props {
  card: RecallCard;
  onGrade?: (cardId: string, grade: Grade) => void;
  onDefer?: (cardId: string) => void;
}

export const RecallCardItem: React.FC<Props> = ({ card, onGrade, onDefer }) => {
  const { colors, isDark } = useThemeContext();
  const { t } = useTranslation();
  const subject = SUBJECT_CONFIG[card.subject];

  const styles = useMemo(
    () => createStyles(colors, isDark, subject),
    [colors, isDark, subject],
  );

  const [stage, setStage] = useState<'resting' | 'revealed' | 'completed'>('resting');
  const [earnedXp, setEarnedXp] = useState(0);

  // Animations
  const answerOpacity = useSharedValue(0);
  const answerTranslate = useSharedValue(10);
  const checkScale = useSharedValue(0.4);
  const checkOpacity = useSharedValue(0);
  const xpNumberScale = useSharedValue(0.55);
  const xpNumberOpacity = useSharedValue(0);
  const chipsOpacity = useSharedValue(0);
  const strengthFill = useSharedValue(card.recallStrength);

  const handleReveal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStage('revealed');
    answerOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    answerTranslate.value = withSpring(0, { damping: 16, stiffness: 220 });
  }, [answerOpacity, answerTranslate]);

  const handleGrade = useCallback(
    (grade: Grade) => {
      if (grade === 'again') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const xp =
        grade === 'again' ? 1
        : grade === 'good' ? card.xpReward
        : Math.round(card.xpReward * 1.4);
      setEarnedXp(xp);
      setStage('completed');

      checkScale.value = withSequence(
        withSpring(1.15, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 14, stiffness: 220 }),
      );
      checkOpacity.value = withTiming(1, { duration: 240 });
      xpNumberScale.value = withDelay(180, withSpring(1, { damping: 11, stiffness: 200 }));
      xpNumberOpacity.value = withDelay(180, withTiming(1, { duration: 260 }));
      strengthFill.value = withDelay(
        320,
        withTiming(grade === 'again' ? Math.min(1, card.recallStrength + 0.15) : 1, {
          duration: 700,
          easing: Easing.out(Easing.cubic),
        }),
      );
      chipsOpacity.value = withDelay(440, withTiming(1, { duration: 260 }));

      onGrade?.(card.id, grade);
    },
    [
      card.id,
      card.recallStrength,
      card.xpReward,
      onGrade,
      checkOpacity,
      checkScale,
      chipsOpacity,
      strengthFill,
      xpNumberOpacity,
      xpNumberScale,
    ],
  );

  const handleDefer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDefer?.(card.id);
  }, [card.id, onDefer]);

  const answerAnim = useAnimatedStyle(() => ({
    opacity: answerOpacity.value,
    transform: [{ translateY: answerTranslate.value }],
  }));
  const checkAnim = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));
  const xpNumberAnim = useAnimatedStyle(() => ({
    opacity: xpNumberOpacity.value,
    transform: [{ scale: xpNumberScale.value }],
  }));
  const chipsAnim = useAnimatedStyle(() => ({
    opacity: chipsOpacity.value,
  }));
  const strengthFillAnim = useAnimatedStyle(() => ({
    width: `${Math.round(strengthFill.value * 100)}%`,
  }));

  const decayStatus = useMemo(() => {
    if (card.recallStrength >= 0.66) {
      return {
        text: t('feed.recall.memoryFresh', { defaultValue: 'Fresh' }),
        icon: 'water' as const,
        color: '#16A34A',
        bg: isDark ? 'rgba(34,197,94,0.18)' : '#DCFCE7',
      };
    }
    if (card.recallStrength >= 0.33) {
      return {
        text: t('feed.recall.memoryFading', { defaultValue: 'Fading' }),
        icon: 'flame' as const,
        color: '#D97706',
        bg: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7',
      };
    }
    return {
      text: t('feed.recall.memoryDim', { defaultValue: 'Forgotten' }),
      icon: 'alert-circle' as const,
      color: '#DC2626',
      bg: isDark ? 'rgba(220,38,38,0.18)' : '#FEE2E2',
    };
  }, [card.recallStrength, isDark, t]);

  const memoryFromLabel = useMemo(() => {
    if (card.recallStrength >= 0.66) return t('feed.recall.memoryFresh', { defaultValue: 'Fresh' });
    if (card.recallStrength >= 0.33) return t('feed.recall.memoryFading', { defaultValue: 'Fading' });
    return t('feed.recall.memoryDim', { defaultValue: 'Forgotten' });
  }, [card.recallStrength, t]);

  return (
    <View style={styles.outer}>
      {/* ────────── HEADER (mirrors PostHeader pattern) ────────── */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrapHeader}>
          <Ionicons name={subject.icon} size={20} color={subject.accent} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {t('feed.recall.title', { defaultValue: 'Memory Check' })}
            </Text>
            {stage === 'completed' ? (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : '#DCFCE7' },
                ]}
              >
                <Ionicons name="checkmark-circle" size={11} color={isDark ? '#4ADE80' : '#059669'} />
                <Text style={[styles.roleBadgeText, { color: isDark ? '#86EFAC' : '#059669' }]}>
                  {t('feed.recall.doneToday', { defaultValue: 'Done' })}
                </Text>
              </View>
            ) : (
              <View style={[styles.roleBadge, { backgroundColor: decayStatus.bg }]}>
                <Ionicons name={decayStatus.icon} size={11} color={decayStatus.color} />
                <Text style={[styles.roleBadgeText, { color: decayStatus.color }]}>
                  {decayStatus.text}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {card.courseTitle
                ? t('feed.recall.metaFromCourse', {
                    defaultValue: 'From {{course}}',
                    course: card.courseTitle,
                  })
                : card.subjectLabel}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {t('feed.recall.metaDaysAgo', {
                defaultValue: '{{count}}d ago',
                count: card.daysSinceLastSeen,
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* ────────── BODY ────────── */}
      {stage === 'completed' ? (
        <View style={styles.completedBody}>
          <AnimatedView style={[styles.checkRing, checkAnim]}>
            <Ionicons name="checkmark" size={34} color="#16A34A" />
          </AnimatedView>

          <AnimatedView style={[styles.xpNumberWrap, xpNumberAnim]}>
            <View style={styles.xpNumberRow}>
              <Text style={[styles.xpPlus, { color: subject.accentDeep }]}>+</Text>
              <Text style={[styles.xpNumber, { color: subject.accentDeep }]}>{earnedXp}</Text>
              <Text style={[styles.xpUnit, { color: subject.accentDeep }]}>XP</Text>
            </View>
            <Text style={styles.xpCaption}>
              {t('feed.recall.xpEarned', { defaultValue: 'EARNED' })}
            </Text>
          </AnimatedView>

          {/* Memory strength bar — mirrors profile card progress bar */}
          <View style={styles.strengthBlock}>
            <View style={styles.strengthLabels}>
              <Text style={[styles.strengthLabelStart, { color: decayStatus.color }]}>
                {memoryFromLabel}
              </Text>
              <Text style={[styles.strengthLabelEnd, { color: subject.accentDeep }]}>
                {t('feed.recall.memoryStrong', { defaultValue: 'Strong' })}
              </Text>
            </View>
            <View
              style={[
                styles.strengthTrack,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
              ]}
            >
              <AnimatedView style={[styles.strengthFillWrap, strengthFillAnim]}>
                <LinearGradient
                  colors={[subject.accent, subject.accentDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.strengthFill}
                />
              </AnimatedView>
            </View>
            <Text style={styles.strengthHint}>
              {t('feed.recall.memoryShift', {
                defaultValue: 'Memory shifted from {{from}} → Strong',
                from: memoryFromLabel,
              })}
            </Text>
          </View>
        </View>
      ) : (
        <>
          {/* Question text — like a post body */}
          <Text style={styles.question}>{card.questionText}</Text>

          {stage === 'resting' && card.hint ? (
            <View style={styles.hintRow}>
              <Ionicons name="bulb-outline" size={13} color={subject.accent} />
              <Text style={styles.hintText}>
                <Text style={[styles.hintLabel, { color: subject.accent }]}>
                  {t('feed.recall.hintLabel', { defaultValue: 'Hint' })}
                  {' · '}
                </Text>
                {card.hint}
              </Text>
            </View>
          ) : null}

          {stage === 'revealed' ? (
            <AnimatedView style={[styles.answerBlock, answerAnim]}>
              <View style={styles.answerDividerRow}>
                <View style={[styles.answerDividerLine, { backgroundColor: subject.accent + '40' }]} />
                <Text style={[styles.answerDividerLabel, { color: subject.accent }]}>
                  {t('feed.recall.answerLabel', { defaultValue: 'ANSWER' })}
                </Text>
                <View style={[styles.answerDividerLine, { backgroundColor: subject.accent + '40' }]} />
              </View>
              <Text style={[styles.answer, { color: subject.accentDeep }]}>
                {card.answerText}
              </Text>
            </AnimatedView>
          ) : null}

          {/* CTA pill — mirrors "Read Article →" pattern */}
          {stage === 'resting' ? (
            <TouchableOpacity
              onPress={handleReveal}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('feed.recall.revealCta', { defaultValue: 'Reveal answer' })}
              style={[
                styles.cta,
                { backgroundColor: isDark ? subject.accentSoftDark : subject.accentSoft },
              ]}
            >
              <Text style={[styles.ctaText, { color: subject.accentDeep }]}>
                {t('feed.recall.revealCta', { defaultValue: 'Reveal answer' })}
              </Text>
              <Ionicons name="arrow-forward" size={17} color={subject.accentDeep} />
            </TouchableOpacity>
          ) : (
            <View style={styles.gradeWrap}>
              <Text style={styles.gradePrompt}>
                {t('feed.recall.gradePrompt', { defaultValue: 'How did that feel?' })}
              </Text>
              <View style={styles.gradeRow}>
                <GradeButton
                  styles={styles}
                  label={t('feed.recall.gradeAgain', { defaultValue: 'Again' })}
                  sub={t('feed.recall.gradeAgainSub', { defaultValue: 'Missed it' })}
                  variant="ghost"
                  color="#DC2626"
                  ghostBg={isDark ? 'rgba(220,38,38,0.10)' : '#FEF2F2'}
                  ghostBorder={isDark ? 'rgba(220,38,38,0.35)' : '#FECACA'}
                  onPress={() => handleGrade('again')}
                />
                <GradeButton
                  styles={styles}
                  label={t('feed.recall.gradeGood', { defaultValue: 'Got it' })}
                  sub={`+${card.xpReward} XP`}
                  variant="primary"
                  color={subject.accent}
                  gradientEnd={subject.accentDeep}
                  onPress={() => handleGrade('good')}
                />
                <GradeButton
                  styles={styles}
                  label={t('feed.recall.gradeEasy', { defaultValue: 'Easy' })}
                  sub={`+${Math.round(card.xpReward * 1.4)} XP`}
                  variant="ghost"
                  color={subject.accentDeep}
                  ghostBg={isDark ? subject.accentSoftDark : subject.accentSoft}
                  ghostBorder={isDark ? subject.accent + '55' : subject.accent + '55'}
                  onPress={() => handleGrade('easy')}
                />
              </View>
            </View>
          )}
        </>
      )}

      {/* ────────── BOTTOM ROW (mirrors Article chip + stats row) ────────── */}
      <View style={styles.bottomRow}>
        {stage === 'completed' ? (
          <AnimatedView style={[styles.bottomLeftCompleted, chipsAnim]}>
            <View
              style={[
                styles.typeChip,
                { backgroundColor: isDark ? subject.accentSoftDark : subject.accentSoft },
              ]}
            >
              <Ionicons name={subject.icon} size={13} color={subject.accent} />
              <Text style={[styles.typeChipText, { color: subject.accentDeep }]} numberOfLines={1}>
                {card.subjectLabel}
              </Text>
            </View>
            {card.protectsStreak ? (
              <View
                style={[
                  styles.typeChip,
                  { backgroundColor: isDark ? 'rgba(249,115,22,0.18)' : '#FFEDD5' },
                ]}
              >
                <Ionicons name="shield-checkmark" size={13} color="#EA580C" />
                <Text style={[styles.typeChipText, { color: '#C2410C' }]}>
                  {t('feed.recall.streakShielded', { defaultValue: 'Streak shielded' })}
                </Text>
              </View>
            ) : null}
          </AnimatedView>
        ) : (
          <>
            {/* Subject chip — mirrors the "Article" chip exactly */}
            <View
              style={[
                styles.typeChip,
                { backgroundColor: isDark ? subject.accentSoftDark : subject.accentSoft },
              ]}
            >
              <Ionicons name="bulb" size={13} color={subject.accent} />
              <Text style={[styles.typeChipText, { color: subject.accentDeep }]}>
                {t('feed.recall.typeChip', { defaultValue: 'Memory' })}
              </Text>
            </View>

            {/* Right: classmates count + skip */}
            <View style={styles.bottomRight}>
              <View style={styles.classmatesInline}>
                <Ionicons name="people" size={13} color={colors.textSecondary} />
                <Text style={styles.classmatesText}>{card.classmatesReviewingCount}</Text>
              </View>
              {stage === 'resting' ? (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Pressable
                    onPress={handleDefer}
                    hitSlop={6}
                    style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('feed.recall.defer', { defaultValue: 'Skip' })}
                  >
                    <Text style={styles.skipText}>
                      {t('feed.recall.defer', { defaultValue: 'Skip' })}
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </>
        )}
      </View>

    </View>
  );
};

// ─────────────────────────────────────────────────────────
// Grade button

interface GradeButtonProps {
  styles: any;
  label: string;
  sub: string;
  variant: 'primary' | 'ghost';
  color: string;
  gradientEnd?: string;
  ghostBg?: string;
  ghostBorder?: string;
  onPress: () => void;
}

const GradeButton: React.FC<GradeButtonProps> = ({
  styles,
  label,
  sub,
  variant,
  color,
  gradientEnd,
  ghostBg,
  ghostBorder,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedView style={[styles.gradeBtnWrap, anim]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 280 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label} — ${sub}`}
      >
        {variant === 'primary' && gradientEnd ? (
          <LinearGradient
            colors={[color, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradeBtnPrimary}
          >
            <Text style={styles.gradeBtnLabelPrimary}>{label}</Text>
            <Text style={styles.gradeBtnSubPrimary} numberOfLines={1}>{sub}</Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.gradeBtnGhost,
              { backgroundColor: ghostBg, borderColor: ghostBorder },
            ]}
          >
            <Text style={[styles.gradeBtnLabelGhost, { color }]}>{label}</Text>
            <Text style={[styles.gradeBtnSubGhost, { color }]} numberOfLines={1}>{sub}</Text>
          </View>
        )}
      </Pressable>
    </AnimatedView>
  );
};

// ─────────────────────────────────────────────────────────
// Styles

type StyleMap = {
  outer: ViewStyle;

  headerRow: ViewStyle;
  iconWrapHeader: ViewStyle;
  headerInfo: ViewStyle;
  nameRow: ViewStyle;
  name: TextStyle;
  roleBadge: ViewStyle;
  roleBadgeText: TextStyle;
  metaRow: ViewStyle;
  metaText: TextStyle;
  metaDot: TextStyle;

  question: TextStyle;
  hintRow: ViewStyle;
  hintText: TextStyle;
  hintLabel: TextStyle;

  answerBlock: ViewStyle;
  answerDividerRow: ViewStyle;
  answerDividerLine: ViewStyle;
  answerDividerLabel: TextStyle;
  answer: TextStyle;

  cta: ViewStyle;
  ctaText: TextStyle;

  gradeWrap: ViewStyle;
  gradePrompt: TextStyle;
  gradeRow: ViewStyle;
  gradeBtnWrap: ViewStyle;
  gradeBtnPrimary: ViewStyle;
  gradeBtnGhost: ViewStyle;
  gradeBtnLabelPrimary: TextStyle;
  gradeBtnLabelGhost: TextStyle;
  gradeBtnSubPrimary: TextStyle;
  gradeBtnSubGhost: TextStyle;

  bottomRow: ViewStyle;
  typeChip: ViewStyle;
  typeChipText: TextStyle;
  bottomRight: ViewStyle;
  classmatesInline: ViewStyle;
  classmatesText: TextStyle;
  skipBtn: ViewStyle;
  skipText: TextStyle;
  bottomLeftCompleted: ViewStyle;

  completedBody: ViewStyle;
  checkRing: ViewStyle;
  xpNumberWrap: ViewStyle;
  xpNumberRow: ViewStyle;
  xpPlus: TextStyle;
  xpNumber: TextStyle;
  xpUnit: TextStyle;
  xpCaption: TextStyle;
  strengthBlock: ViewStyle;
  strengthLabels: ViewStyle;
  strengthLabelStart: TextStyle;
  strengthLabelEnd: TextStyle;
  strengthTrack: ViewStyle;
  strengthFillWrap: ViewStyle;
  strengthFill: ViewStyle;
  strengthHint: TextStyle;
};

const createStyles = (colors: any, isDark: boolean, subject: SubjectVisual) =>
  StyleSheet.create<StyleMap>({
    // Beautiful flat card — floats on the feed background.
    // Recall cards stand apart from the full-bleed posts above/below by being
    // the only contained card in the stream. White body, soft shadow,
    // generous radius, no border — depth comes from shadow alone.
    outer: {
      marginHorizontal: 14,
      marginVertical: 10,
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.card,
      ...Platform.select({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.06,
          shadowRadius: 20,
        },
        android: {
          elevation: 4,
        },
      }),
    },

    // ── Header (mirrors PostHeader: avatar + name + role badge + meta row) ──
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    iconWrapHeader: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? subject.accentSoftDark : subject.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: { flex: 1 },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    // Matches PostHeader's role badge: color + 20 alpha bg, color + icon
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      gap: 0,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textTertiary,
    },
    metaDot: {
      fontSize: 12,
      color: colors.textTertiary,
      marginHorizontal: 6,
    },

    // ── Question body (like post body text) ──
    question: {
      fontSize: 17,
      lineHeight: 25,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: -0.1,
      marginBottom: 4,
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 5,
      marginTop: 8,
    },
    hintText: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    hintLabel: {
      fontWeight: '800',
      letterSpacing: 0.3,
    },

    // ── Answer (revealed) ──
    answerBlock: {
      marginTop: 14,
      gap: 8,
    },
    answerDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    answerDividerLine: {
      flex: 1,
      height: 1,
    },
    answerDividerLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.6,
    },
    answer: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      letterSpacing: -0.3,
    },

    // ── CTA pill (mirrors "Read Article" exactly) ──
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 999,
      marginTop: 14,
    },
    ctaText: {
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.1,
    },

    // ── Grade buttons (revealed) ──
    gradeWrap: {
      marginTop: 14,
      gap: 8,
    },
    gradePrompt: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.1,
    },
    gradeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    gradeBtnWrap: { flex: 1 },
    gradeBtnPrimary: {
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gradeBtnGhost: {
      paddingVertical: 11,
      paddingHorizontal: 8,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    gradeBtnLabelPrimary: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.1,
    },
    gradeBtnLabelGhost: {
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    gradeBtnSubPrimary: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
      opacity: 0.92,
      marginTop: 1,
    },
    gradeBtnSubGhost: {
      fontSize: 11,
      fontWeight: '600',
      opacity: 0.85,
      marginTop: 1,
    },

    // ── Bottom row (mirrors the "Article chip + stats" row) ──
    // No marginBottom — the card padding handles bottom whitespace now.
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      gap: 8,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    bottomRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    classmatesInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    classmatesText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    skipBtn: {
      paddingVertical: 2,
      paddingHorizontal: 2,
    },
    skipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
    bottomLeftCompleted: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      flex: 1,
    },

    // ── Completed body ──
    completedBody: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    checkRing: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 2.5,
      borderColor: '#22C55E',
      backgroundColor: isDark ? 'rgba(34,197,94,0.14)' : '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    xpNumberWrap: {
      alignItems: 'center',
      marginTop: 2,
    },
    xpNumberRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    xpPlus: {
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: -1.2,
      marginRight: 2,
    },
    xpNumber: {
      fontSize: 46,
      fontWeight: '900',
      letterSpacing: -2.4,
    },
    xpUnit: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      marginLeft: 6,
    },
    xpCaption: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.4,
      marginTop: -2,
    },
    strengthBlock: {
      width: '100%',
      marginTop: 14,
    },
    strengthLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    strengthLabelStart: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    strengthLabelEnd: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    strengthTrack: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    strengthFillWrap: {
      height: '100%',
      minWidth: 8,
    },
    strengthFill: {
      height: '100%',
      borderRadius: 4,
    },
    strengthHint: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      letterSpacing: 0.1,
    },
  });

export default RecallCardItem;
