/**
 * FeynmanBountyItem — XP-staked Q&A card in the feed.
 *
 * Cognitive science: protégé effect (teaching = deeper learning), generation
 * effect (producing an explanation > consuming one), elaborative encoding via
 * articulation.
 *
 * Voice: same flat-card aesthetic as RecallCardItem v6 (white body, 24px
 * radius, soft shadow, 20px padding) — but with a gold/amber motif as the
 * single accent (the "coin" / stakes metaphor). Stands apart from posts
 * above/below as a distinct floating card.
 *
 * Hero: the bounty XP number, displayed at 48px weight-900 — mirrors the
 * profile card's "5 LEVEL" big-number treatment so the stakes feel real.
 *
 * Prototype: data is mocked, action callbacks are no-ops. Production needs
 * a Bounty Prisma model, XP-escrow service, and multi-format reply
 * pipeline (video / sketch / text + LaTeX).
 */

import React, { useCallback, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import type { FeynmanBounty } from '@/types';
import MasterExplainerBadge from './MasterExplainerBadge';

// Gold / amber accent palette — the "coin" metaphor in one color system
const ACCENT = '#D97706';        // amber-600 — primary bounty color
const ACCENT_DEEP = '#92400E';   // amber-800 — gradient end / numbers
const ACCENT_SOFT = '#FEF3C7';   // amber-100 — chip + icon-wrap backgrounds
const ACCENT_SOFT_DARK = 'rgba(217,119,6,0.18)';

// Urgency color coding for the "X hours left" chip
const urgencyFor = (hours: number): { color: string; bg: string } => {
  if (hours < 2) return { color: '#DC2626', bg: '#FEE2E2' };      // red — urgent
  if (hours < 6) return { color: '#D97706', bg: '#FEF3C7' };      // amber — soon
  return { color: '#0D9488', bg: '#CCFBF1' };                     // teal — fresh
};

interface Props {
  bounty: FeynmanBounty;
  onSeeAnswers?: (bountyId: string) => void;
  onExplain?: (bountyId: string) => void;
}

export const FeynmanBountyItem: React.FC<Props> = ({
  bounty,
  onSeeAnswers,
  onExplain,
}) => {
  const { colors, isDark } = useThemeContext();
  const { t } = useTranslation();

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const urgency = useMemo(() => urgencyFor(bounty.hoursLeft), [bounty.hoursLeft]);

  const handleSeeAnswers = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSeeAnswers?.(bounty.id);
  }, [bounty.id, onSeeAnswers]);

  const handleExplain = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onExplain?.(bounty.id);
  }, [bounty.id, onExplain]);

  return (
    <View style={styles.outer}>
      {/* ────────── HEADER ────────── */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrapHeader}>
          <Ionicons name="cash" size={20} color={ACCENT} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {t('feed.bounty.title', { defaultValue: 'Bounty Question' })}
            </Text>
            <View style={[styles.urgencyPill, { backgroundColor: urgency.bg }]}>
              <Ionicons name="time" size={11} color={urgency.color} />
              <Text style={[styles.urgencyText, { color: urgency.color }]}>
                {t('feed.bounty.hoursLeft', {
                  defaultValue: '{{count}}h left',
                  count: bounty.hoursLeft,
                })}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {bounty.subject}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {t('feed.bounty.askedBy', {
                defaultValue: 'asked by @{{name}}',
                name: bounty.asker.name,
              })}
              {bounty.asker.gradeLabel ? ` · ${bounty.asker.gradeLabel}` : ''}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ────────── QUESTION ────────── */}
      <Text style={styles.question}>{bounty.questionText}</Text>

      {bounty.attachmentName ? (
        <View style={styles.attachmentRow}>
          <Ionicons name="attach" size={14} color={ACCENT} />
          <Text style={styles.attachmentText} numberOfLines={1}>
            {bounty.attachmentName}
          </Text>
        </View>
      ) : null}

      {/* ────────── BOUNTY HERO (big number) ────────── */}
      <View style={styles.bountyHero}>
        <View style={styles.bountyNumberRow}>
          <Text style={[styles.bountyNumber, { color: ACCENT_DEEP }]}>
            {bounty.bountyXp}
          </Text>
          <Text style={[styles.bountyUnit, { color: ACCENT_DEEP }]}>XP</Text>
        </View>
        <Text style={styles.bountyCaption}>
          {t('feed.bounty.atStake', { defaultValue: 'AT STAKE' })}
        </Text>
      </View>

      {/* ────────── STAT CHIPS ────────── */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statChip,
            { backgroundColor: isDark ? ACCENT_SOFT_DARK : ACCENT_SOFT },
          ]}
        >
          <Ionicons name="people" size={13} color={ACCENT} />
          <Text style={[styles.statChipText, { color: ACCENT_DEEP }]}>
            {t('feed.bounty.tutorsWorking', {
              defaultValue: '{{count}} tutors working',
              count: bounty.tutorsWorking,
            })}
          </Text>
        </View>
        <View
          style={[
            styles.statChip,
            { backgroundColor: isDark ? ACCENT_SOFT_DARK : ACCENT_SOFT },
          ]}
        >
          <Ionicons name="chatbubbles" size={13} color={ACCENT} />
          <Text style={[styles.statChipText, { color: ACCENT_DEEP }]}>
            {t('feed.bounty.answersIn', {
              defaultValue: '{{count}} answers',
              count: bounty.answersCount,
            })}
          </Text>
        </View>
      </View>

      {/* ────────── TOP TUTOR ────────── */}
      {bounty.topTutor ? (
        <View style={styles.topTutorRow}>
          <Ionicons name="trophy" size={12} color={ACCENT} />
          <Text style={styles.topTutorLabel}>
            {t('feed.bounty.topTutor', { defaultValue: 'Top tutor:' })}{' '}
            <Text style={styles.topTutorName}>@{bounty.topTutor.name}</Text>
          </Text>
          <MasterExplainerBadge tier={bounty.topTutor.tier} />
        </View>
      ) : null}

      {/* ────────── ACTIONS ────────── */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleSeeAnswers}
          style={({ pressed }) => [
            styles.secondaryCta,
            { backgroundColor: isDark ? ACCENT_SOFT_DARK : ACCENT_SOFT },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('feed.bounty.seeAnswersCta', {
            defaultValue: 'See answers',
          })}
        >
          <Ionicons name="bulb" size={16} color={ACCENT_DEEP} />
          <Text style={[styles.secondaryCtaText, { color: ACCENT_DEEP }]}>
            {t('feed.bounty.seeAnswersCta', {
              defaultValue: 'See answers ({{count}})',
              count: bounty.answersCount,
            })}
          </Text>
        </Pressable>

        <TouchableOpacity
          onPress={handleExplain}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('feed.bounty.explainCta', {
            defaultValue: 'Explain it',
          })}
          style={styles.primaryCtaWrap}
        >
          <LinearGradient
            colors={[ACCENT, ACCENT_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryCta}
          >
            <Ionicons name="videocam" size={16} color="#FFFFFF" />
            <Text style={styles.primaryCtaText}>
              {t('feed.bounty.explainCta', { defaultValue: 'Explain it' })}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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
  urgencyPill: ViewStyle;
  urgencyText: TextStyle;
  metaRow: ViewStyle;
  metaText: TextStyle;
  metaDot: TextStyle;

  divider: ViewStyle;

  question: TextStyle;
  attachmentRow: ViewStyle;
  attachmentText: TextStyle;

  bountyHero: ViewStyle;
  bountyNumberRow: ViewStyle;
  bountyNumber: TextStyle;
  bountyUnit: TextStyle;
  bountyCaption: TextStyle;

  statsRow: ViewStyle;
  statChip: ViewStyle;
  statChipText: TextStyle;

  topTutorRow: ViewStyle;
  topTutorLabel: TextStyle;
  topTutorName: TextStyle;

  actionsRow: ViewStyle;
  secondaryCta: ViewStyle;
  secondaryCtaText: TextStyle;
  primaryCtaWrap: ViewStyle;
  primaryCta: ViewStyle;
  primaryCtaText: TextStyle;
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create<StyleMap>({
    // Beautiful flat card — same DNA as RecallCardItem v6
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
      backgroundColor: isDark ? ACCENT_SOFT_DARK : ACCENT_SOFT,
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
    urgencyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    urgencyText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      flexWrap: 'wrap',
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

    // ── Divider ──
    divider: {
      height: 1,
      backgroundColor: isDark ? colors.border : '#F1F5F9',
      marginVertical: 16,
    },

    // ── Question ──
    question: {
      fontSize: 17,
      lineHeight: 25,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: -0.1,
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 10,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: isDark ? ACCENT_SOFT_DARK : ACCENT_SOFT,
      alignSelf: 'flex-start',
    },
    attachmentText: {
      fontSize: 12,
      fontWeight: '700',
      color: ACCENT_DEEP,
      letterSpacing: 0.1,
    },

    // ── Bounty hero (mirrors profile-card big number) ──
    bountyHero: {
      alignItems: 'center',
      marginTop: 20,
      paddingVertical: 6,
    },
    bountyNumberRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    bountyNumber: {
      fontSize: 48,
      fontWeight: '900',
      letterSpacing: -2.5,
    },
    bountyUnit: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      marginLeft: 6,
    },
    bountyCaption: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.4,
      marginTop: -2,
    },

    // ── Stats chips ──
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      marginTop: 14,
    },
    statChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    statChipText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.1,
    },

    // ── Top tutor inline row ──
    topTutorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.border : '#F1F5F9',
    },
    topTutorLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      flexShrink: 1,
    },
    topTutorName: {
      fontWeight: '800',
      color: colors.text,
    },

    // ── Actions ──
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    secondaryCta: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 999,
    },
    secondaryCtaText: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    primaryCtaWrap: {
      flex: 1,
    },
    primaryCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 999,
      ...Platform.select({
        ios: {
          shadowColor: ACCENT,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.20,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    primaryCtaText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.1,
    },
  });

export default FeynmanBountyItem;
