/**
 * Educational Value Modal
 *
 * Compact, mobile-friendly bottom sheet for rating educational content.
 * Single-line star rows, inline difficulty chips, and a recommend toggle.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

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
  { value: 'too_easy', label: 'Easy', emoji: '😴', color: '#10B981' },
  { value: 'just_right', label: 'Just Right', emoji: '🎯', color: '#0EA5E9' },
  { value: 'too_hard', label: 'Hard', emoji: '😰', color: '#EF4444' },
] as const;

// ── Compact Star Row ───────────────────────────────────────────────
function StarRow({
  icon,
  label,
  color,
  rating,
  onRate,
}: {
  icon: string;
  label: string;
  color: string;
  rating: number;
  onRate: (n: number) => void;
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
              color={star <= rating ? color : '#D1D5DB'}
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
  const [value, setValue] = useState<EducationalValue>({
    accuracy: 0,
    helpfulness: 0,
    clarity: 0,
    depth: 0,
    difficulty: null,
    recommend: false,
  });

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
    // Reset on close
    setValue({
      accuracy: 0,
      helpfulness: 0,
      clarity: 0,
      depth: 0,
      difficulty: null,
      recommend: false,
    });
    onClose();
  }, [onClose]);

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
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <Animated.View entering={SlideInDown.duration(300).springify()} style={styles.modal}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="diamond" size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.title}>Rate Content</Text>
                <Text style={styles.subtitle}>
                  How valuable is this {postType.toLowerCase()}?
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* ── Star Ratings ───────────────────────────────── */}
          <View style={styles.section}>
            {DIMENSIONS.map((dim) => (
              <StarRow
                key={dim.key}
                icon={dim.icon}
                label={dim.label}
                color={dim.color}
                rating={value[dim.key] as number}
                onRate={(n) => handleRate(dim.key, n)}
              />
            ))}
          </View>

          {/* ── Difficulty ─────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Difficulty</Text>
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
                    <Text style={styles.difficultyEmoji}>{opt.emoji}</Text>
                    <Text
                      style={[
                        styles.difficultyLabel,
                        active && { color: opt.color, fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
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
                color={value.recommend ? '#6366F1' : '#D1D5DB'}
              />
              <Text style={[styles.recommendText, value.recommend && styles.recommendTextActive]}>
                I'd recommend this to peers
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Summary + Submit ──────────────────────────── */}
          <View style={styles.footer}>
            {isComplete && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.summaryRow}>
                <Ionicons name="analytics" size={18} color="#8B5CF6" />
                <Text style={styles.summaryText}>
                  Your rating: <Text style={styles.summaryBold}>{averageRating}/5.0</Text>
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
                colors={isComplete && !isSubmitting ? ['#6366F1', '#8B5CF6'] : ['#E5E7EB', '#D1D5DB']}
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
                      color={isComplete ? '#fff' : '#9CA3AF'}
                    />
                    <Text style={[styles.submitText, !isComplete && styles.submitTextDisabled]}>
                      Submit Rating
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34, // Safe area padding
    minHeight: 520,    // Always tall enough to cover tab bar
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
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
    borderBottomColor: '#F3F4F6',
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
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
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
    borderBottomColor: '#F9FAFB',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    gap: 5,
  },
  difficultyEmoji: {
    fontSize: 18,
  },
  difficultyLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  recommendRowActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  recommendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  recommendTextActive: {
    color: '#6366F1',
    fontWeight: '600',
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
    fontSize: 14,
    color: '#6B7280',
  },
  summaryBold: {
    fontWeight: '700',
    color: '#8B5CF6',
  },
  submitBtn: {
    borderRadius: 14,
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
    color: '#FFFFFF',
  },
  submitTextDisabled: {
    color: '#9CA3AF',
  },
});
