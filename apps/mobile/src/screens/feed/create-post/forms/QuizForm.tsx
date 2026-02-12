/**
 * Quiz Form Component - Redesigned
 * Beautiful, clean UI for quiz creation
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { QuizQuestionInput, QuizQuestion, QuestionType } from '../components/QuizQuestionInput';

interface QuizFormProps {
  onDataChange: (data: QuizData) => void;
}

export interface QuizData {
  questions: QuizQuestion[];
  timeLimit: number | null;
  passingScore: number;
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

export function QuizForm({ onDataChange }: QuizFormProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: Date.now().toString(),
      text: '',
      type: 'MULTIPLE_CHOICE' as QuestionType,
      options: ['', ''],
      correctAnswer: '0',
      points: 1,
    },
  ]);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [passingScore, setPassingScore] = useState(70);

  useEffect(() => {
    onDataChange({ 
      questions, 
      timeLimit, 
      passingScore, 
      resultsVisibility: 'AFTER_SUBMISSION' 
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
      {/* Settings Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="settings-outline" size={18} color="#6366F1" />
          </View>
          <Text style={styles.cardTitle}>Quiz Settings</Text>
        </View>
        
        {/* Time Limit */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>⏱️ Time Limit</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
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
        <View style={styles.settingGroup}>
          <View style={styles.settingHeader}>
            <Text style={styles.settingLabel}>🎯 Passing Score</Text>
            <Text style={styles.settingValue}>{passingScore}%</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
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

      {/* Questions Section */}
      <Animated.View entering={FadeIn.duration(300).delay(100)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="help-circle-outline" size={18} color="#6366F1" />
          </View>
          <Text style={styles.cardTitle}>Questions</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{questions.length}</Text>
          </View>
          <View style={[styles.badge, { marginLeft: 4 }]}>
            <Text style={styles.badgeText}>{totalPoints} pts</Text>
          </View>
        </View>

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

        <TouchableOpacity onPress={addQuestion} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
          <Text style={styles.addButtonText}>Add Question</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Summary Card */}
      <Animated.View entering={FadeIn.duration(300).delay(200)} style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryTitle}>Quiz Summary</Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Questions</Text>
            <Text style={styles.summaryValue}>{questions.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Points</Text>
            <Text style={styles.summaryValue}>{totalPoints}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Time Limit</Text>
            <Text style={styles.summaryValue}>
              {timeLimit ? `${timeLimit} min` : 'No limit'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pass Score</Text>
            <Text style={styles.summaryValue}>{passingScore}%</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 0,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F1FF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
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
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: -0.2,
  },
  settingGroup: {
    marginBottom: 28,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  settingValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6366F1',
  },
  chipsContainer: {
    gap: 12,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    borderWidth: 2.5,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    marginTop: 20,
    marginHorizontal: 0,
    backgroundColor: '#FAFBFF',
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: -0.3,
  },
  summaryCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#6366F1',
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
    backgroundColor: '#E0E7FF',
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
