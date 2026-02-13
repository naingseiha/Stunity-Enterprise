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
import ConfettiCannon from 'react-native-confetti-cannon';
import { liveQuizAPI } from '@/services/liveQuiz';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'LiveQuizPodium'>;

const { width, height } = Dimensions.get('window');

export const LiveQuizPodiumScreen: React.FC<Props> = ({ route, navigation }) => {
  const { sessionCode } = route.params;
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const confettiRef = useRef<any>(null);
  
  const scaleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  
  const slideAnims = useRef([
    new Animated.Value(100),
    new Animated.Value(100),
    new Animated.Value(100),
  ]).current;

  useEffect(() => {
    loadWinners();
  }, []);

  const loadWinners = async () => {
    try {
      const leaderboard = await liveQuizAPI.getLeaderboard(sessionCode);
      const top3 = leaderboard.slice(0, 3);
      
      // Rearrange for podium display: [2nd, 1st, 3rd]
      const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
      setWinners(podiumOrder);
      
      // Trigger confetti
      setTimeout(() => {
        confettiRef.current?.start();
      }, 500);
      
      // Animate podium entries
      podiumOrder.forEach((_, index) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(scaleAnims[index], {
              toValue: 1,
              friction: 6,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(slideAnims[index], {
              toValue: 0,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        }, index * 200);
      });
      
      setLoading(false);
    } catch (err: any) {
      console.error('Load winners error:', err);
    }
  };

  const handleFinish = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const getPodiumHeight = (index: number) => {
    // [2nd, 1st, 3rd] -> heights
    return [140, 180, 120][index] || 100;
  };

  const getPodiumColor = (index: number) => {
    return ['#94a3b8', '#fbbf24', '#f97316'][index] || '#64748b';
  };

  const getRankLabel = (index: number) => {
    return ['2nd', '1st', '3rd'][index] || '';
  };

  const getTrophySize = (index: number) => {
    return [40, 56, 36][index] || 32;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Ionicons name="trophy" size={64} color="#fbbf24" />
            <Text style={styles.loadingText}>Calculating results...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
      >
        {/* Confetti */}
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: width / 2, y: 0 }}
          autoStart={false}
          fadeOut
        />

        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="trophy" size={48} color="#fbbf24" />
          <Text style={styles.headerTitle}>🎉 Quiz Complete! 🎉</Text>
          <Text style={styles.headerSubtitle}>Congratulations to our winners!</Text>
        </View>

        {/* Podium */}
        <View style={styles.podiumContainer}>
          {winners.map((winner, index) => (
            <Animated.View
              key={winner.id}
              style={[
                styles.podiumItem,
                {
                  transform: [
                    { scale: scaleAnims[index] },
                    { translateY: slideAnims[index] },
                  ],
                },
              ]}
            >
              {/* Avatar */}
              <View style={styles.winnerAvatar}>
                <Text style={styles.winnerInitial}>
                  {winner.nickname.charAt(0).toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.crownBadge,
                    index === 1 && styles.crownBadgeFirst,
                  ]}
                >
                  <Ionicons
                    name={index === 1 ? 'trophy' : 'medal'}
                    size={getTrophySize(index)}
                    color="#FFF"
                  />
                </View>
              </View>

              {/* Name */}
              <Text style={styles.winnerName} numberOfLines={1}>
                {winner.nickname}
              </Text>

              {/* Score */}
              <View style={styles.scoreContainer}>
                <Ionicons name="flash" size={16} color="#fbbf24" />
                <Text style={styles.scoreText}>{winner.score}</Text>
              </View>

              {/* Podium Block */}
              <View
                style={[
                  styles.podiumBlock,
                  {
                    height: getPodiumHeight(index),
                    backgroundColor: getPodiumColor(index),
                  },
                ]}
              >
                <Text style={styles.rankLabel}>{getRankLabel(index)}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#FFF" />
            <Text style={styles.statValue}>{winners.length}</Text>
            <Text style={styles.statLabel}>Top Players</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={24} color="#fbbf24" />
            <Text style={styles.statValue}>
              {winners[1]?.score || 0}
            </Text>
            <Text style={styles.statLabel}>Highest Score</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={24} color="#fbbf24" />
            <Text style={styles.statValue}>Epic!</Text>
            <Text style={styles.statLabel}>Performance</Text>
          </View>
        </View>

        {/* Finish Button */}
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            style={styles.finishButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.finishButtonText}>Back to Feed</Text>
            <Ionicons name="home" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
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
    paddingBottom: 32,
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
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
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 110,
  },
  winnerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  winnerInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  crownBadge: {
    position: 'absolute',
    top: -12,
    right: -8,
    backgroundColor: '#f97316',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  crownBadgeFirst: {
    backgroundColor: '#fbbf24',
    width: 44,
    height: 44,
    borderRadius: 22,
    top: -16,
    right: -10,
  },
  winnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  rankLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  finishButton: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  finishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});
