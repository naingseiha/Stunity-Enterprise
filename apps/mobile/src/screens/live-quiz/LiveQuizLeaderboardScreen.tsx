import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { liveQuizAPI } from '@/services/liveQuiz';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'LiveQuizLeaderboard'>;

export const LiveQuizLeaderboardScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { sessionCode, participantId, isHost } = route.params;
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  
  const fadeAnims = useRef<Animated.Value[]>([]).current;
  const slideAnims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleContinue();
    }
  }, [countdown]);

  const loadLeaderboard = async () => {
    try {
      const data = await liveQuizAPI.getLeaderboard(sessionCode);
      setLeaderboard(data);
      
      // Initialize animations
      const newFadeAnims: Animated.Value[] = [];
      const newSlideAnims: Animated.Value[] = [];
      
      data.forEach((_, index) => {
        newFadeAnims[index] = new Animated.Value(0);
        newSlideAnims[index] = new Animated.Value(50);
      });
      
      fadeAnims.push(...newFadeAnims);
      slideAnims.push(...newSlideAnims);
      
      // Stagger animations
      data.forEach((_, index) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(fadeAnims[index], {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(slideAnims[index], {
              toValue: 0,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        }, index * 100);
      });
      
      setLoading(false);
    } catch (err: any) {
      console.error('Load leaderboard error:', err);
    }
  };

  const handleContinue = async () => {
    try {
      const session = await liveQuizAPI.getSessionStatus(sessionCode);
      
      if (session.status === 'completed') {
        navigation.replace('LiveQuizPodium', { sessionCode });
      } else {
        navigation.replace('LiveQuizPlay', {
          sessionCode,
          participantId,
          isHost,
        });
      }
    } catch (err: any) {
      console.error('Continue error:', err);
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#fbbf24'; // Gold
      case 2:
        return '#94a3b8'; // Silver
      case 3:
        return '#f97316'; // Bronze
      default:
        return 'rgba(255, 255, 255, 0.6)';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return 'trophy';
      case 2:
        return 'medal';
      case 3:
        return 'ribbon';
      default:
        return 'star-outline';
    }
  };

  const renderLeaderboardItem = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => {
    const rank = index + 1;
    const isCurrentUser = item.id === participantId;
    
    return (
      <Animated.View
        style={[
          styles.leaderboardCard,
          {
            opacity: fadeAnims[index] || 1,
            transform: [{ translateY: slideAnims[index] || 0 }],
          },
          isCurrentUser && styles.leaderboardCardHighlight,
        ]}
      >
        <View style={[styles.rankBadge, { backgroundColor: getRankColor(rank) }]}>
          {rank <= 3 ? (
            <Ionicons name={getRankIcon(rank)} size={24} color="#FFF" />
          ) : (
            <Text style={styles.rankText}>{rank}</Text>
          )}
        </View>

        <View style={styles.participantAvatar}>
          <Text style={styles.participantInitial}>
            {item.nickname.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {item.nickname}
            {isCurrentUser && ' (You)'}
          </Text>
          <View style={styles.scoreRow}>
            <Ionicons name="flash" size={14} color="#fbbf24" />
            <Text style={styles.scoreText}>{item.score} points</Text>
          </View>
        </View>

        {rank <= 3 && (
          <View style={styles.trendBadge}>
            <Ionicons name="trending-up" size={16} color="#10b981" />
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="podium" size={32} color="#FFF" />
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>

        {/* Countdown */}
        <View style={styles.countdownContainer}>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
          <Text style={styles.countdownLabel}>Next question starting...</Text>
        </View>

        {/* Leaderboard */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="hourglass-outline" size={48} color="#FFF" />
            <Text style={styles.loadingText}>Loading rankings...</Text>
          </View>
        ) : (
          <FlatList
            data={leaderboard}
            renderItem={renderLeaderboardItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.leaderboardList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Continue Button (Host only) */}
        {isHost && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.continueButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
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
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  countdownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  countdownText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  countdownLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
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
  leaderboardList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  leaderboardCardHighlight: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  trendBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    padding: 6,
    borderRadius: 8,
  },
  continueButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});
