import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { liveQuizAPI } from '@/services/liveQuiz';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'LiveQuizPlay'>;

const { width } = Dimensions.get('window');

export const LiveQuizPlayScreen: React.FC<Props> = ({ route, navigation }) => {
  const { sessionCode, participantId, isHost } = route.params;
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(1))
  ).current;

  useEffect(() => {
    loadCurrentQuestion();
    const interval = setInterval(pollQuestion, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentQuestion && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        
        // Animate progress bar
        Animated.timing(progressAnim, {
          toValue: timeLeft / currentQuestion.timeLimit,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted && currentQuestion) {
      // Time's up - auto submit
      handleSubmit();
    }
  }, [timeLeft, currentQuestion, isSubmitted]);

  const loadCurrentQuestion = async () => {
    try {
      const session = await liveQuizAPI.getSessionStatus(sessionCode);
      
      if (session.status === 'completed') {
        navigation.replace('LiveQuizPodium', { sessionCode });
        return;
      }
      
      if (session.currentQuestion !== null) {
        setCurrentQuestion(session.currentQuestion);
        setTimeLeft(session.currentQuestion.timeLimit || 30);
        progressAnim.setValue(1);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Load question error:', err);
    }
  };

  const pollQuestion = async () => {
    try {
      const session = await liveQuizAPI.getSessionStatus(sessionCode);
      
      // Check if moved to next question
      if (session.currentQuestion?.id !== currentQuestion?.id) {
        if (session.currentQuestion === null) {
          // Show leaderboard
          navigation.replace('LiveQuizLeaderboard', {
            sessionCode,
            participantId,
            isHost,
          });
        } else {
          // Reset for next question
          setCurrentQuestion(session.currentQuestion);
          setSelectedAnswer(null);
          setIsSubmitted(false);
          setPointsEarned(null);
          setTimeLeft(session.currentQuestion.timeLimit || 30);
          progressAnim.setValue(1);
        }
      }
    } catch (err: any) {
      console.error('Poll error:', err);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (isSubmitted) return;
    
    setSelectedAnswer(index);
    
    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (isSubmitted || selectedAnswer === null) return;
    
    setIsSubmitted(true);
    
    try {
      const timeSpent = (currentQuestion.timeLimit || 30) - timeLeft;
      const result = await liveQuizAPI.submitAnswer(sessionCode, participantId, {
        questionId: currentQuestion.id,
        answer: selectedAnswer.toString(),
        timeSpent,
      });
      
      setPointsEarned(result.pointsEarned);
      
      // Animate points
      Animated.spring(pointsAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error('Submit error:', err);
    }
  };

  const handleNextQuestion = async () => {
    try {
      await liveQuizAPI.nextQuestion(sessionCode);
      // Will update via polling
    } catch (err: any) {
      console.error('Next question error:', err);
    }
  };

  if (loading || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Ionicons name="hourglass-outline" size={48} color="#FFF" />
            <Text style={styles.loadingText}>Loading question...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressColor = timeLeft > 10 ? '#10b981' : timeLeft > 5 ? '#f59e0b' : '#ef4444';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
      >
        {/* Header with Timer */}
        <View style={styles.header}>
          <View style={styles.questionCounter}>
            <Text style={styles.questionCounterText}>
              {currentQuestion.index + 1} / {currentQuestion.total}
            </Text>
          </View>
          
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={20} color="#FFF" />
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: progressWidth, backgroundColor: progressColor },
            ]}
          />
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option: string, index: number) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = isSubmitted && index.toString() === currentQuestion.correctAnswer;
            const isWrong = isSubmitted && isSelected && !isCorrect;
            
            return (
              <Animated.View
                key={index}
                style={{ transform: [{ scale: scaleAnims[index] }] }}
              >
                <TouchableOpacity
                  onPress={() => handleAnswerSelect(index)}
                  disabled={isSubmitted}
                  style={[
                    styles.optionButton,
                    isSelected && !isSubmitted && styles.optionSelected,
                    isCorrect && styles.optionCorrect,
                    isWrong && styles.optionWrong,
                  ]}
                >
                  <View style={styles.optionContent}>
                    <View style={[
                      styles.optionIcon,
                      isSelected && !isSubmitted && styles.optionIconSelected,
                      isCorrect && styles.optionIconCorrect,
                      isWrong && styles.optionIconWrong,
                    ]}>
                      {isCorrect ? (
                        <Ionicons name="checkmark" size={20} color="#FFF" />
                      ) : isWrong ? (
                        <Ionicons name="close" size={20} color="#FFF" />
                      ) : (
                        <Text style={styles.optionIconText}>
                          {['A', 'B', 'C', 'D'][index]}
                        </Text>
                      )}
                    </View>
                    <Text style={[
                      styles.optionText,
                      (isCorrect || isWrong) && styles.optionTextHighlight,
                    ]}>
                      {option}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Points Earned */}
        {pointsEarned !== null && (
          <Animated.View
            style={[
              styles.pointsContainer,
              {
                transform: [
                  { scale: pointsAnim },
                  {
                    translateY: pointsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                opacity: pointsAnim,
              },
            ]}
          >
            <Ionicons name="trophy" size={32} color="#fbbf24" />
            <Text style={styles.pointsText}>+{pointsEarned} points</Text>
          </Animated.View>
        )}

        {/* Submit/Next Button */}
        {!isSubmitted ? (
          <TouchableOpacity
            style={[styles.submitButton, selectedAnswer === null && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={selectedAnswer === null}
          >
            <LinearGradient
              colors={selectedAnswer === null ? ['#94a3b8', '#64748b'] : ['#8b5cf6', '#7c3aed']}
              style={styles.submitButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitButtonText}>Submit Answer</Text>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : isHost ? (
          <TouchableOpacity style={styles.submitButton} onPress={handleNextQuestion}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.submitButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitButtonText}>Next Question</Text>
              <Ionicons name="arrow-forward" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingNextContainer}>
            <Ionicons name="hourglass-outline" size={24} color="#FFF" />
            <Text style={styles.waitingNextText}>Waiting for next question...</Text>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  questionCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  questionCounterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  questionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    minHeight: 120,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 32,
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
    borderColor: '#8b5cf6',
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    borderColor: '#10b981',
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    borderColor: '#ef4444',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: {
    backgroundColor: '#8b5cf6',
  },
  optionIconCorrect: {
    backgroundColor: '#10b981',
  },
  optionIconWrong: {
    backgroundColor: '#ef4444',
  },
  optionIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  optionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  optionTextHighlight: {
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  pointsText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fbbf24',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  waitingNextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  waitingNextText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});
