/**
 * Course Card Component
 * 
 * Premium card design matching the feed's indigo design language
 * Clean shadows, indigo accents, gradient badges
 */

import React from 'react';
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

// Level badge colors
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  BEGINNER: { bg: '#D1FAE5', text: '#059669' },
  INTERMEDIATE: { bg: '#DBEAFE', text: '#2563EB' },
  ADVANCED: { bg: '#FEE2E2', text: '#DC2626' },
  ALL_LEVELS: { bg: '#EEF2FF', text: '#6366F1' },
};

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
  const levelStyle = LEVEL_COLORS[course.level] || LEVEL_COLORS.ALL_LEVELS;

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
              colors={['#EEF2FF', '#E0E7FF']}
              style={styles.thumbnailPlaceholder}
            >
              <Ionicons name="book" size={isCompact ? 24 : 36} color="#6366F1" />
            </LinearGradient>
          )}

          {/* Level Badge */}
          <View style={[styles.levelBadge, { backgroundColor: levelStyle.bg }]}>
            <Text style={[styles.levelText, { color: levelStyle.text }]}>{course.level}</Text>
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
                <View style={styles.verifiedTick}>
                  <Ionicons name="checkmark" size={8} color="#fff" />
                </View>
              )}
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="people" size={13} color="#6366F1" />
              <Text style={styles.statText}>{formatNumber(course.enrollmentCount || 0)}</Text>
            </View>
            {course.rating && (
              <View style={styles.stat}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.statText}>{course.rating.toFixed(1)}</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Ionicons name="play-circle" size={13} color="#10B981" />
              <Text style={styles.statText}>{course.totalLessons || 0} lessons</Text>
            </View>
          </View>

          {/* Price / Free */}
          <View style={styles.priceRow}>
            {course.price && course.price > 0 ? (
              <Text style={styles.price}>${course.price}</Text>
            ) : (
              <View style={styles.freeBadge}>
                <Text style={styles.freeText}>FREE</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  compactContainer: {
    width: CARD_WIDTH,
    marginBottom: 0,
  },
  thumbnailContainer: {
    height: 170,
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
  },
  levelBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  durationText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 14,
  },
  compactContent: {
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 22,
  },
  compactTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 18,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 7,
  },
  instructorName: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  verifiedTick: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 14,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 19,
    fontWeight: '800',
    color: '#6366F1',
  },
  freeBadge: {
    backgroundColor: '#D1FAE5',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
});

export default CourseCard;
