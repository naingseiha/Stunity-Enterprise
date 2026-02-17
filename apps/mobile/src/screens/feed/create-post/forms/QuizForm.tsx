/**
 * Quiz Form Component - Clean Modern Redesign
 * Minimal, spacious UI for quiz creation
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, TextInput, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { QuizQuestionInput, QuizQuestion, QuestionType } from '../components/QuizQuestionInput';

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
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

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
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="settings-outline" size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Quiz Settings</Text>
              <Text style={styles.cardSubtitle}>
                {totalPoints} Total Points • {timeLimit ? `${timeLimit} min` : 'No Limit'}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isSettingsExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>

        {isSettingsExpanded && (
          <View style={styles.cardContent}>
            {/* Time Limit */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="timer-outline" size={18} color="#6B7280" />
                <Text style={styles.settingLabel}>Time Limit</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capsuleScroll}>
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
              </ScrollView>
            </View>

            {/* Passing Score */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="trophy-outline" size={18} color="#6B7280" />
                <Text style={styles.settingLabel}>Passing Score (%)</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capsuleScroll}>
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
              </ScrollView>
            </View>

            {/* Max Attempts */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="repeat-outline" size={18} color="#6B7280" />
                <Text style={styles.settingLabel}>Max Attempts</Text>
              </View>
              <View style={styles.togglesContainer}>
                {[null, 1, 2, 3].map((val) => (
                  <TouchableOpacity
                    key={String(val)}
                    style={[
                      styles.capsule,
                      maxAttempts === val && styles.capsuleSelected
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setMaxAttempts(val); }}
                  >
                    <Text style={[
                      styles.capsuleText,
                      maxAttempts === val && styles.capsuleTextSelected
                    ]}>{val === null ? 'Unlimited' : val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Toggles */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>Shuffle Questions</Text>
                <Text style={styles.switchSubLabel}>Randomize order for each attempt</Text>
              </View>
              <Switch
                value={shuffleQuestions}
                onValueChange={(v) => { Haptics.selectionAsync(); setShuffleQuestions(v); }}
                trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                thumbColor={shuffleQuestions ? '#4F46E5' : '#F9FAFB'}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>Show Review</Text>
                <Text style={styles.switchSubLabel}>Allow reviewing answers after submission</Text>
              </View>
              <Switch
                value={showReview}
                onValueChange={(v) => { Haptics.selectionAsync(); setShowReview(v); }}
                trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                thumbColor={showReview ? '#4F46E5' : '#F9FAFB'}
              />
            </View>

          </View>
        )}
      </View>

      {/* Questions Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
        <TouchableOpacity onPress={addQuestion} style={styles.addButtonSmall}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonSmallText}>Add New</Text>
        </TouchableOpacity>
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
            <Ionicons name="add" size={24} color="#4F46E5" />
          </View>
          <Text style={styles.addCardText}>Add Question</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardHeaderExpanded: {
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  cardContent: {
    padding: 16,
  },
  // Settings Sections
  settingRow: {
    marginBottom: 20,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  capsuleScroll: {
    gap: 8,
  },
  capsule: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  capsuleSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  capsuleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  capsuleTextSelected: {
    color: '#4F46E5',
  },
  togglesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  switchLabelContainer: {
    flex: 1,
    paddingRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  addButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  questionsList: {
    gap: 0,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 12,
  },
  addCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
