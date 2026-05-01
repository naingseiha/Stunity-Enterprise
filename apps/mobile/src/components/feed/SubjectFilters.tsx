/**
 * SubjectFilters Component — Featured Categories Grid
 * 
 * Screenshot-inspired circular icon containers:
 * - Round pastel-tinted icon circles with subject icons
 * - Label underneath each circle
 * - Scrollable horizontal row
 * - Active state with colored ring + subtle scale
 */

import React from 'react';
import { useThemeContext } from '@/contexts';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export interface SubjectFilter {
  key: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;       // Main accent color
  bgColor: string;     // Light circle background
  gradient: [string, string]; // Gradient for active ring
}

const SUBJECTS: SubjectFilter[] = [
  { key: 'ALL', labelKey: 'feed.subjects.all', icon: 'grid', color: '#0EA5E9', bgColor: '#E0F2FE', gradient: ['#7DD3FC', '#0EA5E9'] },
  { key: 'MATH', labelKey: 'feed.subjects.math', icon: 'calculator', color: '#2563EB', bgColor: '#DBEAFE', gradient: ['#60A5FA', '#2563EB'] },
  { key: 'PHYSICS', labelKey: 'feed.subjects.physics', icon: 'rocket-outline', color: '#DC2626', bgColor: '#FEE2E2', gradient: ['#F87171', '#DC2626'] },
  { key: 'CHEMISTRY', labelKey: 'feed.subjects.chemistry', icon: 'flask', color: '#059669', bgColor: '#D1FAE5', gradient: ['#34D399', '#059669'] },
  { key: 'BIOLOGY', labelKey: 'feed.subjects.biology', icon: 'leaf', color: '#16A34A', bgColor: '#DCFCE7', gradient: ['#4ADE80', '#16A34A'] },
  { key: 'CS', labelKey: 'feed.subjects.cs', icon: 'terminal-outline', color: '#4338CA', bgColor: '#E0E7FF', gradient: ['#818CF8', '#4338CA'] },
  { key: 'ENGLISH', labelKey: 'feed.subjects.english', icon: 'library-outline', color: '#DB2777', bgColor: '#FCE7F3', gradient: ['#F472B6', '#DB2777'] },
  { key: 'HISTORY', labelKey: 'feed.subjects.history', icon: 'hourglass-outline', color: '#C2410C', bgColor: '#FFEDD5', gradient: ['#FB923C', '#C2410C'] },
  { key: 'GEOGRAPHY', labelKey: 'feed.subjects.geography', icon: 'earth', color: '#0891B2', bgColor: '#CFFAFE', gradient: ['#22D3EE', '#0891B2'] },
  { key: 'ARTS', labelKey: 'feed.subjects.arts', icon: 'brush-outline', color: '#E11D48', bgColor: '#FFE4E6', gradient: ['#FB7185', '#E11D48'] },
];

interface SubjectFiltersProps {
  activeFilter: string;
  pendingFilter?: string | null;
  onFilterChange: (filterKey: string) => void;
}

interface SubjectFilterChipProps {
  subject: SubjectFilter;
  isActive: boolean;
  isPending: boolean;
  label: string;
  styles: any;
  onPress: (filterKey: string) => void;
}

const SubjectFilterChip = React.memo(function SubjectFilterChip({
  subject,
  isActive,
  isPending,
  label,
  styles,
  onPress,
}: SubjectFilterChipProps) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const haloScale = React.useRef(new Animated.Value(0.7)).current;
  const haloOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1.06 : 1,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [isActive, scale]);

  const animatePress = React.useCallback(() => {
    scale.stopAnimation();
    haloScale.stopAnimation();
    haloOpacity.stopAnimation();
    scale.setValue(0.94);
    haloScale.setValue(0.68);
    haloOpacity.setValue(0.18);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1.08,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(haloScale, {
          toValue: 1.7,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [haloOpacity, haloScale, scale]);

  const handlePress = React.useCallback(() => {
    animatePress();
    onPress(subject.key);
  }, [animatePress, onPress, subject.key]);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.categoryItem}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive, busy: isPending }}
      hitSlop={6}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.filterHalo,
          {
            backgroundColor: subject.color,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View style={[styles.iconBoxWrap, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={subject.gradient}
          style={[
            styles.iconBox,
            isActive && { shadowColor: subject.color, borderColor: subject.color },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={subject.icon} size={20} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <Text
        style={[
          styles.categoryLabel,
          isActive && { color: subject.color, fontWeight: '800' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.dotSlot}>
        {!!isActive && (
          <View
            style={[
              styles.activeDot,
              {
                backgroundColor: subject.color,
                opacity: isPending ? 0.55 : 1,
              },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
});

export default function SubjectFilters({
  activeFilter,
  pendingFilter,
  onFilterChange,
}: SubjectFiltersProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUBJECTS.map((subject) => {
          const isActive = activeFilter === subject.key;
          const isPending = pendingFilter === subject.key;
          const label = t(subject.labelKey);
          return (
            <SubjectFilterChip
              key={subject.key}
              subject={subject}
              isActive={isActive}
              isPending={isPending}
              label={label}
              styles={styles}
              onPress={onFilterChange}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 4,
  },
  categoryItem: {
    alignItems: 'center',
    width: 64,
    gap: 5,
    position: 'relative',
  },
  filterHalo: {
    position: 'absolute',
    top: 5,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  iconBoxWrap: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dotSlot: {
    height: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
