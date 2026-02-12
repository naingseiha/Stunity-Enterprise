/**
 * Quiz Question Input Component - ENTERPRISE REDESIGN V2
 * Clean, professional UI for individual questions
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

console.log('✅ QuizQuestionInput LOADED - Enterprise Redesign V2');

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  points: number;
}

interface QuizQuestionInputProps {
  question: QuizQuestion;
  index: number;
  onUpdate: (updates: Partial<QuizQuestion>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: string }[] = [
  { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: 'list' },
  { type: 'TRUE_FALSE', label: 'True/False', icon: 'help-circle' },
  { type: 'SHORT_ANSWER', label: 'Short Answer', icon: 'create' },
];

const POINTS_OPTIONS = [1, 2, 3, 5, 10];

export function QuizQuestionInput({
  question,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: QuizQuestionInputProps) {
  const addOption = () => {
    if (question.options.length < 6) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpdate({ options: [...question.options, ''] });
    }
  };

  const removeOption = (optionIndex: number) => {
    if (question.options.length > 2) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onUpdate({ options: question.options.filter((_, i) => i !== optionIndex) });
    }
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    onUpdate({ options: newOptions });
  };

  const renderOptions = () => {
    if (question.type === 'TRUE_FALSE') {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Correct Answer</Text>
          <View style={styles.trueFalseButtons}>
            <TouchableOpacity
              style={[
                styles.trueFalseButton,
                question.correctAnswer === 'true' && styles.trueFalseButtonTrue,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ correctAnswer: 'true' });
              }}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={22} 
                color={question.correctAnswer === 'true' ? '#FFFFFF' : '#9CA3AF'} 
              />
              <Text style={[
                styles.trueFalseText,
                question.correctAnswer === 'true' && styles.trueFalseTextTrue
              ]}>
                True
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.trueFalseButton,
                question.correctAnswer === 'false' && styles.trueFalseButtonFalse,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ correctAnswer: 'false' });
              }}
            >
              <Ionicons 
                name="close-circle" 
                size={22} 
                color={question.correctAnswer === 'false' ? '#FFFFFF' : '#9CA3AF'} 
              />
              <Text style={[
                styles.trueFalseText,
                question.correctAnswer === 'false' && styles.trueFalseTextFalse
              ]}>
                False
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (question.type === 'SHORT_ANSWER') {
      return (
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#6366F1" />
            <Text style={styles.infoText}>Students will type their answer in a text field</Text>
          </View>
        </View>
      );
    }

    // Multiple Choice
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Answer Options</Text>
        <Text style={styles.sectionSubtitle}>Tap the circle to mark correct answer</Text>
        {question.options.map((option, optionIndex) => (
          <Animated.View
            key={optionIndex}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            layout={Layout.springify()}
            style={styles.optionRow}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ correctAnswer: optionIndex.toString() });
              }}
              style={styles.radioButton}
            >
              <View style={[
                styles.radio,
                question.correctAnswer === optionIndex.toString() && styles.radioSelected
              ]}>
                {question.correctAnswer === optionIndex.toString() && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </TouchableOpacity>

            <TextInput
              style={styles.optionInput}
              placeholder={`Option ${optionIndex + 1}`}
              placeholderTextColor="#9CA3AF"
              value={option}
              onChangeText={(text) => updateOption(optionIndex, text)}
            />

            {question.options.length > 2 && (
              <TouchableOpacity
                onPress={() => removeOption(optionIndex)}
                style={styles.removeOptionButton}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </Animated.View>
        ))}

        {question.options.length < 6 && (
          <TouchableOpacity onPress={addOption} style={styles.addOptionButton}>
            <Ionicons name="add-circle" size={20} color="#6366F1" />
            <Text style={styles.addOptionText}>Add Another Option</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View 
        entering={FadeIn.duration(300)}
        layout={Layout.springify()}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.questionNumber}>
              <Text style={styles.questionNumberText}>Q{index + 1}</Text>
            </View>
            <Text style={styles.headerTitle}>Question {index + 1}</Text>
          </View>
          {canRemove && (
            <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

      {/* Question Type Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Question Type</Text>
        <View style={styles.typeCards}>
          {QUESTION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.type}
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ 
                  type: type.type,
                  options: type.type === 'MULTIPLE_CHOICE' ? ['', ''] : [],
                  correctAnswer: type.type === 'TRUE_FALSE' ? 'true' : '0',
                });
              }}
              style={[
                styles.typeCard,
                question.type === type.type && styles.typeCardSelected
              ]}
            >
              <View style={[
                styles.typeCardIcon,
                question.type === type.type && styles.typeCardIconSelected
              ]}>
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={question.type === type.type ? '#FFFFFF' : '#6B7280'}
                />
              </View>
              <View style={styles.typeCardContent}>
                <Text style={[
                  styles.typeCardText,
                  question.type === type.type && styles.typeCardTextSelected
                ]}>
                  {type.label}
                </Text>
                <Text style={[
                  styles.typeCardDescription,
                  question.type === type.type && styles.typeCardDescriptionSelected
                ]}>
                  {type.type === 'MULTIPLE_CHOICE' && 'Students select from multiple choices'}
                  {type.type === 'TRUE_FALSE' && 'Simple true or false question'}
                  {type.type === 'SHORT_ANSWER' && 'Students type their own answer'}
                </Text>
              </View>
              {question.type === type.type && (
                <Ionicons name="checkmark-circle" size={26} color="#6366F1" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Question Text */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Question</Text>
        <TextInput
          style={styles.questionInput}
          placeholder="What do you want to ask your students?"
          placeholderTextColor="#9CA3AF"
          multiline
          value={question.text}
          onChangeText={(text) => onUpdate({ text })}
        />
      </View>

      {/* Options/Answers */}
      {renderOptions()}

      {/* Points */}
      <View style={[styles.section, { marginBottom: 0 }]}>
        <Text style={styles.sectionTitle}>Points Value</Text>
        <View style={styles.pointsContainer}>
          {POINTS_OPTIONS.map((pts) => (
            <TouchableOpacity
              key={pts}
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ points: pts });
              }}
              style={[
                styles.pointButton,
                question.points === pts && styles.pointButtonSelected
              ]}
            >
              <Text style={[
                styles.pointButtonText,
                question.points === pts && styles.pointButtonTextSelected
              ]}>
                {pts}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  questionNumber: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  questionNumberText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.4,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  typeCards: {
    gap: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 14,
  },
  typeCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  typeCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardIconSelected: {
    backgroundColor: '#6366F1',
  },
  typeCardContent: {
    flex: 1,
    gap: 4,
  },
  typeCardText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  typeCardTextSelected: {
    color: '#4F46E5',
  },
  typeCardDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: -0.1,
    lineHeight: 17,
  },
  typeCardDescriptionSelected: {
    color: '#6B7280',
  },
  questionInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    lineHeight: 22,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  radioButton: {
    padding: 4,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366F1',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    fontWeight: '500',
  },
  removeOptionButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    marginTop: 6,
    backgroundColor: '#FAFBFF',
  },
  addOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: -0.2,
  },
  trueFalseButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  trueFalseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  trueFalseButtonTrue: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  trueFalseButtonFalse: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  trueFalseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: -0.3,
  },
  trueFalseTextTrue: {
    color: '#FFFFFF',
  },
  trueFalseTextFalse: {
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  infoText: {
    fontSize: 14,
    color: '#4F46E5',
    flex: 1,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  pointsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pointButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
  },
  pointButtonSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  pointButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: -0.3,
  },
  pointButtonTextSelected: {
    color: '#FFFFFF',
  },
});
