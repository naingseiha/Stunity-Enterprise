/**
 * Quiz Results Screen - Enterprise Dark Glassmorphism Design
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  ZoomIn,
  FadeInUp,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { statsAPI } from '@/services/stats';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Interface Definitions
interface QuizQuestion {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'ORDERING' | 'MATCHING';
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
  } = route.params as {
    quiz: Quiz;
    answers: UserAnswer[];
    score?: number;
    passed?: boolean;
    pointsEarned?: number;
    results?: any[];
    viewMode?: boolean;
  };

  // State
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const confettiRef = useRef<any>(null);

  // Computed Values
  const totalPoints = pointsEarned || 0;
  const scorePercentage = score || 0;
  const isPassed = passed !== undefined ? passed : scorePercentage >= quiz.passingScore;

  // Manual calculation for display if API results aren't full
  const calculatedResults = quiz.questions.map((question) => {
    const userAnswer = answers.find((a) => a.questionId === question.id)?.answer;
    const isCorrect = userAnswer === question.correctAnswer;
    // Note: This is a simple check, complex types might need more logic or rely on API result
    return {
      question,
      userAnswer,
      isCorrect,
      points: isCorrect ? question.points : 0
    };
  });

  const correctCount = calculatedResults.filter(r => r.isCorrect).length;
  const incorrectCount = calculatedResults.length - correctCount;

  useEffect(() => {
    if (isPassed && !viewMode) {
      setShowConfetti(true);
      setTimeout(() => confettiRef.current?.start(), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const getPerformanceColor = () => {
    if (scorePercentage >= 80) return '#10B981'; // Green
    if (scorePercentage >= 60) return '#0EA5E9'; // Orange
    return '#EF4444'; // Red
  };

  const ringAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withRepeat(withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true) }]
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#4c1d95', '#2e1065', '#0f172a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Results</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Score Circle */}
          <View style={styles.scoreContainer}>
            <Animated.View style={[styles.scoreRing, { borderColor: getPerformanceColor() }, ringAnimatedStyle]}>
              <View style={styles.scoreInner}>
                <Text style={[styles.scoreText, { color: getPerformanceColor() }]}>
                  {scorePercentage}%
                </Text>
                <Text style={styles.scoreLabel}>
                  {isPassed ? 'PASSED' : 'FAILED'}
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Message */}
          <Animated.Text entering={FadeInDown.delay(300)} style={styles.messageText}>
            {isPassed ? "Outstanding Performance! 🎉" : "Keep Practicing! 📚"}
          </Animated.Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <Animated.View entering={ZoomIn.delay(400)} style={styles.statCard}>
              <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.statGradient}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.statValue}>{correctCount}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </LinearGradient>
            </Animated.View>
            <Animated.View entering={ZoomIn.delay(500)} style={styles.statCard}>
              <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.statGradient}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
                <Text style={styles.statValue}>{incorrectCount}</Text>
                <Text style={styles.statLabel}>Incorrect</Text>
              </LinearGradient>
            </Animated.View>
            <Animated.View entering={ZoomIn.delay(600)} style={styles.statCard}>
              <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.statGradient}>
                <Ionicons name="trophy" size={24} color="#FBBF24" />
                <Text style={styles.statValue}>{pointsEarned}</Text>
                <Text style={styles.statLabel}>XP Earned</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Explore & Compare Grid */}
          <View style={styles.exploreContainer}>
            <Text style={styles.sectionHeader}>What's Next?</Text>
            <View style={styles.exploreGrid}>
              <TouchableOpacity
                style={styles.exploreCard}
                onPress={() => navigation.navigate('Leaderboard' as any)}
              >
                <LinearGradient colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']} style={styles.exploreGradient}>
                  <Ionicons name="podium" size={24} color="#FBBF24" />
                  <Text style={styles.exploreLabel}>Rankings</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exploreCard}
                onPress={() => navigation.navigate('Stats' as any)}
              >
                <LinearGradient colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']} style={styles.exploreGradient}>
                  <Ionicons name="stats-chart" size={24} color="#60A5FA" />
                  <Text style={styles.exploreLabel}>My Stats</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exploreCard}
                onPress={() => navigation.navigate('Achievements' as any)}
              >
                <LinearGradient colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']} style={styles.exploreGradient}>
                  <Ionicons name="trophy" size={24} color="#A78BFA" />
                  <Text style={styles.exploreLabel}>Badges</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <Animated.View entering={FadeInUp.delay(800)} style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.primaryButtonText}>
                {showDetails ? 'Hide Details' : 'Review Answers'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Details Section */}
          {showDetails && (
            <Animated.View entering={FadeInDown} style={styles.detailsContainer}>
              {calculatedResults.map((result, index) => (
                <View key={index} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionNumber}>Q{index + 1}</Text>
                    <Ionicons
                      name={result.isCorrect ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={result.isCorrect ? "#10B981" : "#EF4444"}
                    />
                  </View>
                  <Text style={styles.questionText}>{result.question.text}</Text>
                  <Text style={[
                    styles.answerText,
                    { color: result.isCorrect ? '#10B981' : '#EF4444' }
                  ]}>
                    Your Answer: {result.userAnswer || 'Skipped'}
                  </Text>
                  {!result.isCorrect && (
                    <Text style={styles.correctAnswerText}>
                      Correct Answer: {result.question.correctAnswer}
                    </Text>
                  )}
                </View>
              ))}
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {showConfetti && (
          <ConfettiCannon
            ref={confettiRef}
            count={200}
            origin={{ x: SCREEN_WIDTH / 2, y: -20 }}
            autoStart={false}
            fadeOut={true}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 20,
  },
  scoreContainer: {
    marginBottom: 24,
  },
  scoreRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  scoreInner: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    letterSpacing: 1,
  },
  messageText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
    width: '100%',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    height: 100,
  },
  statGradient: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  exploreContainer: {
    width: '100%',
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
    marginLeft: 4,
  },
  exploreGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  exploreCard: {
    flex: 1,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
  },
  exploreGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  exploreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    
    shadowOpacity: 0.3,
    
    
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsContainer: {
    width: '100%',
    gap: 16,
  },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    
    borderColor: 'rgba(255,255,255,0.05)',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionNumber: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
  },
  questionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  answerText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  correctAnswerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
});
