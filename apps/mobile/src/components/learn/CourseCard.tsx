/**
 * Course Card Component
 * 
 * Card displaying course preview in learn screens
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar, Card } from '@/components/common';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
import { Course } from '@/types';
import { formatNumber } from '@/utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing[4] * 3) / 2;

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

  const progress = course.enrollmentCount || 0 > 0 
    ? Math.floor(Math.random() * 100) // Demo: would come from enrollment
    : 0;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.7}
        style={[
          styles.container,
          isCompact && styles.compactContainer,
        ]}
      >
        {/* Thumbnail */}
        <View style={[styles.thumbnailContainer, isCompact && styles.compactThumbnail]}>
          {course.thumbnailUrl ? (
            <Image 
              source={{ uri: course.thumbnailUrl }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[Colors.primary[400], Colors.secondary[500]]}
              style={styles.thumbnailPlaceholder}
            >
              <Ionicons name="book" size={isCompact ? 24 : 40} color={Colors.white} />
            </LinearGradient>
          )}

          {/* Level Badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{course.level}</Text>
          </View>

          {/* Duration */}
          {course.totalDuration && (
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={12} color={Colors.white} />
              <Text style={styles.durationText}>
                {Math.floor(course.totalDuration / 60)}h {course.totalDuration % 60}m
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={[styles.content, isCompact && styles.compactContent]}>
          <Text 
            style={[styles.title, isCompact && styles.compactTitle]} 
            numberOfLines={2}
          >
            {course.title}
          </Text>

          {!isCompact && course.description && (
            <Text style={styles.description} numberOfLines={2}>
              {course.description}
            </Text>
          )}

          {/* Instructor */}
          {course.instructor && (
            <View style={styles.instructorRow}>
              <Avatar
                uri={course.instructor.profilePictureUrl}
                name={`${course.instructor.firstName} ${course.instructor.lastName}`}
                size="xs"
              />
              <Text style={styles.instructorName} numberOfLines={1}>
                {course.instructor.firstName} {course.instructor.lastName}
              </Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={14} color={Colors.gray[400]} />
              <Text style={styles.statText}>
                {formatNumber(course.enrollmentCount || 0)}
              </Text>
            </View>

            {course.rating && (
              <View style={styles.stat}>
                <Ionicons name="star" size={14} color={Colors.warning.main} />
                <Text style={styles.statText}>
                  {course.rating.toFixed(1)}
                </Text>
              </View>
            )}

            <View style={styles.stat}>
              <Ionicons name="documents-outline" size={14} color={Colors.gray[400]} />
              <Text style={styles.statText}>
                {course.lessonCount || 0} lessons
              </Text>
            </View>
          </View>

          {/* Progress Bar (if enrolled) */}
          {progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${progress}%` }]} 
                />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}

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
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing[3],
    ...Shadows.sm,
  },
  compactContainer: {
    width: CARD_WIDTH,
    marginBottom: 0,
  },
  thumbnailContainer: {
    height: 160,
    position: 'relative',
  },
  compactThumbnail: {
    height: 100,
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
    top: Spacing[2],
    left: Spacing[2],
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  levelText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  durationBadge: {
    position: 'absolute',
    bottom: Spacing[2],
    right: Spacing[2],
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
    gap: Spacing[1],
  },
  durationText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
    fontWeight: '500',
  },
  content: {
    padding: Spacing[4],
  },
  compactContent: {
    padding: Spacing[3],
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.gray[900],
    lineHeight: 24,
  },
  compactTitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 20,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    marginTop: Spacing[2],
    lineHeight: 20,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[3],
    gap: Spacing[2],
  },
  instructorName: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing[3],
    gap: Spacing[4],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  statText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[3],
    gap: Spacing[2],
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gray[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: 3,
  },
  progressText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[500],
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  priceRow: {
    marginTop: Spacing[3],
  },
  price: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  freeBadge: {
    backgroundColor: Colors.success.light,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  freeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.success.main,
  },
});

export default CourseCard;
