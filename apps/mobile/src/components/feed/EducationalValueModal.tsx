/**
 * Educational Value Modal
 * 
 * UNIQUE FEATURE - Multi-dimensional educational content rating
 * Unlike simple "like" buttons, this provides structured feedback
 * that helps surface quality content and provides actionable insights
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export interface EducationalValue {
  accuracy: number; // 1-5: How accurate is the information?
  helpfulness: number; // 1-5: Did it help you learn?
  clarity: number; // 1-5: How clear is the explanation?
  depth: number; // 1-5: How comprehensive is it?
  difficulty: 'too_easy' | 'just_right' | 'too_hard' | null;
  recommend: boolean; // Would you recommend this to peers?
}

interface EducationalValueModalProps {
  visible: boolean;
  postType: string;
  authorName: string;
  onClose: () => void;
  onSubmit: (value: EducationalValue) => void;
}

const RATING_DIMENSIONS = [
  {
    key: 'accuracy' as keyof EducationalValue,
    icon: 'checkmark-circle',
    label: 'Accuracy',
    description: 'Is the information correct?',
    color: '#10B981',
  },
  {
    key: 'helpfulness' as keyof EducationalValue,
    icon: 'bulb',
    label: 'Helpfulness',
    description: 'Did it help you learn?',
    color: '#0EA5E9',
  },
  {
    key: 'clarity' as keyof EducationalValue,
    icon: 'eye',
    label: 'Clarity',
    description: 'How clear is the explanation?',
    color: '#3B82F6',
  },
  {
    key: 'depth' as keyof EducationalValue,
    icon: 'layers',
    label: 'Depth',
    description: 'How comprehensive is it?',
    color: '#8B5CF6',
  },
];

const DIFFICULTY_OPTIONS = [
  { value: 'too_easy', label: 'Too Easy', emoji: '😴', color: '#10B981' },
  { value: 'just_right', label: 'Just Right', emoji: '🎯', color: '#0EA5E9' },
  { value: 'too_hard', label: 'Too Hard', emoji: '😰', color: '#EF4444' },
];

export const EducationalValueModal: React.FC<EducationalValueModalProps> = ({
  visible,
  postType,
  authorName,
  onClose,
  onSubmit,
}) => {
  const [value, setValue] = useState<EducationalValue>({
    accuracy: 0,
    helpfulness: 0,
    clarity: 0,
    depth: 0,
    difficulty: null,
    recommend: false,
  });

  const handleRating = (dimension: keyof EducationalValue, rating: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setValue({ ...value, [dimension]: rating });
  };

  const handleDifficulty = (diff: 'too_easy' | 'just_right' | 'too_hard') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setValue({ ...value, difficulty: diff });
  };

  const handleRecommend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setValue({ ...value, recommend: !value.recommend });
  };

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(value);
    onClose();
    // Reset
    setValue({
      accuracy: 0,
      helpfulness: 0,
      clarity: 0,
      depth: 0,
      difficulty: null,
      recommend: false,
    });
  };

  const isComplete = 
    value.accuracy > 0 &&
    value.helpfulness > 0 &&
    value.clarity > 0 &&
    value.depth > 0 &&
    value.difficulty !== null;

  const averageRating = (
    (value.accuracy + value.helpfulness + value.clarity + value.depth) / 4
  ).toFixed(1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          entering={SlideInDown.duration(300).springify()}
          style={styles.modal}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Educational Value</Text>
              <Text style={styles.subtitle}>
                Help improve content quality for everyone
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Rating Dimensions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rate this {postType.toLowerCase()}</Text>
              
              {RATING_DIMENSIONS.map((dimension, index) => (
                <Animated.View
                  key={dimension.key}
                  entering={FadeInDown.delay(index * 50).duration(300)}
                  style={styles.dimensionCard}
                >
                  <View style={styles.dimensionHeader}>
                    <View style={styles.dimensionInfo}>
                      <View style={[styles.iconContainer, { backgroundColor: `${dimension.color}15` }]}>
                        <Ionicons name={dimension.icon as any} size={20} color={dimension.color} />
                      </View>
                      <View>
                        <Text style={styles.dimensionLabel}>{dimension.label}</Text>
                        <Text style={styles.dimensionDescription}>{dimension.description}</Text>
                      </View>
                    </View>
                    {value[dimension.key] > 0 && (
                      <Text style={[styles.ratingValue, { color: dimension.color }]}>
                        {value[dimension.key]}/5
                      </Text>
                    )}
                  </View>
                  
                  {/* Star Rating */}
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => handleRating(dimension.key, star)}
                        style={styles.star}
                      >
                        <Ionicons
                          name={star <= (value[dimension.key] as number) ? 'star' : 'star-outline'}
                          size={32}
                          color={star <= (value[dimension.key] as number) ? dimension.color : '#E5E7EB'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              ))}
            </View>

            {/* Difficulty Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Difficulty Level</Text>
              <Text style={styles.sectionDescription}>
                Is the difficulty appropriate for the topic?
              </Text>
              
              <View style={styles.difficultyRow}>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleDifficulty(option.value as any)}
                    style={[
                      styles.difficultyOption,
                      value.difficulty === option.value && {
                        backgroundColor: `${option.color}15`,
                        borderColor: option.color,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Text style={styles.difficultyEmoji}>{option.emoji}</Text>
                    <Text style={[
                      styles.difficultyLabel,
                      value.difficulty === option.value && { color: option.color, fontWeight: '600' },
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recommendation */}
            <Animated.View 
              entering={FadeInDown.delay(250).duration(300)}
              style={styles.section}
            >
              <TouchableOpacity
                onPress={handleRecommend}
                style={[
                  styles.recommendCard,
                  value.recommend && styles.recommendCardActive,
                ]}
              >
                <View style={styles.recommendContent}>
                  <View style={[
                    styles.recommendIcon,
                    value.recommend && styles.recommendIconActive,
                  ]}>
                    <Ionicons 
                      name={value.recommend ? 'checkmark-circle' : 'checkmark-circle-outline'} 
                      size={28} 
                      color={value.recommend ? '#FFFFFF' : '#6366F1'} 
                    />
                  </View>
                  <View style={styles.recommendText}>
                    <Text style={[
                      styles.recommendLabel,
                      value.recommend && styles.recommendLabelActive,
                    ]}>
                      Recommend to Peers
                    </Text>
                    <Text style={styles.recommendDescription}>
                      I would suggest this to my classmates
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Summary */}
            {isComplete && (
              <Animated.View 
                entering={FadeIn.duration(300)}
                style={styles.summaryCard}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryGradient}
                >
                  <View style={styles.summaryContent}>
                    <Ionicons name="analytics" size={32} color="#FFFFFF" />
                    <View style={styles.summaryText}>
                      <Text style={styles.summaryLabel}>Overall Rating</Text>
                      <Text style={styles.summaryValue}>{averageRating} / 5.0</Text>
                    </View>
                  </View>
                  <Text style={styles.summaryNote}>
                    Your feedback helps improve learning for everyone
                  </Text>
                </LinearGradient>
              </Animated.View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!isComplete}
              style={[
                styles.submitButton,
                !isComplete && styles.submitButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={isComplete ? ['#6366F1', '#8B5CF6'] : ['#E5E7EB', '#D1D5DB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <Text style={[
                  styles.submitText,
                  !isComplete && styles.submitTextDisabled,
                ]}>
                  Submit Rating
                </Text>
                <Ionicons 
                  name="arrow-forward" 
                  size={20} 
                  color={isComplete ? '#FFFFFF' : '#9CA3AF'} 
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  dimensionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dimensionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dimensionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dimensionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  star: {
    padding: 4,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  difficultyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  difficultyLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  recommendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  recommendCardActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  recommendContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendIconActive: {
    backgroundColor: '#6366F1',
  },
  recommendText: {
    flex: 1,
  },
  recommendLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  recommendLabelActive: {
    color: '#6366F1',
  },
  recommendDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    marginLeft: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryNote: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitTextDisabled: {
    color: '#9CA3AF',
  },
});
