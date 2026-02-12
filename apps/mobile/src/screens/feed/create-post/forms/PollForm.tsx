/**
 * Enhanced Poll Form Component
 * Beautiful, clean UI for poll creation with advanced features
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
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

export function PollForm({ options, onOptionsChange, onDataChange }: PollFormProps) {
  const [duration, setDuration] = useState<number | null>(24);
  const [resultsVisibility, setResultsVisibility] = useState<PollData['resultsVisibility']>('AFTER_VOTING');
  const [allowMultipleSelections, setAllowMultipleSelections] = useState(false);
  const [anonymousVoting, setAnonymousVoting] = useState(false);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onOptionsChange([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onOptionsChange(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onOptionsChange(updated);
  };

  return (
    <View style={styles.container}>
      {/* Poll Options Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="list" size={18} color="#8B5CF6" />
          </View>
          <Text style={styles.cardTitle}>Poll Options</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{options.length}/10</Text>
          </View>
        </View>

        {options.map((option, index) => (
          <Animated.View
            key={index}
            entering={FadeIn.duration(200).delay(index * 30)}
            exiting={FadeOut.duration(150)}
            layout={Layout.springify()}
            style={styles.optionRow}
          >
            <View style={styles.optionNumber}>
              <Text style={styles.optionNumberText}>{index + 1}</Text>
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
          </Animated.View>
        ))}

        {options.length < 10 && (
          <TouchableOpacity onPress={addOption} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={20} color="#8B5CF6" />
            <Text style={styles.addButtonText}>Add Option</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Duration Card */}
      <Animated.View entering={FadeIn.duration(300).delay(100)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="time" size={18} color="#10B981" />
          </View>
          <Text style={styles.cardTitle}>Poll Duration</Text>
        </View>

        <Text style={styles.description}>
          How long should this poll run?
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {DURATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.label}
              onPress={() => {
                Haptics.selectionAsync();
                setDuration(option.value);
              }}
              style={[
                styles.chip,
                duration === option.value && styles.chipSelected,
              ]}
            >
              <Text style={[
                styles.chipText,
                duration === option.value && styles.chipTextSelected,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Results Visibility Card */}
      <Animated.View entering={FadeIn.duration(300).delay(200)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="eye" size={18} color="#3B82F6" />
          </View>
          <Text style={styles.cardTitle}>Results Visibility</Text>
        </View>

        <Text style={styles.description}>
          When can voters see the results?
        </Text>

        {VISIBILITY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.type}
            onPress={() => {
              Haptics.selectionAsync();
              setResultsVisibility(option.type);
            }}
            style={[
              styles.visibilityOption,
              resultsVisibility === option.type && styles.visibilityOptionSelected,
            ]}
          >
            <View style={[
              styles.visibilityIconBadge,
              resultsVisibility === option.type && styles.visibilityIconBadgeSelected,
            ]}>
              <Ionicons
                name={option.icon as any}
                size={20}
                color={resultsVisibility === option.type ? '#3B82F6' : '#6B7280'}
              />
            </View>
            <View style={styles.visibilityContent}>
              <Text style={[
                styles.visibilityLabel,
                resultsVisibility === option.type && styles.visibilityLabelSelected,
              ]}>
                {option.label}
              </Text>
              <Text style={styles.visibilityDescription}>{option.description}</Text>
            </View>
            {resultsVisibility === option.type && (
              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Advanced Settings Card */}
      <Animated.View entering={FadeIn.duration(300).delay(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="settings" size={18} color="#F59E0B" />
          </View>
          <Text style={styles.cardTitle}>Advanced Settings</Text>
        </View>

        {/* Multiple Selections Toggle */}
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setAllowMultipleSelections(!allowMultipleSelections);
          }}
          style={styles.toggleOption}
        >
          <View style={styles.toggleLeft}>
            <View style={styles.toggleIconBadge}>
              <Ionicons name="checkbox" size={18} color="#F59E0B" />
            </View>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Multiple Selections</Text>
              <Text style={styles.toggleDescription}>Allow voters to pick multiple options</Text>
            </View>
          </View>
          <View style={[
            styles.toggle,
            allowMultipleSelections && styles.toggleActive,
          ]}>
            <View style={[
              styles.toggleThumb,
              allowMultipleSelections && styles.toggleThumbActive,
            ]} />
          </View>
        </TouchableOpacity>

        {/* Anonymous Voting Toggle */}
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setAnonymousVoting(!anonymousVoting);
          }}
          style={[styles.toggleOption, { marginTop: 12 }]}
        >
          <View style={styles.toggleLeft}>
            <View style={styles.toggleIconBadge}>
              <Ionicons name="eye-off" size={18} color="#F59E0B" />
            </View>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Anonymous Voting</Text>
              <Text style={styles.toggleDescription}>Hide voter identities</Text>
            </View>
          </View>
          <View style={[
            styles.toggle,
            anonymousVoting && styles.toggleActive,
          ]}>
            <View style={[
              styles.toggleThumb,
              anonymousVoting && styles.toggleThumbActive,
            ]} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Summary Card */}
      <Animated.View entering={FadeIn.duration(300).delay(400)} style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryTitle}>Poll Summary</Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Options</Text>
            <Text style={styles.summaryValue}>{options.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={[styles.summaryValue, { fontSize: 16 }]}>
              {duration ? `${duration}h` : 'No end'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Features</Text>
            <Text style={[styles.summaryValue, { fontSize: 16 }]}>
              {allowMultipleSelections || anonymousVoting
                ? `${allowMultipleSelections ? 'Multi' : ''}${allowMultipleSelections && anonymousVoting ? '+' : ''}${anonymousVoting ? 'Anon' : ''}`
                : 'Basic'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  optionNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    marginTop: 6,
    backgroundColor: '#FAFBFF',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: -0.2,
  },
  chipsContainer: {
    gap: 10,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  visibilityOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  visibilityIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityIconBadgeSelected: {
    backgroundColor: '#DBEAFE',
  },
  visibilityContent: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  visibilityLabelSelected: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  visibilityDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#F59E0B',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  summaryCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#BBF7D0',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
});
