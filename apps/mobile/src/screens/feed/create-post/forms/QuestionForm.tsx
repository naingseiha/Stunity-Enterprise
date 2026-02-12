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
      {/* Bounty Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="trophy" size={18} color="#F59E0B" />
          </View>
          <Text style={styles.cardTitle}>Question Bounty</Text>
          {bounty > 0 && (
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.badgeText, { color: '#F59E0B' }]}>{bounty} pts</Text>
            </View>
          )}
        </View>

        <Text style={styles.description}>
          Offer points to attract quality answers. Higher bounties get more attention.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
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

      {/* Tags Card */}
      <Animated.View entering={FadeIn.duration(300).delay(100)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="pricetag" size={18} color="#3B82F6" />
          </View>
          <Text style={styles.cardTitle}>Tags</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tags.length}/5</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Add up to 5 tags to help others find your question.
        </Text>

        {/* Tag Input */}
        <View style={styles.tagInputContainer}>
          <TextInput
            style={styles.tagInput}
            placeholder="Type a tag and press +"
            placeholderTextColor="#9CA3AF"
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            maxLength={20}
            editable={tags.length < 5}
          />
          <TouchableOpacity
            onPress={addTag}
            style={[styles.addTagButton, tags.length >= 5 && styles.addTagButtonDisabled]}
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
            {tags.map((tag, index) => (
              <Animated.View
                key={tag}
                entering={FadeIn.duration(200).delay(index * 50)}
                exiting={FadeOut.duration(150)}
                layout={Layout.springify()}
                style={styles.tag}
              >
                <Text style={styles.tagText}>#{tag}</Text>
                <TouchableOpacity
                  onPress={() => removeTag(tag)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color="#6366F1" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Expected Answer Type Card */}
      <Animated.View entering={FadeIn.duration(300).delay(200)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="help-circle" size={18} color="#10B981" />
          </View>
          <Text style={styles.cardTitle}>Expected Answer Type</Text>
        </View>

        <Text style={styles.description}>
          What kind of answer are you looking for?
        </Text>

        <View style={styles.answerTypesContainer}>
          {ANSWER_TYPES.map((type, index) => (
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
              <View style={[
                styles.answerTypeIconBadge,
                expectedAnswerType === type.type && styles.answerTypeIconBadgeSelected,
              ]}>
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={expectedAnswerType === type.type ? '#10B981' : '#6B7280'}
                />
              </View>
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

      {/* Summary Card */}
      <Animated.View entering={FadeIn.duration(300).delay(300)} style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryTitle}>Question Summary</Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Bounty</Text>
            <Text style={[styles.summaryValue, { color: bounty > 0 ? '#F59E0B' : '#6B7280' }]}>
              {bounty > 0 ? `${bounty} pts` : 'None'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tags</Text>
            <Text style={styles.summaryValue}>{tags.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Answer Type</Text>
            <Text style={[styles.summaryValue, { fontSize: 14 }]}>
              {ANSWER_TYPES.find(t => t.type === expectedAnswerType)?.label}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
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
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  chipsContainer: {
    gap: 10,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  chipNoBounty: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  chipTextNoBounty: {
    color: '#6B7280',
    fontWeight: '600',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  addTagButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addTagButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
  },
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
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
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
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  answerTypeButtonSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  answerTypeIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerTypeIconBadgeSelected: {
    backgroundColor: '#D1FAE5',
  },
  answerTypeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  answerTypeTextSelected: {
    color: '#10B981',
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#3B82F6',
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
    backgroundColor: '#BFDBFE',
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
