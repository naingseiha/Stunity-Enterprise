/**
 * SubjectFilters Component
 * 
 * Horizontal scrollable subject filter chips for feed:
 * - All, Math, Physics, Chemistry, Biology, Computer Science, English, History
 * - Active state with purple gradient
 * - Replaces post-type filters
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing } from '@/config';

export interface SubjectFilter {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SUBJECTS: SubjectFilter[] = [
  { key: 'ALL', label: 'All', icon: 'grid-outline' },
  { key: 'MATH', label: 'Math', icon: 'calculator-outline' },
  { key: 'PHYSICS', label: 'Physics', icon: 'planet-outline' },
  { key: 'CHEMISTRY', label: 'Chemistry', icon: 'flask-outline' },
  { key: 'BIOLOGY', label: 'Biology', icon: 'leaf-outline' },
  { key: 'CS', label: 'Computer Sci', icon: 'code-slash-outline' },
  { key: 'ENGLISH', label: 'English', icon: 'book-outline' },
  { key: 'HISTORY', label: 'History', icon: 'time-outline' },
  { key: 'ECONOMICS', label: 'Economics', icon: 'trending-up-outline' },
  { key: 'ARTS', label: 'Arts', icon: 'color-palette-outline' },
];

interface SubjectFiltersProps {
  activeFilter: string;
  onFilterChange: (filterKey: string) => void;
}

export default function SubjectFilters({
  activeFilter,
  onFilterChange,
}: SubjectFiltersProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUBJECTS.map((subject) => {
          const isActive = activeFilter === subject.key;
          return (
            <TouchableOpacity
              key={subject.key}
              onPress={() => onFilterChange(subject.key)}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
              ]}
              activeOpacity={0.7}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterChipGradient}
                >
                  <Ionicons name={subject.icon} size={16} color="#fff" />
                  <Text style={styles.filterChipTextActive}>{subject.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterChipInner}>
                  <Ionicons name={subject.icon} size={16} color="#6B7280" />
                  <Text style={styles.filterChipText}>{subject.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterChipActive: {
    // Active state handled by gradient
  },
  filterChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  filterChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    gap: 6,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: Typography.fontFamily.medium,
  },
  filterChipTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Typography.fontFamily.semibold,
  },
});
