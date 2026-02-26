/**
 * Quiz Form Component - COLORFUL & BEAUTIFUL REDESIGN
 * Top-level configuration for the quiz
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { QuizQuestionInput, QuizQuestion, QuestionType } from '../components/QuizQuestionInput';
import { AIGenerateButton } from '@/components/ai/AIGenerateButton';
import { AIPromptModal } from '@/components/ai/AIPromptModal';
import { AILoadingOverlay } from '@/components/ai/AILoadingOverlay';
import { AIResultPreview } from '@/components/ai/AIResultPreview';
import type { AIPromptData } from '@/components/ai/AIPromptModal';
import { aiService } from '@/services/ai.service';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface QuizFormProps {
  onDataChange: (data: QuizData) => void;
  initialData?: QuizData;
}

export interface QuizData {
  title?: string;
  questions: QuizQuestion[];
  timeLimit: number | null;
  passingScore: number;
  totalPoints: number;
  resultsVisibility: 'IMMEDIATE' | 'AFTER_SUBMISSION' | 'MANUAL';
  shuffleQuestions?: boolean;
  maxAttempts?: number | null;
  showReview?: boolean;
}

const TIME_LIMITS = [
  { label: 'No limit', value: null },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
];

const PASSING_SCORES = [50, 60, 70, 75, 80, 85, 90];

export function QuizForm({ onDataChange, initialData }: QuizFormProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialData?.questions || [
    {
      id: Date.now().toString(),
      text: '',
      type: 'MULTIPLE_CHOICE' as QuestionType,
      options: ['', ''],
      correctAnswer: '0',
      points: 1,
    },
  ]);
  const [timeLimit, setTimeLimit] = useState<number | null>(initialData?.timeLimit ?? null);
  const [passingScore, setPassingScore] = useState(initialData?.passingScore ?? 70);
  const [shuffleQuestions, setShuffleQuestions] = useState(initialData?.shuffleQuestions ?? false);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(initialData?.maxAttempts ?? null);
  const [showReview, setShowReview] = useState(initialData?.showReview ?? true);

  // UI State
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    initialData?.questions?.[0]?.id || questions[0]?.id || null
  );
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

  // AI State
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<any[] | null>(null);
  const [lastPrompt, setLastPrompt] = useState<AIPromptData | null>(null);

  const handleGenerateAI = async (data: AIPromptData) => {
    setLastPrompt(data);
    setIsAiLoading(true);
    try {
      const result = await aiService.generateQuiz(data.topic, data.gradeLevel, data.count, data.difficulty);
      setAiPreviewData(result || null);
    } catch (error: any) {
      alert(error.message || 'Failed to generate quiz');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAI = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (aiPreviewData && Array.isArray(aiPreviewData)) {
      setQuestions(aiPreviewData);
      setExpandedQuestionId(aiPreviewData[0]?.id || null);
    }
    setAiPreviewData(null);
  };

  useEffect(() => {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    onDataChange({
      questions,
      timeLimit,
      passingScore,
      totalPoints,
      resultsVisibility: initialData?.resultsVisibility || 'AFTER_SUBMISSION',
      shuffleQuestions,
      maxAttempts,
      showReview,
    });
  }, [questions, timeLimit, passingScore, shuffleQuestions, maxAttempts, showReview]);

  const addQuestion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newId = Date.now().toString();
    setQuestions([...questions, {
      id: newId,
      text: '',
      type: 'MULTIPLE_CHOICE',
      options: ['', ''],
      correctAnswer: '0',
      points: 1,
    }]);
    // Auto expand new question
    setTimeout(() => {
      setExpandedQuestionId(newId);
    }, 100);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setQuestions(questions.filter((q) => q.id !== id));
      if (expandedQuestionId === id) {
        setExpandedQuestionId(null);
      }
    }
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const toggleSettings = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSettingsExpanded(!isSettingsExpanded);
  };

  const toggleQuestionExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedQuestionId(expandedQuestionId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      {/* Settings Card - Collapsible */}
      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.cardHeader, isSettingsExpanded && styles.cardHeaderExpanded]}
          onPress={toggleSettings}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#F8FAFC' }]}>
              <Ionicons name="settings" size={24} color="#0EA5E9" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Quiz Configuration</Text>
              <Text style={styles.cardSubtitle}>
                {totalPoints} Points • {questions.length} Questions
              </Text>
            </View>
          </View>
          <View style={[styles.expandIcon, isSettingsExpanded && styles.expandIconRotated]}>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {isSettingsExpanded && (
          <View style={styles.cardContent}>
            {/* Time Limit */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionLabel}>Time Limit</Text>
              <View style={styles.optionWrap}>
                {TIME_LIMITS.map((opt) => (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[
                      styles.capsule,
                      timeLimit === opt.value && styles.capsuleSelected
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setTimeLimit(opt.value); }}
                  >
                    <Text style={[
                      styles.capsuleText,
                      timeLimit === opt.value && styles.capsuleTextSelected
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Passing Score */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionLabel}>Passing Score (%)</Text>
              <View style={styles.optionWrap}>
                {PASSING_SCORES.map((score) => (
                  <TouchableOpacity
                    key={score}
                    style={[
                      styles.capsule,
                      passingScore === score && styles.capsuleSelected
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setPassingScore(score); }}
                  >
                    <Text style={[
                      styles.capsuleText,
                      passingScore === score && styles.capsuleTextSelected
                    ]}>{score}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Toggles Grid */}
            <View style={styles.toggleList}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleRowLeft}>
                  <View style={[styles.toggleIcon, { backgroundColor: '#F0FDFA' }]}>
                    <Ionicons name="shuffle" size={18} color="#0D9488" />
                  </View>
                  <View>
                    <Text style={styles.toggleLabel}>Shuffle Questions</Text>
                    <Text style={styles.toggleDesc}>Randomize order per user</Text>
                  </View>
                </View>
                <Switch
                  value={shuffleQuestions}
                  onValueChange={(v) => { Haptics.selectionAsync(); setShuffleQuestions(v); }}
                  trackColor={{ false: '#E5E7EB', true: '#5EEAD4' }}
                  thumbColor={shuffleQuestions ? '#0F766E' : '#FFFFFF'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>

              <View style={styles.toggleDivider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleRowLeft}>
                  <View style={[styles.toggleIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="eye" size={18} color="#EA580C" />
                  </View>
                  <View>
                    <Text style={styles.toggleLabel}>Allow Review</Text>
                    <Text style={styles.toggleDesc}>Show answers after quiz</Text>
                  </View>
                </View>
                <Switch
                  value={showReview}
                  onValueChange={(v) => { Haptics.selectionAsync(); setShowReview(v); }}
                  trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
                  thumbColor={showReview ? '#C2410C' : '#FFFFFF'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>
            </View>

          </View>
        )}
      </View>

      {/* Questions Header */}
      <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.sectionTitle}>Questions</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{questions.length} Items</Text>
          </View>
        </View>
        <AIGenerateButton
          label="AI Generate"
          size="small"
          onPress={() => setIsAiModalVisible(true)}
        />
      </View>

      {/* Question List */}
      <View style={styles.questionsList}>
        {questions.map((question, index) => (
          <QuizQuestionInput
            key={question.id}
            question={question}
            index={index}
            onUpdate={(updates) => updateQuestion(question.id, updates)}
            onRemove={() => removeQuestion(question.id)}
            canRemove={questions.length > 1}
            isExpanded={expandedQuestionId === question.id}
            onToggleExpand={() => toggleQuestionExpand(question.id)}
          />
        ))}

        <TouchableOpacity style={styles.addCardButton} onPress={addQuestion}>
          <View style={styles.addCardIcon}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.addCardTitle}>Add New Question</Text>
            <Text style={styles.addCardSubtitle}>Tap to create</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* AI Modals */}
      <AIPromptModal
        visible={isAiModalVisible}
        onClose={() => setIsAiModalVisible(false)}
        onGenerate={handleGenerateAI}
        type="quiz"
        title="Generate Quiz with AI"
      />

      <AIResultPreview
        visible={!!aiPreviewData}
        content={!!(aiPreviewData && Array.isArray(aiPreviewData)) ? `Generated ${aiPreviewData.length} questions:\n\n${aiPreviewData.map((q: any, i: number) => `${i + 1}. ${q.text}`).join('\n')}` : ''}
        title="Quiz Generated"
        onAccept={handleAcceptAI}
        onRegenerate={() => !!lastPrompt && handleGenerateAI(lastPrompt)}
        onDiscard={() => setAiPreviewData(null)}
        isRegenerating={isAiLoading}
      />

      <AILoadingOverlay
        isVisible={!!(isAiLoading && !aiPreviewData)}
        message="AI is generating your quiz..."
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 40,
  },
  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
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
  cardContent: {
    padding: 20,
    paddingTop: 8,
  },
  // Settings Sections
  settingSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  capsule: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  capsuleSelected: {
    backgroundColor: '#0EA5E9', // Sky blue
    borderColor: '#0EA5E9',
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
  // Toggles Grid
  toggleList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  toggleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  questionsList: {
    gap: 0,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderStyle: 'dashed',
    marginTop: 12,
    gap: 16,
  },
  addCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0369A1',
  },
  addCardSubtitle: {
    fontSize: 13,
    color: '#0EA5E9',
    fontWeight: '500',
  },
});
