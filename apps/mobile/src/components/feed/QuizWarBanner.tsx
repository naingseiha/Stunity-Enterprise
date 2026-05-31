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
          <Ionicons name="flash" size={18} color={URGENT} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {t('feed.quizWar.title', { defaultValue: 'Quiz War' })}
            </Text>
            {war.status === 'LIVE' ? (
              <View style={styles.liveBadge}>
                <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                <Text style={styles.liveText}>
                  {t('feed.quizWar.live', { defaultValue: 'LIVE' })}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {war.subject}
          </Text>
        </View>
        {/* Sleek header timer */}
        {war.status === 'LIVE' ? (
          <View style={styles.timerBadge}>
            <Ionicons name="timer-outline" size={13} color={URGENT} />
            <Text style={styles.timerText}>{formatMMSS(remainingSec)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* ────────── ROUND INFO ────────── */}
      <View style={styles.roundInfoWrap}>
        <Text style={styles.roundInfoText}>
          {t('feed.quizWar.round', {
            defaultValue: 'Round {{round}} of {{total}}',
            round: war.round,
            totalRounds: war.totalRounds,
          })}
        </Text>
      </View>

      {/* ────────── TEAMS COMPARISON ────────── */}
      <View style={styles.teamsRow}>
        {/* Team A */}
        <View style={styles.teamCol}>
          <View style={styles.teamBadgeRow}>
            <View style={[styles.classBadge, { backgroundColor: war.teamA.color }]}>
              <Text style={styles.classBadgeText}>{war.teamA.name}</Text>
            </View>
            <View style={styles.teamInfoCol}>
              <Text style={styles.teamScore}>{war.teamA.score}</Text>
              <Text style={styles.teamLabel} numberOfLines={1}>
                {userTeam === 'A' ? t('feed.quizWar.yourTeam', { defaultValue: 'Your Class' }) : t('feed.quizWar.class', { defaultValue: 'Class A' })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.vsWrap}>
          <Text style={styles.vsText}>{t('feed.quizWar.vs', { defaultValue: 'VS' })}</Text>
        </View>

        {/* Team B */}
        <View style={styles.teamCol}>
          <View style={[styles.teamBadgeRow, { flexDirection: 'row-reverse' }]}>
            <View style={[styles.classBadge, { backgroundColor: war.teamB.color }]}>
              <Text style={styles.classBadgeText}>{war.teamB.name}</Text>
            </View>
            <View style={[styles.teamInfoCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.teamScore}>{war.teamB.score}</Text>
              <Text style={styles.teamLabel} numberOfLines={1}>
                {userTeam === 'B' ? t('feed.quizWar.yourTeam', { defaultValue: 'Your Class' }) : t('feed.quizWar.class', { defaultValue: 'Class B' })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ────────── TUG-OF-WAR BALANCE BAR ────────── */}
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

      {/* ────────── PRESENCE / SOCIAL PROOF ────────── */}
      <View style={styles.presenceRow}>
        <View style={styles.avatarPile}>
          <View style={[styles.pileAvatar, { backgroundColor: war.teamA.color, zIndex: 3 }]}>
            <Text style={styles.pileAvatarText}>{war.teamA.name.substring(0, 2)}</Text>
          </View>
          <View style={[styles.pileAvatar, { backgroundColor: war.teamB.color, zIndex: 2, marginLeft: -8 }]}>
            <Text style={styles.pileAvatarText}>{war.teamB.name.substring(0, 2)}</Text>
          </View>
          <View style={[styles.pileAvatar, { backgroundColor: colors.primary, zIndex: 1, marginLeft: -8 }]}>
            <Ionicons name="people" size={10} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.presenceText}>
          <Text style={styles.presenceHighlight}>
            {t('feed.quizWar.classmatesFighting', {
              defaultValue: '{{count}} classmates fighting',
              count: war.classmatesFighting,
            })}
          </Text>
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
  liveBadge: ViewStyle;
  liveDot: ViewStyle;
  liveText: TextStyle;
  timerBadge: ViewStyle;
  timerIcon: ViewStyle;
  timerText: TextStyle;
  roundInfoWrap: ViewStyle;
  roundInfoText: TextStyle;

  divider: ViewStyle;

  teamsRow: ViewStyle;
  teamCol: ViewStyle;
  teamBadgeRow: ViewStyle;
  classBadge: ViewStyle;
  classBadgeText: TextStyle;
  teamInfoCol: ViewStyle;
  teamScore: TextStyle;
  teamLabel: TextStyle;
  vsWrap: ViewStyle;
  vsText: TextStyle;

  tugBar: ViewStyle;
  tugFillA: ViewStyle;
  tugFillB: ViewStyle;
  tugPercentRow: ViewStyle;
  tugPercentText: TextStyle;

  avatarPile: ViewStyle;
  pileAvatar: ViewStyle;
  pileAvatarText: TextStyle;
  presenceRow: ViewStyle;
  presenceText: TextStyle;
  presenceHighlight: TextStyle;
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
      gap: 8,
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
    liveBadge: {
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
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? URGENT_SOFT_DARK : URGENT_SOFT,
    },
    timerIcon: {
      marginRight: 1,
    },
    timerText: {
      fontSize: 12,
      fontWeight: '800',
      color: URGENT,
      ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] as any } : {}),
    },
    roundInfoWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    roundInfoText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },

    divider: {
      height: 1,
      backgroundColor: isDark ? colors.border : '#F1F5F9',
      marginVertical: 14,
    },

    // ── Teams scoreboard ──
    teamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 4,
    },
    teamCol: {
      flex: 1,
    },
    teamBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    classBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        android: { elevation: 1 },
      }),
    },
    classBadgeText: {
      fontSize: 12,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    teamInfoCol: {
      flex: 1,
      justifyContent: 'center',
    },
    teamScore: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.5,
    },
    teamLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      marginTop: 1,
    },
    vsWrap: {
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vsText: {
      fontSize: 11,
      fontWeight: '900',
      color: colors.textTertiary,
      letterSpacing: 0.5,
    },

    // ── Tug-of-war bar ──
    tugBar: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      flexDirection: 'row',
      marginTop: 16,
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

    // ── Presence / Social Proof ──
    avatarPile: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 6,
    },
    pileAvatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pileAvatarText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    presenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      justifyContent: 'center',
    },
    presenceText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    presenceHighlight: {
      fontWeight: '700',
      color: colors.text,
    },
    presenceSecondary: {
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
      paddingVertical: 13,
      borderRadius: 999,
      ...Platform.select({
        ios: {
          shadowColor: URGENT,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    ctaText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.1,
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
