/**
 * Course Form Component
 * Clean UI for course creation with syllabus and materials
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface CourseFormProps {
  onDataChange: (data: CourseData) => void;
}

export interface CourseData {
  syllabusSections: SyllabusSection[];
  duration: number; // weeks
  schedule: 'FLEXIBLE' | 'WEEKLY' | 'DAILY';
  enrollmentLimit: number | null;
  prerequisites: string[];
}

interface SyllabusSection {
  id: string;
  title: string;
  description: string;
}

const DURATION_OPTIONS = [2, 4, 6, 8, 12, 16];

const SCHEDULE_TYPES = [
  { type: 'FLEXIBLE' as const, label: 'Flexible', icon: 'infinite', description: 'Self-paced learning' },
  { type: 'WEEKLY' as const, label: 'Weekly', icon: 'calendar', description: 'New content weekly' },
  { type: 'DAILY' as const, label: 'Daily', icon: 'time', description: 'Daily lessons' },
];

const ENROLLMENT_OPTIONS = [
  { label: 'No limit', value: null },
  { label: '10 students', value: 10 },
  { label: '25 students', value: 25 },
  { label: '50 students', value: 50 },
  { label: '100 students', value: 100 },
];

export function CourseForm({ onDataChange }: CourseFormProps) {
  const [syllabusSections, setSyllabusSections] = useState<SyllabusSection[]>([
    { id: Date.now().toString(), title: '', description: '' },
  ]);
  const [duration, setDuration] = useState(4);
  const [schedule, setSchedule] = useState<CourseData['schedule']>('FLEXIBLE');
  const [enrollmentLimit, setEnrollmentLimit] = useState<number | null>(null);
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [prerequisiteInput, setPrerequisiteInput] = useState('');

  useEffect(() => {
    onDataChange({
      syllabusSections,
      duration,
      schedule,
      enrollmentLimit,
      prerequisites,
    });
  }, [syllabusSections, duration, schedule, enrollmentLimit, prerequisites]);

  const addSection = () => {
    if (syllabusSections.length < 12) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSyllabusSections([...syllabusSections, {
        id: Date.now().toString(),
        title: '',
        description: '',
      }]);
    }
  };

  const removeSection = (id: string) => {
    if (syllabusSections.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSyllabusSections(syllabusSections.filter(s => s.id !== id));
    }
  };

  const updateSection = (id: string, field: 'title' | 'description', value: string) => {
    setSyllabusSections(syllabusSections.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const addPrerequisite = () => {
    const trimmed = prerequisiteInput.trim();
    if (trimmed && prerequisites.length < 5 && !prerequisites.includes(trimmed)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPrerequisites([...prerequisites, trimmed]);
      setPrerequisiteInput('');
    }
  };

  const removePrerequisite = (prereq: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrerequisites(prerequisites.filter(p => p !== prereq));
  };

  return (
    <View style={styles.container}>
      {/* Course Settings Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="school" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>Course Settings</Text>
        </View>

        {/* Duration */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Duration</Text>
            <Text style={styles.settingValue}>{duration} weeks</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {DURATION_OPTIONS.map((weeks) => (
              <TouchableOpacity
                key={weeks}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDuration(weeks);
                }}
                style={[
                  styles.chip,
                  duration === weeks && styles.chipSelected
                ]}
              >
                <Text style={[
                  styles.chipText,
                  duration === weeks && styles.chipTextSelected
                ]}>
                  {weeks}w
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Schedule Type */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Schedule Type</Text>
          <View style={styles.scheduleTypes}>
            {SCHEDULE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.type}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSchedule(type.type);
                }}
                style={[
                  styles.scheduleButton,
                  schedule === type.type && styles.scheduleButtonSelected,
                ]}
              >
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={schedule === type.type ? '#10B981' : '#6B7280'}
                />
                <Text style={[
                  styles.scheduleText,
                  schedule === type.type && styles.scheduleTextSelected,
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Enrollment Limit */}
        <View style={[styles.settingRow, { marginBottom: 0 }]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enrollment Limit</Text>
            <Text style={styles.settingValue}>
              {enrollmentLimit ? `${enrollmentLimit}` : 'No limit'}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {ENROLLMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.label}
                onPress={() => {
                  Haptics.selectionAsync();
                  setEnrollmentLimit(option.value);
                }}
                style={[
                  styles.chip,
                  enrollmentLimit === option.value && styles.chipSelected
                ]}
              >
                <Text style={[
                  styles.chipText,
                  enrollmentLimit === option.value && styles.chipTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Syllabus Sections Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="list" size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Syllabus</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{syllabusSections.length}</Text>
          </View>
        </View>

        {syllabusSections.map((section, index) => (
          <Animated.View
            key={section.id}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            layout={Layout.springify()}
            style={styles.sectionItem}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.sectionLabel}>Section {index + 1}</Text>
              {syllabusSections.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeSection(section.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.sectionTitleInput}
              placeholder="Section title"
              placeholderTextColor="#9CA3AF"
              value={section.title}
              onChangeText={(text) => updateSection(section.id, 'title', text)}
            />

            <TextInput
              style={styles.sectionDescInput}
              placeholder="What will students learn?"
              placeholderTextColor="#9CA3AF"
              multiline
              value={section.description}
              onChangeText={(text) => updateSection(section.id, 'description', text)}
            />
          </Animated.View>
        ))}

        {syllabusSections.length < 12 && (
          <TouchableOpacity onPress={addSection} style={styles.addButton}>
            <Ionicons name="add-circle" size={22} color="#6366F1" />
            <Text style={styles.addButtonText}>Add Section</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Prerequisites Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
          <Text style={styles.cardTitle}>Prerequisites</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{prerequisites.length}/5</Text>
          </View>
        </View>

        <View style={styles.tagInputContainer}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add a prerequisite..."
            placeholderTextColor="#9CA3AF"
            value={prerequisiteInput}
            onChangeText={setPrerequisiteInput}
            onSubmitEditing={addPrerequisite}
            maxLength={50}
            editable={prerequisites.length < 5}
          />
          <TouchableOpacity
            onPress={addPrerequisite}
            style={[
              styles.addTagButton,
              (prerequisites.length >= 5 || !prerequisiteInput.trim()) && styles.addTagButtonDisabled
            ]}
            disabled={prerequisites.length >= 5 || !prerequisiteInput.trim()}
          >
            <Ionicons
              name="add"
              size={20}
              color={prerequisites.length >= 5 || !prerequisiteInput.trim() ? '#9CA3AF' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {prerequisites.length > 0 && (
          <View style={styles.tagsContainer}>
            {prerequisites.map((prereq) => (
              <Animated.View
                key={prereq}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                layout={Layout.springify()}
                style={styles.tag}
              >
                <Text style={styles.tagText}>{prereq}</Text>
                <TouchableOpacity
                  onPress={() => removePrerequisite(prereq)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color="#F59E0B" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Sections</Text>
          <Text style={styles.summaryValue}>{syllabusSections.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>{duration}w</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Schedule</Text>
          <Text style={[styles.summaryValue, { fontSize: 14 }]}>
            {SCHEDULE_TYPES.find(t => t.type === schedule)?.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 20,
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Settings
  settingRow: {
    marginBottom: 20,
  },
  settingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },

  // Chips
  chipsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Schedule Types
  scheduleTypes: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  scheduleButtonSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  scheduleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  scheduleTextSelected: {
    color: '#10B981',
    fontWeight: '700',
  },

  // Syllabus Sections
  sectionItem: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionDescInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Prerequisites
  tagInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  addTagButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },

  // Summary Bar
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
});
