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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Brand Colors
const TEAL = '#09CFF7';
const TEAL_DARK = '#06A8CC';
const TEAL_LIGHT = '#E0F9FD';

// Interface Definitions
interface QuizQuestion {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'ORDERING' | 'MATCHING';
  options?: string[];
  correctAnswer: string;
  points: number;
  explanation?: string;
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

const DECORATIVE_ICONS = [
  { name: 'star', color: '#FBBF24', size: 24, top: 80, left: 40 },
  { name: 'rocket', color: '#8B5CF6', size: 30, top: 150, right: 30 },
  { name: 'bulb', color: '#10B981', size: 22, top: 250, left: 60 },
  { name: 'school', color: '#0EA5E9', size: 26, top: 40, right: 80 },
  { name: 'trophy', color: '#F59E0B', size: 28, bottom: 200, left: 30 },
];

export function QuizResultsScreen() {
  const navigation = useNavigation<any>();
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
    return {
      question,
      userAnswer,
      isCorrect,
      points: isCorrect ? question.points : 0
    };
  });

  const correctCount = calculatedResults.filter(r => r.isCorrect).length;
  const incorrectCount = calculatedResults.length - correctCount;

  // Animated values
  const ringScale = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    if (isPassed && !viewMode) {
      setShowConfetti(true);
      setTimeout(() => confettiRef.current?.start(), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Ring pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, [isPassed, viewMode, ringScale, contentFade]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#06A8CC', '#007A99', '#0F172A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Floating Elements */}
      {DECORATIVE_ICONS.map((icon, idx) => (
        <View
          key={idx}
          style={[
            styles.decorativeIcon,
            icon.top !== undefined && { top: icon.top },
            icon.bottom !== undefined && { bottom: icon.bottom },
            icon.left !== undefined && { left: icon.left },
            icon.right !== undefined && { right: icon.right },
          ]}
        >
          <Ionicons name={icon.name as any} size={icon.size} color={icon.color} style={{ opacity: 0.15 }} />
        </View>
      ))}

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.popToTop()}
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
          <Animated.View style={{ opacity: contentFade, alignItems: 'center', width: '100%' }}>
            {/* Score Circle */}
            <View style={styles.scoreContainer}>
              <Animated.View style={[
                styles.scoreRing,
                { transform: [{ scale: ringScale }] }
              ]}>
                <View style={styles.scoreInner}>
                  <Text style={styles.scoreText}>
                    {scorePercentage}%
                  </Text>
                  <Text style={styles.scoreLabel}>
                    {isPassed ? 'PASSED' : 'FAILED'}
                  </Text>
                </View>
              </Animated.View>
              <View style={styles.scoreGlow} />
            </View>

            {/* Message */}
            <Text style={styles.messageText}>
              {isPassed ? "Outstanding Performance! 🎉" : "Keep Practicing! 📚"}
            </Text>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.statGradient}>
                  <View style={[styles.statIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <Ionicons name="checkmark-sharp" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.statValue}>{correctCount}</Text>
                  <Text style={styles.statLabel}>Correct</Text>
                </LinearGradient>
              </View>
              <View style={styles.statCard}>
                <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.statGradient}>
                  <View style={[styles.statIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <Ionicons name="close-sharp" size={18} color="#EF4444" />
                  </View>
                  <Text style={styles.statValue}>{incorrectCount}</Text>
                  <Text style={styles.statLabel}>Incorrect</Text>
                </LinearGradient>
              </View>
              <View style={styles.statCard}>
                <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.statGradient}>
                  <View style={[styles.statIconCircle, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                    <Ionicons name="trophy" size={18} color="#FBBF24" />
                  </View>
                  <Text style={styles.statValue}>{pointsEarned}</Text>
                  <Text style={styles.statLabel}>XP Earned</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Explore & Compare Grid */}
            <View style={styles.exploreContainer}>
              <Text style={styles.sectionHeader}>What's Next?</Text>
              <View style={styles.exploreGrid}>
                <TouchableOpacity
                  style={styles.exploreCard}
                  onPress={() => navigation.navigate('Leaderboard' as any)}
                >
                  <LinearGradient colors={['rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0.1)']} style={styles.exploreGradient}>
                    <Ionicons name="podium" size={24} color="#FBBF24" />
                    <Text style={styles.exploreLabel}>Rankings</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exploreCard}
                  onPress={() => navigation.navigate('Stats' as any)}
                >
                  <LinearGradient colors={['rgba(9, 207, 247, 0.25)', 'rgba(9, 207, 247, 0.1)']} style={styles.exploreGradient}>
                    <Ionicons name="stats-chart" size={24} color={TEAL} />
                    <Text style={styles.exploreLabel}>My Stats</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exploreCard}
                  onPress={() => navigation.navigate('Achievements' as any)}
                >
                  <LinearGradient colors={['rgba(139, 92, 246, 0.25)', 'rgba(139, 92, 246, 0.1)']} style={styles.exploreGradient}>
                    <Ionicons name="medal" size={24} color="#A78BFA" />
                    <Text style={styles.exploreLabel}>Badges</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowDetails(!showDetails);
                }}
              >
                <LinearGradient
                  colors={[TEAL, TEAL_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  <Ionicons name={showDetails ? "eye-off" : "book"} size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>
                    {showDetails ? 'Hide Details' : 'Review Answers'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.7}
                onPress={() => navigation.popToTop()}
              >
                <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>

            {/* Details Section */}
            {showDetails && (
              <View style={styles.detailsContainer}>
                {calculatedResults.map((result, index) => (
                  <View key={index} style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <View style={styles.questionNumberBadge}>
                        <Text style={styles.questionNumber}>Question {index + 1}</Text>
                      </View>
                      <View style={[
                        styles.statusIndicator,
                        { backgroundColor: result.isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                      ]}>
                        <Ionicons
                          name={result.isCorrect ? "checkmark-circle" : "close-circle"}
                          size={16}
                          color={result.isCorrect ? "#10B981" : "#EF4444"}
                        />
                        <Text style={[styles.statusText, { color: result.isCorrect ? "#10B981" : "#EF4444" }]}>
                          {result.isCorrect ? 'Correct' : 'Incorrect'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.questionText}>{result.question.text}</Text>
                    
                    <View style={styles.answersBox}>
                      <View style={styles.answerRow}>
                        <Text style={styles.answerLabel}>Your Answer:</Text>
                        <Text style={[
                          styles.answerValue,
                          { color: result.isCorrect ? '#10B981' : '#EF4444' }
                        ]}>
                          {result.userAnswer || 'Skipped'}
                        </Text>
                      </View>
                      
                      {!result.isCorrect && (
                        <View style={styles.answerRow}>
                          <Text style={styles.answerLabel}>Correct Answer:</Text>
                          <Text style={[styles.answerValue, { color: '#10B981' }]}>
                            {result.question.correctAnswer}
                          </Text>
                        </View>
                      )}
                    </View>

                    {result.question.explanation && (
                      <View style={styles.explanationBox}>
                        <Ionicons name="information-circle" size={16} color={TEAL} style={{ marginTop: 2, marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.explanationTitle}>Explanation</Text>
                          <Text style={styles.explanationText}>
                            {result.question.explanation}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          <View style={{ height: 60 }} />
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
    backgroundColor: '#0F172A',
  },
  decorativeIcon: {
    position: 'absolute',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 30,
  },
  scoreContainer: {
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 10,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    zIndex: 2,
  },
  scoreGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: TEAL,
    opacity: 0.1,
    zIndex: 1,
  },
  scoreInner: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFF',
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    marginTop: -2,
    letterSpacing: 2,
  },
  messageText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 40,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
    width: '100%',
  },
  statCard: {
    flex: 1,
    height: 110,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statGradient: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exploreContainer: {
    width: '100%',
    marginBottom: 40,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '800',
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
    height: 95,
    borderRadius: 18,
    overflow: 'hidden',
  },
  exploreGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  exploreLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  primaryButton: {
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '700',
  },
  detailsContainer: {
    width: '100%',
    gap: 16,
  },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  questionNumberBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  questionNumber: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  questionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 20,
  },
  answersBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  answerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  answerLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  answerValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  explanationBox: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(9, 207, 247, 0.08)',
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: TEAL,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEAL,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  explanationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
});
