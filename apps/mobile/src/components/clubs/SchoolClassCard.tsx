import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import type { MyClassSummary } from '@/api/classes';
import { getClassGenderCounts, getSafeStudentCount } from '@/utils/classGenderCounts';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CLASS_THEMES = [
  { accent: '#06A8CC', soft: '#E0F9FD', icon: 'school-outline'      as const }, // Brand Teal
  { accent: '#6366F1', soft: '#EEF2FF', icon: 'library-outline'     as const }, // Indigo
  { accent: '#F59E0B', soft: '#FEF3C7', icon: 'ribbon-outline'      as const }, // Amber
  { accent: '#EC4899', soft: '#FDF2F8', icon: 'star-outline'        as const }, // Pink
  { accent: '#10B981', soft: '#D1FAE5', icon: 'leaf-outline'        as const }, // Emerald
  { accent: '#8B5CF6', soft: '#F3E8FF', icon: 'extension-puzzle-outline' as const }, // Violet
];

const formatTeacherDisplayName = (
  teacher?: MyClassSummary['homeroomTeacher'] | null,
  preferEnglish = false
): string => {
  if (!teacher) return '';
  const nativeName = [teacher.lastName, teacher.firstName].filter(Boolean).join(' ').trim();
  const englishName = [teacher.englishLastName, teacher.englishFirstName].filter(Boolean).join(' ').trim();
  return (preferEnglish ? englishName || nativeName : nativeName || englishName) || '';
};

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
  orderNumber,
}: SchoolClassCardProps) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const isKhmer = i18n.language?.startsWith('km');
  const theme = CLASS_THEMES[index % CLASS_THEMES.length];
  
  const teacherName = item.homeroomTeacher
    ? formatTeacherDisplayName(item.homeroomTeacher, !isKhmer)
    : t('classes.directory.notAssigned');
    
  const { male: maleCount, female: femaleCount } = getClassGenderCounts(item);
  const studentTotal = getSafeStudentCount(item);
  
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
  const handlePressIn = () => { scale.value = withSpring(0.97, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  // Mock momentum/progress for visual parity
  const classMomentum = Math.min(100, Math.max(15, (studentTotal / 50) * 100));

  return (
    <AnimatedPressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? colors.border : '#E2E8F0' }, animatedStyle]}
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <LinearGradient
        colors={isDark ? [colors.card, colors.surfaceVariant] : ['#F8FEFF', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? `${theme.accent}25` : theme.soft }]}>
            <Ionicons name="school" size={20} color={theme.accent} />
          </View>
          
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('classes.directory.gradeShort', { grade: item.grade })} • {item.section || 'A'}
            </Text>
          </View>
          
          <View style={[styles.scorePill, { backgroundColor: theme.accent }]}>
            <Text style={styles.scoreValue}>{studentTotal}</Text>
            <Text style={styles.scoreLabel}>{t('common.student')}</Text>
          </View>
        </View>

        {/* Progress Bar Section */}
        <View style={[styles.momentumTrack, { backgroundColor: isDark ? colors.border : '#F8FAFC' }]}>
          <LinearGradient
            colors={[theme.accent, `${theme.accent}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.momentumFill, { width: `${classMomentum}%` }]}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{maleCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('common.male')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? colors.border : '#F1F5F9' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{femaleCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('common.female')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? colors.border : '#F1F5F9' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{studentTotal}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('common.total')}</Text>
          </View>
        </View>

        {/* Signal Chips Section */}
        <View style={styles.signalRow}>
          <View style={[styles.signalChip, { backgroundColor: isDark ? `${theme.accent}15` : `${theme.soft}80` }]}>
            <Ionicons name="person" size={13} color={theme.accent} />
            <Text style={[styles.signalText, { color: theme.accent }]} numberOfLines={1}>
              {teacherName}
            </Text>
          </View>
          <View style={[styles.signalChip, { backgroundColor: isDark ? '#063A2C' : '#ECFDF5' }]}>
            <Ionicons name="checkmark-circle" size={13} color="#059669" />
            <Text style={[styles.signalText, { color: '#059669' }]}>
              {t('common.active')}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    fontWeight: '500',
  },
  scorePill: {
    minWidth: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
  },
  momentumTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 16,
  },
  momentumFill: {
    height: '100%',
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  divider: {
    width: 1,
    height: 30,
    alignSelf: 'center',
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  signalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  signalText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
