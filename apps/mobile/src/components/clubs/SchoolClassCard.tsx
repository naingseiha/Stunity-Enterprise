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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CLASS_THEMES = [
  { accent: '#06A8CC', soft: '#E0F9FD', icon: 'school-outline'      as const }, // Brand Teal
  { accent: '#6366F1', soft: '#EEF2FF', icon: 'library-outline'     as const }, // Indigo
  { accent: '#F59E0B', soft: '#FEF3C7', icon: 'ribbon-outline'      as const }, // Amber
  { accent: '#EC4899', soft: '#FDF2F8', icon: 'star-outline'        as const }, // Pink
  { accent: '#10B981', soft: '#D1FAE5', icon: 'leaf-outline'        as const }, // Emerald
  { accent: '#8B5CF6', soft: '#F3E8FF', icon: 'extension-puzzle-outline' as const }, // Violet
];

interface SchoolClassCardProps {
  item: MyClassSummary;
  index: number;
  onPress: (item: MyClassSummary) => void;
  orderNumber?: number;
}

export const SchoolClassCard = React.memo(function SchoolClassCard({
  item,
  index,
  onPress,
}: SchoolClassCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const theme = CLASS_THEMES[index % CLASS_THEMES.length];
  const studentTotal = getSafeStudentCount(item);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.97, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  return (
    <AnimatedPressable
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.border : '#E2E8F0',
        },
        animatedStyle,
      ]}
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.body}>
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {t('clubs.screen.studentCountInline', {
              count: studentTotal,
              defaultValue: `${studentTotal} ${studentTotal === 1 ? 'student' : 'students'}`,
            })}
          </Text>
        </View>

        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark ? `${theme.accent}25` : theme.soft,
            },
          ]}
        >
          <Ionicons name={theme.icon} size={20} color={theme.accent} />
        </View>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 84,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
