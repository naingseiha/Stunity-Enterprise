/**
 * CreateBountyScreen — compose form for posting a new Feynman Bounty.
 *
 * Design mirrors CreatePostScreen: SafeAreaView + gradient header +
 * scrollable body + sticky submit bar at the bottom.
 *
 * The user picks a subject (from a predefined list), types their
 * question, sets the XP stake via a slider, optionally names an
 * attachment, and taps "Post Bounty". The XP is debited atomically
 * on the backend (InsufficientXpError → 409 surfaces a user-readable
 * message).
 */

import React, { useCallback, useMemo, useState } from 'react';
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
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { Colors, ColorScale, Spacing, BorderRadius } from '@/config';
import { Haptics } from '@/services/haptics';
import { createBounty } from '@/api/bounties';

const ACCENT      = '#D97706';
const ACCENT_DEEP = '#92400E';
const ACCENT_SOFT = '#FEF3C7';
const ACCENT_DARK = 'rgba(217,119,6,0.18)';

const MIN_XP = 5;
const MAX_XP = 500;
const XP_STEP = 5;

const SUBJECTS = [
  { label: 'Mathematics',      value: 'mathematics',      color: '#0284C7', icon: 'calculator' as const },
  { label: 'Physics',          value: 'physics',          color: '#4F46E5', icon: 'planet' as const },
  { label: 'Chemistry',        value: 'chemistry',        color: '#9333EA', icon: 'flask' as const },
  { label: 'Biology',          value: 'biology',          color: '#16A34A', icon: 'leaf' as const },
  { label: 'English',          value: 'english',          color: '#EA580C', icon: 'book' as const },
  { label: 'History',          value: 'history',          color: '#CA8A04', icon: 'time' as const },
  { label: 'Computer Science', value: 'computerScience',  color: '#DB2777', icon: 'code-slash' as const },
  { label: 'General',          value: 'general',          color: '#6B7280', icon: 'help-circle' as const },
];

export default function CreateBountyScreen() {
  const { colors, isDark } = useThemeContext();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userXp = useAuthStore(s => s.user ? 0 : 0); // XP read from stats if available

  const [subject,    setSubject]    = useState(SUBJECTS[0]);
  const [question,   setQuestion]   = useState('');
  const [attachment, setAttachment] = useState('');
  const [bountyXp,   setBountyXp]   = useState(50);
  const [duration,   setDuration]   = useState(24); // hours
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const canPost = question.trim().length >= 20 && bountyXp >= MIN_XP;

  const handleXpStep = useCallback((dir: 1 | -1) => {
    Haptics.selectionAsync();
    setBountyXp(prev => Math.max(MIN_XP, Math.min(MAX_XP, prev + dir * XP_STEP)));
  }, []);

  const handlePost = useCallback(async () => {
    if (!canPost || submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const result = await createBounty({
        subject: `${subject.label} · ${question.trim().split(' ').slice(0, 4).join(' ')}`,
        subjectColor: subject.color,
        questionText: question.trim(),
        attachmentName: attachment.trim() || undefined,
        bountyXp,
        durationHours: duration,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('feed.bounty.postedTitle', { defaultValue: 'Bounty Posted!' }),
        t('feed.bounty.postedBody', {
          defaultValue:
            'Your {{xp}} XP bounty is live. Tutors in your school can now see it in their feed.',
          xp: result.bountyXp,
        }),
        [{
          text: t('feed.bounty.viewBounty', { defaultValue: 'View answers' }),
          onPress: () => {
            navigation.replace('BountyDetail', {
              bountyId: result.id,
              bountySubject: subject.label,
              bountyXp: result.bountyXp,
            });
          },
        }],
      );
    } catch (err: any) {
      const isInsufficientXp = err?.response?.status === 409;
      Alert.alert(
        isInsufficientXp
          ? t('feed.bounty.insufficientXpTitle', { defaultValue: 'Not enough XP' })
          : t('common.error', { defaultValue: 'Error' }),
        isInsufficientXp
          ? t('feed.bounty.insufficientXpBody', {
              defaultValue:
                'You need {{need}} XP but only have {{have}}. Earn more XP by ' +
                'completing quizzes and having your posts rated.',
              need: err?.response?.data?.details?.need ?? '?',
              have: err?.response?.data?.details?.have ?? '?',
            })
          : (err?.message ?? t('feed.bounty.postFailed', { defaultValue: 'Failed to post bounty' })),
        [{ text: t('common.ok') }],
      );
    } finally {
      setSubmitting(false);
    }
  }, [canPost, submitting, subject, question, attachment, bountyXp, duration, navigation, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1C0A00', '#2D1500'] : [ACCENT_SOFT, '#FFF7ED']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="close" size={24} color={isDark ? Colors.white : ACCENT_DEEP} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('feed.bounty.createTitle', { defaultValue: 'Post a Bounty Question' })}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Subject picker */}
          <Text style={styles.sectionLabel}>
            {t('feed.bounty.subjectLabel', { defaultValue: 'Subject' })}
          </Text>
          <View style={styles.subjectGrid}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s.value}
                onPress={() => { Haptics.selectionAsync(); setSubject(s); }}
                style={[
                  styles.subjectChip,
                  { backgroundColor: subject.value === s.value
                      ? (isDark ? `${s.color}30` : `${s.color}18`)
                      : (isDark ? 'rgba(255,255,255,0.06)' : ColorScale.gray[100]),
                    borderColor: subject.value === s.value ? s.color : 'transparent',
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={s.icon}
                  size={13}
                  color={subject.value === s.value ? s.color : colors.textSecondary}
                />
                <Text style={[
                  styles.subjectChipText,
                  { color: subject.value === s.value ? s.color : colors.textSecondary },
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Question */}
          <Text style={styles.sectionLabel}>
            {t('feed.bounty.questionLabel', { defaultValue: 'Your Question' })}
            <Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={[styles.questionInput, {
              color: colors.text,
              backgroundColor: isDark ? colors.card : Colors.white,
              borderColor: isDark ? colors.border : ColorScale.gray[200],
            }]}
            placeholder={t('feed.bounty.questionPlaceholder', {
              defaultValue:
                'Be specific. Include what you tried, what confused you, and what kind of explanation would help most. Min 20 characters.',
            })}
            placeholderTextColor={colors.textTertiary}
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={2000}
          />
          <Text style={[styles.charCount, { color: colors.textTertiary }]}>
            {question.length}/2000
          </Text>

          {/* Attachment (optional) */}
          <Text style={styles.sectionLabel}>
            {t('feed.bounty.attachmentLabel', { defaultValue: 'Attachment Name (optional)' })}
          </Text>
          <TextInput
            style={[styles.singleLineInput, {
              color: colors.text,
              backgroundColor: isDark ? colors.card : Colors.white,
              borderColor: isDark ? colors.border : ColorScale.gray[200],
            }]}
            placeholder={t('feed.bounty.attachmentPlaceholder', { defaultValue: 'e.g. textbook_page42.jpg' })}
            placeholderTextColor={colors.textTertiary}
            value={attachment}
            onChangeText={setAttachment}
            maxLength={200}
          />

          {/* XP Stake */}
          <Text style={styles.sectionLabel}>
            {t('feed.bounty.xpLabel', { defaultValue: 'XP at Stake' })}
          </Text>
          <View style={[styles.xpRow, { backgroundColor: isDark ? colors.card : Colors.white, borderColor: isDark ? colors.border : ColorScale.gray[200] }]}>
            <TouchableOpacity onPress={() => handleXpStep(-1)} style={styles.xpStep} hitSlop={4}>
              <Ionicons name="remove" size={20} color={bountyXp <= MIN_XP ? colors.textTertiary : ACCENT_DEEP} />
            </TouchableOpacity>
            <View style={styles.xpCenter}>
              <Text style={[styles.xpNumber, { color: ACCENT_DEEP }]}>{bountyXp}</Text>
              <Text style={[styles.xpUnit, { color: ACCENT }]}>XP</Text>
            </View>
            <TouchableOpacity onPress={() => handleXpStep(1)} style={styles.xpStep} hitSlop={4}>
              <Ionicons name="add" size={20} color={bountyXp >= MAX_XP ? colors.textTertiary : ACCENT_DEEP} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.xpHint, { color: colors.textSecondary }]}>
            {t('feed.bounty.xpHint', {
              defaultValue:
                'This XP is deducted from your balance immediately and held in escrow. The winning tutor receives it when you award them.',
            })}
          </Text>

          {/* Duration */}
          <Text style={styles.sectionLabel}>
            {t('feed.bounty.durationLabel', { defaultValue: 'Open for' })}
          </Text>
          <View style={styles.durationRow}>
            {[12, 24, 48, 72].map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => { Haptics.selectionAsync(); setDuration(h); }}
                style={[
                  styles.durationChip,
                  { backgroundColor: duration === h
                      ? (isDark ? ACCENT_DARK : ACCENT_SOFT)
                      : (isDark ? 'rgba(255,255,255,0.06)' : ColorScale.gray[100]),
                    borderColor: duration === h ? ACCENT : 'transparent',
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.durationChipText, { color: duration === h ? ACCENT_DEEP : colors.textSecondary }]}>
                  {h}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Sticky bottom bar */}
        <View style={[styles.bottomBar, {
          backgroundColor: isDark ? colors.surfaceVariant : Colors.white,
          borderTopColor: isDark ? colors.border : ColorScale.gray[200],
          paddingBottom: insets.bottom + 8,
        }]}>
          <View style={styles.bottomSummary}>
            <View style={[styles.bottomChip, { backgroundColor: isDark ? ACCENT_DARK : ACCENT_SOFT }]}>
              <Ionicons name="flash" size={14} color={ACCENT} />
              <Text style={[styles.bottomChipText, { color: ACCENT_DEEP }]}>
                -{bountyXp} XP
              </Text>
            </View>
            <View style={[styles.bottomChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : ColorScale.gray[100] }]}>
              <Ionicons name="time" size={14} color={colors.textSecondary} />
              <Text style={[styles.bottomChipText, { color: colors.textSecondary }]}>
                {duration}h
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handlePost}
            disabled={!canPost || submitting}
            activeOpacity={0.9}
            style={[styles.postBtn, (!canPost || submitting) && { opacity: 0.5 }]}
          >
            <LinearGradient
              colors={[ACCENT, ACCENT_DEEP]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.postGradient}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <>
                    <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.postText}>
                      {t('feed.bounty.postBtn', { defaultValue: 'Post Bounty' })}
                    </Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safeArea:       { flex: 1, backgroundColor: colors.background } as ViewStyle,
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 } as ViewStyle,
  backBtn:        { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)' } as ViewStyle,
  headerTitle:    { fontSize: 16, fontWeight: '800', color: isDark ? Colors.white : ACCENT_DEEP } as TextStyle,
  scrollContent:  { paddingHorizontal: 16, paddingTop: 16 } as ViewStyle,
  sectionLabel:   { fontSize: 13, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 } as TextStyle,
  required:       { color: '#EF4444' } as TextStyle,
  subjectGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  subjectChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 } as ViewStyle,
  subjectChipText:{ fontSize: 12, fontWeight: '700' } as TextStyle,
  questionInput:  { borderRadius: BorderRadius.lg, borderWidth: 1, padding: 14, minHeight: 120, maxHeight: 220, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' } as TextStyle,
  charCount:      { alignSelf: 'flex-end', fontSize: 11, fontWeight: '500', marginTop: 4 } as TextStyle,
  singleLineInput:{ borderRadius: BorderRadius.lg, borderWidth: 1, padding: 14, fontSize: 15 } as TextStyle,
  xpRow:          { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' } as ViewStyle,
  xpStep:         { width: 52, height: 60, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  xpCenter:       { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 } as ViewStyle,
  xpNumber:       { fontSize: 32, fontWeight: '900', letterSpacing: -1.5 } as TextStyle,
  xpUnit:         { fontSize: 16, fontWeight: '800' } as TextStyle,
  xpHint:         { fontSize: 12, lineHeight: 17, marginTop: 6 } as TextStyle,
  durationRow:    { flexDirection: 'row', gap: 10 } as ViewStyle,
  durationChip:   { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 } as ViewStyle,
  durationChipText:{ fontSize: 14, fontWeight: '800' } as TextStyle,
  bottomBar:      { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16 } as ViewStyle,
  bottomSummary:  { flexDirection: 'row', gap: 8, marginBottom: 10 } as ViewStyle,
  bottomChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 } as ViewStyle,
  bottomChipText: { fontSize: 12, fontWeight: '800' } as TextStyle,
  postBtn:        { borderRadius: 999, overflow: 'hidden' } as ViewStyle,
  postGradient:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 } as ViewStyle,
  postText:       { fontSize: 15, fontWeight: '800', color: '#FFFFFF' } as TextStyle,
});
