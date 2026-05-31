/**
 * QuizWarBanner — live inter-class quiz battle, drops in as a single banner
 * near the top of the feed.
 *
 * Cognitive science: social facilitation (Zajonc), identity-based motivation
 * (Oyserman — "I'm a 10A kid" → I perform), Köhler effect (weaker performers
 * exert more in interdependent groups than alone).
 *
 * Voice: same flat-card aesthetic as the rest of the feed-event family
 * (white body, 24px radius, soft shadow, 20px padding). Urgency rendered
 * through a pulsing red LIVE indicator + live-ticking countdown + a
 * crimson gradient CTA — restrained chrome elsewhere.
 *
 * Visual hero: a tug-of-war score bar split between the two classes'
 * colors, fillproportional to their share of the total score. More
 * dramatic than parallel bars — makes the rivalry feel zero-sum.
 *
 * Prototype: countdown ticks locally via setInterval; scores are static.
 * Production: WebSocket subscription pushes score deltas in real time +
 * advances rounds + transitions status (PRE_MATCH → LIVE → POST_MATCH).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import type { QuizWar } from '@/types';
import { useQuizWarSocket } from '@/hooks/useQuizWarSocket';

// Urgency accent for LIVE / CTA — distinct from any subject color
const URGENT = '#DC2626';        // red-600
const URGENT_DEEP = '#991B1B';   // red-800
const URGENT_SOFT = '#FEE2E2';   // red-100
const URGENT_SOFT_DARK = 'rgba(220,38,38,0.18)';

const formatMMSS = (totalSec: number): string => {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

interface Props {
  war: QuizWar;
  onJoin?: (warId: string) => void;
}

export const QuizWarBanner: React.FC<Props> = ({ war: initialWar, onJoin }) => {
  const war = useQuizWarSocket(initialWar);
  const { colors, isDark } = useThemeContext();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // ── Live-ticking countdown ──
  const [remainingSec, setRemainingSec] = useState(war.timeRemainingSec);

  useEffect(() => {
    setRemainingSec(war.timeRemainingSec);
  }, [war.timeRemainingSec]);

  useEffect(() => {
    if (war.status !== 'LIVE') return;
    const id = setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [war.status]);

  // ── Pulsing LIVE dot ──
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (war.status !== 'LIVE') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, war.status]);

  const handleJoin = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onJoin?.(war.id);
  }, [onJoin, war.id]);

  // ── Score split for the tug-of-war bar ──
  const total = Math.max(1, war.teamA.score + war.teamB.score);
  const aShare = war.teamA.score / total;
  const aPercent = Math.round(aShare * 100);
  const bPercent = 100 - aPercent;

  const userTeam =
    war.userTeamId === war.teamA.id
      ? 'A'
      : war.userTeamId === war.teamB.id
        ? 'B'
        : null;

  return (
    <View style={styles.outer}>
      {/* ────────── HEADER ────────── */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrapHeader}>
          <Ionicons name="flash" size={20} color={URGENT} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {t('feed.quizWar.title', { defaultValue: 'Quiz War' })}
            </Text>
            {war.status === 'LIVE' ? (
              <View style={styles.livePill}>
                <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                <Text style={styles.liveText}>
                  {t('feed.quizWar.live', { defaultValue: 'LIVE' })}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {war.subject}
            {'  ·  '}
            {t('feed.quizWar.round', {
              defaultValue: 'Round {{round}} of {{total}}',
              round: war.round,
              total: war.totalRounds,
            })}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ────────── TEAMS ROW ────────── */}
      <View style={styles.teamsRow}>
        <View style={styles.teamCol}>
          <View
            style={[
              styles.teamBadge,
              { backgroundColor: war.teamA.color },
            ]}
          >
            <Text style={styles.teamBadgeText}>{war.teamA.name}</Text>
          </View>
          <Text style={[styles.teamScore, { color: war.teamA.color }]}>
            {war.teamA.score}
          </Text>
          {userTeam === 'A' ? (
            <Text style={styles.yourTeam}>
              {t('feed.quizWar.yourTeam', { defaultValue: 'Your team' })}
            </Text>
          ) : null}
        </View>

        <View style={styles.vsWrap}>
          <Text style={styles.vsText}>
            {t('feed.quizWar.vs', { defaultValue: 'VS' })}
          </Text>
        </View>

        <View style={styles.teamCol}>
          <View
            style={[
              styles.teamBadge,
              { backgroundColor: war.teamB.color },
            ]}
          >
            <Text style={styles.teamBadgeText}>{war.teamB.name}</Text>
          </View>
          <Text style={[styles.teamScore, { color: war.teamB.color }]}>
            {war.teamB.score}
          </Text>
          {userTeam === 'B' ? (
            <Text style={styles.yourTeam}>
              {t('feed.quizWar.yourTeam', { defaultValue: 'Your team' })}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ────────── TUG-OF-WAR SCORE BAR ────────── */}
      <View style={styles.tugBar}>
        <View
          style={[
            styles.tugFillA,
            {
              width: `${aPercent}%`,
              backgroundColor: war.teamA.color,
            },
          ]}
        />
        <View
          style={[
            styles.tugFillB,
            {
              width: `${bPercent}%`,
              backgroundColor: war.teamB.color,
            },
          ]}
        />
      </View>
      <View style={styles.tugPercentRow}>
        <Text style={[styles.tugPercentText, { color: war.teamA.color }]}>
          {aPercent}%
        </Text>
        <Text style={[styles.tugPercentText, { color: war.teamB.color }]}>
          {bPercent}%
        </Text>
      </View>

      {/* ────────── COUNTDOWN ────────── */}
      <View style={styles.countdownBlock}>
        <View style={styles.countdownRow}>
          <Ionicons name="timer" size={20} color={URGENT} />
          <Text style={styles.countdownNumber}>{formatMMSS(remainingSec)}</Text>
        </View>
        <Text style={styles.countdownCaption}>
          {t('feed.quizWar.remaining', { defaultValue: 'REMAINING' })}
        </Text>
      </View>

      {/* ────────── PRESENCE ────────── */}
      <View style={styles.presenceRow}>
        <View style={styles.presenceDot} />
        <Text style={styles.presenceText}>
          {t('feed.quizWar.classmatesFighting', {
            defaultValue: '{{count}} classmates fighting',
            count: war.classmatesFighting,
          })}
          {!war.isUserParticipating ? (
            <Text style={styles.presenceSecondary}>
              {' '}
              ·{' '}
              {t('feed.quizWar.youreOut', { defaultValue: "you're out" })}
            </Text>
          ) : null}
        </Text>
      </View>

      {/* ────────── CTA ────────── */}
      <TouchableOpacity
        onPress={handleJoin}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={t('feed.quizWar.joinCta', {
          defaultValue: 'Join the Battle',
        })}
        style={styles.ctaWrap}
      >
        <LinearGradient
          colors={[URGENT, URGENT_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cta}
        >
          <Ionicons name="play" size={16} color="#FFFFFF" />
          <Text style={styles.ctaText}>
            {war.isUserParticipating
              ? t('feed.quizWar.continueCta', {
                  defaultValue: 'Back to the Battle',
                })
              : t('feed.quizWar.joinCta', {
                  defaultValue: 'Join the Battle',
                })}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ────────── REWARD FOOTER ────────── */}
      <View style={styles.rewardRow}>
        <Ionicons name="trophy" size={14} color="#D97706" />
        <Text style={styles.rewardText}>
          {t('feed.quizWar.reward', {
            defaultValue: 'Win: +{{xp}} XP to your class leaderboard',
            xp: war.rewardXp,
          })}
        </Text>
      </View>
    </View>
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
  subtitle: TextStyle;
  livePill: ViewStyle;
  liveDot: ViewStyle;
  liveText: TextStyle;

  divider: ViewStyle;

  teamsRow: ViewStyle;
  teamCol: ViewStyle;
  teamBadge: ViewStyle;
  teamBadgeText: TextStyle;
  teamScore: TextStyle;
  yourTeam: TextStyle;
  vsWrap: ViewStyle;
  vsText: TextStyle;

  tugBar: ViewStyle;
  tugFillA: ViewStyle;
  tugFillB: ViewStyle;
  tugPercentRow: ViewStyle;
  tugPercentText: TextStyle;

  countdownBlock: ViewStyle;
  countdownRow: ViewStyle;
  countdownNumber: TextStyle;
  countdownCaption: TextStyle;

  presenceRow: ViewStyle;
  presenceDot: ViewStyle;
  presenceText: TextStyle;
  presenceSecondary: TextStyle;

  ctaWrap: ViewStyle;
  cta: ViewStyle;
  ctaText: TextStyle;

  rewardRow: ViewStyle;
  rewardText: TextStyle;
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create<StyleMap>({
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
        android: { elevation: 4 },
      }),
    },

    // ── Header ──
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconWrapHeader: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? URGENT_SOFT_DARK : URGENT_SOFT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: { flex: 1 },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    name: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      flexShrink: 1,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
      color: colors.textSecondary,
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: URGENT,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FFFFFF',
    },
    liveText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 1.2,
    },

    divider: {
      height: 1,
      backgroundColor: isDark ? colors.border : '#F1F5F9',
      marginVertical: 16,
    },

    // ── Teams row ──
    teamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    teamCol: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    teamBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
    },
    teamBadgeText: {
      fontSize: 13,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    teamScore: {
      fontSize: 36,
      fontWeight: '900',
      letterSpacing: -1.6,
    },
    yourTeam: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    vsWrap: {
      paddingHorizontal: 6,
    },
    vsText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textTertiary,
      letterSpacing: 1.4,
    },

    // ── Tug-of-war bar ──
    tugBar: {
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      flexDirection: 'row',
      marginTop: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
    },
    tugFillA: {
      height: '100%',
    },
    tugFillB: {
      height: '100%',
    },
    tugPercentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    tugPercentText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.2,
    },

    // ── Countdown ──
    countdownBlock: {
      alignItems: 'center',
      marginTop: 16,
    },
    countdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    countdownNumber: {
      fontSize: 38,
      fontWeight: '900',
      letterSpacing: -1.8,
      color: URGENT_DEEP,
      // Tabular numerals so the countdown doesn't wobble as digits change
      ...(Platform.OS === 'ios'
        ? { fontVariant: ['tabular-nums'] as any }
        : {}),
    },
    countdownCaption: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.4,
      marginTop: -2,
    },

    // ── Presence ──
    presenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      justifyContent: 'center',
    },
    presenceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22C55E',
    },
    presenceText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    presenceSecondary: {
      fontWeight: '500',
      color: colors.textSecondary,
    },

    // ── CTA ──
    ctaWrap: {
      marginTop: 16,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 999,
      ...Platform.select({
        ios: {
          shadowColor: URGENT,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        android: { elevation: 3 },
      }),
    },
    ctaText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },

    // ── Reward footer ──
    rewardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      marginTop: 14,
    },
    rewardText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
  });

export default QuizWarBanner;
