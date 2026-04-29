/**
 * Enhanced Question Form Component
 * Beautiful, clean UI for question creation with bounty system
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation, Alert , Animated} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as Haptics from 'expo-haptics';
import { AIGenerateButton } from '@/components/ai/AIGenerateButton';
import { AIPromptModal } from '@/components/ai/AIPromptModal';
import { AILoadingOverlay } from '@/components/ai/AILoadingOverlay';
import { AIResultPreview } from '@/components/ai/AIResultPreview';
import type { AIPromptData } from '@/components/ai/AIPromptModal';
import { aiService } from '@/services/ai.service';
import { useTranslation } from 'react-i18next';

interface QuestionFormProps {
  onDataChange: (data: QuestionData) => void;
}

export interface QuestionData {
  bounty: number;
  tags: string[];
  expectedAnswerType: 'SHORT_ANSWER' | 'DETAILED_EXPLANATION' | 'CODE_SNIPPET' | 'RESOURCE_LINK';
}

const BOUNTY_OPTIONS = [
  { labelKey: 'feed.createPost.question.noBounty', value: 0, icon: 'close-circle-outline' },
  { labelKey: 'feed.createPost.question.bountyPoints', value: 50, icon: 'star-outline' },
  { labelKey: 'feed.createPost.question.bountyPoints', value: 100, icon: 'star' },
  { labelKey: 'feed.createPost.question.bountyPoints', value: 250, icon: 'flame-outline' },
  { labelKey: 'feed.createPost.question.bountyPoints', value: 500, icon: 'trophy-outline' },
];

const ANSWER_TYPES = [
  { type: 'SHORT_ANSWER' as const, labelKey: 'feed.createPost.question.answerType.quickAnswer', icon: 'chatbox-outline', descKey: 'feed.createPost.question.answerType.quickAnswerDesc' },
  { type: 'DETAILED_EXPLANATION' as const, labelKey: 'feed.createPost.question.answerType.detailed', icon: 'document-text-outline', descKey: 'feed.createPost.question.answerType.detailedDesc' },
  { type: 'CODE_SNIPPET' as const, labelKey: 'feed.createPost.question.answerType.code', icon: 'code-slash-outline', descKey: 'feed.createPost.question.answerType.codeDesc' },
  { type: 'RESOURCE_LINK' as const, labelKey: 'feed.createPost.question.answerType.resources', icon: 'link-outline', descKey: 'feed.createPost.question.answerType.resourcesDesc' },
];

export function QuestionForm({ onDataChange }: QuestionFormProps) {
  const { t } = useTranslation();
  const [bounty, setBounty] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [expectedAnswerType, setExpectedAnswerType] = useState<QuestionData['expectedAnswerType']>('SHORT_ANSWER');

  // AI State
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<AIPromptData | null>(null);

  useEffect(() => {
    onDataChange({ bounty, tags, expectedAnswerType });
  }, [bounty, tags, expectedAnswerType]);

  const handleGenerateAI = async (data: AIPromptData) => {
    setLastPrompt(data);
    setIsAiLoading(true);
    try {
      // For questions, we "Enhance" the current topic or generate a new one
      const result = await aiService.enhanceContent(data.topic, 'educational', 'question');
      if (result && result.enhanced) {
        setAiPreviewData(result.enhanced);
      } else {
        Alert.alert(t('feed.createPost.aiError'), t('feed.createPost.question.failedGenerateQuestion'));
      }
    } catch (error: any) {
      Alert.alert(t('feed.createPost.aiError'), error.message || t('feed.createPost.question.failedGenerateQuestion'));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAI = () => {
    if (aiPreviewData) {
      // In a real scenario, we might want to update the parent's content
      // But for QuestionForm, we just show it for now or we could emit an event
      setAiPreviewData(null);
    }
  };

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
          <View style={[styles.iconContainer, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="trophy" size={20} color="#0EA5E9" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('feed.createPost.question.bountyPointsTitle')}</Text>
            <Text style={styles.cardSubtitle}>{t('feed.createPost.question.bountyPointsSubtitle')}</Text>
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
                !!(bounty === option.value) && styles.bountyLabelSelected
              ]}>
                {option.value === 0 ? t(option.labelKey) : t(option.labelKey, { count: option.value })}
              </Text>
              {!!(bounty === option.value) && (
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
          <View style={[styles.iconContainer, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="pricetags" size={20} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('feed.createPost.topicTags')}</Text>
            <Text style={styles.cardSubtitle}>{t('feed.createPost.question.tagsAdded', { count: tags.length })}</Text>
          </View>
          <AIGenerateButton
            label={t('feed.createPost.aiSuggest')}
            type="ghost"
            size="small"
            onPress={async () => {
              if (tags.length >= 5) return;
              setIsAiLoading(true);
              try {
                const result = await aiService.suggestTags(t('feed.createPost.question.questionTagsPrompt'), tags);
                if (result && result.tags) {
                  const newTags = [...new Set([...tags, ...result.tags])].slice(0, 5);
                  setTags(newTags);
                }
              } catch (e) {
                console.error(e);
              } finally {
                setIsAiLoading(false);
              }
            }}
          />
        </View>

        <View style={styles.tagInputWrapper}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.tagIcon} />
          <TextInput
            style={styles.tagInput}
            placeholder={tags.length < 5 ? t('feed.createPost.question.addTagsPlaceholder') : t('feed.createPost.question.maxTagsReached')}
            placeholderTextColor="#9CA3AF"
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            maxLength={20}
            editable={tags.length < 5}
            returnKeyType="done"
          />
          {!!(tagInput.length > 0) && (
            <TouchableOpacity onPress={addTag} style={styles.addTagButton}>
              <Ionicons name="arrow-up" size={16} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {!!(tags.length > 0) && (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <Animated.View
                key={tag}
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
            <Text style={styles.cardTitle}>{t('feed.createPost.question.expectedAnswer')}</Text>
            <Text style={styles.cardSubtitle}>{t('feed.createPost.question.expectedAnswerSubtitle')}</Text>
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
                  {t(type.labelKey)}
                </Text>
                <Text style={styles.answerDesc}>
                  {t(type.descKey)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* AI Modals */}
      <AIPromptModal
        visible={isAiModalVisible}
        onClose={() => setIsAiModalVisible(false)}
        onGenerate={handleGenerateAI}
        type="lesson"
        title={t('feed.createPost.question.improveWithAi')}
      />

      <AIResultPreview
        visible={!!aiPreviewData}
        content={aiPreviewData || ''}
        title={t('feed.createPost.question.aiSuggestion')}
        onAccept={handleAcceptAI}
        onRegenerate={() => !!lastPrompt && handleGenerateAI(lastPrompt)}
        onDiscard={() => setAiPreviewData(null)}
        isRegenerating={isAiLoading}
      />

      <AILoadingOverlay
        isVisible={!!(isAiLoading && !aiPreviewData)}
        message={t('feed.createPost.question.aiPolishing')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
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
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 8,
  },
  bountyCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0EA5E9',
    borderWidth: 1,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  bountyCardNone: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  bountyIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tags
  tagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    borderRadius: 14,
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
    borderColor: '#F3F4F6',
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
