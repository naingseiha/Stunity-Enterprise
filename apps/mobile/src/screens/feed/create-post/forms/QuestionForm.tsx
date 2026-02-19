/**
 * Enhanced Question Form Component
 * Beautiful, clean UI for question creation with bounty system
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation } from 'react-native';
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
  { label: 'No bounty', value: 0, icon: 'close-circle-outline' },
  { label: '50 pts', value: 50, icon: 'star-outline' },
  { label: '100 pts', value: 100, icon: 'star' },
  { label: '250 pts', value: 250, icon: 'flame-outline' },
  { label: '500 pts', value: 500, icon: 'trophy-outline' },
];

const ANSWER_TYPES = [
  { type: 'SHORT_ANSWER' as const, label: 'Quick Answer', icon: 'chatbox-outline', desc: 'Brief and concise' },
  { type: 'DETAILED_EXPLANATION' as const, label: 'Detailed', icon: 'document-text-outline', desc: 'In-depth explanation' },
  { type: 'CODE_SNIPPET' as const, label: 'Code', icon: 'code-slash-outline', desc: 'Code examples' },
  { type: 'RESOURCE_LINK' as const, label: 'Resources', icon: 'link-outline', desc: 'Links & references' },
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <View style={styles.container}>
      {/* Bounty Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#F0F9FF' }]}>
            <Ionicons name="trophy" size={20} color="#0EA5E9" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Bounty Points</Text>
            <Text style={styles.cardSubtitle}>Offer points to encourage answers</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bountyScroll}
        >
          {BOUNTY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => {
                Haptics.selectionAsync();
                setBounty(option.value);
              }}
              style={[
                styles.bountyCard,
                bounty === option.value && styles.bountyCardSelected,
                option.value === 0 && styles.bountyCardNone,
              ]}
            >
              <View style={[
                styles.bountyIcon,
                bounty === option.value && styles.bountyIconSelected,
                option.value === 0 && styles.bountyIconNone,
              ]}>
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={bounty === option.value ? '#FFF' : (option.value === 0 ? '#6B7280' : '#0EA5E9')}
                />
              </View>
              <Text style={[
                styles.bountyLabel,
                bounty === option.value && styles.bountyLabelSelected
              ]}>
                {option.label}
              </Text>
              {bounty === option.value && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={12} color="#0EA5E9" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tags Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="pricetags" size={20} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Topic Tags</Text>
            <Text style={styles.cardSubtitle}>{tags.length}/5 tags added</Text>
          </View>
        </View>

        <View style={styles.tagInputWrapper}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.tagIcon} />
          <TextInput
            style={styles.tagInput}
            placeholder={tags.length < 5 ? "Add tags (e.g., math, physics)..." : "Max tags reached"}
            placeholderTextColor="#9CA3AF"
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            maxLength={20}
            editable={tags.length < 5}
            returnKeyType="done"
          />
          {tagInput.length > 0 && (
            <TouchableOpacity onPress={addTag} style={styles.addTagButton}>
              <Ionicons name="arrow-up" size={16} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <Animated.View
                key={tag}
                entering={FadeIn.duration(200)}
                layout={Layout.springify()}
                style={styles.tag}
              >
                <Text style={styles.tagText}>#{tag}</Text>
                <TouchableOpacity
                  onPress={() => removeTag(tag)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#93C5FD" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* Answer Type Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="bulb" size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Expected Answer</Text>
            <Text style={styles.cardSubtitle}>What kind of response do you need?</Text>
          </View>
        </View>

        <View style={styles.answerGrid}>
          {ANSWER_TYPES.map((type) => (
            <TouchableOpacity
              key={type.type}
              onPress={() => {
                Haptics.selectionAsync();
                setExpectedAnswerType(type.type);
              }}
              style={[
                styles.answerCard,
                expectedAnswerType === type.type && styles.answerCardSelected
              ]}
            >
              <View style={[
                styles.answerIcon,
                expectedAnswerType === type.type && styles.answerIconSelected
              ]}>
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={expectedAnswerType === type.type ? '#FFF' : '#6B7280'}
                />
              </View>
              <View>
                <Text style={[
                  styles.answerLabel,
                  expectedAnswerType === type.type && styles.answerLabelSelected
                ]}>
                  {type.label}
                </Text>
                <Text style={styles.answerDesc}>
                  {type.desc}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Bounty
  bountyScroll: {
    gap: 12,
    paddingRight: 16,
  },
  bountyCard: {
    width: 100,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#E0F2FE',
    alignItems: 'center',
    gap: 8,
  },
  bountyCardSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bountyCardNone: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  bountyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bountyIconSelected: {
    backgroundColor: '#0EA5E9',
  },
  bountyIconNone: {
    backgroundColor: '#E5E7EB',
  },
  bountyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0C4A6E',
  },
  bountyLabelSelected: {
    color: '#B45309',
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tags
  tagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
  },
  tagIcon: {
    marginRight: 8,
  },
  tagInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    height: '100%',
  },
  addTagButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  // Answer Type
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  answerCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  answerCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  answerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerIconSelected: {
    backgroundColor: '#10B981',
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  answerLabelSelected: {
    color: '#065F46',
  },
  answerDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
});
