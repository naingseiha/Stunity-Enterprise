/**
 * Question Form Component
 * Beautiful, clean UI for question creation with bounty system
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface QuestionFormProps {
  onDataChange: (data: QuestionData) => void;
}

export interface QuestionData {
  bounty: number;
  tags: string[];
  expectedAnswerType: 'SHORT_ANSWER' | 'DETAILED_EXPLANATION' | 'CODE_SNIPPET' | 'RESOURCE_LINK';
}

const BOUNTY_OPTIONS = [
  { label: 'No bounty', value: 0, icon: 'close-circle' },
  { label: '50 pts', value: 50, icon: 'star' },
  { label: '100 pts', value: 100, icon: 'star' },
  { label: '200 pts', value: 200, icon: 'flame' },
  { label: '500 pts', value: 500, icon: 'trophy' },
];

const ANSWER_TYPES = [
  { type: 'SHORT_ANSWER' as const, label: 'Short Answer', icon: 'chatbox' },
  { type: 'DETAILED_EXPLANATION' as const, label: 'Detailed', icon: 'document-text' },
  { type: 'CODE_SNIPPET' as const, label: 'Code', icon: 'code-slash' },
  { type: 'RESOURCE_LINK' as const, label: 'Link', icon: 'link' },
];

export function QuestionForm({ onDataChange }: QuestionFormProps) {
  const [bounty, setBounty] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [expectedAnswerType, setExpectedAnswerType] = useState<QuestionData['expectedAnswerType']>('SHORT_ANSWER');

  useEffect(() => {
    onDataChange({ bounty, tags, expectedAnswerType });
  }, [bounty, tags, expectedAnswerType]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && tags.length < 5 && !tags.includes(trimmed)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <View style={styles.container}>
      {/* Bounty Section */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="trophy" size={20} color="#F59E0B" />
          <Text style={styles.cardTitle}>Question Bounty</Text>
          {bounty > 0 && (
            <View style={styles.bountyBadge}>
              <Text style={styles.bountyText}>{bounty} pts</Text>
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {BOUNTY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => {
                Haptics.selectionAsync();
                setBounty(option.value);
              }}
              style={[
                styles.chip,
                bounty === option.value && styles.chipSelected,
                option.value === 0 && bounty === option.value && styles.chipNoBounty,
              ]}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={bounty === option.value 
                  ? (option.value === 0 ? '#6B7280' : '#fff')
                  : '#9CA3AF'}
              />
              <Text style={[
                styles.chipText,
                bounty === option.value && styles.chipTextSelected,
                option.value === 0 && bounty === option.value && styles.chipTextNoBounty,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Tags Section */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="pricetag" size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Tags</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{tags.length}/5</Text>
          </View>
        </View>

        {/* Tag Input */}
        <View style={styles.tagInputContainer}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add a tag..."
            placeholderTextColor="#9CA3AF"
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            maxLength={20}
            editable={tags.length < 5}
          />
          <TouchableOpacity
            onPress={addTag}
            style={[styles.addTagButton, (tags.length >= 5 || !tagInput.trim()) && styles.addTagButtonDisabled]}
            disabled={tags.length >= 5 || !tagInput.trim()}
          >
            <Ionicons
              name="add"
              size={20}
              color={tags.length >= 5 || !tagInput.trim() ? '#9CA3AF' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* Tags Display */}
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <Animated.View
                key={tag}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                layout={Layout.springify()}
                style={styles.tag}
              >
                <Text style={styles.tagText}>#{tag}</Text>
                <TouchableOpacity
                  onPress={() => removeTag(tag)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color="#3B82F6" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Expected Answer Type */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="chatbox-ellipses" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>Expected Answer</Text>
        </View>

        <View style={styles.answerTypesContainer}>
          {ANSWER_TYPES.map((type) => (
            <TouchableOpacity
              key={type.type}
              onPress={() => {
                Haptics.selectionAsync();
                setExpectedAnswerType(type.type);
              }}
              style={[
                styles.answerTypeButton,
                expectedAnswerType === type.type && styles.answerTypeButtonSelected,
              ]}
            >
              <Ionicons
                name={type.icon as any}
                size={20}
                color={expectedAnswerType === type.type ? '#10B981' : '#6B7280'}
              />
              <Text style={[
                styles.answerTypeText,
                expectedAnswerType === type.type && styles.answerTypeTextSelected,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Bounty</Text>
          <Text style={[styles.summaryValue, { color: bounty > 0 ? '#F59E0B' : '#6B7280' }]}>
            {bounty > 0 ? `${bounty}` : '0'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Tags</Text>
          <Text style={styles.summaryValue}>{tags.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Type</Text>
          <Text style={[styles.summaryValue, { fontSize: 14 }]}>
            {ANSWER_TYPES.find(t => t.type === expectedAnswerType)?.label}
          </Text>
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

  // Cards
  card: {
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  bountyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bountyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  countBadge: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Chips
  chipsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  chipNoBounty: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  chipTextNoBounty: {
    color: '#6B7280',
    fontWeight: '600',
  },

  // Tag Input
  tagInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  addTagButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },

  // Tags Display
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Answer Types
  answerTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  answerTypeButton: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  answerTypeButtonSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  answerTypeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  answerTypeTextSelected: {
    color: '#10B981',
    fontWeight: '700',
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
