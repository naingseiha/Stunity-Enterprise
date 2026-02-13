import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import type { Challenge } from '@/services/stats';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ChallengeResult'>;

export const ChallengeResultScreen: React.FC<Props> = ({ route, navigation }) => {
  const { challenge } = route.params;
  const [userId] = React.useState('current-user-id'); // Get from auth context
  
  const confettiRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scoreAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const isChallenger = challenge.challengerId === userId;
  const userScore = isChallenger ? challenge.challengerScore : challenge.opponentScore;
  const opponentScore = isChallenger ? challenge.opponentScore : challenge.challengerScore;
  const isWinner = challenge.winnerId === userId;
  const isDraw = userScore === opponentScore;

  useEffect(() => {
    // Trigger confetti if winner
    if (isWinner && !isDraw) {
      setTimeout(() => {
        confettiRef.current?.start();
      }, 500);
    }

    // Animate result badge
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate scores
    scoreAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 300 + index * 200);
    });
  }, []);

  const handleRematch = () => {
    // TODO: Create new challenge with same opponent
    navigation.goBack();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      
      <LinearGradient colors={['#667eea', '#764ba2', '#f093fb']} style={styles.gradient}>
        {/* Confetti */}
        {isWinner && !isDraw && (
          <ConfettiCannon
            ref={confettiRef}
            count={150}
            origin={{ x: -10, y: 0 }}
            autoStart={false}
            fadeOut
          />
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.placeholder} />
            <Text style={styles.headerTitle}>Challenge Result</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Result Badge */}
          <Animated.View
            style={[
              styles.resultBadgeContainer,
              {
                transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={
                isDraw
                  ? ['#f59e0b', '#f97316']
                  : isWinner
                  ? ['#10b981', '#059669']
                  : ['#ef4444', '#dc2626']
              }
              style={styles.resultBadge}
            >
              <Ionicons
                name={isDraw ? 'git-compare' : isWinner ? 'trophy' : 'close-circle'}
                size={64}
                color="#FFF"
              />
            </LinearGradient>
            <Text style={styles.resultText}>
              {isDraw ? 'Draw!' : isWinner ? 'You Won!' : 'You Lost'}
            </Text>
            <Text style={styles.resultSubtext}>
              {isDraw
                ? 'Both scored the same'
                : isWinner
                ? 'Great job! Keep it up!'
                : "Don't give up, try again!"}
            </Text>
          </Animated.View>

          {/* Scores Comparison */}
          <View style={styles.scoresContainer}>
            <Animated.View
              style={[
                styles.scoreCard,
                {
                  transform: [{ scale: scoreAnims[0] }],
                  backgroundColor: isWinner && !isDraw
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(255, 255, 255, 0.2)',
                },
              ]}
            >
              <View style={styles.scoreAvatar}>
                <Ionicons name="person" size={32} color="#8b5cf6" />
              </View>
              <Text style={styles.scoreLabel}>You</Text>
              <Text style={styles.scoreValue}>{userScore ?? 0}</Text>
              {isWinner && !isDraw && (
                <View style={styles.winnerBadge}>
                  <Ionicons name="trophy" size={20} color="#fbbf24" />
                </View>
              )}
            </Animated.View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <Animated.View
              style={[
                styles.scoreCard,
                {
                  transform: [{ scale: scoreAnims[1] }],
                  backgroundColor: !isWinner && !isDraw
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(255, 255, 255, 0.2)',
                },
              ]}
            >
              <View style={styles.scoreAvatar}>
                <Ionicons name="person" size={32} color="#8b5cf6" />
              </View>
              <Text style={styles.scoreLabel}>Opponent</Text>
              <Text style={styles.scoreValue}>{opponentScore ?? 0}</Text>
              {!isWinner && !isDraw && (
                <View style={styles.winnerBadge}>
                  <Ionicons name="trophy" size={20} color="#fbbf24" />
                </View>
              )}
            </Animated.View>
          </View>

          {/* Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>Challenge Stats</Text>
            
            <View style={styles.statRow}>
              <Ionicons name="calendar" size={20} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>
                {challenge.completedAt
                  ? new Date(challenge.completedAt).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Ionicons name="time" size={20} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>
                {challenge.completedAt && challenge.createdAt
                  ? `${Math.round(
                      (new Date(challenge.completedAt).getTime() -
                        new Date(challenge.createdAt).getTime()) /
                        (1000 * 60)
                    )} min`
                  : 'N/A'}
              </Text>
            </View>

            <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
              <Ionicons name="analytics" size={20} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.statLabel}>Difference</Text>
              <Text style={styles.statValue}>
                {Math.abs((userScore ?? 0) - (opponentScore ?? 0))} points
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.rematchButton} onPress={handleRematch}>
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="refresh" size={24} color="#FFF" />
                <Text style={styles.actionButtonText}>Rematch</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
              <View style={styles.doneButtonContent}>
                <Text style={styles.doneButtonText}>Done</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
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
    paddingBottom: 24,
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadgeContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resultBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
    marginBottom: 20,
  },
  resultText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  scoresContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scoreAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
  },
  winnerBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.9)',
    padding: 6,
    borderRadius: 12,
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsSection: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  rematchButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  doneButton: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  doneButtonContent: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});
