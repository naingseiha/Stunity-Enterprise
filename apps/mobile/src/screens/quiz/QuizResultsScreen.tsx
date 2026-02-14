/**
 * Quiz Results Screen - Colorful Flat Modern Design
 * Inspired by modern learning apps with soft pastels and rounded elements
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  ZoomIn, 
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { statsAPI } from '@/services/stats';
import { AchievementUnlockModal } from '@/components/achievements';
import { XPGainAnimation, LevelUpModal, PerformanceBreakdown } from '@/components/quiz';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  questions: QuizQuestion[];
  passingScore: number;
  totalPoints: number;
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

export function QuizResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { 
    quiz, 
    answers, 
    score, 
    passed, 
    pointsEarned, 
    results: apiResults,
    viewMode = false,
    attemptId,
  } = route.params as { 
    quiz: Quiz; 
    answers: UserAnswer[];
    score?: number;
    passed?: boolean;
    pointsEarned?: number;
    results?: any[];
    viewMode?: boolean;
    attemptId?: string;
  };

  // State
  const [xpGained, setXpGained] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [achievementModal, setAchievementModal] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<any>(null);
  const [streakIncreased, setStreakIncreased] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const confettiRef = React.useRef<any>(null);

  // Calculate results
  let scorePercentage: number;
  let isPassed: boolean;
  let totalPointsEarned: number;
  let results: any[];

  if (score !== undefined && passed !== undefined && pointsEarned !== undefined) {
    scorePercentage = score;
    isPassed = passed;
    totalPointsEarned = pointsEarned;
    
    results = quiz.questions.map((question) => {
      const apiResult = apiResults?.find((r) => r.questionId === question.id);
      const userAnswer = answers.find((a) => a.questionId === question.id);
      
      return {
        question,
        userAnswer: userAnswer?.answer || '',
        isCorrect: apiResult?.correct || false,
        pointsEarned: apiResult?.pointsEarned || 0,
      };
    });
  } else {
    results = quiz.questions.map((question) => {
      const userAnswer = answers.find((a) => a.questionId === question.id);
      const isCorrect = userAnswer?.answer === question.correctAnswer;
      return {
        question,
        userAnswer: userAnswer?.answer || '',
        isCorrect,
        pointsEarned: isCorrect ? question.points : 0,
      };
    });

    totalPointsEarned = results.reduce((sum, r) => sum + r.pointsEarned, 0);
    scorePercentage = Math.round((totalPointsEarned / quiz.totalPoints) * 100);
    isPassed = scorePercentage >= quiz.passingScore;
  }

  const totalPossiblePoints = quiz.totalPoints;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const incorrectCount = results.filter((r) => !r.isCorrect && r.userAnswer).length;
  const unansweredCount = results.filter((r) => !r.userAnswer).length;

  useEffect(() => {
    if (isPassed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Only record attempt if NOT in view mode
    if (!viewMode) {
      recordQuizAttempt();
    }
  }, []);

  const recordQuizAttempt = async () => {
    try {
      const attemptResult = await statsAPI.recordAttempt({
        quizId: quiz.id,
        score: pointsEarned || 0,
        totalPoints: quiz.totalPoints || quiz.questions.reduce((sum, q) => sum + (q.points || 10), 0),
        timeSpent: 0,
        type: 'solo',
      });

      setXpGained(attemptResult.xpGained);

      if (attemptResult.leveledUp) {
        setLeveledUp(true);
        setNewLevel(attemptResult.newLevel);
      }

      if (attemptResult.achievement) {
        setUnlockedAchievement(attemptResult.achievement);
        setAchievementModal(true);
      }

      if (attemptResult.streakIncreased) {
        setStreakIncreased(true);
        setCurrentStreak(attemptResult.currentStreak);
      }

      if (isPassed && scorePercentage >= 80) {
        setShowConfetti(true);
        setTimeout(() => {
          confettiRef.current?.start();
        }, 500);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to record quiz attempt:', error);
      }
    }
  };

  const getAnswerDisplay = (question: QuizQuestion, answerIndex: string) => {
    if (question.type === 'MULTIPLE_CHOICE') {
      const index = parseInt(answerIndex);
      return question.options?.[index] || 'No answer';
    } else if (question.type === 'TRUE_FALSE') {
      return answerIndex === 'true' ? 'True' : answerIndex === 'false' ? 'False' : 'No answer';
    } else {
      return answerIndex || 'No answer';
    }
  };

  const getPerformanceMessage = () => {
    if (scorePercentage >= 90) return "Outstanding! 🌟";
    if (scorePercentage >= 80) return "Excellent work! 🎯";
    if (scorePercentage >= 70) return "Great job! 👍";
    if (scorePercentage >= 60) return "Good effort! 💪";
    return "Keep practicing! 📚";
  };

  const getPerformanceColor = () => {
    if (scorePercentage >= 80) return '#10B981'; // Green
    if (scorePercentage >= 60) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz Results</Text>
        <View style={styles.placeholder} />
      </View>

      {/* View Mode Banner */}
      {viewMode && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.viewModeBanner}>
          <Ionicons name="eye-outline" size={18} color="#6B7280" />
          <Text style={styles.viewModeText}>Viewing Past Result</Text>
        </Animated.View>
      )}

      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Score Circle - Big Colorful */}
        <Animated.View entering={ZoomIn.duration(600).delay(100)} style={styles.scoreSection}>
          <View style={[styles.scoreCircle, { borderColor: getPerformanceColor() }]}>
            <Text style={[styles.scoreNumber, { color: getPerformanceColor() }]}>{scorePercentage}%</Text>
            <Text style={styles.scoreLabel}>{isPassed ? 'Passed! 🎉' : 'Try Again'}</Text>
          </View>
          <Text style={styles.performanceMessage}>{getPerformanceMessage()}</Text>
        </Animated.View>

        {/* Stats Pills - Colorful Badges */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={[styles.statPillText, { color: '#065F46' }]}>{correctCount} Correct</Text>
          </View>
          
          <View style={[styles.statPill, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={[styles.statPillText, { color: '#991B1B' }]}>{incorrectCount} Wrong</Text>
          </View>
          
          {unansweredCount > 0 && (
            <View style={[styles.statPill, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="help-circle" size={20} color="#F59E0B" />
              <Text style={[styles.statPillText, { color: '#92400E' }]}>{unansweredCount} Skipped</Text>
            </View>
          )}
        </Animated.View>

        {/* Points Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.pointsCard}>
          <View style={styles.pointsRow}>
            <View style={styles.pointsItem}>
              <Text style={styles.pointsValue}>{totalPointsEarned}</Text>
              <Text style={styles.pointsLabel}>Points Earned</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.pointsItem}>
              <Text style={styles.pointsValue}>{totalPossiblePoints}</Text>
              <Text style={styles.pointsLabel}>Total Points</Text>
            </View>
          </View>
        </Animated.View>

        {/* XP & Streak Cards - Only show if NOT view mode */}
        {!viewMode && xpGained > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.rewardsSection}>
            {/* XP Card */}
            <View style={[styles.rewardCard, { backgroundColor: '#E0E7FF' }]}>
              <View style={styles.rewardIconBg}>
                <Ionicons name="flash" size={24} color="#6366F1" />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardValue}>+{xpGained} XP</Text>
                <Text style={styles.rewardLabel}>Experience Gained</Text>
              </View>
            </View>

            {/* Streak Card */}
            {streakIncreased && (
              <View style={[styles.rewardCard, { backgroundColor: '#FFEDD5' }]}>
                <View style={styles.rewardIconBg}>
                  <Text style={styles.rewardEmoji}>🔥</Text>
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardValue}>{currentStreak} Day Streak!</Text>
                  <Text style={styles.rewardLabel}>Keep it going!</Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* Performance Breakdown */}
        {!viewMode && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <PerformanceBreakdown
              correctCount={correctCount}
              totalQuestions={quiz.questions.length}
              accuracy={scorePercentage}
            />
          </Animated.View>
        )}

        {/* Analytics Navigation - Colorful Flat Cards */}
        {!viewMode && (
          <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.analyticsSection}>
            <Text style={styles.analyticsSectionTitle}>Explore More</Text>
            
            <TouchableOpacity 
              style={styles.analyticsCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Leaderboard' as never);
              }}
            >
              <View style={[styles.analyticsIconBg, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="trophy" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.analyticsInfo}>
                <Text style={styles.analyticsTitle}>Leaderboard</Text>
                <Text style={styles.analyticsSubtitle}>See how you rank</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.analyticsCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Stats' as never);
              }}
            >
              <View style={[styles.analyticsIconBg, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="stats-chart" size={24} color="#10B981" />
              </View>
              <View style={styles.analyticsInfo}>
                <Text style={styles.analyticsTitle}>My Stats</Text>
                <Text style={styles.analyticsSubtitle}>Track your progress</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.analyticsCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Achievements' as never);
              }}
            >
              <View style={[styles.analyticsIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="medal" size={24} color="#F59E0B" />
              </View>
              <View style={styles.analyticsInfo}>
                <Text style={styles.analyticsTitle}>Achievements</Text>
                <Text style={styles.analyticsSubtitle}>Unlock rewards</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.actionsSection}>
          {!viewMode && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.replace('TakeQuiz', { quiz });
              }}
            >
              <Ionicons name="refresh" size={22} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Retake Quiz</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDetails(!showDetails);
            }}
          >
            <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={22} color="#6366F1" />
            <Text style={styles.secondaryButtonText}>
              {showDetails ? 'Hide' : 'Review'} Answers
            </Text>
          </TouchableOpacity>

          {viewMode && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.goBack();
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Back to Feed</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Question Details - Expandable */}
        {showDetails && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Question Breakdown</Text>
            {results.map((result, index) => (
              <View key={index} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>Q{index + 1}</Text>
                  <View style={[
                    styles.questionStatusBadge,
                    { backgroundColor: result.isCorrect ? '#D1FAE5' : '#FEE2E2' }
                  ]}>
                    <Ionicons 
                      name={result.isCorrect ? "checkmark" : "close"} 
                      size={14} 
                      color={result.isCorrect ? '#10B981' : '#EF4444'} 
                    />
                    <Text style={[
                      styles.questionStatusText,
                      { color: result.isCorrect ? '#065F46' : '#991B1B' }
                    ]}>
                      {result.isCorrect ? 'Correct' : 'Incorrect'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.questionText}>{result.question.text}</Text>

                <View style={styles.answerSection}>
                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Your Answer:</Text>
                    <Text style={[
                      styles.answerText,
                      !result.isCorrect && styles.wrongAnswer
                    ]}>
                      {getAnswerDisplay(result.question, result.userAnswer)}
                    </Text>
                  </View>

                  {!result.isCorrect && (
                    <View style={styles.answerRow}>
                      <Text style={styles.answerLabel}>Correct Answer:</Text>
                      <Text style={[styles.answerText, styles.correctAnswer]}>
                        {getAnswerDisplay(result.question, result.question.correctAnswer)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.pointsRow}>
                  <Text style={styles.pointsEarnedText}>
                    {result.pointsEarned} / {result.question.points} points
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confetti */}
      {showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
          autoStart={false}
          fadeOut
        />
      )}

      {/* Modals */}
      {achievementModal && unlockedAchievement && (
        <AchievementUnlockModal
          achievement={unlockedAchievement}
          visible={achievementModal}
          onClose={() => setAchievementModal(false)}
        />
      )}

      {leveledUp && (
        <LevelUpModal
          visible={leveledUp}
          newLevel={newLevel}
          onClose={() => setLeveledUp(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  viewModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  // Score Section
  scoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: '800',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  performanceMessage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  // Stats Pills
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statPillText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Points Card
  pointsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsItem: {
    flex: 1,
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  pointsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  // Rewards Section
  rewardsSection: {
    gap: 12,
    marginBottom: 20,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  rewardIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardEmoji: {
    fontSize: 24,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  rewardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Analytics Section - Colorful Flat Cards
  analyticsSection: {
    gap: 12,
    marginBottom: 24,
  },
  analyticsSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  analyticsIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsInfo: {
    flex: 1,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  analyticsSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  // Actions
  actionsSection: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6366F1',
  },
  // Details Section
  detailsSection: {
    gap: 12,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6366F1',
  },
  questionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  questionStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    lineHeight: 22,
  },
  answerSection: {
    gap: 8,
    marginBottom: 8,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    minWidth: 100,
  },
  answerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  wrongAnswer: {
    color: '#EF4444',
  },
  correctAnswer: {
    color: '#10B981',
  },
  pointsEarnedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
});
