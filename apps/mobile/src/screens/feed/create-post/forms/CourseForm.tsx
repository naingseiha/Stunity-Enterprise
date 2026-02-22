/**
 * Enhanced Course Form Component
 * Beautiful, clean UI for course creation with syllabus and materials
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
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
  { type: 'FLEXIBLE' as const, label: 'Flexible', icon: 'infinite', description: 'Self-paced' },
  { type: 'WEEKLY' as const, label: 'Weekly', icon: 'calendar', description: 'New content weekly' },
  { type: 'DAILY' as const, label: 'Daily', icon: 'time', description: 'Daily lessons' },
];

const ENROLLMENT_OPTIONS = [
  { label: 'Unlimited', value: null },
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
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
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(syllabusSections[0].id);

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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newId = Date.now().toString();
      setSyllabusSections([...syllabusSections, {
        id: newId,
        title: '',
        description: '',
      }]);
      setExpandedSectionId(newId);
    }
  };

  const removeSection = (id: string) => {
    if (syllabusSections.length > 1) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSyllabusSections(syllabusSections.filter(s => s.id !== id));
    }
  };

  const updateSection = (id: string, field: 'title' | 'description', value: string) => {
    setSyllabusSections(syllabusSections.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const toggleSectionExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSectionId(expandedSectionId === id ? null : id);
  };

  const addPrerequisite = () => {
    const trimmed = prerequisiteInput.trim();
    if (trimmed && prerequisites.length < 5 && !prerequisites.includes(trimmed)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPrerequisites([...prerequisites, trimmed]);
      setPrerequisiteInput('');
    }
  };

  const removePrerequisite = (prereq: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrerequisites(prerequisites.filter(p => p !== prereq));
  };

  return (
    <View style={styles.container}>
      {/* Course Structure Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="school" size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Structure</Text>
            <Text style={styles.cardSubtitle}>Format and duration</Text>
          </View>
        </View>

        {/* Schedule Grid */}
        <View style={styles.scheduleGrid}>
          {SCHEDULE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.type}
              onPress={() => {
                Haptics.selectionAsync();
                setSchedule(type.type);
              }}
              style={[
                styles.scheduleCard,
                schedule === type.type && styles.scheduleCardSelected,
              ]}
            >
              <View style={[
                styles.scheduleIcon,
                schedule === type.type && styles.scheduleIconSelected,
              ]}>
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={schedule === type.type ? '#FFF' : '#6B7280'}
                />
              </View>
              <Text style={[
                styles.scheduleLabel,
                schedule === type.type && styles.scheduleLabelSelected,
              ]}>
                {type.label}
              </Text>
              <Text style={styles.scheduleDesc}>{type.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Duration & Limit */}
        <View style={styles.settingsStack}>
          <View>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.chipWrap}>
              {DURATION_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w}
                  onPress={() => { Haptics.selectionAsync(); setDuration(w); }}
                  style={[styles.miniChip, duration === w && styles.miniChipSelected]}
                >
                  <Text style={[styles.miniChipText, duration === w && styles.miniChipTextSelected]}>{w}w</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Enrollment Limit</Text>
            <View style={styles.chipWrap}>
              {ENROLLMENT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={String(opt.value)}
                  onPress={() => { Haptics.selectionAsync(); setEnrollmentLimit(opt.value); }}
                  style={[styles.miniChip, enrollmentLimit === opt.value && styles.miniChipSelected]}
                >
                  <Text style={[styles.miniChipText, enrollmentLimit === opt.value && styles.miniChipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Syllabus Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="book" size={20} color="#6366F1" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Syllabus</Text>
            <Text style={styles.cardSubtitle}>{syllabusSections.length} sections added</Text>
          </View>
        </View>

        <View style={styles.sectionsList}>
          {syllabusSections.map((section, index) => (
            <Animated.View
              key={section.id}
              entering={FadeIn.duration(200)}
              layout={Layout.springify()}
              style={[
                styles.sectionCard,
                expandedSectionId === section.id && styles.sectionCardExpanded
              ]}
            >
              <TouchableOpacity
                onPress={() => toggleSectionExpand(section.id)}
                style={styles.sectionHeader}
              >
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.sectionTitlePlaceholder} numberOfLines={1}>
                    {section.title || `Section ${index + 1}`}
                  </Text>
                </View>
                <View style={styles.sectionActions}>
                  {syllabusSections.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeSection(section.id)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  <Ionicons
                    name={expandedSectionId === section.id ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#9CA3AF"
                  />
                </View>
              </TouchableOpacity>

              {expandedSectionId === section.id && (
                <View style={styles.sectionContent}>
                  <TextInput
                    style={styles.input}
                    placeholder="Section Title (e.g., Introduction to React)"
                    placeholderTextColor="#9CA3AF"
                    value={section.title}
                    onChangeText={(text) => updateSection(section.id, 'title', text)}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="What will students learn in this section?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    value={section.description}
                    onChangeText={(text) => updateSection(section.id, 'description', text)}
                  />
                </View>
              )}
            </Animated.View>
          ))}
        </View>

        {syllabusSections.length < 12 && (
          <TouchableOpacity onPress={addSection} style={styles.addButton}>
            <Ionicons name="add" size={20} color="#6366F1" />
            <Text style={styles.addButtonText}>Add Section</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Prerequisites Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#0EA5E9" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Prerequisites</Text>
            <Text style={styles.cardSubtitle}>Requirements to join</Text>
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.mainInput}
            placeholder={prerequisites.length < 5 ? "Add prerequisite..." : "Max reached"}
            value={prerequisiteInput}
            onChangeText={setPrerequisiteInput}
            onSubmitEditing={addPrerequisite}
            editable={prerequisites.length < 5}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={addPrerequisite}
            style={[
              styles.inputButton,
              (!prerequisiteInput.trim() || prerequisites.length >= 5) && styles.inputButtonDisabled
            ]}
          >
            <Ionicons name="arrow-up" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {prerequisites.length > 0 && (
          <View style={styles.tagsContainer}>
            {prerequisites.map((prereq) => (
              <Animated.View
                key={prereq}
                entering={FadeIn.duration(200)}
                layout={Layout.springify()}
                style={styles.tag}
              >
                <Text style={styles.tagText}>{prereq}</Text>
                <TouchableOpacity onPress={() => removePrerequisite(prereq)}>
                  <Ionicons name="close-circle" size={16} color="#7DD3FC" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Schedule
  scheduleGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    gap: 8,
  },
  scheduleCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  scheduleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleIconSelected: {
    backgroundColor: '#10B981',
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  scheduleLabelSelected: {
    color: '#064E3B',
  },
  scheduleDesc: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 16,
  },
  // Row Settings
  settingsStack: {
    gap: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  miniChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  miniChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  miniChipTextSelected: {
    color: '#FFF',
  },
  // Sections
  sectionsList: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  sectionCardExpanded: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.08,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  sectionTitlePlaceholder: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  sectionContent: {
    padding: 12,
    paddingTop: 0,
    gap: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  // Prereqs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingRight: 6,
  },
  mainInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  inputButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputButtonDisabled: {
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
  },
});
