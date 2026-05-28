import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { Club } from '@/api/clubs';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CLUB_TYPE_META: Record<
  Club['type'],
  { labelKey: string; icon: keyof typeof Ionicons.glyphMap; accent: string; soft: string; gradient: [string, string, string] }
> = {
  CASUAL_STUDY_GROUP: { 
    labelKey: 'clubs.types.studyGroup', 
    icon: 'people', 
    accent: '#8B5CF6', 
    soft: '#F3E8FF',
    gradient: ['#F5F3FF', '#EDE9FE', '#DDD6FE'] 
  },
  STRUCTURED_CLASS: { 
    labelKey: 'clubs.types.class', 
    icon: 'school', 
    accent: '#06A8CC', 
    soft: '#E0F9FD',
    gradient: ['#ECFEFF', '#CFFAFE', '#A5F3FC'] 
  },
  PROJECT_GROUP: { 
    labelKey: 'clubs.types.project', 
    icon: 'rocket', 
    accent: '#F59E0B', 
    soft: '#FEF3C7',
    gradient: ['#FEF3C7', '#FDE68A', '#FCD34D'] 
  },
  EXAM_PREP: { 
    labelKey: 'clubs.types.examPrep', 
    icon: 'book', 
    accent: '#6366F1', 
    soft: '#E0E7FF',
    gradient: ['#E0E7FF', '#C7D2FE', '#A5B4FC'] 
  },
};

const MODE_CONFIG: Record<
  Club['mode'],
  { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap; labelKey: string }
> = {
  PUBLIC: { gradient: ['#10B981', '#059669'], icon: 'globe-outline', labelKey: 'clubs.screen.mode.public' },
  APPROVAL_REQUIRED: { gradient: ['#F59E0B', '#D97706'], icon: 'shield-outline', labelKey: 'clubs.screen.mode.approval' },
  INVITE_ONLY: { gradient: ['#8B5CF6', '#7C3AED'], icon: 'mail-outline', labelKey: 'clubs.screen.mode.invite' },
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
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  
  const typeMeta = CLUB_TYPE_META[item.type] || CLUB_TYPE_META.CASUAL_STUDY_GROUP;
  const modeConfig = MODE_CONFIG[item.mode] || MODE_CONFIG.PUBLIC;
  const memberCount = item.memberCount || 0;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  // Dark mode specific gradients for placeholders
  const darkThumbGradients: [string, string, string][] = [
    ['#1E1B4B', '#312E81', '#3730A3'],
    ['#082F35', '#0C4A54', '#0E7490'],
    ['#451A03', '#78350F', '#9A3412'],
    ['#2E1065', '#4C1D95', '#6D28D9'],
  ];

  const gradientIndex = useMemo(() => {
    const idStr = String(item.id || '0');
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % darkThumbGradients.length;
  }, [item.id]);

  const thumbGradient = isDark ? darkThumbGradients[gradientIndex] : typeMeta.gradient;

  const modeLabel = t(modeConfig.labelKey, { 
    defaultValue: item.mode === 'PUBLIC' ? 'Public' : item.mode === 'APPROVAL_REQUIRED' ? 'Approval' : 'Invite Only' 
  });

  return (
    <AnimatedPressable
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, { backgroundColor: colors.card, borderColor: isDark ? colors.border : '#E0F2FE' }, animatedStyle]}
    >
      <View style={[styles.cardInner, { backgroundColor: colors.card }]}>
        {/* Abstract background shapes */}
        <View style={styles.abstractBg}>
          <LinearGradient
            colors={['rgba(34, 211, 238, 0.05)', 'rgba(8, 145, 178, 0.08)']}
            style={styles.abstractShape1}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={['rgba(34, 211, 238, 0.10)', 'rgba(8, 145, 178, 0.14)']}
            style={styles.abstractShape2}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        {/* ── Thumbnail / Cover Image ── */}
        <View style={styles.thumbnailContainer}>
          {item.coverImage ? (
            <Image
              source={{ uri: item.coverImage }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <LinearGradient
              colors={thumbGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.thumbnailPlaceholder}
            >
              <View style={styles.thumbDecor1} />
              <View style={styles.thumbDecor2} />
              <View style={[styles.thumbIconCircle, { borderColor: isDark ? 'rgba(45,212,191,0.35)' : 'rgba(34, 211, 238, 0.2)' }]}>
                <Ionicons name={typeMeta.icon} size={28} color={isDark ? '#22D3EE' : typeMeta.accent} />
              </View>
            </LinearGradient>
          )}

          {/* Mode Badge (analogous to Level Badge in CourseCard) */}
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[modeConfig.gradient[0] + 'CC', modeConfig.gradient[1] + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.levelBadgeGradient}
            >
              <Ionicons name={modeConfig.icon} size={10} color="#fff" />
              <Text style={styles.levelText}>{modeLabel}</Text>
            </LinearGradient>
          </View>

          {/* Lock icon overlay if not public */}
          {item.mode !== 'PUBLIC' && (
            <View style={styles.lockOverlay}>
              <View style={styles.lockCircle}>
                <Ionicons name="lock-closed" size={12} color="#fff" />
              </View>
            </View>
          )}
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description || t(typeMeta.labelKey)}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {t('clubs.memberCountInline', { count: memberCount, defaultValue: `${memberCount} members` })}
              </Text>
            </View>
          </View>

          {/* Footer CTA */}
          <View style={styles.footerRow}>
            <View style={[styles.typeChip, { backgroundColor: isDark ? `${typeMeta.accent}20` : typeMeta.soft }]}>
              <Ionicons name={typeMeta.icon} size={12} color={typeMeta.accent} />
              <Text style={[styles.typeChipText, { color: typeMeta.accent }]}>
                {t(typeMeta.labelKey)}
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.enrollBtn, isBusy && styles.btnDisabled]} 
              activeOpacity={0.85}
              onPress={(e: any) => {
                e.stopPropagation();
                onToggleMembership(item.id);
              }}
              disabled={isBusy}
            >
              <LinearGradient
                colors={
                  isJoined
                    ? isDark
                      ? ['#063A2C', '#0F5132']
                      : ['#ECFDF5', '#D1FAE5']
                    : ['#0EA5E9', '#2563EB']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.enrollBtnGradient}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={isJoined ? '#059669' : '#FFFFFF'} />
                ) : (
                  <>
                    <Ionicons 
                      name={isJoined ? 'checkmark-circle' : 'add-circle'} 
                      size={14} 
                      color={isJoined ? '#059669' : '#FFFFFF'} 
                    />
                    <Text style={[styles.enrollBtnText, { color: isJoined ? '#059669' : '#FFFFFF' }]}>
                      {isJoined ? t('clubs.joined') : t('clubs.joinNow')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'visible',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    width: '100%',
  },
  cardInner: {
    flex: 1,
    borderRadius: 18.5,
    overflow: 'hidden',
  },
  abstractBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  abstractShape1: {
    position: 'absolute',
    bottom: -30,
    right: -20,
    width: 140,
    height: 60,
    borderRadius: 30,
    transform: [{ rotate: '-35deg' }],
  },
  abstractShape2: {
    position: 'absolute',
    bottom: -15,
    right: -45,
    width: 160,
    height: 70,
    borderRadius: 35,
    transform: [{ rotate: '-35deg' }],
  },
  thumbnailContainer: {
    height: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDecor1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -30,
    right: -30,
  },
  thumbDecor2: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -20,
    left: 10,
  },
  thumbIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  levelBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  levelBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  lockCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  enrollBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  enrollBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  enrollBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
