/**
 * Quiz Results Screen - Show Quiz Performance
 * Display score, correct/incorrect answers, and performance summary
 * Integrated with XP, streaks, and achievements
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { statsAPI } from '@/services/stats';
import { AchievementUnlockModal } from '@/components/achievements';
import { XPGainAnimation, LevelUpModal, PerformanceBreakdown } from '@/components/quiz';

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
    results: apiResults 
  } = route.params as { 
    quiz: Quiz; 
    answers: UserAnswer[];
    score?: number;
    passed?: boolean;
    pointsEarned?: number;
    results?: any[];
  };

  // State for XP/Achievement/Streak features
  const [xpGained, setXpGained] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [achievementModal, setAchievementModal] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<any>(null);
  const [streakIncreased, setStreakIncreased] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = React.useRef<any>(null);

  // Use API results if available, otherwise calculate locally
  let scorePercentage: number;
  let isPassed: boolean;
  let totalPointsEarned: number;
  let results: any[];

  if (score !== undefined && passed !== undefined && pointsEarned !== undefined) {
    // Use API results
    scorePercentage = score;
    isPassed = passed;
    totalPointsEarned = pointsEarned;
    
    // Map API results to local format
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
    // Fallback: Calculate locally (shouldn't happen with API)
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

    // Record quiz attempt and update stats
    recordQuizAttempt();
  }, []);

  const recordQuizAttempt = async () => {
    try {
      // 1. Record attempt (awards XP)
      const attemptResult = await statsAPI.recordAttempt({
        quizId: quiz.id,
        score: pointsEarned || 0, // Use actual points earned
        totalPoints: quiz.totalPoints || quiz.questions.reduce((sum, q) => sum + (q.points || 10), 0), // Calculate total points
        timeSpent: 0, // TODO: Track time in TakeQuizScreen
        type: 'solo',
      });

      setXpGained(attemptResult.xpGained);

      // Check if leveled up
      if (attemptResult.leveledUp) {
        setLeveledUp(true);
        setNewLevel(attemptResult.newLevel);
      }

      // 2. Update streak
      const streakResult = await statsAPI.updateStreak();
      
      if (streakResult.streakIncreased) {
        setStreakIncreased(true);
        setCurrentStreak(streakResult.streak.currentStreak);
      }

      // Check for streak achievement
      if (streakResult.achievementUnlocked) {
        const achievements = await statsAPI.getAchievements();
        const unlocked = achievements.find(a => a.id === streakResult.achievementUnlocked);
        if (unlocked) {
          setUnlockedAchievement(unlocked);
          setAchievementModal(true);
        }
      }

      // 3. Check for other achievements
      const newAchievements = await statsAPI.checkAchievements();
      
      if (newAchievements.length > 0 && !streakResult.achievementUnlocked) {
        setUnlockedAchievement(newAchievements[0].achievement);
        setAchievementModal(true);
      }

      // 4. Show confetti for perfect score
      if (scorePercentage === 100) {
        setShowConfetti(true);
        setTimeout(() => {
          confettiRef.current?.start();
        }, 500);
      }
    } catch (error: any) {
      // Analytics service not available - this is OK, just log it
      if (__DEV__) {
        console.warn('⚠️  Analytics service unavailable - XP/achievements disabled');
      }
      // Don't show error to user, let them see results anyway
      // Still show confetti for perfect score
      if (scorePercentage === 100) {
        setShowConfetti(true);
        setTimeout(() => {
          confettiRef.current?.start();
        }, 500);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.closeButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz Results</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <Animated.View entering={ZoomIn.duration(500).delay(100)} style={styles.scoreCard}>
          <LinearGradient
            colors={isPassed ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
            style={styles.scoreGradient}
          >
            <Ionicons
              name={isPassed ? 'checkmark-circle' : 'close-circle'}
              size={64}
              color="#FFFFFF"
              style={styles.scoreIcon}
            />
            <Text style={styles.scorePercentage}>{scorePercentage}%</Text>
            <Text style={styles.scoreLabel}>{isPassed ? 'Passed!' : 'Not Passed'}</Text>
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreDetailText}>
                {totalPointsEarned} / {totalPossiblePoints} points
              </Text>
              <Text style={styles.scoreDetailText}>
                Passing score: {quiz.passingScore}%
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Summary Stats */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{correctCount}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </View>
              <Text style={styles.statValue}>{incorrectCount}</Text>
              <Text style={styles.statLabel}>Incorrect</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="help-circle" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{unansweredCount}</Text>
              <Text style={styles.statLabel}>Skipped</Text>
            </View>
          </View>
        </Animated.View>

        {/* XP Gain Animation */}
        {xpGained > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <XPGainAnimation xpGained={xpGained} delay={500} />
          </Animated.View>
        )}

        {/* Streak Notification */}
        {streakIncreased && (
          <Animated.View entering={FadeInDown.duration(500).delay(700)} style={styles.streakCard}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.streakGradient}
            >
              <Text style={styles.streakEmoji}>🔥</Text>
              <View style={styles.streakContent}>
                <Text style={styles.streakTitle}>{currentStreak}-Day Streak!</Text>
                <Text style={styles.streakSubtitle}>Keep it up! Complete a quiz every day.</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Performance Breakdown */}
        <Animated.View entering={FadeInDown.duration(500).delay(900)}>
          <PerformanceBreakdown
            correctCount={correctCount}
            totalQuestions={quiz.questions.length}
            accuracy={scorePercentage}
          />
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.duration(500).delay(1100)} style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>What's Next?</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Leaderboard' as never)}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <Ionicons name="trophy" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>View Leaderboard</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Stats' as never)}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <Ionicons name="stats-chart" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>My Stats</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Achievements' as never)}
          >
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <Ionicons name="medal" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Achievements</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Questions Review */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <Ionicons name="list-outline" size={20} color="#6366F1" />
            <Text style={styles.reviewTitle}>Review Answers</Text>
          </View>

          {results.map((result, index) => (
            <Animated.View
              key={result.question.id}
              entering={FadeInDown.duration(400).delay(600 + index * 50)}
              style={[
                styles.questionReviewCard,
                result.isCorrect
                  ? styles.questionCorrect
                  : result.userAnswer
                  ? styles.questionIncorrect
                  : styles.questionSkipped,
              ]}
            >
              {/* Question Header */}
              <View style={styles.questionReviewHeader}>
                <View style={styles.questionNumberBadge}>
                  <Text style={styles.questionNumberBadgeText}>Q{index + 1}</Text>
                </View>
                <View style={styles.questionStatus}>
                  {result.isCorrect ? (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.statusTextCorrect}>Correct</Text>
                    </>
                  ) : result.userAnswer ? (
                    <>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.statusTextIncorrect}>Incorrect</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="help-circle" size={20} color="#F59E0B" />
                      <Text style={styles.statusTextSkipped}>Skipped</Text>
                    </>
                  )}
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsBadgeText}>
                    {result.pointsEarned}/{result.question.points} pts
                  </Text>
                </View>
              </View>

              {/* Question Text */}
              <Text style={styles.questionReviewText}>{result.question.text}</Text>

              {/* Answers */}
              <View style={styles.answersSection}>
                {result.userAnswer && (
                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Your Answer:</Text>
                    <Text
                      style={[
                        styles.answerText,
                        result.isCorrect ? styles.answerCorrect : styles.answerIncorrect,
                      ]}
                    >
                      {getAnswerDisplay(result.question, result.userAnswer)}
                    </Text>
                  </View>
                )}

                {!result.isCorrect && (
                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Correct Answer:</Text>
                    <Text style={[styles.answerText, styles.answerCorrect]}>
                      {getAnswerDisplay(result.question, result.question.correctAnswer)}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(800)} style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Feed')}
            style={styles.actionButtonPrimary}
          >
            <Ionicons name="home-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonPrimaryText}>Back to Feed</Text>
          </TouchableOpacity>

          {!passed && (
            <TouchableOpacity
              onPress={() => {
                navigation.goBack();
                navigation.navigate('TakeQuiz', { quiz });
              }}
              style={styles.actionButtonSecondary}
            >
              <Ionicons name="refresh-outline" size={20} color="#6366F1" />
              <Text style={styles.actionButtonSecondaryText}>Retake Quiz</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Confetti for Perfect Score */}
      {showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={false}
          fadeOut
        />
      )}

      {/* Level Up Modal */}
      <LevelUpModal
        visible={leveledUp}
        newLevel={newLevel}
        onClose={() => {
          setLeveledUp(false);
          // Show achievement modal if there is one
          if (unlockedAchievement && !achievementModal) {
            setAchievementModal(true);
          }
        }}
      />

      {/* Achievement Unlock Modal */}
      <AchievementUnlockModal
        visible={achievementModal}
        achievement={unlockedAchievement}
        onClose={() => {
          setAchievementModal(false);
          setUnlockedAchievement(null);
        }}
      />
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scoreCard: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scoreGradient: {
    padding: 32,
    alignItems: 'center',
  },
  scoreIcon: {
    marginBottom: 16,
  },
  scorePercentage: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  scoreDetails: {
    alignItems: 'center',
    gap: 4,
  },
  scoreDetailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  questionReviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  questionCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  questionIncorrect: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  questionSkipped: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  questionReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  questionNumberBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  questionNumberBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
  questionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statusTextCorrect: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  statusTextIncorrect: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  statusTextSkipped: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  pointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  questionReviewText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 12,
  },
  answersSection: {
    gap: 8,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 110,
  },
  answerText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  answerCorrect: {
    color: '#10B981',
  },
  answerIncorrect: {
    color: '#EF4444',
  },
  actionsContainer: {
    marginHorizontal: 20,
    gap: 12,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    gap: 8,
  },
  actionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
  bottomSpacer: {
    height: 40,
  },
  streakCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  streakGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  streakEmoji: {
    fontSize: 48,
  },
  streakContent: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  streakSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  actionsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
