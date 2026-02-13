import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statsAPI, type UserStats } from '@/services/stats';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Stats'>;

export const StatsScreen: React.FC<Props> = ({ navigation }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState('current-user-id'); // Get from auth context
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef([
    new Animated.Value(0.8),
    new Animated.Value(0.8),
    new Animated.Value(0.8),
    new Animated.Value(0.8),
  ]).current;

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (stats) {
      // Animate XP progress bar
      Animated.spring(progressAnim, {
        toValue: stats.xpProgress / stats.xpToNextLevel,
        friction: 6,
        useNativeDriver: false,
      }).start();

      // Animate stat cards
      scaleAnims.forEach((anim, index) => {
        setTimeout(() => {
          Animated.spring(anim, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }).start();
        }, index * 100);
      });
    }
  }, [stats]);

  const loadStats = async () => {
    try {
      const data = await statsAPI.getUserStats(userId);
      setStats(data);
    } catch (error: any) {
      console.error('Load stats error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Ionicons name="stats-chart" size={48} color="#FFF" />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      <LinearGradient colors={['#667eea', '#764ba2', '#f093fb']} style={styles.gradient}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your Stats</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Level Badge */}
          <View style={styles.levelContainer}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              style={styles.levelBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="trophy" size={32} color="#FFF" />
              <Text style={styles.levelNumber}>{stats.level}</Text>
            </LinearGradient>
            <Text style={styles.levelLabel}>Level {stats.level}</Text>
          </View>

          {/* XP Progress */}
          <View style={styles.xpContainer}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpLabel}>XP Progress</Text>
              <Text style={styles.xpValue}>
                {stats.xpProgress} / {stats.xpToNextLevel}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressWidth,
                    backgroundColor: '#10b981',
                  },
                ]}
              />
            </View>
            <Text style={styles.xpHint}>
              {stats.xpToNextLevel - stats.xpProgress} XP to Level {stats.level + 1}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <Animated.View
              style={[
                styles.statCard,
                { transform: [{ scale: scaleAnims[0] }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statCardGradient}
              >
                <Ionicons name="clipboard" size={28} color="#10b981" />
                <Text style={styles.statValue}>{stats.totalQuizzes}</Text>
                <Text style={styles.statLabel}>Quizzes</Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.statCard,
                { transform: [{ scale: scaleAnims[1] }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statCardGradient}
              >
                <Ionicons name="checkmark-circle" size={28} color="#fbbf24" />
                <Text style={styles.statValue}>{stats.avgScore.toFixed(1)}%</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.statCard,
                { transform: [{ scale: scaleAnims[2] }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statCardGradient}
              >
                <Ionicons name="flame" size={28} color="#f97316" />
                <Text style={styles.statValue}>{stats.winStreak}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.statCard,
                { transform: [{ scale: scaleAnims[3] }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.statCardGradient}
              >
                <Ionicons name="star" size={28} color="#8b5cf6" />
                <Text style={styles.statValue}>{stats.winRate.toFixed(0)}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Performance Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.performanceCard}>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Total Points</Text>
                <Text style={styles.performanceValue}>{stats.totalPoints.toLocaleString()}</Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Accuracy</Text>
                <Text style={styles.performanceValue}>
                  {((stats.correctAnswers / stats.totalAnswers) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.performanceRow}>
                <Text style={styles.performanceLabel}>Live Quiz Wins</Text>
                <Text style={styles.performanceValue}>
                  {stats.liveQuizWins} / {stats.liveQuizTotal}
                </Text>
              </View>
              <View style={[styles.performanceRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.performanceLabel}>Best Streak</Text>
                <Text style={styles.performanceValue}>{stats.bestStreak}</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {stats.recentAttempts.slice(0, 5).map((attempt) => (
              <View key={attempt.id} style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={attempt.type === 'live' ? 'people' : 'clipboard'}
                    size={20}
                    color="#8b5cf6"
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    {attempt.type === 'live' ? 'Live Quiz' : attempt.type === 'challenge' ? 'Challenge' : 'Solo Quiz'}
                  </Text>
                  <Text style={styles.activityTime}>
                    {new Date(attempt.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.activityStats}>
                  <Text style={styles.activityScore}>{attempt.accuracy.toFixed(0)}%</Text>
                  <Text style={styles.activityXP}>+{attempt.xpEarned} XP</Text>
                </View>
              </View>
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  levelBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
    marginBottom: 12,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 4,
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  xpContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  xpLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  xpValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  xpHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: '47%',
  },
  statCardGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  performanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  performanceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activityStats: {
    alignItems: 'flex-end',
  },
  activityScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  activityXP: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
});
