/**
 * BountyDetailScreen — full replies list for a Feynman Bounty.
 *
 * Shows: bounty question + XP + time left, then a scrollable list of
 * replies ordered by (winner first, then ahaCount desc). Each reply has
 * an Aha! toggle button (one per user). The winner reply gets a distinct
 * gold banner. If the current user is the asker and the bounty is ACTIVE,
 * they see an "Award" button on each reply.
 *
 * Navigation: FeedScreen → onSeeAnswers(bountyId) → navigate('BountyDetail')
 *             FeedScreen → onExplain(bountyId) → navigate('BountyDetail', { openCompose: true })
 *             (compose sheet opens automatically when openCompose=true)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { Colors, ColorScale, Spacing, BorderRadius, Shadows } from '@/config';
import { Avatar } from '@/components/common';
import { Haptics } from '@/services/haptics';
import { formatRelativeTime } from '@/utils';
import {
  fetchBountyReplies,
  submitBountyReply,
  toggleBountyAha,
  awardBounty,
  type BountyReply,
} from '@/api/bounties';
import { fetchActiveBounties } from '@/api/bounties';
import type { FeynmanBounty, MasterExplainerTier } from '@/types';
import type { FeedStackParamList } from '@/navigation/types';

const ACCENT       = '#D97706';
const ACCENT_DEEP  = '#92400E';
const ACCENT_SOFT  = '#FEF3C7';
const ACCENT_DARK  = 'rgba(217,119,6,0.18)';

const TIER_CONFIG: Record<MasterExplainerTier, { color: string; bg: string; label: string }> = {
  bronze: { color: '#92400E', bg: '#FEF3C7', label: 'Bronze' },
  silver: { color: '#475569', bg: '#E2E8F0', label: 'Silver' },
  gold:   { color: '#B45309', bg: '#FDE68A', label: 'Gold'   },
};

type RouteProps = RouteProp<FeedStackParamList, 'BountyDetail'>;

export default function BountyDetailScreen() {
  const { colors, isDark } = useThemeContext();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore(s => s.user?.id);

  const { bountyId, bountySubject, bountyXp } = route.params;

  const [bounty, setBounty]     = useState<FeynmanBounty | null>(null);
  const [replies, setReplies]   = useState<BountyReply[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [allBounties, replyData] = await Promise.all([
        fetchActiveBounties({ limit: 50 }),
        fetchBountyReplies(bountyId, { limit: 50 }),
      ]);
      const found = allBounties.find(b => b.id === bountyId);
      if (found) setBounty(found);
      setReplies(replyData);
    } catch (e: any) {
      if (__DEV__) console.warn('[BountyDetail] load failed', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bountyId]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const handleAha = useCallback(async (replyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await toggleBountyAha(bountyId, replyId);
      setReplies(prev => prev.map(r =>
        r.id === replyId
          ? { ...r, ahaCount: result.ahaCount, hasAha: result.added }
          : r,
      ));
    } catch { /* silent */ }
  }, [bountyId]);

  const handleAward = useCallback(async (replyId: string) => {
    Alert.alert(
      t('feed.bounty.awardTitle', { defaultValue: 'Award Bounty' }),
      t('feed.bounty.awardConfirm', {
        defaultValue: 'Award the full {{xp}} XP bounty to this explanation?',
        xp: bounty?.bountyXp ?? bountyXp ?? '?',
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('feed.bounty.awardConfirmBtn', { defaultValue: 'Award it!' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await awardBounty(bountyId, replyId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await load(true);
            } catch (err: any) {
              Alert.alert(
                t('common.error', { defaultValue: 'Error' }),
                err?.message ?? t('feed.bounty.awardFailed', { defaultValue: 'Failed to award bounty' }),
                [{ text: t('common.ok') }],
              );
            }
          },
        },
      ],
    );
  }, [bountyId, bounty?.bountyXp, bountyXp, load, t]);

  const handleSubmitReply = useCallback(async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitBountyReply(bountyId, { content: replyText.trim(), format: 'TEXT' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReplyText('');
      setComposeOpen(false);
      await load(true);
    } catch (err: any) {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        err?.message ?? t('feed.bounty.submitFailed', { defaultValue: 'Failed to submit reply' }),
        [{ text: t('common.ok') }],
      );
    } finally {
      setSubmitting(false);
    }
  }, [bountyId, replyText, submitting, load, t]);

  const isAsker = bounty ? bounty.asker.id === currentUserId : false;
  const isBountyActive = bounty ? true : false; // simplified — real check: status === 'ACTIVE'

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: 0 }]} edges={['top']}>
      {/* ── Header ── */}
      <LinearGradient
        colors={isDark ? ['#1C0A00', '#2D1500'] : [ACCENT_SOFT, '#FFF7ED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? Colors.white : ACCENT_DEEP} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerSubject} numberOfLines={1}>
            {bounty?.subject ?? bountySubject ?? t('feed.bounty.title', { defaultValue: 'Bounty' })}
          </Text>
          <View style={styles.headerMeta}>
            <Ionicons name="flash" size={13} color={ACCENT} />
            <Text style={styles.headerXp}>
              {bounty?.bountyXp ?? bountyXp ?? '?'} XP{' '}
              {t('feed.bounty.atStake', { defaultValue: 'AT STAKE' })}
            </Text>
            {bounty ? (
              <>
                <Text style={styles.headerMetaDot}>·</Text>
                <Ionicons name="time" size={12} color={colors.textSecondary} />
                <Text style={styles.headerMetaText}>
                  {bounty.hoursLeft}h{' '}
                  {t('feed.bounty.left', { defaultValue: 'left' })}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setComposeOpen(true)}
          style={styles.explainBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.explainBtnText}>
            {t('feed.bounty.explainCta', { defaultValue: 'Explain' })}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT} />
            }
            keyboardShouldPersistTaps="handled"
          >
            {/* Question */}
            {bounty ? (
              <View style={[styles.questionCard, { backgroundColor: isDark ? colors.surfaceVariant : Colors.white }]}>
                <View style={styles.questionAskerRow}>
                  <Avatar uri={bounty.asker.avatarUrl} name={bounty.asker.name} size="sm" />
                  <View>
                    <Text style={[styles.questionAskerName, { color: colors.text }]}>{bounty.asker.name}</Text>
                    {bounty.asker.gradeLabel ? (
                      <Text style={[styles.questionAskerGrade, { color: colors.textSecondary }]}>{bounty.asker.gradeLabel}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.questionText, { color: colors.text }]}>{bounty.questionText}</Text>
                {bounty.attachmentName ? (
                  <View style={[styles.attachRow, { backgroundColor: isDark ? ACCENT_DARK : ACCENT_SOFT }]}>
                    <Ionicons name="attach" size={13} color={ACCENT} />
                    <Text style={[styles.attachText, { color: ACCENT_DEEP }]}>{bounty.attachmentName}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Replies header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('feed.bounty.repliesTitle', { defaultValue: 'Explanations' })}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {replies.length}
              </Text>
            </View>

            {replies.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="bulb-outline" size={40} color={isDark ? ACCENT_DARK : ACCENT_SOFT} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t('feed.bounty.noReplies', { defaultValue: 'No explanations yet' })}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t('feed.bounty.beFirst', { defaultValue: 'Be the first to explain it and claim the bounty!' })}
                </Text>
                <TouchableOpacity
                  onPress={() => setComposeOpen(true)}
                  style={styles.emptyExplainBtn}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[ACCENT, ACCENT_DEEP]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.emptyExplainGradient}
                  >
                    <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.emptyExplainText}>
                      {t('feed.bounty.explainCta', { defaultValue: 'Explain it & earn' })} {bounty?.bountyXp ?? ''} XP
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              replies.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  isAsker={isAsker}
                  isBountyActive={isBountyActive}
                  isDark={isDark}
                  colors={colors}
                  onAha={handleAha}
                  onAward={handleAward}
                  t={t}
                />
              ))
            )}
          </ScrollView>

          {/* Compose sheet */}
          {composeOpen ? (
            <View style={[styles.composeSheet, {
              backgroundColor: isDark ? colors.surfaceVariant : Colors.white,
              borderTopColor: isDark ? colors.border : ColorScale.gray[200],
              paddingBottom: insets.bottom + 8,
            }]}>
              <View style={styles.composeHeader}>
                <Text style={[styles.composeTitle, { color: colors.text }]}>
                  {t('feed.bounty.composeTitle', { defaultValue: 'Your Explanation' })}
                </Text>
                <Pressable onPress={() => setComposeOpen(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.composeInput, {
                  color: colors.text,
                  backgroundColor: isDark ? colors.card : ColorScale.gray[50],
                  borderColor: isDark ? colors.border : ColorScale.gray[200],
                }]}
                placeholder={t('feed.bounty.composePlaceholder', {
                  defaultValue: 'Write a clear, step-by-step explanation...',
                })}
                placeholderTextColor={colors.textTertiary}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                autoFocus
                maxLength={2000}
              />
              <View style={styles.composeFooter}>
                <Text style={[styles.composeCharCount, { color: colors.textSecondary }]}>
                  {replyText.length}/2000
                </Text>
                <TouchableOpacity
                  onPress={handleSubmitReply}
                  disabled={!replyText.trim() || submitting}
                  activeOpacity={0.9}
                  style={[styles.submitBtn, (!replyText.trim() || submitting) && { opacity: 0.5 }]}
                >
                  <LinearGradient
                    colors={[ACCENT, ACCENT_DEEP]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.submitGradient}
                  >
                    {submitting
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Text style={styles.submitText}>
                          {t('feed.bounty.submitReply', { defaultValue: 'Submit Explanation' })}
                        </Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ── ReplyCard sub-component ──────────────────────────────────────────────

interface ReplyCardProps {
  reply: BountyReply;
  isAsker: boolean;
  isBountyActive: boolean;
  isDark: boolean;
  colors: any;
  onAha: (replyId: string) => void;
  onAward: (replyId: string) => void;
  t: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ReplyCard({ reply, isAsker, isBountyActive, isDark, colors, onAha, onAward, t }: ReplyCardProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const tier = reply.tutor.tier;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  return (
    <View style={[
      replyStyles.card,
      { backgroundColor: isDark ? colors.surfaceVariant : Colors.white },
      reply.isWinner && replyStyles.winnerCard,
    ]}>
      {reply.isWinner ? (
        <View style={replyStyles.winnerBanner}>
          <Ionicons name="trophy" size={13} color="#FFFFFF" />
          <Text style={replyStyles.winnerBannerText}>
            {t('feed.bounty.winnerBadge', { defaultValue: 'Winning Explanation' })}
          </Text>
        </View>
      ) : null}

      {/* Tutor row */}
      <View style={replyStyles.tutorRow}>
        <Avatar uri={reply.tutor.avatarUrl} name={reply.tutor.name} size="sm" />
        <View style={{ flex: 1 }}>
          <View style={replyStyles.tutorNameRow}>
            <Text style={[replyStyles.tutorName, { color: colors.text }]}>{reply.tutor.name}</Text>
            {tierCfg ? (
              <View style={[replyStyles.tierBadge, { backgroundColor: tierCfg.bg }]}>
                <Ionicons name="ribbon" size={10} color={tierCfg.color} />
                <Text style={[replyStyles.tierText, { color: tierCfg.color }]}>{tierCfg.label}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[replyStyles.tutorMeta, { color: colors.textTertiary }]}>
            {reply.format.toLowerCase()}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[replyStyles.content, { color: colors.text }]}>{reply.content}</Text>

      {/* Footer — Aha + Award */}
      <View style={replyStyles.footer}>
        <AnimatedPressable
          style={[
            replyStyles.ahaBtn,
            reply.hasAha
              ? { backgroundColor: isDark ? ACCENT_DARK : ACCENT_SOFT }
              : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : ColorScale.gray[100] },
            anim,
          ]}
          onPress={() => onAha(reply.id)}
          onPressIn={() => { scale.value = withSpring(0.94, { damping: 15, stiffness: 320 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 13, stiffness: 280 }); }}
          accessibilityRole="button"
          accessibilityLabel="Aha reaction"
        >
          <Ionicons name="bulb" size={14} color={reply.hasAha ? ACCENT : colors.textSecondary} />
          <Text style={[replyStyles.ahaCount, { color: reply.hasAha ? ACCENT_DEEP : colors.textSecondary }]}>
            {reply.ahaCount > 0 ? reply.ahaCount : ''}{' '}
            {t('feed.bounty.aha', { defaultValue: 'Aha!' })}
          </Text>
        </AnimatedPressable>

        {isAsker && isBountyActive && !reply.isWinner ? (
          <TouchableOpacity
            onPress={() => onAward(reply.id)}
            style={replyStyles.awardBtn}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[ACCENT, ACCENT_DEEP]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={replyStyles.awardGradient}
            >
              <Ionicons name="trophy" size={13} color="#FFFFFF" />
              <Text style={replyStyles.awardText}>
                {t('feed.bounty.awardBtn', { defaultValue: 'Award winner' })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safeArea:           { flex: 1, backgroundColor: colors.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn:            { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)' },
  headerCenter:       { flex: 1 },
  headerSubject:      { fontSize: 15, fontWeight: '800', color: isDark ? Colors.white : ACCENT_DEEP },
  headerMeta:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerXp:           { fontSize: 12, fontWeight: '800', color: ACCENT, letterSpacing: 0.3 },
  headerMetaDot:      { color: colors.textSecondary, fontSize: 12, marginHorizontal: 2 },
  headerMetaText:     { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  explainBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  explainBtnText:     { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  loadingWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent:      { paddingBottom: 40 },
  questionCard:       { margin: 16, borderRadius: BorderRadius.xl, padding: 16, gap: 10, ...Shadows.md },
  questionAskerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questionAskerName:  { fontSize: 14, fontWeight: '700' },
  questionAskerGrade: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  questionText:       { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  attachRow:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  attachText:         { fontSize: 12, fontWeight: '700' },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  sectionTitle:       { fontSize: 16, fontWeight: '800' },
  sectionCount:       { fontSize: 13, fontWeight: '600' },
  emptyWrap:          { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, gap: 12 },
  emptyTitle:         { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyExplainBtn:    { marginTop: 8, borderRadius: 999, overflow: 'hidden' },
  emptyExplainGradient:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  emptyExplainText:   { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  composeSheet:       { borderTopWidth: 1, paddingTop: 14, paddingHorizontal: 16 },
  composeHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  composeTitle:       { fontSize: 15, fontWeight: '800' },
  composeInput:       { borderRadius: BorderRadius.lg, borderWidth: 1, padding: 12, minHeight: 100, maxHeight: 200, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  composeFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  composeCharCount:   { fontSize: 12, fontWeight: '500' },
  submitBtn:          { borderRadius: 999, overflow: 'hidden' },
  submitGradient:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 11 },
  submitText:         { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});

const replyStyles = StyleSheet.create({
  card:         { marginHorizontal: 16, marginBottom: 12, borderRadius: BorderRadius.xl, padding: 16, ...Shadows.md },
  winnerCard:   { borderWidth: 1.5, borderColor: ACCENT },
  winnerBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginBottom: 10 },
  winnerBannerText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },
  tutorRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tutorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tutorName:    { fontSize: 14, fontWeight: '700' },
  tierBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tierText:     { fontSize: 10, fontWeight: '700' },
  tutorMeta:    { fontSize: 11, fontWeight: '500', marginTop: 2, textTransform: 'capitalize' },
  content:      { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  ahaBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  ahaCount:     { fontSize: 12, fontWeight: '700' },
  awardBtn:     { borderRadius: 999, overflow: 'hidden' },
  awardGradient:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  awardText:    { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
