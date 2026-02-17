/**
 * Quiz Question Input Component - CLEAN MODERN REDESIGN
 * Minimal, spacious UI without heavy cards
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'ORDERING' | 'MATCHING';

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
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: string; desc: string }[] = [
  { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: 'list-circle-outline', desc: 'Choose one answer' },
  { type: 'TRUE_FALSE', label: 'True / False', icon: 'toggle-outline', desc: 'Yes or no question' },
  { type: 'SHORT_ANSWER', label: 'Short Answer', icon: 'text-outline', desc: 'Type an answer' },
  { type: 'FILL_IN_BLANK', label: 'Fill in Blank', icon: 'create-outline', desc: 'Complete sentence' },
  { type: 'ORDERING', label: 'Ordering', icon: 'reorder-four-outline', desc: 'Arrange items' },
  { type: 'MATCHING', label: 'Matching', icon: 'git-merge-outline', desc: 'Pair items' },
];

const POINTS_OPTIONS = [1, 2, 3, 5, 10];

export function QuizQuestionInput({
  question,
  index,
  onUpdate,
  onRemove,
  canRemove,
  isExpanded,
  onToggleExpand,
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
          <Text style={styles.sectionLabel}>Correct Answer</Text>
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
                size={24}
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
                size={24}
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
          <Text style={styles.sectionLabel}>Correct Answer (Optional)</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Enter the correct answer"
            placeholderTextColor="#9CA3AF"
            value={question.correctAnswer}
            onChangeText={(text) => onUpdate({ correctAnswer: text })}
          />
          <Text style={styles.helperText}>
            Leave blank if you want to grade manually.
          </Text>
        </View>
      );
    }

    if (question.type === 'FILL_IN_BLANK') {
      return (
        <View style={styles.answerSection}>
          <Text style={styles.sectionLabel}>Correct Words</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Exact word(s) missing"
            placeholderTextColor="#9CA3AF"
            value={question.correctAnswer}
            onChangeText={(text) => onUpdate({ correctAnswer: text })}
          />
          <Text style={styles.helperText}>
            Student must type this exact text to get points.
          </Text>
        </View>
      );
    }

    if (question.type === 'ORDERING') {
      return (
        <View style={styles.answerSection}>
          <Text style={styles.sectionLabel}>Correct Order (Top to Bottom)</Text>
          {question.options.map((opt, idx) => (
            <View key={idx} style={styles.optionRow}>
              <View style={styles.optionNumber}>
                <Text style={styles.optionNumberText}>{idx + 1}</Text>
              </View>
              <TextInput
                style={styles.optionInput}
                placeholder={`Item ${idx + 1}`}
                placeholderTextColor="#D1D5DB"
                value={opt}
                onChangeText={(text) => updateOption(idx, text)}
              />
              {question.options.length > 2 && (
                <TouchableOpacity onPress={() => removeOption(idx)} style={styles.removeOptionBtn}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {question.options.length < 6 && (
            <TouchableOpacity onPress={addOption} style={styles.addOptionBtn}>
              <Ionicons name="add" size={18} color="#6366F1" />
              <Text style={styles.addOptionText}>Add Item</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (question.type === 'MATCHING') {
      return (
        <View style={styles.answerSection}>
          <Text style={styles.sectionLabel}>Matching Pairs (Left : Right)</Text>
          {question.options.map((opt, idx) => {
            const parts = opt.split(':::');
            const left = parts[0] || '';
            const right = parts[1] || '';

            return (
              <View key={idx} style={styles.matchRow}>
                <TextInput
                  style={[styles.matchInput, { flex: 1 }]}
                  placeholder="Term"
                  placeholderTextColor="#D1D5DB"
                  value={left}
                  onChangeText={(t) => {
                    const newOpt = `${t}:::${right}`;
                    updateOption(idx, newOpt);
                  }}
                />
                <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                <TextInput
                  style={[styles.matchInput, { flex: 1.5 }]}
                  placeholder="Definition"
                  placeholderTextColor="#D1D5DB"
                  value={right}
                  onChangeText={(t) => {
                    const newOpt = `${left}:::${t}`;
                    updateOption(idx, newOpt);
                  }}
                />
                {question.options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(idx)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          {question.options.length < 6 && (
            <TouchableOpacity onPress={() => onUpdate({ options: [...question.options, ':::'] })} style={styles.addOptionBtn}>
              <Ionicons name="add" size={18} color="#6366F1" />
              <Text style={styles.addOptionText}>Add Pair</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Default: Multiple Choice
    return (
      <View style={styles.answerSection}>
        <Text style={styles.sectionLabel}>Options</Text>
        {question.options.map((option, idx) => (
          <View key={idx} style={styles.optionRow}>
            <TouchableOpacity
              style={[
                styles.checkCircle,
                String(idx) === question.correctAnswer && styles.checkCircleSelected,
              ]}
              onPress={() => onUpdate({ correctAnswer: String(idx) })}
            >
              {String(idx) === question.correctAnswer && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.optionInput}
              placeholder={`Option ${idx + 1}`}
              placeholderTextColor="#D1D5DB"
              value={option}
              onChangeText={(text) => updateOption(idx, text)}
            />

            {question.options.length > 2 && (
              <TouchableOpacity onPress={() => removeOption(idx)} style={styles.removeOptionBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {question.options.length < 6 && (
          <TouchableOpacity onPress={addOption} style={styles.addOptionBtn}>
            <Ionicons name="add" size={18} color="#6366F1" />
            <Text style={styles.addOptionText}>Add Option</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Header/Summary View
  const renderHeader = () => (
    <TouchableOpacity
      style={[styles.header, isExpanded && styles.headerExpanded]}
      onPress={onToggleExpand}
      activeOpacity={0.9}
    >
      <View style={styles.headerLeft}>
        <View style={styles.dragHandle}>
          <Ionicons name="drag" size={20} color="#D1D5DB" />
        </View>
        <View style={styles.questionNumberContainer}>
          <Text style={styles.questionNumber}>Q{index + 1}</Text>
        </View>
        <View style={styles.questionSummary}>
          <Text style={styles.questionSummaryType}>
            {QUESTION_TYPES.find(t => t.type === question.type)?.label}
          </Text>
          {question.text ? (
            <Text style={styles.questionSummaryText} numberOfLines={1}>
              {question.text}
            </Text>
          ) : (
            <Text style={[styles.questionSummaryText, styles.placeholderText]} numberOfLines={1}>
              Tap to edit question...
            </Text>
          )}
        </View>
      </View>

      <View style={styles.headerRight}>
        {!isExpanded && (
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
          </View>
        )}
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Animated.View layout={Layout.springify()} style={[styles.card, isExpanded && styles.cardExpanded]}>
      {renderHeader()}

      {isExpanded && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.content}>
          {/* Question Text */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.questionInput}
              placeholder="Enter your question here..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={question.text}
              onChangeText={(text) => onUpdate({ text })}
            />
          </View>

          {/* Type Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>Question Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScroll}>
              {QUESTION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.type}
                  style={[
                    styles.typeChip,
                    question.type === type.type && styles.typeChipSelected
                  ]}
                  onPress={() => {
                    // Reset options when changing type
                    let newOptions = ['', ''];
                    let newCorrect = '0';
                    if (type.type === 'TRUE_FALSE') newCorrect = 'true';
                    if (type.type === 'SHORT_ANSWER' || type.type === 'FILL_IN_BLANK') {
                      newOptions = [];
                      newCorrect = '';
                    }
                    if (type.type === 'MATCHING') newOptions = [':::'];

                    Haptics.selectionAsync();
                    onUpdate({
                      type: type.type,
                      options: newOptions,
                      correctAnswer: newCorrect
                    });
                  }}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={16}
                    color={question.type === type.type ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text style={[
                    styles.typeChipText,
                    question.type === type.type && styles.typeChipTextSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Points Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>Points</Text>
            <View style={styles.pointsRow}>
              {POINTS_OPTIONS.map((points) => (
                <TouchableOpacity
                  key={points}
                  style={[
                    styles.pointChip,
                    question.points === points && styles.pointChipSelected
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onUpdate({ points });
                  }}
                >
                  <Text style={[
                    styles.pointChipText,
                    question.points === points && styles.pointChipTextSelected
                  ]}>{points}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dynamic Options */}
          {renderOptions()}

          {/* Footer Actions */}
          <View style={styles.footer}>
            {canRemove && (
              <TouchableOpacity onPress={onRemove} style={styles.deleteButton}>
                <Ionicons name="trash" size={18} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Delete Question</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: '#C7D2FE',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  headerExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dragHandle: {
    width: 20,
    alignItems: 'center',
  },
  questionNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
  questionSummary: {
    flex: 1,
  },
  questionSummaryType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionSummaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointsBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionInput: {
    fontSize: 16,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeScroll: {
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
  pointsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pointChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pointChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  pointChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  pointChipTextSelected: {
    color: '#6366F1',
    fontWeight: '700',
  },
  // Answer Sections
  answerSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkCircleSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  removeOptionBtn: {
    padding: 8,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    borderStyle: 'dashed',
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  // TF Styles
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
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
    fontWeight: '600',
    color: '#374151',
  },
  tfTextSelected: {
    color: '#FFFFFF',
  },
  // Input Field
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  // Ordering/Matching Specific
  optionNumber: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  matchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  // Footer
  footer: {
    marginTop: 20,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
