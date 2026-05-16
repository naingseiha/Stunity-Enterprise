import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Club } from '@/api/clubs';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CLUB_TYPE_META: Record<
  Club['type'],
  { labelKey: string; icon: keyof typeof Ionicons.glyphMap; accent: string; soft: string }
> = {
  CASUAL_STUDY_GROUP: { labelKey: 'clubs.types.studyGroup', icon: 'people',  accent: '#8B5CF6', soft: '#F3E8FF' }, // Purple
  STRUCTURED_CLASS:   { labelKey: 'clubs.types.class',      icon: 'school',  accent: '#06A8CC', soft: '#E0F9FD' }, // Brand Teal
  PROJECT_GROUP:      { labelKey: 'clubs.types.project',    icon: 'rocket',  accent: '#F59E0B', soft: '#FEF3C7' }, // Amber
  EXAM_PREP:          { labelKey: 'clubs.types.examPrep',   icon: 'book',    accent: '#6366F1', soft: '#E0E7FF' }, // Indigo
};

interface ClubCardProps {
  item: Club;
  isJoined: boolean;
  isBusy: boolean;
  onPress: (club: Club) => void;
  onToggleMembership: (clubId: string) => void;
}

export const ClubCard = React.memo(function ClubCard({
  item,
  isJoined,
  isBusy,
  onPress,
  onToggleMembership,
}: ClubCardProps) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const isKhmer = i18n.language?.startsWith('km');
  const typeMeta = CLUB_TYPE_META[item.type] || CLUB_TYPE_META.CASUAL_STUDY_GROUP;
  const memberCount = item.memberCount || 0;
  
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
  const handlePressIn = () => { scale.value = withSpring(0.97, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  // Calculate progress based on member count (clamped for visual purposes)
  const memberProgress = Math.min(100, Math.max(15, (memberCount / 20) * 100));

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
          <View style={[styles.iconBox, { backgroundColor: isDark ? `${typeMeta.accent}25` : typeMeta.soft }]}>
            <Ionicons name={typeMeta.icon} size={20} color={typeMeta.accent} />
          </View>
          
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.description || t(typeMeta.labelKey)}
            </Text>
          </View>
          
          <View style={[styles.scorePill, { backgroundColor: typeMeta.accent }]}>
            <Text style={styles.scoreValue}>{memberCount}</Text>
            <Text style={styles.scoreLabel}>{t('clubs.members')}</Text>
          </View>
        </View>

        {/* Progress Bar Section */}
        <View style={[styles.momentumTrack, { backgroundColor: isDark ? colors.border : '#F8FAFC' }]}>
          <LinearGradient
            colors={[typeMeta.accent, `${typeMeta.accent}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.momentumFill, { width: `${memberProgress}%` }]}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{memberCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('clubs.membersCaps')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? colors.border : '#F1F5F9' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>12</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('clubs.postsCaps')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? colors.border : '#F1F5F9' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {item.mode === 'PUBLIC' ? '0' : '1'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('clubs.eventsCaps')}</Text>
          </View>
        </View>

        {/* Signal Chips Section */}
        <View style={styles.signalRow}>
          <View style={[styles.signalChip, { backgroundColor: isDark ? `${typeMeta.accent}15` : `${typeMeta.soft}80` }]}>
            <Ionicons name="apps" size={13} color={typeMeta.accent} />
            <Text style={[styles.signalText, { color: typeMeta.accent }]}>
              {t(typeMeta.labelKey)}
            </Text>
          </View>
          
          <Pressable 
            onPress={() => onToggleMembership(item.id)}
            disabled={isBusy}
          >
            <View style={[
              styles.signalChip, 
              { backgroundColor: isJoined ? (isDark ? '#063A2C' : '#ECFDF5') : (isDark ? '#172554' : '#EFF6FF') }
            ]}>
              {isBusy ? (
                <ActivityIndicator size="small" color={isJoined ? '#059669' : '#2563EB'} style={{ width: 13, height: 13 }} />
              ) : (
                <Ionicons name={isJoined ? "checkmark-circle" : "add-circle"} size={13} color={isJoined ? "#059669" : "#2563EB"} />
              )}
              <Text style={[styles.signalText, { color: isJoined ? '#059669' : '#2563EB' }]}>
                {isJoined ? t('clubs.joined') : t('clubs.joinNow')}
              </Text>
            </View>
          </Pressable>
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
