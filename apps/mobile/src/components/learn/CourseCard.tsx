/**
 * Course Card Component — Premium Enterprise Design
 * 
 * Elevated card design matching enterprise design language:
 * - Rich gradient thumbnail placeholders with decorative elements
 * - Floating glassmorphic level badge
 * - Colored stat icons with mini circle backgrounds
 * - Refined instructor row with glow verified badge
 * - Gradient price/enroll button
 * - Bookmark overlay icon
 * - Indigo-tinted card shadows
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { Course } from '@/types';
import { formatNumber } from '@/utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Level badge colors with gradient pairs
const LEVEL_CONFIG: Record<string, { bg: string; text: string; gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap }> = {
  BEGINNER: { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669', gradient: ['#34D399', '#059669'], icon: 'leaf' },
  INTERMEDIATE: { bg: 'rgba(59, 130, 246, 0.15)', text: '#2563EB', gradient: ['#60A5FA', '#2563EB'], icon: 'trending-up' },
  ADVANCED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#DC2626', gradient: ['#F87171', '#DC2626'], icon: 'flame' },
  ALL_LEVELS: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366F1', gradient: ['#818CF8', '#6366F1'], icon: 'layers' },
};

// Gradient pairs for placeholder thumbnails
const THUMB_GRADIENTS: [string, string, string][] = [
  ['#818CF8', '#6366F1', '#4F46E5'],
  ['#F472B6', '#EC4899', '#DB2777'],
  ['#34D399', '#10B981', '#059669'],
  ['#38BDF8', '#0EA5E9', '#0284C7'],
  ['#60A5FA', '#3B82F6', '#2563EB'],
];

interface CourseCardProps {
  course: Course;
  onPress: () => void;
  variant?: 'full' | 'compact';
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onPress,
  variant = 'full',
}) => {
  const isCompact = variant === 'compact';
  const levelConfig = LEVEL_CONFIG[course.level] || LEVEL_CONFIG.ALL_LEVELS;
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Deterministic gradient based on course id
  const gradientIndex = parseInt(course.id, 10) % THUMB_GRADIENTS.length || 0;
  const thumbGradient = THUMB_GRADIENTS[gradientIndex];

  const THUMB_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
    'code-slash', 'analytics', 'bulb', 'color-palette', 'globe',
  ];
  const thumbIcon = THUMB_ICONS[gradientIndex % THUMB_ICONS.length];

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.container, isCompact && styles.compactContainer]}
      >
        {/* Thumbnail */}
        <View style={[styles.thumbnailContainer, isCompact && styles.compactThumbnail]}>
          {course.thumbnailUrl ? (
            <Image
              source={{ uri: course.thumbnailUrl }}
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
              <View style={styles.thumbIconCircle}>
                <Ionicons name={thumbIcon} size={isCompact ? 22 : 32} color="rgba(255,255,255,0.9)" />
              </View>
              {/* Decorative elements on thumbnail */}
              <View style={[styles.thumbDecor, { top: -15, right: -10, width: 60, height: 60 }]} />
              <View style={[styles.thumbDecor, { bottom: -10, left: 20, width: 40, height: 40 }]} />
              <View style={[styles.thumbDecor, { top: 20, left: -8, width: 30, height: 30 }]} />
            </LinearGradient>
          )}

          {/* Level Badge — glassmorphic style */}
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[levelConfig.gradient[0] + 'DD', levelConfig.gradient[1] + 'DD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.levelBadgeGradient}
            >
              <Ionicons name={levelConfig.icon} size={10} color="#fff" />
              <Text style={styles.levelText}>{course.level}</Text>
            </LinearGradient>
          </View>

          {/* Duration */}
          {course.duration && (
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={11} color="#fff" />
              <Text style={styles.durationText}>
                {Math.floor(course.duration / 60)}h {course.duration % 60}m
              </Text>
            </View>
          )}

          {/* Bookmark overlay */}
          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={(e) => {
              e.stopPropagation();
              setIsBookmarked(!isBookmarked);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.bookmarkCircle}>
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={isBookmarked ? '#0EA5E9' : '#fff'}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={[styles.content, isCompact && styles.compactContent]}>
          <Text style={[styles.title, isCompact && styles.compactTitle]} numberOfLines={2}>
            {course.title}
          </Text>

          {!isCompact && course.description && (
            <Text style={styles.description} numberOfLines={2}>{course.description}</Text>
          )}

          {/* Instructor */}
          {course.instructor && (
            <View style={styles.instructorRow}>
              <Avatar
                uri={course.instructor.profilePictureUrl}
                name={`${course.instructor.firstName} ${course.instructor.lastName}`}
                size="xs"
                showBorder={false}
                gradientBorder="none"
              />
              <Text style={styles.instructorName} numberOfLines={1}>
                {course.instructor.firstName} {course.instructor.lastName}
              </Text>
              {course.instructor.isVerified && (
                <View style={styles.verifiedBadge}>
                  <LinearGradient
                    colors={['#818CF8', '#6366F1']}
                    style={styles.verifiedGradient}
                  >
                    <Ionicons name="checkmark" size={8} color="#fff" />
                  </LinearGradient>
                </View>
              )}
            </View>
          )}

          {/* Stats Row with colored icon backgrounds */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <View style={[styles.statIconBg, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="people" size={11} color="#6366F1" />
              </View>
              <Text style={styles.statText}>{formatNumber(course.enrollmentCount || 0)}</Text>
            </View>
            {course.rating && (
              <View style={styles.stat}>
                <View style={[styles.statIconBg, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="star" size={11} color="#0EA5E9" />
                </View>
                <Text style={styles.statText}>{course.rating.toFixed(1)}</Text>
              </View>
            )}
            <View style={styles.stat}>
              <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="play-circle" size={11} color="#10B981" />
              </View>
              <Text style={styles.statText}>{course.totalLessons || 0} lessons</Text>
            </View>
          </View>

          {/* Price / Free Badge + Enroll */}
          <View style={styles.priceRow}>
            {course.price && course.price > 0 ? (
              <View style={styles.priceContainer}>
                <Text style={styles.price}>${course.price}</Text>
              </View>
            ) : (
              <View style={styles.freeBadge}>
                <Ionicons name="gift-outline" size={12} color="#059669" />
                <Text style={styles.freeText}>FREE</Text>
              </View>
            )}
            <TouchableOpacity style={styles.enrollMiniBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['#818CF8', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.enrollMiniBtnGradient}
              >
                <Text style={styles.enrollMiniText}>Enroll</Text>
                <Ionicons name="arrow-forward" size={12} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  compactContainer: {
    width: CARD_WIDTH,
    marginBottom: 0,
  },
  thumbnailContainer: {
    height: 175,
    position: 'relative',
  },
  compactThumbnail: {
    height: 110,
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
    position: 'relative',
    overflow: 'hidden',
  },
  thumbIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDecor: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Level Badge
  levelBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 10,
    overflow: 'hidden',
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

  // Duration
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },

  // Bookmark
  bookmarkBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  bookmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  content: {
    padding: 16,
  },
  compactContent: {
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  compactTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 19,
  },

  // Instructor
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  instructorName: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  verifiedBadge: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  verifiedGradient: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statIconBg: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  // Price
  priceRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: -0.3,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  freeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  enrollMiniBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  enrollMiniBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  enrollMiniText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

export default CourseCard;
