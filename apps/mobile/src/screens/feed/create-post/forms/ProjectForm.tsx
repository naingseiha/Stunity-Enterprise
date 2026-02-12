/**
 * Project Form Component
 * Clean UI for project creation with milestones and deliverables
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ProjectFormProps {
  onDataChange: (data: ProjectData) => void;
}

export interface ProjectData {
  teamType: 'INDIVIDUAL' | 'PAIR' | 'SMALL_GROUP' | 'LARGE_GROUP';
  maxTeamSize: number;
  milestones: Milestone[];
  deliverables: string[];
  duration: number; // days
}

interface Milestone {
  id: string;
  title: string;
  dueInDays: number;
}

const TEAM_TYPES = [
  { type: 'INDIVIDUAL' as const, label: 'Individual', icon: 'person', max: 1 },
  { type: 'PAIR' as const, label: 'Pair', icon: 'people', max: 2 },
  { type: 'SMALL_GROUP' as const, label: 'Small Group', icon: 'people-circle', max: 4 },
  { type: 'LARGE_GROUP' as const, label: 'Large Group', icon: 'people', max: 8 },
];

const DURATION_OPTIONS = [7, 14, 21, 30, 45, 60, 90];

export function ProjectForm({ onDataChange }: ProjectFormProps) {
  const [teamType, setTeamType] = useState<ProjectData['teamType']>('INDIVIDUAL');
  const [maxTeamSize, setMaxTeamSize] = useState(1);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: Date.now().toString(), title: '', dueInDays: 7 },
  ]);
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [deliverableInput, setDeliverableInput] = useState('');
  const [duration, setDuration] = useState(14);

  useEffect(() => {
    onDataChange({
      teamType,
      maxTeamSize,
      milestones,
      deliverables,
      duration,
    });
  }, [teamType, maxTeamSize, milestones, deliverables, duration]);

  const handleTeamTypeChange = (type: ProjectData['teamType']) => {
    Haptics.selectionAsync();
    setTeamType(type);
    const teamInfo = TEAM_TYPES.find(t => t.type === type);
    if (teamInfo) {
      setMaxTeamSize(teamInfo.max);
    }
  };

  const addMilestone = () => {
    if (milestones.length < 10) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMilestones([...milestones, {
        id: Date.now().toString(),
        title: '',
        dueInDays: 7,
      }]);
    }
  };

  const removeMilestone = (id: string) => {
    if (milestones.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setMilestones(milestones.filter(m => m.id !== id));
    }
  };

  const updateMilestone = (id: string, field: 'title' | 'dueInDays', value: string | number) => {
    setMilestones(milestones.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const addDeliverable = () => {
    const trimmed = deliverableInput.trim();
    if (trimmed && deliverables.length < 10 && !deliverables.includes(trimmed)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDeliverables([...deliverables, trimmed]);
      setDeliverableInput('');
    }
  };

  const removeDeliverable = (deliverable: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeliverables(deliverables.filter(d => d !== deliverable));
  };

  return (
    <View style={styles.container}>
      {/* Team Settings Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="people" size={20} color="#8B5CF6" />
          <Text style={styles.cardTitle}>Team Settings</Text>
        </View>

        {/* Team Type */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Team Type</Text>
          <View style={styles.teamTypes}>
            {TEAM_TYPES.map((type) => (
              <TouchableOpacity
                key={type.type}
                onPress={() => handleTeamTypeChange(type.type)}
                style={[
                  styles.teamButton,
                  teamType === type.type && styles.teamButtonSelected,
                ]}
              >
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={teamType === type.type ? '#8B5CF6' : '#6B7280'}
                />
                <Text style={[
                  styles.teamText,
                  teamType === type.type && styles.teamTextSelected,
                ]}>
                  {type.label}
                </Text>
                <Text style={styles.teamSize}>({type.max})</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Project Duration */}
        <View style={[styles.settingRow, { marginBottom: 0 }]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Duration</Text>
            <Text style={styles.settingValue}>{duration} days</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {DURATION_OPTIONS.map((days) => (
              <TouchableOpacity
                key={days}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDuration(days);
                }}
                style={[
                  styles.chip,
                  duration === days && styles.chipSelected
                ]}
              >
                <Text style={[
                  styles.chipText,
                  duration === days && styles.chipTextSelected
                ]}>
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Milestones Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="flag" size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Milestones</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{milestones.length}</Text>
          </View>
        </View>

        {milestones.map((milestone, index) => (
          <Animated.View
            key={milestone.id}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            layout={Layout.springify()}
            style={styles.milestoneItem}
          >
            <View style={styles.milestoneHeader}>
              <View style={styles.milestoneNumber}>
                <Text style={styles.milestoneNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.milestoneLabel}>Milestone {index + 1}</Text>
              {milestones.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeMilestone(milestone.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.milestoneTitleInput}
              placeholder="Milestone title"
              placeholderTextColor="#9CA3AF"
              value={milestone.title}
              onChangeText={(text) => updateMilestone(milestone.id, 'title', text)}
            />

            <View style={styles.dueInRow}>
              <Text style={styles.dueInLabel}>Due in:</Text>
              <View style={styles.dueInPicker}>
                {[3, 7, 14, 21, 30].map((days) => (
                  <TouchableOpacity
                    key={days}
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateMilestone(milestone.id, 'dueInDays', days);
                    }}
                    style={[
                      styles.dueInChip,
                      milestone.dueInDays === days && styles.dueInChipSelected
                    ]}
                  >
                    <Text style={[
                      styles.dueInChipText,
                      milestone.dueInDays === days && styles.dueInChipTextSelected
                    ]}>
                      {days}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        ))}

        {milestones.length < 10 && (
          <TouchableOpacity onPress={addMilestone} style={styles.addButton}>
            <Ionicons name="add-circle" size={22} color="#3B82F6" />
            <Text style={styles.addButtonText}>Add Milestone</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Deliverables Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="checkbox" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>Deliverables</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{deliverables.length}/10</Text>
          </View>
        </View>

        <View style={styles.tagInputContainer}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add a deliverable..."
            placeholderTextColor="#9CA3AF"
            value={deliverableInput}
            onChangeText={setDeliverableInput}
            onSubmitEditing={addDeliverable}
            maxLength={50}
            editable={deliverables.length < 10}
          />
          <TouchableOpacity
            onPress={addDeliverable}
            style={[
              styles.addTagButton,
              (deliverables.length >= 10 || !deliverableInput.trim()) && styles.addTagButtonDisabled
            ]}
            disabled={deliverables.length >= 10 || !deliverableInput.trim()}
          >
            <Ionicons
              name="add"
              size={20}
              color={deliverables.length >= 10 || !deliverableInput.trim() ? '#9CA3AF' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {deliverables.length > 0 && (
          <View style={styles.deliverablesContainer}>
            {deliverables.map((deliverable, index) => (
              <Animated.View
                key={deliverable}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                layout={Layout.springify()}
                style={styles.deliverableItem}
              >
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.deliverableText}>{deliverable}</Text>
                <TouchableOpacity
                  onPress={() => removeDeliverable(deliverable)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Team</Text>
          <Text style={styles.summaryValue}>{maxTeamSize}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Milestones</Text>
          <Text style={styles.summaryValue}>{milestones.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>{duration}d</Text>
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
    color: '#8B5CF6',
  },

  // Team Types
  teamTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamButton: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  teamButtonSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  teamText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  teamTextSelected: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  teamSize: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
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

  // Milestones
  milestoneItem: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  milestoneNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  milestoneLabel: {
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
  milestoneTitleInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 12,
  },
  dueInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dueInLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dueInPicker: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  dueInChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  dueInChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dueInChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  dueInChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Deliverables
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
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  deliverablesContainer: {
    marginTop: 12,
    gap: 10,
  },
  deliverableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  deliverableText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
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
    color: '#3B82F6',
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
