import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Course Card Component — Genesis Premium Design
 *
 * Modern, high-performance card design:
 * - Glassmorphism badges (level, duration) using BlurView
 * - Gradient overlays and primary buttons
 * - Reanimated scale/opacity interaction
 * - Refined typography and layout for premium feel
 * - Supports full, compact, and row variants
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { Course } from '@/types';
import { formatNumber } from '@/utils';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Level config - Updated Beginner to Cyan/Teal
const LEVEL_CONFIG: Record<string, { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap; labelKey: string }> = {
  BEGINNER: { gradient: ['#22D3EE', '#0891B2'], icon: 'leaf', labelKey: 'feed.difficulty.beginner' },
  INTERMEDIATE: { gradient: ['#60A5FA', '#2563EB'], icon: 'trending-up', labelKey: 'feed.difficulty.intermediate' },
  ADVANCED: { gradient: ['#F87171', '#DC2626'], icon: 'flame', labelKey: 'feed.difficulty.advanced' },
  ALL_LEVELS: { gradient: ['#818CF8', '#6366F1'], icon: 'layers', labelKey: 'learn.allLevels' },
};

// Thumbnail gradients - Updated to match Education Card (Light Teal/Cyan)
const THUMB_GRADIENTS: [string, string, string][] = [
  ['#F0FDFA', '#CCFBF1', '#99F6E4'], // Very Light Teal
  ['#ECFEFF', '#CFFAFE', '#A5F3FC'], // Very Light Cyan (Education Card style)
  ['#F0F9FF', '#E0F2FE', '#BAE6FD'], // Very Light Sky
  ['#F5F3FF', '#EDE9FE', '#DDD6FE'], // Very Light Violet
];

const THUMB_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'code-slash', 'analytics', 'bulb', 'color-palette', 'globe',
];

interface CourseCardProps {
  course: Course | any; // Any for flexibility with different API models
  onPress: () => void;
  onEnroll?: () => void;
  variant?: 'full' | 'compact' | 'row';
  isEnrolled?: boolean;
  isBusy?: boolean;
  progress?: number;
  completedLessons?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onPress,
  onEnroll,
  variant = 'full',
  isEnrolled = false,
  isBusy = false,
  progress,
  completedLessons,
}) => {
  const { t } = useTranslation();
  const isCompact = variant === 'compact';
  const isRow = variant === 'row';
  const levelRef = (course.level || 'ALL_LEVELS').toUpperCase().replace(' ', '_');
  const levelConfig = LEVEL_CONFIG[levelRef] || LEVEL_CONFIG.ALL_LEVELS;
  const [isBookmarked, setIsBookmarked] = useState(false);

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

  const gradientIndex = useMemo(() => {
    const idStr = String(course.id || '0');
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % THUMB_GRADIENTS.length;
  }, [course.id]);

  const thumbGradient = THUMB_GRADIENTS[gradientIndex];
  const thumbIcon = THUMB_ICONS[gradientIndex % THUMB_ICONS.length];

  // ── Row variant ──────────────────────────────────────────────
  if (isRow) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.rowContainer, animatedStyle]}
      >
        <LinearGradient
          colors={thumbGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.rowThumb}
        >
          <Ionicons name={thumbIcon} size={22} color="rgba(255,255,255,0.95)" />
        </LinearGradient>

        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{course.title}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {course.instructor?.name || `${course.instructor?.firstName || ''} ${course.instructor?.lastName || ''}`} · {course.category}
          </Text>
          <View style={styles.rowMeta}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={styles.rowRating}>{(course.rating || 0).toFixed(1)}</Text>
            <Text style={styles.rowDot}> · </Text>
            <Text style={styles.rowLessons}>{t('learn.lessonCount', { count: course.lessonsCount || course.totalLessons || 0 })}</Text>
            <Text style={styles.rowDot}> · </Text>
            <Text style={[styles.rowPrice, (course.isFree || course.price === 0) && styles.rowFree]}>
              {course.price && course.price > 0 ? `$${course.price}` : t('learn.free')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); setIsBookmarked(!isBookmarked); }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.rowBookmark}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isBookmarked ? '#0EA5E9' : '#94A3B8'}
          />
        </TouchableOpacity>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        isCompact && styles.compactContainer,
        animatedStyle
      ]}
    >
      <View style={styles.cardInner}>
        <View style={styles.abstractBg}>
        <LinearGradient
          colors={['rgba(34, 211, 238, 0.05)', 'rgba(8, 145, 178, 0.1)']}
          style={styles.abstractShape1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(34, 211, 238, 0.12)', 'rgba(8, 145, 178, 0.18)']}
          style={styles.abstractShape2}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      {/* ── Thumbnail ── */}
      <View style={[styles.thumbnailContainer, isCompact && styles.compactThumbnail]}>
        {(course.thumbnail || course.thumbnailUrl) ? (
          <Image
            source={{ uri: course.thumbnail || course.thumbnailUrl }}
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
            <View style={styles.thumbIconCircle}>
              <Ionicons name={thumbIcon} size={isCompact ? 22 : 32} color="#0891B2" />
            </View>
          </LinearGradient>
        )}

        {/* Level Badge */}
        <View style={styles.levelBadge}>
          <LinearGradient
            colors={[levelConfig.gradient[0] + 'CC', levelConfig.gradient[1] + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.levelBadgeGradient}
          >
            <Ionicons name={levelConfig.icon} size={10} color="#fff" />
            <Text style={styles.levelText}>{t(levelConfig.labelKey)}</Text>
          </LinearGradient>
        </View>

        {/* Duration Badge */}
        {(course.duration || 0) > 0 && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <Text style={styles.durationText}>
              {Math.floor(course.duration / 60)}<AutoI18nText i18nKey="auto.mobile.components_learn_CourseCard.k_292d58fb" /> {course.duration % 60}<AutoI18nText i18nKey="auto.mobile.components_learn_CourseCard.k_ae35b63f" />
            </Text>
          </View>
        )}

        {/* Bookmark */}
        <TouchableOpacity
          style={styles.bookmarkBtn}
          onPress={(e) => {
            e.stopPropagation();
            setIsBookmarked(!isBookmarked);
          }}
          hitSlop={12}
        >
          <View style={styles.bookmarkCircle}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={15}
              color={isBookmarked ? '#F59E0B' : '#fff'}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <View style={[styles.content, isCompact && styles.compactContent]}>
        <Text style={[styles.title, isCompact && styles.compactTitle]} numberOfLines={2}>
          {course.title}
        </Text>

        {!isCompact && course.description && (
          <Text style={styles.description} numberOfLines={2}>{course.description}</Text>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={13} color="#64748B" />
            <Text style={styles.statText}>{formatNumber(course.enrolledCount || course.enrollmentCount || 0)}</Text>
          </View>
          {(course.rating || 0) > 0 && (
            <View style={styles.stat}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={[styles.statText, { color: '#F59E0B', fontWeight: '700' }]}>
                {course.rating.toFixed(1)}
              </Text>
            </View>
          )}
          <View style={styles.stat}>
            <Ionicons name="play-circle-outline" size={13} color="#64748B" />
            <Text style={styles.statText}>{t('learn.lessonCount', { count: course.lessonsCount || course.totalLessons || 0 })}</Text>
          </View>
        </View>

        {/* Progress Bar (if enrolled) */}
        {isEnrolled && typeof progress === 'number' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercent}>{t('learn.percentComplete', { percent: Math.round(progress) })}</Text>
              {completedLessons !== undefined && (
                <Text style={styles.progressCounts}>{completedLessons}/{course.lessonsCount || 0}</Text>
              )}
            </View>
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={['#0EA5E9', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.min(100, progress)}%` }]}
              />
            </View>
          </View>
        )}

        {/* Footer: Instructor & CTA */}
        <View style={styles.footerRow}>
          {course.instructor && (
            <View style={styles.instructorInfo}>
              <Avatar
                uri={course.instructor.profilePictureUrl || course.instructor.avatar}
                name={course.instructor.name || `${course.instructor.firstName} ${course.instructor.lastName}`}
                size="xs"
                showBorder={false}
              />
              <Text style={styles.instructorName} numberOfLines={1}>
                {course.instructor.name || course.instructor.firstName}
              </Text>
            </View>
          )}

          {!isEnrolled && onEnroll ? (
            <TouchableOpacity 
              style={[styles.enrollBtn, isBusy && styles.btnDisabled]} 
              activeOpacity={0.85}
              onPress={(e) => { e.stopPropagation(); onEnroll(); }}
              disabled={isBusy}
            >
              <LinearGradient
                colors={['#0EA5E9', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.enrollBtnGradient}
              >
                <Text style={styles.enrollBtnText}>{t('learn.enroll')}</Text>
                <Ionicons name="arrow-forward" size={12} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
             <View style={styles.priceContainer}>
                {(course.isFree || course.price === 0) ? (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeText}>{t('learn.free')}</Text>
                  </View>
                ) : (
                  <Text style={styles.priceText}>${course.price}</Text>
                )}
             </View>
          )}
        </View>
      </View>
     </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0FDFA', // Subtle Teal/Cyan background
    borderRadius: 20,
    marginBottom: 16,
    marginHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E0F2FE', // Light blue border matching Education Card
    overflow: 'visible', // Visible for shadows
    // Premium Shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  cardInner: {
    flex: 1,
    borderRadius: 18.5, // Slightly less than 20 to account for border thickness
    overflow: 'hidden',
    backgroundColor: '#F0FDFA', // Subtle Teal/Cyan background
  },
  compactContainer: {
    width: CARD_WIDTH,
    marginBottom: 0,
    borderRadius: 16,
  },

  // Thumbnail
  thumbnailContainer: {
    height: 180,
    position: 'relative',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  compactThumbnail: {
    height: 160,
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -40,
    right: -40,
  },
  thumbDecor2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    bottom: -20,
    left: 20,
  },
  thumbIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    // Subtle glow
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  // Badges
  levelBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  levelBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },
  durationText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  bookmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },

  // Content
  content: {
    padding: 16,
  },
  compactContent: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  compactTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 19,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 14,
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Progress
  progressContainer: {
    marginTop: 14,
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  progressCounts: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Footer
  footerRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  instructorName: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0EA5E9',
    letterSpacing: -0.5,
  },
  freeBadge: {
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  freeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0891B2',
    letterSpacing: 0.5,
  },
  enrollBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  enrollBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  enrollBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // ── Row variant ──────────────────────────────────────────────
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rowThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  rowSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 3,
  },
  rowDot: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  rowLessons: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  rowPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  rowFree: {
    color: '#0891B2',
  },
  rowBookmark: {
    padding: 4,
  },
  // Abstract Background
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
});

export default CourseCard;
