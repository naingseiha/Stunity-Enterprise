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
import { Colors, Typography, Spacing } from '@/config';

export interface SubjectFilter {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  textColor: string;
  iconColor: string;
}

const SUBJECTS: SubjectFilter[] = [
  { 
    key: 'ALL', 
    label: 'All', 
    icon: 'grid-outline',
    bgColor: '#EEF2FF', // Light indigo
    textColor: '#4F46E5', // Indigo
    iconColor: '#4F46E5',
  },
  { 
    key: 'MATH', 
    label: 'Math', 
    icon: 'calculator-outline',
    bgColor: '#DBEAFE', // Light blue
    textColor: '#1D4ED8', // Blue
    iconColor: '#1D4ED8',
  },
  { 
    key: 'PHYSICS', 
    label: 'Physics', 
    icon: 'planet-outline',
    bgColor: '#FEE2E2', // Light red
    textColor: '#DC2626', // Red
    iconColor: '#DC2626',
  },
  { 
    key: 'CHEMISTRY', 
    label: 'Chemistry', 
    icon: 'flask-outline',
    bgColor: '#D1FAE5', // Light green
    textColor: '#059669', // Green
    iconColor: '#059669',
  },
  { 
    key: 'BIOLOGY', 
    label: 'Biology', 
    icon: 'leaf-outline',
    bgColor: '#DCFCE7', // Light lime
    textColor: '#16A34A', // Lime green
    iconColor: '#16A34A',
  },
  { 
    key: 'CS', 
    label: 'Computer Sci', 
    icon: 'code-slash-outline',
    bgColor: '#E0E7FF', // Light indigo blue
    textColor: '#4338CA', // Indigo blue
    iconColor: '#4338CA',
  },
  { 
    key: 'ENGLISH', 
    label: 'English', 
    icon: 'book-outline',
    bgColor: '#FCE7F3', // Light pink
    textColor: '#DB2777', // Pink
    iconColor: '#DB2777',
  },
  { 
    key: 'HISTORY', 
    label: 'History', 
    icon: 'time-outline',
    bgColor: '#FEF3C7', // Light yellow
    textColor: '#D97706', // Orange
    iconColor: '#D97706',
  },
  { 
    key: 'ECONOMICS', 
    label: 'Economics', 
    icon: 'trending-up-outline',
    bgColor: '#FAE8FF', // Light purple
    textColor: '#A21CAF', // Purple
    iconColor: '#A21CAF',
  },
  { 
    key: 'ARTS', 
    label: 'Arts', 
    icon: 'color-palette-outline',
    bgColor: '#FFE4E6', // Light rose
    textColor: '#E11D48', // Rose
    iconColor: '#E11D48',
  },
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
              style={styles.filterChip}
              activeOpacity={0.7}
            >
              <View 
                style={[
                  styles.filterChipInner,
                  { backgroundColor: subject.bgColor }
                ]}
              >
                <Ionicons name={subject.icon} size={18} color={subject.iconColor} />
                <Text style={[styles.filterChipText, { color: subject.textColor }]}>
                  {subject.label}
                </Text>
              </View>
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
    paddingVertical: 12,
    gap: 10,
  },
  filterChip: {
    marginRight: 0, // gap handles spacing
  },
  filterChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  filterChipText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.semibold,
  },
});
