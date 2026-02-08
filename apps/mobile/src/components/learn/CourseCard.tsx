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
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.thumbnailPlaceholder}
            >
              <Ionicons name="book" size={isCompact ? 24 : 40} color="#6B7280" />
            </LinearGradient>
          )}

          {/* Level Badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{course.level}</Text>
          </View>

          {/* Duration */}
          {course.duration && (
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={12} color={Colors.white} />
              <Text style={styles.durationText}>
                {Math.floor(course.duration / 60)}h {course.duration % 60}m
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
                {course.totalLessons || 0} lessons
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
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    // Match Feed card shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  compactContainer: {
    width: CARD_WIDTH,
    marginBottom: 0,
  },
  thumbnailContainer: {
    height: 180,
    position: 'relative',
  },
  compactThumbnail: {
    height: 120,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  compactContent: {
    padding: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 24,
  },
  compactTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 20,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  instructorName: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA500',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
    width: 35,
    textAlign: 'right',
  },
  priceRow: {
    marginTop: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFA500',
  },
  freeBadge: {
    backgroundColor: '#D1FAE5',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
});

export default CourseCard;
