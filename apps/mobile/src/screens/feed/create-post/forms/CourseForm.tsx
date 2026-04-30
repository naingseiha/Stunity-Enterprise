/**
 * Enhanced Course Form Component
 * Beautiful, clean UI for course creation with syllabus and materials
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, LayoutAnimation , Animated} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as Haptics from 'expo-haptics';
import { AIGenerateButton } from '@/components/ai/AIGenerateButton';
import { AIPromptModal } from '@/components/ai/AIPromptModal';
import { AILoadingOverlay } from '@/components/ai/AILoadingOverlay';
import { AIResultPreview } from '@/components/ai/AIResultPreview';
import type { AIPromptData } from '@/components/ai/AIPromptModal';
import { useThemeContext } from '@/contexts';
import { aiService } from '@/services/ai.service';
import { useTranslation } from 'react-i18next';

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
  { type: 'FLEXIBLE' as const, labelKey: 'feed.createPost.course.flexible', icon: 'infinite', descriptionKey: 'feed.createPost.course.flexibleDesc' },
  { type: 'WEEKLY' as const, labelKey: 'feed.createPost.course.weekly', icon: 'calendar', descriptionKey: 'feed.createPost.course.weeklyDesc' },
  { type: 'DAILY' as const, labelKey: 'feed.createPost.course.daily', icon: 'time', descriptionKey: 'feed.createPost.course.dailyDesc' },
];

const ENROLLMENT_OPTIONS = [
  { labelKey: 'feed.createPost.course.unlimited', value: null },
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
];

export function CourseForm({ onDataChange }: CourseFormProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [syllabusSections, setSyllabusSections] = useState<SyllabusSection[]>([
    { id: Date.now().toString(), title: '', description: '' },
  ]);
  const [duration, setDuration] = useState(4);
  const [schedule, setSchedule] = useState<CourseData['schedule']>('FLEXIBLE');
  const [enrollmentLimit, setEnrollmentLimit] = useState<number | null>(null);
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [prerequisiteInput, setPrerequisiteInput] = useState('');
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(syllabusSections[0].id);

  // AI State
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<any>(null);
  const [lastPrompt, setLastPrompt] = useState<AIPromptData | null>(null);

  const handleGenerateAI = async (data: AIPromptData) => {
    setLastPrompt(data);
    setIsAiLoading(true);
    try {
      const result = await aiService.generateCourseOutline(data.topic, data.gradeLevel, data.count);
      setAiPreviewData(result || null);
    } catch (error: any) {
      alert(error.message || t('feed.createPost.course.failedGenerate'));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAI = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (aiPreviewData?.sections && Array.isArray(aiPreviewData.sections)) {
      const mappedSections = aiPreviewData.sections.slice(0, 12).map((sec: any) => ({
        id: Date.now().toString() + Math.random().toString(),
        title: sec.title || t('feed.createPost.course.weekLabel', { week: sec.week || '' }),
        description: sec.description || sec.topics?.join(', ') || '',
      }));
      setSyllabusSections(mappedSections);
      if (mappedSections.length > 0) {
        setExpandedSectionId(mappedSections[0].id);
      }

      // Auto-set duration if possible
      if (aiPreviewData.summary && aiPreviewData.duration) {
        // Find closest valid duration
        const durationNum = parseInt(aiPreviewData.duration, 10);
        if (!isNaN(durationNum)) {
          const closest = [...DURATION_OPTIONS].sort((a, b) => Math.abs(a - durationNum) - Math.abs(b - durationNum))[0];
          setDuration(closest);
        }
      }
    }
    setAiPreviewData(null);
  };

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
            <Text style={styles.cardTitle}>{t('feed.createPost.course.structure')}</Text>
            <Text style={styles.cardSubtitle}>{t('feed.createPost.course.formatDuration')}</Text>
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
                  color={schedule === type.type ? '#FFF' : colors.textSecondary}
                />
              </View>
              <Text style={[
                styles.scheduleLabel,
                schedule === type.type && styles.scheduleLabelSelected,
              ]}>
                {t(type.labelKey)}
              </Text>
              <Text style={styles.scheduleDesc}>{t(type.descriptionKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Duration & Limit */}
        <View style={styles.settingsStack}>
          <View>
            <Text style={styles.label}>{t('feed.createPost.course.duration')}</Text>
            <View style={styles.chipWrap}>
              {DURATION_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w}
                  onPress={() => { Haptics.selectionAsync(); setDuration(w); }}
                  style={[styles.miniChip, duration === w && styles.miniChipSelected]}
                >
                  <Text style={[styles.miniChipText, duration === w && styles.miniChipTextSelected]}>
                    {t('feed.createPost.course.weekShort', { count: w })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>{t('feed.createPost.course.enrollmentLimit')}</Text>
            <View style={styles.chipWrap}>
              {ENROLLMENT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={String(opt.value)}
                  onPress={() => { Haptics.selectionAsync(); setEnrollmentLimit(opt.value); }}
                  style={[styles.miniChip, enrollmentLimit === opt.value && styles.miniChipSelected]}
                >
                  <Text style={[styles.miniChipText, enrollmentLimit === opt.value && styles.miniChipTextSelected]}>
                    {opt.labelKey ? t(opt.labelKey) : opt.label}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="book" size={20} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.cardTitle}>{t('feed.createPost.course.syllabus')}</Text>
              <Text style={styles.cardSubtitle}>
                {t('feed.createPost.course.sectionsAdded', { count: syllabusSections.length })}
              </Text>
            </View>
          </View>
          <AIGenerateButton
            label={t('feed.createPost.course.outline')}
            size="small"
            type="ghost"
            onPress={() => setIsAiModalVisible(true)}
          />
        </View>

        <View style={styles.sectionsList}>
          {syllabusSections.map((section, index) => (
            <Animated.View
              key={section.id}
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
                    {section.title || t('feed.createPost.course.sectionLabel', { number: index + 1 })}
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
                    color={colors.textTertiary}
                  />
                </View>
              </TouchableOpacity>

              {expandedSectionId === section.id && (
                <View style={styles.sectionContent}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('feed.createPost.course.sectionTitlePlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={section.title}
                    onChangeText={(text) => updateSection(section.id, 'title', text)}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={t('feed.createPost.course.sectionDescriptionPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
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
            <Text style={styles.addButtonText}>{t('feed.createPost.course.addSection')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Prerequisites Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="shield-checkmark" size={20} color="#0EA5E9" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('feed.createPost.course.prerequisites')}</Text>
            <Text style={styles.cardSubtitle}>{t('feed.createPost.course.requirementsToJoin')}</Text>
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.mainInput}
            placeholder={prerequisites.length < 5 ? t('feed.createPost.course.addPrerequisite') : t('feed.createPost.course.maxReached')}
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

      {/* AI Modals */}
      <AIPromptModal
        visible={isAiModalVisible}
        onClose={() => setIsAiModalVisible(false)}
        onGenerate={handleGenerateAI}
        type="course"
        title={t('feed.createPost.course.generateOutline')}
      />

      <AIResultPreview
        visible={!!aiPreviewData}
        content={!!(aiPreviewData?.sections && Array.isArray(aiPreviewData.sections)) ? `${t('feed.createPost.course.generatedSections', { count: aiPreviewData.sections.length })}\n\n${aiPreviewData.sections.map((s: any, i: number) => `${t('feed.createPost.course.weekLabel', { week: i + 1 })}: ${s.title}`).join('\n')}` : ''}
        title={t('feed.createPost.course.generatedTitle')}
        onAccept={handleAcceptAI}
        onRegenerate={() => !!lastPrompt && handleGenerateAI(lastPrompt)}
        onDiscard={() => setAiPreviewData(null)}
        isRegenerating={isAiLoading}
      />

      <AILoadingOverlay
        isVisible={!!(isAiLoading && !aiPreviewData)}
        message={t('feed.createPost.course.generating')}
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleIconSelected: {
    backgroundColor: '#10B981',
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  scheduleLabelSelected: {
    color: isDark ? '#34D399' : '#064E3B',
  },
  scheduleDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  // Row Settings
  settingsStack: {
    gap: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  miniChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  miniChipTextSelected: {
    color: '#FFF',
  },
  // Sections
  sectionsList: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionCardExpanded: {
    backgroundColor: colors.card,
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
    color: colors.text,
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
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
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
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 6,
  },
  mainInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: colors.text,
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
    backgroundColor: colors.border,
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
