/**
 * Enhanced Poll Form Component
 * Beautiful, clean UI for poll creation with advanced features
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface PollFormProps {
  options: string[];
  onOptionsChange: (options: string[]) => void;
  onDataChange: (data: PollData) => void;
}

export interface PollData {
  options: string[];
  duration: number | null; // hours, null = no end
  resultsVisibility: 'WHILE_VOTING' | 'AFTER_VOTING' | 'AFTER_ENDING';
  allowMultipleSelections: boolean;
  anonymousVoting: boolean;
}

const DURATION_OPTIONS = [
  { label: 'No end', value: null },
  { label: '24 hours', value: 24 },
  { label: '3 days', value: 72 },
  { label: '1 week', value: 168 },
  { label: '2 weeks', value: 336 },
];

const VISIBILITY_OPTIONS = [
  { type: 'WHILE_VOTING' as const, label: 'Live Results', icon: 'pulse', description: 'Show in real-time' },
  { type: 'AFTER_VOTING' as const, label: 'After Vote', icon: 'lock-closed', description: 'After user votes' },
  { type: 'AFTER_ENDING' as const, label: 'After End', icon: 'eye-off', description: 'After poll ends' },
];

// Color palette for poll option badges
const OPTION_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#0EA5E9', '#14B8A6', '#F97316', '#84CC16',
];

export function PollForm({ options, onOptionsChange, onDataChange }: PollFormProps) {
  const [duration, setDuration] = useState<number | null>(24);
  const [resultsVisibility, setResultsVisibility] = useState<PollData['resultsVisibility']>('AFTER_VOTING');
  const [allowMultipleSelections, setAllowMultipleSelections] = useState(false);
  const [anonymousVoting, setAnonymousVoting] = useState(false);

  // UI State
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  useEffect(() => {
    onDataChange({
      options,
      duration,
      resultsVisibility,
      allowMultipleSelections,
      anonymousVoting,
    });
  }, [options, duration, resultsVisibility, allowMultipleSelections, anonymousVoting]);

  const addOption = () => {
    if (options.length < 10) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onOptionsChange([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onOptionsChange(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onOptionsChange(updated);
  };

  const toggleSettings = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSettingsExpanded(!isSettingsExpanded);
  };

  return (
    <View style={styles.container}>
      {/* Poll Options Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="stats-chart" size={24} color="#6366F1" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Poll Questions</Text>
            <Text style={styles.cardSubtitle}>
              Ask your community
            </Text>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{options.length}/10</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {options.map((option, index) => (
            <View
              key={index}
              style={styles.optionRow}
            >
              <View style={[styles.optionIndex, { backgroundColor: OPTION_COLORS[index % OPTION_COLORS.length] }]}>
                <Text style={styles.optionIndexText}>{String.fromCharCode(65 + index)}</Text>
              </View>
              <TextInput
                style={styles.optionInput}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor="#9CA3AF"
                value={option}
                onChangeText={(text) => updateOption(index, text)}
              />
              {options.length > 2 && (
                <TouchableOpacity
                  onPress={() => removeOption(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {options.length < 10 && (
            <TouchableOpacity onPress={addOption} style={styles.addButton}>
              <View style={styles.addButtonIcon}>
                <Ionicons name="add" size={20} color="#6366F1" />
              </View>
              <Text style={styles.addButtonText}>Add Another Option</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Settings Card */}
      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.cardHeader, isSettingsExpanded && styles.cardHeaderExpanded]}
          onPress={toggleSettings}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="options" size={24} color="#10B981" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Settings</Text>
              <Text style={styles.cardSubtitle}>
                Duration & Visibility
              </Text>
            </View>
          </View>
          <View style={[styles.expandIcon, isSettingsExpanded && styles.expandIconRotated]}>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {isSettingsExpanded && (
          <View style={styles.cardContent}>
            {/* Duration */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionLabel}>Poll Duration</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capsuleScroll}>
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[
                      styles.capsule,
                      duration === opt.value && styles.capsuleSelected
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setDuration(opt.value); }}
                  >
                    <Text style={[
                      styles.capsuleText,
                      duration === opt.value && styles.capsuleTextSelected
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.divider} />

            {/* Visibility */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionLabel}>Results Visibility</Text>
              <View style={styles.visibilityGrid}>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      styles.visibilityCard,
                      resultsVisibility === opt.type && styles.visibilityCardSelected
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setResultsVisibility(opt.type); }}
                  >
                    <View style={[
                      styles.visibilityIcon,
                      resultsVisibility === opt.type && styles.visibilityIconSelected
                    ]}>
                      <Ionicons
                        name={opt.icon as any}
                        size={20}
                        color={resultsVisibility === opt.type ? '#6366F1' : '#6B7280'}
                      />
                    </View>
                    <View style={styles.visibilityInfo}>
                      <Text style={[
                        styles.visibilityLabel,
                        resultsVisibility === opt.type && styles.visibilityLabelSelected
                      ]}>{opt.label}</Text>
                      <Text style={styles.visibilityDesc}>{opt.description}</Text>
                    </View>
                    {resultsVisibility === opt.type && (
                      <View style={styles.checkIcon}>
                        <Ionicons name="checkmark-circle" size={18} color="#6366F1" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Toggles */}
            <View style={styles.togglesContainer}>
              <View style={styles.switchRow}>
                <View style={[styles.switchIcon, { backgroundColor: '#E0E7FF' }]}>
                  <Ionicons name="checkbox-outline" size={18} color="#4338CA" />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.switchLabel}>Multiple Answers</Text>
                  <Text style={styles.switchSubLabel}>Allow selecting more than one option</Text>
                </View>
                <Switch
                  value={allowMultipleSelections}
                  onValueChange={(v) => { Haptics.selectionAsync(); setAllowMultipleSelections(v); }}
                  trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                  thumbColor={allowMultipleSelections ? '#4F46E5' : '#FFF'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={[styles.switchIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="eye-off-outline" size={18} color="#7C3AED" />
                </View>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.switchLabel}>Anonymous Voting</Text>
                  <Text style={styles.switchSubLabel}>Hide voter identities from results</Text>
                </View>
                <Switch
                  value={anonymousVoting}
                  onValueChange={(v) => { Haptics.selectionAsync(); setAnonymousVoting(v); }}
                  trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                  thumbColor={anonymousVoting ? '#4F46E5' : '#FFF'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>
            </View>
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
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  cardHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  badgeContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  cardContent: {
    padding: 20,
    paddingTop: 8,
  },
  expandIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
    backgroundColor: '#FFFFFF',
  },
  // Options
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  optionIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIndexText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',

    borderColor: '#FEE2E2',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 14,

    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  // Settings Sections
  settingSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  capsuleScroll: {
    gap: 10,
  },
  capsule: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',


  },
  capsuleSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',

    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  capsuleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  capsuleTextSelected: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginHorizontal: -20,
    marginBottom: 20,
  },
  // Visibility
  visibilityGrid: {
    gap: 12,
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 14,
  },
  visibilityCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  visibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityIconSelected: {
    backgroundColor: '#FFFFFF',
  },
  visibilityInfo: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  visibilityLabelSelected: {
    color: '#4F46E5',
  },
  visibilityDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  // Toggles
  togglesContainer: {
    gap: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
  },
  switchIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
});
