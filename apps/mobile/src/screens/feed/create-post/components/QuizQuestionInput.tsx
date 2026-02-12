/**
 * Quiz Question Input Component - CLEAN MODERN REDESIGN
 * Minimal, spacious UI without heavy cards
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

console.log('✅ QuizQuestionInput LOADED - Clean Modern Redesign');

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

const QUESTION_TYPES: { type: QuestionType; label: string; icon: string; desc: string }[] = [
  { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: 'list-circle-outline', desc: 'Choose one answer' },
  { type: 'TRUE_FALSE', label: 'True / False', icon: 'toggle-outline', desc: 'Yes or no question' },
  { type: 'SHORT_ANSWER', label: 'Short Answer', icon: 'text-outline', desc: 'Type an answer' },
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
        <View style={styles.answerSection}>
          <Text style={styles.answerLabel}>Correct Answer</Text>
          <View style={styles.tfContainer}>
            <TouchableOpacity
              style={[
                styles.tfButton,
                question.correctAnswer === 'true' && styles.tfButtonTrue,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ correctAnswer: 'true' });
              }}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={28} 
                color={question.correctAnswer === 'true' ? '#FFFFFF' : '#10B981'} 
              />
              <Text style={[
                styles.tfText,
                question.correctAnswer === 'true' && styles.tfTextSelected
              ]}>
                True
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tfButton,
                question.correctAnswer === 'false' && styles.tfButtonFalse,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ correctAnswer: 'false' });
              }}
            >
              <Ionicons 
                name="close-circle" 
                size={28} 
                color={question.correctAnswer === 'false' ? '#FFFFFF' : '#EF4444'} 
              />
              <Text style={[
                styles.tfText,
                question.correctAnswer === 'false' && styles.tfTextSelected
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
        <View style={styles.answerSection}>
          <View style={styles.infoNote}>
            <Ionicons name="pencil" size={18} color="#6366F1" />
            <Text style={styles.infoNoteText}>Students will type their answer</Text>
          </View>
        </View>
      );
    }

    // Multiple Choice
    return (
      <View style={styles.answerSection}>
        <Text style={styles.answerLabel}>Answer Choices</Text>
        {question.options.map((option, optionIndex) => (
          <Animated.View
            key={optionIndex}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            layout={Layout.springify()}
            style={styles.choiceRow}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ correctAnswer: optionIndex.toString() });
              }}
              style={styles.choiceCheck}
            >
              <Ionicons
                name={question.correctAnswer === optionIndex.toString() 
                  ? 'checkmark-circle' 
                  : 'ellipse-outline'
                }
                size={26}
                color={question.correctAnswer === optionIndex.toString() ? '#10B981' : '#D1D5DB'}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.choiceInput}
              placeholder={`Choice ${optionIndex + 1}`}
              placeholderTextColor="#9CA3AF"
              value={option}
              onChangeText={(text) => updateOption(optionIndex, text)}
            />

            {question.options.length > 2 && (
              <TouchableOpacity
                onPress={() => removeOption(optionIndex)}
                style={styles.choiceDelete}
              >
                <Ionicons name="close-circle" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </Animated.View>
        ))}

        {question.options.length < 6 && (
          <TouchableOpacity onPress={addOption} style={styles.addChoice}>
            <Ionicons name="add" size={20} color="#6366F1" />
            <Text style={styles.addChoiceText}>Add choice</Text>
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
      {/* Question Header - Simple & Clean */}
      <View style={styles.header}>
        <View style={styles.questionBadge}>
          <Text style={styles.questionBadgeText}>Q{index + 1}</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.questionLabel}>Question {index + 1}</Text>
          <View style={styles.pointsDisplay}>
            <Ionicons name="trophy" size={14} color="#F59E0B" />
            <Text style={styles.pointsText}>{question.points} points</Text>
          </View>
        </View>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Question Type Selector - Horizontal Pills */}
      <View style={styles.typeSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeScroll}
        >
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
                styles.typePill,
                question.type === type.type && styles.typePillSelected
              ]}
            >
              <Ionicons
                name={type.icon as any}
                size={20}
                color={question.type === type.type ? '#FFFFFF' : '#6366F1'}
              />
              <Text style={[
                styles.typePillText,
                question.type === type.type && styles.typePillTextSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Question Input */}
      <View style={styles.inputSection}>
        <TextInput
          style={styles.questionInput}
          placeholder="Type your question here..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={question.text}
          onChangeText={(text) => onUpdate({ text })}
        />
      </View>

      {/* Options/Answers Section */}
      {renderOptions()}

      {/* Points Selector - Bottom Bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.bottomLabel}>Worth:</Text>
        <View style={styles.pointsRow}>
          {POINTS_OPTIONS.map((pts) => (
            <TouchableOpacity
              key={pts}
              onPress={() => {
                Haptics.selectionAsync();
                onUpdate({ points: pts });
              }}
              style={[
                styles.pointChip,
                question.points === pts && styles.pointChipSelected
              ]}
            >
              <Text style={[
                styles.pointChipText,
                question.points === pts && styles.pointChipTextSelected
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
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  // Header - Clean & Simple
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  questionBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionBadgeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerContent: {
    flex: 1,
  },
  questionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pointsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Type Selector - Horizontal Pills
  typeSection: {
    marginBottom: 20,
  },
  typeScroll: {
    gap: 10,
    paddingRight: 16,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  typePillSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  typePillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  typePillTextSelected: {
    color: '#FFFFFF',
  },

  // Question Input
  inputSection: {
    marginBottom: 20,
  },
  questionInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    lineHeight: 22,
  },

  // Answer Section
  answerSection: {
    marginBottom: 20,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },

  // True/False Buttons
  tfContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  tfButtonTrue: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tfButtonFalse: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  tfText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  tfTextSelected: {
    color: '#FFFFFF',
  },

  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  infoNoteText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },

  // Multiple Choice
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  choiceCheck: {
    padding: 4,
  },
  choiceInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choiceDelete: {
    padding: 4,
  },
  addChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addChoiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Bottom Bar - Points
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bottomLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pointsRow: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  pointChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    minWidth: 44,
    alignItems: 'center',
  },
  pointChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  pointChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  pointChipTextSelected: {
    color: '#FFFFFF',
  },
});
