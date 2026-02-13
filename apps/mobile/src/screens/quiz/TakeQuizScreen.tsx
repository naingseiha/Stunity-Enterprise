/**
 * Take Quiz Screen - Enterprise Edition
 * Professional quiz-taking interface with advanced features
 * - Answer labels (A, B, C, D)
 * - Mark for review
 * - Review screen before submission
 * - Enhanced visual design
 * - Better progress tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Animated as RNAnimated,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, Layout, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { quizService } from '@/services';

const { width } = Dimensions.get('window');
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface QuizQuestion {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options?: string[];
  correctAnswer: string;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit: number | null; // in minutes
  passingScore: number;
  totalPoints: number;
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

export function TakeQuizScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const quiz = route.params?.quiz as Quiz;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quiz?.timeLimit ? quiz.timeLimit * 60 : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const progressAnim = useRef(new RNAnimated.Value(0)).current;

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Progress bar animation
  useEffect(() => {
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
    RNAnimated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false, // Can't use native driver for width animation
    }).start();
  }, [currentQuestionIndex]);

  if (!quiz) {
    return null;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion.id)?.answer || '';

  const handleAnswerChange = (answer: string) => {
    Haptics.selectionAsync();
    const newAnswers = answers.filter((a) => a.questionId !== currentQuestion.id);
    newAnswers.push({ questionId: currentQuestion.id, answer });
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const toggleMarkForReview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newMarked = new Set(markedForReview);
    if (newMarked.has(currentQuestion.id)) {
      newMarked.delete(currentQuestion.id);
    } else {
      newMarked.add(currentQuestion.id);
    }
    setMarkedForReview(newMarked);
  };

  const handleReviewClick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowReviewScreen(true);
  };

  const handleAutoSubmit = () => {
    Alert.alert(
      'Time\'s Up!',
      'The quiz time limit has been reached. Your answers will be submitted.',
      [{ text: 'OK', onPress: handleSubmit }]
    );
  };

  const handleSubmit = async () => {
    const unansweredCount = quiz.questions.length - answers.length;
    
    if (unansweredCount > 0) {
      Alert.alert(
        'Incomplete Quiz',
        `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', style: 'destructive', onPress: submitQuiz },
        ]
      );
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    try {
      setIsSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Submit to API
      const response = await quizService.submitQuiz(quiz.id, answers);

      // Navigate to results screen with API response
      navigation.navigate('QuizResults', {
        quiz,
        answers,
        score: response.score,
        passed: response.passed,
        pointsEarned: response.pointsEarned,
        results: response.results,
        attemptId: response.attemptId,
      });
    } catch (error: any) {
      console.error('Quiz submission error:', error);
      Alert.alert('Error', error.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const answeredCount = answers.length;
  const progressPercent = (answeredCount / quiz.questions.length) * 100;
  const isMarkedForReview = markedForReview.has(currentQuestion.id);

  // Render Review Screen
  if (showReviewScreen) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          {/* Review Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => setShowReviewScreen(false)} 
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Review Your Answers</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary Card */}
          <View style={styles.reviewSummary}>
            <Text style={styles.reviewTitle}>Submission Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                <Text style={styles.summaryNumber}>{answeredCount}</Text>
                <Text style={styles.summaryLabel}>Answered</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
                <Text style={styles.summaryNumber}>{quiz.questions.length - answeredCount}</Text>
                <Text style={styles.summaryLabel}>Unanswered</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="flag" size={32} color="#F59E0B" />
                <Text style={styles.summaryNumber}>{markedForReview.size}</Text>
                <Text style={styles.summaryLabel}>Flagged</Text>
              </View>
            </View>
          </View>

          {/* Questions Review List */}
          <View style={styles.reviewList}>
            {quiz.questions.map((q, index) => {
              const answer = answers.find(a => a.questionId === q.id);
              const isAnswered = !!answer;
              const isFlagged = markedForReview.has(q.id);
              
              return (
                <TouchableOpacity
                  key={q.id}
                  onPress={() => {
                    setShowReviewScreen(false);
                    setCurrentQuestionIndex(index);
                  }}
                  style={styles.reviewItem}
                >
                  <View style={styles.reviewItemLeft}>
                    <View style={[
                      styles.reviewNumber,
                      isAnswered ? styles.reviewNumberAnswered : styles.reviewNumberUnanswered
                    ]}>
                      <Text style={[
                        styles.reviewNumberText,
                        isAnswered && styles.reviewNumberTextAnswered
                      ]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewQuestionText} numberOfLines={2}>
                        {q.text}
                      </Text>
                      {answer && q.type === 'MULTIPLE_CHOICE' && (
                        <Text style={styles.reviewAnswerText}>
                          Answer: {OPTION_LETTERS[parseInt(answer.answer)]}
                        </Text>
                      )}
                      {answer && q.type === 'TRUE_FALSE' && (
                        <Text style={styles.reviewAnswerText}>
                          Answer: {answer.answer === 'true' ? 'True' : 'False'}
                        </Text>
                      )}
                      {answer && q.type === 'SHORT_ANSWER' && (
                        <Text style={styles.reviewAnswerText} numberOfLines={1}>
                          Answer: {answer.answer}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.reviewItemRight}>
                    {isFlagged && <Ionicons name="flag" size={18} color="#F59E0B" />}
                    {!isAnswered && <Ionicons name="alert-circle" size={18} color="#EF4444" />}
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Review Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => setShowReviewScreen(false)}
            style={styles.navButton}
          >
            <Ionicons name="create-outline" size={20} color="#6366F1" />
            <Text style={styles.navButtonText}>Continue Editing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </Text>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>{quiz.title}</Text>
            {timeRemaining !== null && (
              <View style={[styles.timer, timeRemaining < 60 && styles.timerWarning]}>
                <Ionicons 
                  name="time-outline" 
                  size={18} 
                  color={timeRemaining < 60 ? '#EF4444' : '#6366F1'} 
                />
                <Text style={[styles.timerText, timeRemaining < 60 && styles.timerTextWarning]}>
                  {formatTime(timeRemaining)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <RNAnimated.View
              style={[
                styles.progressBarFill,
                {
                  flex: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </Text>
      </View>

      {/* Question Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          key={currentQuestion.id}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutLeft.duration(300)}
          style={styles.questionCard}
        >
          {/* Question Header */}
          <View style={styles.questionHeader}>
            <View style={styles.questionHeaderLeft}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>Q{currentQuestionIndex + 1}</Text>
              </View>
              <View style={styles.questionPoints}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.pointsText}>{currentQuestion.points} pts</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleMarkForReview} style={styles.flagButton}>
              <Ionicons 
                name={isMarkedForReview ? "flag" : "flag-outline"} 
                size={22} 
                color={isMarkedForReview ? "#F59E0B" : "#9CA3AF"} 
              />
            </TouchableOpacity>
          </View>

          {/* Question Text */}
          <Text style={styles.questionText}>{currentQuestion.text}</Text>

          {/* Answer Input */}
          <View style={styles.answerSection}>
            {currentQuestion.type === 'MULTIPLE_CHOICE' && (
              <View style={styles.optionsContainer}>
                {currentQuestion.options?.map((option, index) => {
                  const isSelected = currentAnswer === index.toString();
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleAnswerChange(index.toString())}
                      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                        <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                          {OPTION_LETTERS[index]}
                        </Text>
                      </View>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {option}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {currentQuestion.type === 'TRUE_FALSE' && (
              <View style={styles.trueFalseContainer}>
                <TouchableOpacity
                  onPress={() => handleAnswerChange('true')}
                  style={[
                    styles.trueFalseButton,
                    currentAnswer === 'true' && styles.trueButtonSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={currentAnswer === 'true' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={24}
                    color={currentAnswer === 'true' ? '#FFFFFF' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.trueFalseText,
                      currentAnswer === 'true' && styles.trueFalseTextSelected,
                    ]}
                  >
                    True
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleAnswerChange('false')}
                  style={[
                    styles.trueFalseButton,
                    currentAnswer === 'false' && styles.falseButtonSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={currentAnswer === 'false' ? 'close-circle' : 'close-circle-outline'}
                    size={24}
                    color={currentAnswer === 'false' ? '#FFFFFF' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.trueFalseText,
                      currentAnswer === 'false' && styles.trueFalseTextSelected,
                    ]}
                  >
                    False
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {currentQuestion.type === 'SHORT_ANSWER' && (
              <TextInput
                value={currentAnswer}
                onChangeText={handleAnswerChange}
                placeholder="Type your answer here..."
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          </View>
        </Animated.View>

        {/* Answer Status Grid */}
        <View style={styles.answerGrid}>
          <Text style={styles.answerGridTitle}>Answer Status</Text>
          <View style={styles.gridContainer}>
            {quiz.questions.map((q, index) => {
              const isAnswered = answers.some((a) => a.questionId === q.id);
              const isCurrent = index === currentQuestionIndex;
              return (
                <TouchableOpacity
                  key={q.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurrentQuestionIndex(index);
                  }}
                  style={[
                    styles.gridItem,
                    isAnswered && styles.gridItemAnswered,
                    isCurrent && styles.gridItemCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.gridItemText,
                      isAnswered && styles.gridItemTextAnswered,
                      isCurrent && styles.gridItemTextCurrent,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.answeredCount}>
            {answeredCount} of {quiz.questions.length} answered ({Math.round(progressPercent)}%)
          </Text>
        </View>
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
            style={[styles.navButtonSmall, currentQuestionIndex === 0 && styles.navButtonDisabled]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={currentQuestionIndex === 0 ? '#D1D5DB' : '#6366F1'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReviewClick}
            style={styles.reviewButton}
          >
            <Ionicons name="list-outline" size={20} color="#6366F1" />
            <Text style={styles.reviewButtonText}>Review</Text>
            {markedForReview.size > 0 && (
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>{markedForReview.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isLastQuestion ? (
          <TouchableOpacity
            onPress={handleReviewClick}
            disabled={isSubmitting}
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Review & Submit'}
            </Text>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  timerWarning: {
    backgroundColor: '#FEE2E2',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6366F1',
  },
  timerTextWarning: {
    color: '#EF4444',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
    flexDirection: 'row',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  questionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  questionNumber: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  questionPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 20,
  },
  answerSection: {
    marginTop: 8,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 14,
    minHeight: 64,
  },
  optionButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  optionLetter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  optionLetterText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
  },
  optionLetterTextSelected: {
    color: '#FFFFFF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  trueFalseContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  trueFalseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  trueButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  falseButtonSelected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  trueFalseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  trueFalseTextSelected: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
  },
  answerGrid: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  answerGridTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  gridItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gridItemAnswered: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  gridItemCurrent: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
    borderWidth: 2,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  gridItemTextAnswered: {
    color: '#10B981',
  },
  gridItemTextCurrent: {
    color: '#6366F1',
    fontWeight: '700',
  },
  answeredCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButtonSmall: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    gap: 6,
  },
  navButtonDisabled: {
    borderColor: '#E5E7EB',
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
  navButtonTextDisabled: {
    color: '#D1D5DB',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    gap: 6,
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
  reviewBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Review Screen Styles
  reviewSummary: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 8,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  reviewItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  reviewNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewNumberAnswered: {
    backgroundColor: '#D1FAE5',
  },
  reviewNumberUnanswered: {
    backgroundColor: '#FEE2E2',
  },
  reviewNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  reviewNumberTextAnswered: {
    color: '#10B981',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reviewAnswerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  reviewItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
