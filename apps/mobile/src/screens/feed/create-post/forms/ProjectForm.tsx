/**
 * Enhanced Project Form Component
 * Beautiful, clean UI for project creation with milestones and deliverables
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AIGenerateButton } from '@/components/ai/AIGenerateButton';
import { AIPromptModal } from '@/components/ai/AIPromptModal';
import { AILoadingOverlay } from '@/components/ai/AILoadingOverlay';
import { AIResultPreview } from '@/components/ai/AIResultPreview';
import type { AIPromptData } from '@/components/ai/AIPromptModal';
import { aiService } from '@/services/ai.service';

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
  { type: 'INDIVIDUAL' as const, label: 'Solo', icon: 'person', max: 1 },
  { type: 'PAIR' as const, label: 'Pair', icon: 'people', max: 2 },
  { type: 'SMALL_GROUP' as const, label: 'Small Team', icon: 'people-circle-outline', max: 4 },
  { type: 'LARGE_GROUP' as const, label: 'Large Team', icon: 'people-circle', max: 8 },
];

const DURATION_OPTIONS = [7, 14, 21, 30, 45, 60, 90];

const SUGGESTED_SKILLS = [
  'React', 'Python', 'Node.js', 'TypeScript', 'Java', 'SQL',
  'Figma', 'Docker', 'AWS', 'Git', 'Flutter', 'Swift',
];

export function ProjectForm({ onDataChange }: ProjectFormProps) {
  const [teamType, setTeamType] = useState<ProjectData['teamType']>('INDIVIDUAL');
  const [maxTeamSize, setMaxTeamSize] = useState(1);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: Date.now().toString(), title: '', dueInDays: 7 },
  ]);
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [deliverableInput, setDeliverableInput] = useState('');
  const [duration, setDuration] = useState(14);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // AI State
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<any>(null);
  const [lastPrompt, setLastPrompt] = useState<AIPromptData | null>(null);

  const handleGenerateAI = async (data: AIPromptData) => {
    setLastPrompt(data);
    setIsAiLoading(true);
    try {
      // The prompt actually wants projectTitle and description, but we only have topic from the generic modal
      // We will map topic to projectTitle, and use gradeLevel as an extra hint for tone.
      const result = await aiService.generateMilestones(data.topic, `A project. Level: ${data.gradeLevel}.`, data.count);
      setAiPreviewData(result || null);
    } catch (error: any) {
      alert(error.message || 'Failed to generate milestones');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAI = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (aiPreviewData?.milestones && Array.isArray(aiPreviewData.milestones)) {
      const mappedMilestones = aiPreviewData.milestones.slice(0, 10).map((m: any) => ({
        id: Date.now().toString() + Math.random().toString(),
        title: m.title || m.name || m.description || 'Milestone',
        dueInDays: m.durationDays || m.dueInDays || 7,
      }));
      setMilestones(mappedMilestones);

      // Attempt to set total duration from sum of milestones
      const totalDays = mappedMilestones.reduce((acc: number, m: any) => acc + (m.dueInDays || 0), 0);
      if (totalDays > 0) {
        const closest = [...DURATION_OPTIONS].sort((a, b) => Math.abs(a - totalDays) - Math.abs(b - totalDays))[0];
        setDuration(closest);
      }
    }
    setAiPreviewData(null);
  };

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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDeliverables([...deliverables, trimmed]);
      setDeliverableInput('');
    }
  };

  const removeDeliverable = (deliverable: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeliverables(deliverables.filter(d => d !== deliverable));
  };

  return (
    <View style={styles.container}>
      {/* Scope Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="people" size={20} color="#8B5CF6" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Team & Timeline</Text>
            <Text style={styles.cardSubtitle}>Group size and duration</Text>
          </View>
        </View>

        <View style={styles.teamGrid}>
          {TEAM_TYPES.map((type) => (
            <TouchableOpacity
              key={type.type}
              onPress={() => handleTeamTypeChange(type.type)}
              style={[
                styles.teamCard,
                teamType === type.type && styles.teamCardSelected,
              ]}
            >
              <View style={[
                styles.teamIcon,
                teamType === type.type && styles.teamIconSelected,
              ]}>
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={teamType === type.type ? '#8B5CF6' : '#9CA3AF'} // Fixed: Icon color when selected
                />
              </View>
              <Text style={[
                styles.teamLabel,
                teamType === type.type && styles.teamLabelSelected,
              ]}>
                {type.label}
              </Text>
              <Text style={styles.teamSize}>Max {type.max}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.durationSection}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.chipsWrap}>
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
          </View>
        </View>
      </View>

      {/* Milestones Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="flag" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Milestones</Text>
              <Text style={styles.cardSubtitle}>Key project checkpoints</Text>
            </View>
          </View>
          <AIGenerateButton
            label="Suggest"
            size="small"
            type="ghost"
            onPress={() => setIsAiModalVisible(true)}
          />
        </View>

        <View style={styles.milestonesList}>
          {milestones.map((milestone, index) => (
            <Animated.View
              key={milestone.id}
              entering={FadeIn.duration(200)}
              layout={Layout.springify()}
              style={styles.milestoneCard}
            >
              <View style={styles.milestoneHeader}>
                <View style={styles.milestoneBadge}>
                  <Text style={styles.milestoneBadgeText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={styles.milestoneInput}
                  placeholder={`Milestone ${index + 1} Title`}
                  placeholderTextColor="#9CA3AF"
                  value={milestone.title}
                  onChangeText={(text) => updateMilestone(milestone.id, 'title', text)}
                />
                {milestones.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeMilestone(milestone.id)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.dueInWrapper}>
                <Text style={styles.dueInLabel}>Due day:</Text>
                <View style={styles.miniWrap}>
                  {[3, 7, 14, 21, 30].map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => {
                        Haptics.selectionAsync();
                        updateMilestone(milestone.id, 'dueInDays', d);
                      }}
                      style={[
                        styles.miniChip,
                        milestone.dueInDays === d && styles.miniChipSelected
                      ]}
                    >
                      <Text style={[
                        styles.miniChipText,
                        milestone.dueInDays === d && styles.miniChipTextSelected
                      ]}>{d}d</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        {milestones.length < 10 && (
          <TouchableOpacity onPress={addMilestone} style={styles.addButton}>
            <Ionicons name="add" size={20} color="#3B82F6" />
            <Text style={styles.addButtonText}>Add Milestone</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Deliverables Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="checkbox" size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Deliverables</Text>
            <Text style={styles.cardSubtitle}>What needs to be submitted</Text>
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.mainInput}
            placeholder={deliverables.length < 10 ? "Add deliverable (e.g., Final Report)..." : "Max reached"}
            value={deliverableInput}
            onChangeText={setDeliverableInput}
            onSubmitEditing={addDeliverable}
            editable={deliverables.length < 10}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={addDeliverable}
            style={[
              styles.inputButton,
              (!deliverableInput.trim() || deliverables.length >= 10) && styles.inputButtonDisabled
            ]}
          >
            <Ionicons name="arrow-up" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {deliverables.length > 0 && (
          <View style={styles.deliverablesList}>
            {deliverables.map((deliverable) => (
              <Animated.View
                key={deliverable}
                entering={FadeIn.duration(200)}
                layout={Layout.springify()}
                style={styles.deliverableItem}
              >
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.deliverableText}>{deliverable}</Text>
                <TouchableOpacity onPress={() => removeDeliverable(deliverable)}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* Skills / Technologies Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="code-slash" size={20} color="#F97316" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Skills & Technologies</Text>
            <Text style={styles.cardSubtitle}>Required skills for this project</Text>
          </View>
        </View>

        {/* Active Skills */}
        {skills.length > 0 && (
          <View style={styles.skillsRow}>
            {skills.map((skill) => (
              <Animated.View
                key={skill}
                entering={FadeIn.duration(200)}
                layout={Layout.springify()}
                style={styles.skillChip}
              >
                <Text style={styles.skillChipText}>{skill}</Text>
                <TouchableOpacity onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setSkills(skills.filter(s => s !== skill));
                }}>
                  <Ionicons name="close-circle" size={16} color="#F97316" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Skill Input */}
        {skills.length < 8 && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.mainInput}
              placeholder="Add a skill or technology..."
              value={skillInput}
              onChangeText={setSkillInput}
              onSubmitEditing={() => {
                const trimmed = skillInput.trim();
                if (trimmed && !skills.includes(trimmed)) {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSkills([...skills, trimmed]);
                  setSkillInput('');
                }
              }}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => {
                const trimmed = skillInput.trim();
                if (trimmed && !skills.includes(trimmed)) {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSkills([...skills, trimmed]);
                  setSkillInput('');
                }
              }}
              style={[
                styles.inputButton,
                { backgroundColor: '#F97316' },
                !skillInput.trim() && styles.inputButtonDisabled
              ]}
            >
              <Ionicons name="arrow-up" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Suggested Skills */}
        {skills.length < 8 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedScroll}
            style={{ marginTop: 10 }}
          >
            {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).slice(0, 6).map((skill) => (
              <TouchableOpacity
                key={skill}
                style={styles.suggestedSkill}
                onPress={() => {
                  if (!skills.includes(skill) && skills.length < 8) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSkills([...skills, skill]);
                  }
                }}
              >
                <Text style={styles.suggestedSkillText}>{skill}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* AI Modals */}
      <AIPromptModal
        visible={isAiModalVisible}
        onClose={() => setIsAiModalVisible(false)}
        onGenerate={handleGenerateAI}
        type="lesson" // Using lesson type to just ask for topic, no difficulty/count needed for project milestones usually, or we can use generic
        title="Generate Milestones"
      />

      <AIResultPreview
        visible={!!aiPreviewData}
        content={!!(aiPreviewData?.milestones && Array.isArray(aiPreviewData.milestones)) ? `Suggested ${aiPreviewData.milestones.length} milestones:\n\n${aiPreviewData.milestones.map((m: any, i: number) => `${i + 1}. ${m.title} (${m.durationDays || m.dueInDays || 7} days)`).join('\n')}` : ''}
        title="Milestones Generated"
        onAccept={handleAcceptAI}
        onRegenerate={() => !!lastPrompt && handleGenerateAI(lastPrompt)}
        onDiscard={() => setAiPreviewData(null)}
        isRegenerating={isAiLoading}
      />

      <AILoadingOverlay
        isVisible={!!(isAiLoading && !aiPreviewData)}
        message="AI is planning project phases..."
      />
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
  // Team Grid
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  teamCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    gap: 8,
  },
  teamCardSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  teamIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamIconSelected: {
    backgroundColor: '#EDE9FE',
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  teamLabelSelected: {
    color: '#5B21B6',
  },
  teamSize: {
    fontSize: 11,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 16,
  },
  // Duration
  durationSection: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFF',
  },
  // Milestones
  milestonesList: {
    gap: 12,
  },
  milestoneCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  milestoneBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  milestoneInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  iconButton: {
    padding: 4,
  },
  dueInWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingLeft: 34,
  },
  dueInLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  miniWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  miniChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  miniChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  miniChipTextSelected: {
    color: '#FFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  // Deliverables
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
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  deliverablesList: {
    marginTop: 12,
    gap: 8,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#064E3B',
  },
  // Skills
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EA580C',
  },
  suggestedScroll: {
    gap: 6,
  },
  suggestedSkill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  suggestedSkillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EA580C',
  },
});
