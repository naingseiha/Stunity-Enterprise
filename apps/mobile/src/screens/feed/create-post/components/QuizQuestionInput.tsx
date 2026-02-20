/**
 * Quiz Question Input Component - COLORFUL & BEAUTIFUL REDESIGN
 * Distinct visual identity for each question type
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

const QUESTION_CONFIG: Record<QuestionType, { label: string; icon: string; desc: string; color: string; bg: string }> = {
  MULTIPLE_CHOICE: {
    label: 'Multiple Choice',
    icon: 'list-circle',
    desc: 'Choose one correct answer',
    color: '#4F46E5', // Indigo
    bg: '#EEF2FF'
  },
  TRUE_FALSE: {
    label: 'True / False',
    icon: 'toggle',
    desc: 'Simple yes or no question',
    color: '#059669', // Emerald
    bg: '#ECFDF5'
  },
  SHORT_ANSWER: {
    label: 'Short Answer',
    icon: 'text',
    desc: 'Student types a response',
    color: '#0284C7', // Amber
    bg: '#F0F9FF'
  },
  FILL_IN_BLANK: {
    label: 'Fill in Blank',
    icon: 'create',
    desc: 'Complete the sentence',
    color: '#0891B2', // Cyan
    bg: '#ECFEFF'
  },
  ORDERING: {
    label: 'Ordering',
    icon: 'reorder-four',
    desc: 'Arrange items in order',
    color: '#E11D48', // Rose
    bg: '#FFF1F2'
  },
  MATCHING: {
    label: 'Matching',
    icon: 'git-merge',
    desc: 'Pair related items',
    color: '#9333EA', // Purple
    bg: '#F3E8FF'
  },
};

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

  const theme = QUESTION_CONFIG[question.type];

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
        <View style={[styles.answerSection, { borderColor: theme.bg }]}>
          <Text style={[styles.sectionLabel, { color: theme.color }]}>Correct Answer</Text>
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
        <View style={[styles.answerSection, { borderColor: theme.bg }]}>
          <Text style={[styles.sectionLabel, { color: theme.color }]}>Correct Answer (Optional)</Text>
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
        <View style={[styles.answerSection, { borderColor: theme.bg }]}>
          <Text style={[styles.sectionLabel, { color: theme.color }]}>Correct Words</Text>
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
        <View style={[styles.answerSection, { borderColor: theme.bg }]}>
          <Text style={[styles.sectionLabel, { color: theme.color }]}>Correct Order (Top to Bottom)</Text>
          {question.options.map((opt, idx) => (
            <View key={idx} style={styles.optionRow}>
              <View style={[styles.optionNumber, { backgroundColor: theme.bg }]}>
                <Text style={[styles.optionNumberText, { color: theme.color }]}>{idx + 1}</Text>
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
            <TouchableOpacity onPress={addOption} style={[styles.addOptionBtn, { borderColor: theme.color }]}>
              <Ionicons name="add" size={18} color={theme.color} />
              <Text style={[styles.addOptionText, { color: theme.color }]}>Add Item</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (question.type === 'MATCHING') {
      return (
        <View style={[styles.answerSection, { borderColor: theme.bg }]}>
          <Text style={[styles.sectionLabel, { color: theme.color }]}>Matching Pairs (Left : Right)</Text>
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
                <Ionicons name="arrow-forward" size={16} color={theme.color} />
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
            <TouchableOpacity onPress={() => onUpdate({ options: [...question.options, ':::'] })} style={[styles.addOptionBtn, { borderColor: theme.color }]}>
              <Ionicons name="add" size={18} color={theme.color} />
              <Text style={[styles.addOptionText, { color: theme.color }]}>Add Pair</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Default: Multiple Choice
    return (
      <View style={[styles.answerSection, { borderColor: theme.bg }]}>
        <Text style={[styles.sectionLabel, { color: theme.color }]}>Answer Options</Text>
        {question.options.map((option, idx) => (
          <View key={idx} style={styles.optionRow}>
            <TouchableOpacity
              style={[
                styles.checkCircle,
                String(idx) === question.correctAnswer && { backgroundColor: theme.color, borderColor: theme.color },
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
          <TouchableOpacity onPress={addOption} style={[styles.addOptionBtn, { borderColor: theme.color }]}>
            <Ionicons name="add" size={18} color={theme.color} />
            <Text style={[styles.addOptionText, { color: theme.color }]}>Add Option</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Header/Summary View
  const renderHeader = () => (
    <TouchableOpacity
      style={[
        styles.header,
        isExpanded && [styles.headerExpanded, { borderBottomColor: theme.bg, backgroundColor: theme.bg }]
      ]}
      onPress={onToggleExpand}
      activeOpacity={0.9}
    >
      <View style={styles.headerLeft}>
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-two" size={20} color={isExpanded ? theme.color : "#D1D5DB"} />
        </View>
        <View style={[styles.questionNumberContainer, { backgroundColor: isExpanded ? '#FFFFFF' : theme.bg }]}>
          <Text style={[styles.questionNumber, { color: theme.color }]}>{index + 1}</Text>
        </View>
        <View style={styles.questionSummary}>
          <Text style={[styles.questionSummaryType, { color: isExpanded ? theme.color : '#6B7280' }]}>
            {theme.label}
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
          <View style={[styles.pointsBadge, { backgroundColor: theme.bg }]}>
            <Text style={[styles.pointsBadgeText, { color: theme.color }]}>{question.points} pts</Text>
          </View>
        )}
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={isExpanded ? theme.color : "#9CA3AF"}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      layout={Layout.springify()}
      style={[
        styles.card,
        isExpanded && [styles.cardExpanded, { borderColor: theme.color, shadowColor: theme.color }]
      ]}
    >
      {renderHeader()}

      {isExpanded && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.content}>
          {/* Question Text */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.questionInput}
              placeholder="What do you want to ask?"
              placeholderTextColor="#9CA3AF"
              multiline
              value={question.text}
              onChangeText={(text) => onUpdate({ text })}
            />
          </View>

          {/* Type Selector Horizontal Scroll */}
          <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>Question Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeScroll}
            >
              {(Object.keys(QUESTION_CONFIG) as QuestionType[]).map((typeKey) => {
                const config = QUESTION_CONFIG[typeKey];
                const isSelected = question.type === typeKey;
                return (
                  <TouchableOpacity
                    key={typeKey}
                    style={[
                      styles.typeChip,
                      isSelected && { backgroundColor: config.color, borderColor: config.color }
                    ]}
                    onPress={() => {
                      // Reset logic
                      let newOptions = ['', ''];
                      let newCorrect = '0';
                      if (typeKey === 'TRUE_FALSE') newCorrect = 'true';
                      if (typeKey === 'SHORT_ANSWER' || typeKey === 'FILL_IN_BLANK') {
                        newOptions = [];
                        newCorrect = '';
                      }
                      if (typeKey === 'MATCHING') newOptions = [':::'];

                      Haptics.selectionAsync();
                      onUpdate({
                        type: typeKey,
                        options: newOptions,
                        correctAnswer: newCorrect
                      });
                    }}
                  >
                    <Ionicons
                      name={config.icon as any}
                      size={16}
                      color={isSelected ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text style={[
                      styles.typeChipText,
                      isSelected && styles.typeChipTextSelected
                    ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Points Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>Points Value</Text>
            <View style={styles.pointsRow}>
              {POINTS_OPTIONS.map((points) => (
                <TouchableOpacity
                  key={points}
                  style={[
                    styles.pointChip,
                    question.points === points && { backgroundColor: theme.bg, borderColor: theme.color }
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onUpdate({ points });
                  }}
                >
                  <Text style={[
                    styles.pointChipText,
                    question.points === points && { color: theme.color, fontWeight: '700' }
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
                <Ionicons name="trash" size={16} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <View style={[styles.pointsBadgeLarge, { backgroundColor: theme.bg }]}>
              <Ionicons name="star" size={14} color={theme.color} />
              <Text style={[styles.pointsBadgeText, { color: theme.color }]}>{question.points} Points</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    marginBottom: 16,
    
    
    overflow: 'hidden',
    shadowColor: '#000',
    
    shadowOpacity: 0.03,
    
    
  },
  cardExpanded: {
    elevation: 4,
    transform: [{ scale: 1.01 }], // Subtle pop
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  headerExpanded: {
    paddingVertical: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  dragHandle: {
    width: 24,
    alignItems: 'center',
  },
  questionNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  questionSummary: {
    flex: 1,
  },
  questionSummaryType: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionSummaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 4,
  },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingTop: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionInput: {
    fontSize: 17,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    
    
    fontWeight: '500',
  },
  typeScroll: {
    gap: 10,
    paddingRight: 20, // Padding for scroll end
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    
    
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
    gap: 10,
  },
  pointChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    
    
  },
  pointChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  // Answer Sections
  answerSection: {
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 16,
    
    borderStyle: 'dashed', // Dashed border for answer area
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    
    
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    shadowColor: '#000',
    
    shadowOpacity: 0.02,
    shadowRadius: 2,
    
  },
  removeOptionBtn: {
    padding: 8,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginTop: 8,
    borderStyle: 'dashed',
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
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
    gap: 10,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    
    
    shadowColor: '#000',
    
    shadowOpacity: 0.03,
    shadowRadius: 4,
    
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
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  tfTextSelected: {
    color: '#FFFFFF',
  },
  // Input Field
  inputField: {
    backgroundColor: '#F8FAFC',
    
    
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Ordering/Matching Specific
  optionNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  matchInput: {
    backgroundColor: '#F8FAFC',
    
    
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  // Footer
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingRight: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  pointsBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});
