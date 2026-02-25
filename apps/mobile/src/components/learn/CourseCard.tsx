/**
 * Course Card Component — Play Store Inspired Design
 *
 * Clean, professional card design:
 * - Gradient thumbnail placeholder with icon
 * - Level badge
 * - Clean title and description
 * - Instructor row with verified badge
 * - Stats row (students, rating, lessons)
 * - Price / Enroll button
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

// Level config
const LEVEL_CONFIG: Record<string, { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  BEGINNER: { gradient: ['#34D399', '#059669'], icon: 'leaf', label: 'Beginner' },
  INTERMEDIATE: { gradient: ['#60A5FA', '#2563EB'], icon: 'trending-up', label: 'Intermediate' },
  ADVANCED: { gradient: ['#F87171', '#DC2626'], icon: 'flame', label: 'Advanced' },
  ALL_LEVELS: { gradient: ['#818CF8', '#6366F1'], icon: 'layers', label: 'All Levels' },
};

// Thumbnail gradients
const THUMB_GRADIENTS: [string, string, string][] = [
  ['#818CF8', '#6366F1', '#4F46E5'],
  ['#F472B6', '#EC4899', '#DB2777'],
  ['#34D399', '#10B981', '#059669'],
  ['#60A5FA', '#3B82F6', '#2563EB'],
];

const THUMB_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'code-slash', 'analytics', 'bulb', 'color-palette', 'globe',
];

interface CourseCardProps {
  course: Course;
  onPress: () => void;
  variant?: 'full' | 'compact' | 'row';
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onPress,
  variant = 'full',
}) => {
  const isCompact = variant === 'compact';
  const isRow = variant === 'row';
  const levelConfig = LEVEL_CONFIG[course.level] || LEVEL_CONFIG.ALL_LEVELS;
  const [isBookmarked, setIsBookmarked] = useState(false);

  const gradientIndex = parseInt(course.id, 10) % THUMB_GRADIENTS.length || 0;
  const thumbGradient = THUMB_GRADIENTS[gradientIndex];
  const thumbIcon = THUMB_ICONS[gradientIndex % THUMB_ICONS.length];

  // ── Row variant (horizontal compact list item) ──────────────────
  if (isRow) {
    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={styles.rowContainer}>
          {/* Small square thumbnail */}
          <LinearGradient
            colors={thumbGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rowThumb}
          >
            <Ionicons name={thumbIcon} size={22} color="rgba(255,255,255,0.9)" />
          </LinearGradient>

          {/* Content */}
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>{course.title}</Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {course.instructor?.firstName} {course.instructor?.lastName}  ·  {course.category}
            </Text>
            <View style={styles.rowMeta}>
              <Ionicons name="star" size={11} color="#F9AB00" />
              <Text style={styles.rowRating}>{course.rating?.toFixed(1)}</Text>
              <Text style={styles.rowDot}>  ·  </Text>
              <Text style={styles.rowLessons}>{course.totalLessons} lessons</Text>
              <Text style={styles.rowDot}>  ·  </Text>
              <Text style={[styles.rowPrice, course.price === 0 && styles.rowFree]}>
                {course.price && course.price > 0 ? `$${course.price}` : 'FREE'}
              </Text>
            </View>
          </View>

          {/* Bookmark */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); setIsBookmarked(!isBookmarked); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isBookmarked ? '#1A73E8' : '#BDBDBD'}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.72}
        style={[styles.container, isCompact && styles.compactContainer]}
      >
        {/* ── Thumbnail ── */}
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
              <View style={styles.thumbDecor1} />
              <View style={styles.thumbDecor2} />
              <View style={styles.thumbIconCircle}>
                <Ionicons name={thumbIcon} size={isCompact ? 22 : 30} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          )}

          {/* Level Badge */}
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[levelConfig.gradient[0] + 'EE', levelConfig.gradient[1] + 'EE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.levelBadgeGradient}
            >
              <Ionicons name={levelConfig.icon} size={9} color="#fff" />
              <Text style={styles.levelText}>{levelConfig.label}</Text>
            </LinearGradient>
          </View>

          {/* Duration */}
          {course.duration && (
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={10} color="#fff" />
              <Text style={styles.durationText}>
                {Math.floor(course.duration / 60)}h {course.duration % 60}m
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.bookmarkCircle}>
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={14}
                color={isBookmarked ? '#1A73E8' : '#fff'}
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
                    colors={['#1A73E8', '#0D47A1']}
                    style={styles.verifiedGradient}
                  >
                    <Ionicons name="checkmark" size={8} color="#fff" />
                  </LinearGradient>
                </View>
              )}
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={12} color="#5F6368" />
              <Text style={styles.statText}>{formatNumber(course.enrollmentCount || 0)}</Text>
            </View>
            {course.rating && (
              <View style={styles.stat}>
                <Ionicons name="star" size={12} color="#F9AB00" />
                <Text style={[styles.statText, { color: '#F9AB00', fontWeight: '700' }]}>{course.rating.toFixed(1)}</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Ionicons name="play-circle-outline" size={12} color="#5F6368" />
              <Text style={styles.statText}>{course.totalLessons || 0} lessons</Text>
            </View>
          </View>

          {/* Price + Enroll */}
          <View style={styles.priceRow}>
            {course.price && course.price > 0 ? (
              <Text style={styles.price}>${course.price}</Text>
            ) : (
              <View style={styles.freeBadge}>
                <Ionicons name="gift-outline" size={11} color="#059669" />
                <Text style={styles.freeText}>FREE</Text>
              </View>
            )}
            <TouchableOpacity style={styles.enrollBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['#1A73E8', '#0D47A1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.enrollBtnGradient}
              >
                <Text style={styles.enrollBtnText}>Enroll</Text>
                <Ionicons name="arrow-forward" size={11} color="#fff" />
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
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DADCE0',
    overflow: 'hidden',
  },
  compactContainer: {
    width: CARD_WIDTH,
    marginBottom: 0,
  },

  // Thumbnail
  thumbnailContainer: {
    height: 170,
    position: 'relative',
    overflow: 'hidden',
  },
  compactThumbnail: {
    height: 105,
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
  thumbDecor1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -20,
    right: -20,
  },
  thumbDecor2: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -10,
    left: 10,
  },
  thumbIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Level Badge
  levelBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  levelBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 4,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Duration
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  durationText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },

  // Bookmark
  bookmarkBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  bookmarkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  content: {
    padding: 14,
  },
  compactContent: {
    padding: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  compactTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    color: '#5F6368',
    marginTop: 5,
    lineHeight: 18,
  },

  // Instructor
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 7,
  },
  instructorName: {
    flex: 1,
    fontSize: 12,
    color: '#5F6368',
    fontWeight: '500',
  },
  verifiedBadge: {
    borderRadius: 8,
    overflow: 'hidden',
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
    marginTop: 10,
    gap: 12,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#5F6368',
    fontWeight: '500',
  },

  // Price
  priceRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A73E8',
    letterSpacing: -0.3,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  freeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  enrollBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  enrollBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 4,
  },
  enrollBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Row variant ────────────────────────────────────────────────
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  rowThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202124',
  },
  rowSub: {
    fontSize: 12,
    color: '#5F6368',
    fontWeight: '400',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rowRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F9AB00',
    marginLeft: 3,
  },
  rowDot: {
    fontSize: 11,
    color: '#BDBDBD',
  },
  rowLessons: {
    fontSize: 11,
    color: '#5F6368',
    fontWeight: '500',
  },
  rowPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A73E8',
  },
  rowFree: {
    color: '#059669',
  },
});

export default CourseCard;
