/**
 * SubjectFilters Component — Featured Categories Grid
 * 
 * Screenshot-inspired circular icon containers:
 * - Round pastel-tinted icon circles with subject icons
 * - Label underneath each circle
 * - Scrollable horizontal row
 * - Active state with colored ring + subtle scale
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

export interface SubjectFilter {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;       // Main accent color
  bgColor: string;     // Light circle background
  gradient: [string, string]; // Gradient for active ring
}

const SUBJECTS: SubjectFilter[] = [
  { key: 'ALL', label: 'All', icon: 'grid', color: '#0EA5E9', bgColor: '#E0F2FE', gradient: ['#7DD3FC', '#0EA5E9'] },
  { key: 'MATH', label: 'Math', icon: 'calculator', color: '#2563EB', bgColor: '#DBEAFE', gradient: ['#60A5FA', '#2563EB'] },
  { key: 'PHYSICS', label: 'Physics', icon: 'rocket-outline', color: '#DC2626', bgColor: '#FEE2E2', gradient: ['#F87171', '#DC2626'] },
  { key: 'CHEMISTRY', label: 'Chemistry', icon: 'flask', color: '#059669', bgColor: '#D1FAE5', gradient: ['#34D399', '#059669'] },
  { key: 'BIOLOGY', label: 'Biology', icon: 'leaf', color: '#16A34A', bgColor: '#DCFCE7', gradient: ['#4ADE80', '#16A34A'] },
  { key: 'CS', label: 'CS', icon: 'terminal-outline', color: '#4338CA', bgColor: '#E0E7FF', gradient: ['#818CF8', '#4338CA'] },
  { key: 'ENGLISH', label: 'English', icon: 'library-outline', color: '#DB2777', bgColor: '#FCE7F3', gradient: ['#F472B6', '#DB2777'] },
  { key: 'HISTORY', label: 'History', icon: 'hourglass-outline', color: '#C2410C', bgColor: '#FFEDD5', gradient: ['#FB923C', '#C2410C'] },
  { key: 'GEOGRAPHY', label: 'Geography', icon: 'earth', color: '#0891B2', bgColor: '#CFFAFE', gradient: ['#22D3EE', '#0891B2'] },
  { key: 'ARTS', label: 'Arts', icon: 'brush-outline', color: '#E11D48', bgColor: '#FFE4E6', gradient: ['#FB7185', '#E11D48'] },
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
              activeOpacity={0.75}
              style={styles.categoryItem}
            >
              <LinearGradient
                  colors={subject.gradient}
                  style={[styles.iconBox, isActive && styles.iconBoxActive]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={subject.icon} size={20} color="#fff" />
                </LinearGradient>
              <Text
                style={[
                  styles.categoryLabel,
                  isActive && { color: subject.color, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {subject.label}
              </Text>
              {isActive && <View style={[styles.activeDot, { backgroundColor: subject.color }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 4,
  },
  categoryItem: {
    alignItems: 'center',
    width: 64,
    gap: 5,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
