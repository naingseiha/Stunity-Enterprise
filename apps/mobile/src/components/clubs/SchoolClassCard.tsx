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
  variant?: 'grid' | 'list';
}

export const SchoolClassCard = React.memo(function SchoolClassCard({
  item,
  index,
  onPress,
  variant = 'grid',
}: SchoolClassCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const theme = CLASS_THEMES[index % CLASS_THEMES.length];
  const studentTotal = getSafeStudentCount(item);
  const isList = variant === 'list';

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.97, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  return (
    <AnimatedPressable
      style={[
        isList ? styles.listCard : styles.gridCard,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.border : '#E2E8F0',
          borderWidth: 1,
        },
        animatedStyle,
      ]}
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={isList ? styles.listBody : styles.gridBody}>
        <View style={isList ? styles.listTextWrap : styles.gridTextWrap}>
          <View style={isList ? styles.listTitleRow : styles.gridTitleRow}>
            <Text
              style={[isList ? styles.listTitle : styles.gridTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>
          <Text
            style={[isList ? styles.listSubtitle : styles.gridSubtitle, { color: colors.textSecondary }]}
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
            isList ? styles.listIconCircle : styles.gridIconCircle,
            {
              backgroundColor: isDark ? `${theme.accent}25` : theme.soft,
            },
          ]}
        >
          <Ionicons name={theme.icon} size={isList ? 22 : 20} color={theme.accent} />
        </View>
        {isList && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ opacity: 0.5, marginLeft: 4 }} />}
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 84,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gridBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gridTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  gridTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  gridSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  listCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    minHeight: 88,
    elevation: 0,
  },
  listBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  listSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  listIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
});
