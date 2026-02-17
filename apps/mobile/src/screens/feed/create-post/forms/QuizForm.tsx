/**
 * Quiz Form Component - Clean Modern Redesign
 * Minimal, spacious UI for quiz creation
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { QuizQuestionInput, QuizQuestion, QuestionType } from '../components/QuizQuestionInput';

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

  useEffect(() => {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    onDataChange({
      questions,
      timeLimit,
      passingScore,
      totalPoints,
      resultsVisibility: initialData?.resultsVisibility || 'AFTER_SUBMISSION'
    });
  }, [questions, timeLimit, passingScore]);

  const addQuestion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuestions([...questions, {
      id: Date.now().toString(),
      text: '',
      type: 'MULTIPLE_CHOICE',
      options: ['', ''],
      correctAnswer: '0',
      points: 1,
    }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <View style={styles.container}>
      {/* Settings Card - Clean Design */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.settingsCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="settings-outline" size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Quiz Settings</Text>
        </View>

        {/* Time Limit */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Time Limit</Text>
            <Text style={styles.settingValue}>
              {timeLimit ? `${timeLimit} min` : 'No limit'}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {TIME_LIMITS.map((option) => (
              <TouchableOpacity
                key={option.label}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTimeLimit(option.value);
                }}
                style={[
                  styles.chip,
                  timeLimit === option.value && styles.chipSelected
                ]}
              >
                <Text style={[
                  styles.chipText,
                  timeLimit === option.value && styles.chipTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Passing Score */}
        <View style={[styles.settingRow, { marginBottom: 0 }]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Passing Score</Text>
            <Text style={styles.settingValue}>{passingScore}%</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {PASSING_SCORES.map((score) => (
              <TouchableOpacity
                key={score}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPassingScore(score);
                }}
                style={[
                  styles.chip,
                  passingScore === score && styles.chipSelected
                ]}
              >
                <Text style={[
                  styles.chipText,
                  passingScore === score && styles.chipTextSelected
                ]}>
                  {score}%
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Questions Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.questionsCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="help-circle-outline" size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Questions</Text>
          <View style={styles.headerStats}>
            <View style={styles.statBadge}>
              <Text style={styles.statText}>{questions.length}</Text>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="trophy" size={12} color="#F59E0B" />
              <Text style={styles.statText}>{totalPoints}</Text>
            </View>
          </View>
        </View>

        {/* Questions List */}
        {questions.map((question, index) => (
          <Animated.View
            key={question.id}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify()}
          >
            <QuizQuestionInput
              question={question}
              index={index}
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onRemove={() => removeQuestion(question.id)}
              canRemove={questions.length > 1}
            />
          </Animated.View>
        ))}

        {/* Add Question Button */}
        <TouchableOpacity onPress={addQuestion} style={styles.addButton}>
          <Ionicons name="add-circle" size={22} color="#6366F1" />
          <Text style={styles.addButtonText}>Add Question</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Questions</Text>
          <Text style={styles.summaryValue}>{questions.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Points</Text>
          <Text style={styles.summaryValue}>{totalPoints}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Time</Text>
          <Text style={styles.summaryValue}>
            {timeLimit ? `${timeLimit}m` : '∞'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pass</Text>
          <Text style={styles.summaryValue}>{passingScore}%</Text>
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

  // Settings Card
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Questions Card
  questionsCard: {
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
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
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
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
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
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
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

  // Stats
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
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
    marginTop: 20,
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
