/**
 * Quiz Question Input Component - Redesigned
 * Clean, professional UI for individual questions
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
        <View style={styles.trueFalseContainer}>
          <Text style={styles.label}>Correct Answer</Text>
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
                size={20} 
                color={question.correctAnswer === 'true' ? '#10B981' : '#9CA3AF'} 
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
                size={20} 
                color={question.correctAnswer === 'false' ? '#EF4444' : '#9CA3AF'} 
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
        <View style={styles.shortAnswerContainer}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#6366F1" />
            <Text style={styles.infoText}>Students will type their answer</Text>
          </View>
        </View>
      );
    }

    // Multiple Choice
    return (
      <View style={styles.optionsContainer}>
        <Text style={styles.label}>Answer Options</Text>
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
            <Ionicons name="add" size={18} color="#6366F1" />
            <Text style={styles.addOptionText}>Add Option</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      layout={Layout.springify()}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.questionNumber}>
          <Text style={styles.questionNumberText}>Q{index + 1}</Text>
        </View>
        <Text style={styles.headerTitle}>Question {index + 1}</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Question Type Selector */}
      <View style={styles.section}>
        <Text style={styles.label}>Question Type</Text>
        <View style={styles.typeButtons}>
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
                styles.typeButton,
                question.type === type.type && styles.typeButtonSelected
              ]}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={question.type === type.type ? '#6366F1' : '#6B7280'}
              />
              <Text style={[
                styles.typeButtonText,
                question.type === type.type && styles.typeButtonTextSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Question Text */}
      <View style={styles.section}>
        <Text style={styles.label}>Question</Text>
        <TextInput
          style={styles.questionInput}
          placeholder="Enter your question here..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={question.text}
          onChangeText={(text) => onUpdate({ text })}
        />
      </View>

      {/* Options/Answers */}
      {renderOptions()}

      {/* Points */}
      <View style={styles.section}>
        <Text style={styles.label}>Points</Text>
        <View style={styles.pointsButtons}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  typeButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextSelected: {
    color: '#6366F1',
  },
  questionInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  radioButton: {
    padding: 4,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#6366F1',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeOptionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  trueFalseContainer: {
    marginBottom: 16,
  },
  trueFalseButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  trueFalseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  trueFalseButtonTrue: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  trueFalseButtonFalse: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  trueFalseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  trueFalseTextTrue: {
    color: '#10B981',
  },
  trueFalseTextFalse: {
    color: '#EF4444',
  },
  shortAnswerContainer: {
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: {
    fontSize: 14,
    color: '#4F46E5',
    flex: 1,
  },
  pointsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pointButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  pointButtonSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  pointButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  pointButtonTextSelected: {
    color: '#fff',
  },
});
