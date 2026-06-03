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
          <Ionicons name="ribbon-outline" size={18} color={ACCENT} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {t('feed.bounty.title', { defaultValue: 'Bounty Question' })}
            </Text>
            <View style={[styles.urgencyPill, { borderColor: urgency.color }]}>
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
        {/* Top-right Bounty XP Tag (Stack Overflow style) */}
        <View style={styles.xpBadge}>
          <Ionicons name="diamond" size={12} color={ACCENT} style={{ marginRight: 2 }} />
          <Text style={styles.xpBadgeText}>+{bounty.bountyXp} XP</Text>
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

      {/* ────────── METRICS & STATS ────────── */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metricText}>
            {t('feed.bounty.tutorsWorking', {
              defaultValue: '{{count}} active',
              count: bounty.tutorsWorking,
            })}
          </Text>
        </View>
        <Text style={styles.metricSeparator}>•</Text>
        <View style={styles.metricItem}>
          <Ionicons name="chatbubbles-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metricText}>
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
          <Ionicons name="trophy-outline" size={12} color={ACCENT} />
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
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('feed.bounty.seeAnswersCta', {
            defaultValue: 'See answers',
          })}
        >
          <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.secondaryCtaText, { color: colors.textSecondary }]}>
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
          <View style={styles.primaryCta}>
            <Ionicons name="videocam-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryCtaText}>
              {t('feed.bounty.explainCta', { defaultValue: 'Explain it' })}
            </Text>
          </View>
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
  xpBadge: ViewStyle;
  xpBadgeText: TextStyle;

  divider: ViewStyle;

  question: TextStyle;
  attachmentRow: ViewStyle;
  attachmentText: TextStyle;

  metricsRow: ViewStyle;
  metricItem: ViewStyle;
  metricText: TextStyle;
  metricSeparator: TextStyle;

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
    outer: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.16)' : '#E5E7EB',
    },

    // ── Header ──
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconWrapHeader: {
      width: 38,
      height: 38,
      borderRadius: 19,
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
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
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
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      backgroundColor: 'transparent',
    },
    xpBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: ACCENT,
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
      borderWidth: 1,
      borderColor: isDark ? ACCENT_SOFT_DARK : ACCENT_SOFT,
      alignSelf: 'flex-start',
      backgroundColor: 'transparent',
    },
    attachmentText: {
      fontSize: 12,
      fontWeight: '700',
      color: ACCENT,
      letterSpacing: 0.1,
    },

    // ── Metrics ──
    metricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      gap: 8,
    },
    metricItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metricText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    metricSeparator: {
      fontSize: 12,
      color: colors.textTertiary,
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
      paddingVertical: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'transparent',
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
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: ACCENT,
    },
    primaryCtaText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.1,
    },
  });

export default FeynmanBountyItem;
