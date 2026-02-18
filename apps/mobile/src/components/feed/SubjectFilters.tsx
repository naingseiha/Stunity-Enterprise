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
  { key: 'ALL', label: 'All', icon: 'apps', color: '#6366F1', bgColor: '#EEF2FF', gradient: ['#818CF8', '#6366F1'] },
  { key: 'MATH', label: 'Math', icon: 'calculator', color: '#2563EB', bgColor: '#DBEAFE', gradient: ['#60A5FA', '#2563EB'] },
  { key: 'PHYSICS', label: 'Physics', icon: 'planet', color: '#DC2626', bgColor: '#FEE2E2', gradient: ['#F87171', '#DC2626'] },
  { key: 'CHEMISTRY', label: 'Chemistry', icon: 'flask', color: '#059669', bgColor: '#D1FAE5', gradient: ['#34D399', '#059669'] },
  { key: 'BIOLOGY', label: 'Biology', icon: 'leaf', color: '#16A34A', bgColor: '#DCFCE7', gradient: ['#4ADE80', '#16A34A'] },
  { key: 'CS', label: 'CS', icon: 'code-slash', color: '#4338CA', bgColor: '#E0E7FF', gradient: ['#818CF8', '#4338CA'] },
  { key: 'ENGLISH', label: 'English', icon: 'book', color: '#DB2777', bgColor: '#FCE7F3', gradient: ['#F472B6', '#DB2777'] },
  { key: 'HISTORY', label: 'History', icon: 'time', color: '#D97706', bgColor: '#FEF3C7', gradient: ['#FBBF24', '#D97706'] },
  { key: 'GEOGRAPHY', label: 'Geography', icon: 'globe', color: '#0891B2', bgColor: '#CFFAFE', gradient: ['#22D3EE', '#0891B2'] },
  { key: 'ARTS', label: 'Arts', icon: 'color-palette', color: '#E11D48', bgColor: '#FFE4E6', gradient: ['#FB7185', '#E11D48'] },
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
              activeOpacity={0.7}
              style={styles.categoryItem}
            >
              {/* Outer ring for active state */}
              {isActive ? (
                <LinearGradient
                  colors={subject.gradient}
                  style={styles.activeRing}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name={subject.icon}
                      size={24}
                      color={subject.color}
                    />
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.iconCircleOuter, { backgroundColor: subject.bgColor }]}>
                  <Ionicons
                    name={subject.icon}
                    size={24}
                    color={subject.color}
                  />
                </View>
              )}
              <Text
                style={[
                  styles.categoryLabel,
                  isActive && { color: subject.color, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {subject.label}
              </Text>
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
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  activeRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
});
