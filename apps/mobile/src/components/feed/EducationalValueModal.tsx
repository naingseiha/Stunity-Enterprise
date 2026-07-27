import { useTranslation } from 'react-i18next';
/**
 * Educational Value Modal
 *
 * Compact, mobile-friendly bottom sheet for rating educational content.
 * Single-line star rows, inline difficulty chips, and a recommend toggle.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Haptics } from '@/services/haptics';
import { useThemeContext } from '@/contexts';

export interface EducationalValue {
  accuracy: number;
  helpfulness: number;
  clarity: number;
  depth: number;
  difficulty: 'too_easy' | 'just_right' | 'too_hard' | null;
  recommend: boolean;
}

interface EducationalValueModalProps {
  visible: boolean;
  postType: string;
  authorName: string;
  onClose: () => void;
  onSubmit: (value: EducationalValue) => void;
  isSubmitting?: boolean;
}

// ── Rating dimensions (compact config) ─────────────────────────────
const DIMENSIONS: { key: keyof EducationalValue; icon: string; label: string; color: string }[] = [
  { key: 'accuracy', icon: 'checkmark-circle', label: 'Accuracy', color: '#10B981' },
  { key: 'helpfulness', icon: 'bulb', label: 'Helpfulness', color: '#0EA5E9' },
  { key: 'clarity', icon: 'eye', label: 'Clarity', color: '#3B82F6' },
  { key: 'depth', icon: 'layers', label: 'Depth', color: '#8B5CF6' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'too_easy', label: 'Easy', icon: 'arrow-down-circle', color: '#10B981' },
  { value: 'just_right', label: 'Just Right', icon: 'checkmark-circle', color: '#0EA5E9' },
  { value: 'too_hard', label: 'Hard', icon: 'flame', color: '#EF4444' },
] as const;

const INITIAL_VALUE: EducationalValue = {
  accuracy: 0,
  helpfulness: 0,
  clarity: 0,
  depth: 0,
  difficulty: null,
  recommend: false,
};

// ── Compact Star Row ───────────────────────────────────────────────
function StarRow({
  icon,
  label,
  color,
  mutedColor,
  rating,
  onRate,
  styles,
}: {
  icon: string;
  label: string;
  color: string;
  mutedColor: string;
  rating: number;
  onRate: (n: number) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.starRow}>
      <View style={styles.starRowLeft}>
        <View style={[styles.starRowIcon, { backgroundColor: `${color}12` }]}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        <Text style={styles.starRowLabel}>{label}</Text>
      </View>
      <View style={styles.starsGroup}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRate(star);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            style={styles.starTouch}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={22}
              color={star <= rating ? color : mutedColor}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────
export const EducationalValueModal: React.FC<EducationalValueModalProps> = ({
  visible,
  postType,
  authorName,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [value, setValue] = useState<EducationalValue>(INITIAL_VALUE);
  const slideAnim = React.useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setValue(INITIAL_VALUE);
      });
    }
  }, [visible, slideAnim]);

  const handleRate = useCallback((key: keyof EducationalValue, rating: number) => {
    setValue((prev) => ({ ...prev, [key]: rating }));
  }, []);

  const handleDifficulty = useCallback((diff: typeof value.difficulty) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setValue((prev) => ({ ...prev, difficulty: diff }));
  }, []);

  const handleRecommend = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setValue((prev) => ({ ...prev, recommend: !prev.recommend }));
  }, []);

  const handleSubmit = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(value);
  }, [value, onSubmit]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setValue(INITIAL_VALUE);
      onClose();
    });
  }, [onClose, slideAnim]);

  const isComplete =
    value.accuracy > 0 &&
    value.helpfulness > 0 &&
    value.clarity > 0 &&
    value.depth > 0;

  const averageRating = isComplete
    ? ((value.accuracy + value.helpfulness + value.clarity + value.depth) / 4).toFixed(1)
    : '0.0';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <Animated.View style={[styles.modal, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="diamond" size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.title}>{t('feed.educationalValue.title', 'Rate Educational Value')}</Text>
                <Text style={styles.subtitle}>
                  {t('feed.educationalValue.rateSubtitle', 'How would you rate this')} {t(`feed.postTypes.${postType.toLowerCase()}`, postType.toLowerCase())}?
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Star Ratings ───────────────────────────────── */}
          <View style={styles.section}>
            {DIMENSIONS.map((dim) => (
              <StarRow
                key={dim.key}
                icon={dim.icon}
                label={t(`feed.educationalValue.${dim.key}`, dim.label)}
                color={dim.color}
                mutedColor={colors.border}
                rating={value[dim.key] as number}
                onRate={(n) => handleRate(dim.key, n)}
                styles={styles}
              />
            ))}
          </View>

          {/* ── Difficulty ─────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('feed.educationalValue.difficulty', 'DIFFICULTY')}</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_OPTIONS.map((opt) => {
                const active = value.difficulty === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleDifficulty(opt.value)}
                    style={[
                      styles.difficultyChip,
                      active && { backgroundColor: `${opt.color}15`, borderColor: opt.color },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={active ? opt.color : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.difficultyLabel,
                        active && { color: opt.color, fontWeight: '700' },
                      ]}
                    >
                      {t(`feed.educationalValue.${opt.value === 'too_easy' ? 'easy' : opt.value === 'just_right' ? 'justRight' : 'hard'}`, opt.label)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Recommend Toggle ───────────────────────────── */}
          <View>
            <TouchableOpacity
              onPress={handleRecommend}
              style={[styles.recommendRow, value.recommend && styles.recommendRowActive]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={value.recommend ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={22}
                color={value.recommend ? '#6366F1' : colors.border}
              />
              <Text style={[styles.recommendText, value.recommend && styles.recommendTextActive]}>
                {t('feed.educationalValue.recommend', 'I recommend this to others')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Summary + Submit ──────────────────────────── */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {isComplete && (
              <Animated.View style={styles.summaryRow}>
                <Ionicons name="analytics" size={18} color="#8B5CF6" />
                <Text style={styles.summaryText}>
                  {t('feed.educationalValue.averageRating', 'Average Rating:')} <Text style={styles.summaryBold}>{averageRating}/5.0</Text>
                </Text>
              </Animated.View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!isComplete || isSubmitting}
              style={[styles.submitBtn, (!isComplete || isSubmitting) && styles.submitBtnDisabled]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isComplete && !isSubmitting ? ['#6366F1', '#8B5CF6'] : [colors.buttonDisabled, colors.buttonDisabled]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="diamond"
                      size={18}
                      color={isComplete ? '#fff' : colors.textSecondary}
                    />
                    <Text style={[styles.submitText, !isComplete && styles.submitTextDisabled]}>
                      {t('feed.educationalValue.submit', 'Submit Rating')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal >
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 520,    // Always tall enough to cover tab bar
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Star rows
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  starRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  starRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.text,
  },
  starsGroup: {
    flexDirection: 'row',
    gap: 2,
  },
  starTouch: {
    padding: 2,
  },

  // ── Difficulty
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  difficultyChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
    gap: 5,
  },
  difficultyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // ── Recommend
  recommendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  recommendRowActive: {
    borderColor: '#6366F1',
    backgroundColor: isDark ? 'rgba(99,102,241,0.16)' : '#EEF2FF',
  },
  recommendText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.textSecondary,
  },
  recommendTextActive: {
    color: '#6366F1',
    fontWeight: '700',
  },

  // ── Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  summaryBold: {
    fontWeight: '700',
    color: '#8B5CF6',
  },
  submitBtn: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: '#FFFFFF',
  },
  submitTextDisabled: {
    color: colors.textSecondary,
  },
});
