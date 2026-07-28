import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import type { MyClassSummary } from '@/api/classes';
import { getSafeStudentCount } from '@/utils/classGenderCounts';

// ─── Refined Color Palette ──────────────────────────────────────────────────
// Very subtle accent colors instead of heavy gradients.
const MINIMAL_PALETTE = [
  { accent: '#0EA5E9', bg: '#F0F9FF', darkBg: 'rgba(14,165,233,0.1)' },
  { accent: '#8B5CF6', bg: '#F5F3FF', darkBg: 'rgba(139,92,246,0.1)' },
  { accent: '#10B981', bg: '#ECFDF5', darkBg: 'rgba(16,185,129,0.1)' },
  { accent: '#F59E0B', bg: '#FFFBEB', darkBg: 'rgba(245,158,11,0.1)' },
  { accent: '#EC4899', bg: '#FDF2F8', darkBg: 'rgba(236,72,153,0.1)' },
];

function getPaletteIndex(name: string): number {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return sum % MINIMAL_PALETTE.length;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SchoolClassCardProps {
  item: MyClassSummary;
  index: number;
  onPress: (item: MyClassSummary) => void;
  orderNumber?: number;
  variant?: 'grid' | 'list' | 'deck';
}

export const SchoolClassCard = React.memo(function SchoolClassCard({
  item,
  onPress,
  variant = 'grid',
}: SchoolClassCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();

  const studentTotal = getSafeStudentCount(item);
  const palette = MINIMAL_PALETTE[getPaletteIndex(item.name)];
  
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.97, { damping: 20, stiffness: 200 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 20, stiffness: 200 }); };

  const studentLabel = t('clubs.screen.studentCountInline', {
    count: studentTotal,
    defaultValue: `${studentTotal} ${studentTotal === 1 ? 'student' : 'students'}`,
  });

  const cardStyle = {
    backgroundColor: isDark ? colors.card : '#FFFFFF',
    borderColor: isDark ? colors.border : '#E2E8F0',
  };

  const iconBg = isDark ? palette.darkBg : palette.bg;

  // ─── DECK Variant (Clean, minimalist 180×130) ─────────────
  if (variant === 'deck') {
    const gradeLabel = item.grade ? `Grade ${item.grade}` : '';
    const initials = item.name.slice(0, 2).toUpperCase();
    
    return (
      <AnimatedPressable
        style={[styles.deckCard, cardStyle, animatedStyle]}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.deckTopRow}>
          <View style={[styles.deckIconCircle, { backgroundColor: iconBg }]}>
            <Text style={[styles.deckInitials, { color: palette.accent }]}>{initials}</Text>
          </View>
          {gradeLabel ? (
            <View style={[styles.deckGradePill, { backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9' }]}>
              <Text style={[styles.deckGradeText, { color: colors.textSecondary }]}>{gradeLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.deckContentWrap}>
          <Text style={[styles.deckClassName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
        </View>

        <View style={styles.deckBottomRow}>
          <View style={styles.deckStudentRow}>
            <Ionicons name="people-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.deckStudentText, { color: colors.textSecondary }]}>{studentTotal}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </AnimatedPressable>
    );
  }

  // ─── GRID Variant ──────────────────────────────────────────────
  if (variant !== 'list') {
    return (
      <AnimatedPressable
        style={[styles.gridCard, cardStyle, animatedStyle]}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.gridContent}>
          <View style={[styles.gridIconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name="school-outline" size={18} color={palette.accent} />
          </View>
          <View style={styles.gridTextBlock}>
            <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.gridSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{studentLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </AnimatedPressable>
    );
  }

  // ─── LIST Variant ──────────────────────────────────────────────
  return (
    <AnimatedPressable
      style={[styles.listCard, cardStyle, animatedStyle]}
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={[styles.listIconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name="school-outline" size={20} color={palette.accent} />
      </View>
      <View style={styles.listTextBlock}>
        <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.listSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{studentLabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  // ── DECK variant (Clean minimalist card) ──────────────
  deckCard: {
    width: 170,
    height: 140,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginLeft: 16,
  },
  deckTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deckIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckInitials: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deckGradePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deckGradeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  deckContentWrap: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 8,
  },
  deckClassName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  deckBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  deckStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deckStudentText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Grid variant ──────────────────────────────────────────────
  gridCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gridContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTextBlock: {
    flex: 1,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  gridSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── List variant ──────────────────────────────────────────────
  listCard: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  listIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTextBlock: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  listSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
});
