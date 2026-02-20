import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statsAPI, type UserStats } from '@/services/stats';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<MainStackParamList, 'Stats'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Simple Line Chart Component
const SimpleLineChart = ({ data, width, height }: { data: number[], width: number, height: number }) => {
  if (data.length < 2) return null;

  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Grid Lines */}
      <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {/* Chart Line */}
      <Path
        d={`M ${points}`}
        fill="none"
        stroke="#FBBF24"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data Points */}
      {data.map((val, i) => {
        const x = padding + (i / (data.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((val - min) / range) * chartHeight;
        return (
          <Circle key={i} cx={x} cy={y} r="4" fill="#FFF" />
        );
      })}
    </Svg>
  );
};

export const StatsScreen: React.FC<Props> = ({ navigation }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState('current-user-id');

  // Animation values
  const progressValue = useSharedValue(0);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (stats) {
      progressValue.value = withTiming(stats.xpProgress / stats.xpToNextLevel, { duration: 1000 });
    }
  }, [stats]);

  const loadStats = async () => {
    try {
      const data = await statsAPI.getUserStats(userId);
      setStats(data);
    } catch (error: any) {
      console.error('Load stats error:', error);
      // Fallback for demo if API fails
      // setStats(MOCK_STATS); 
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadStats();
  };

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
    };
  });

  if (loading || !stats) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#4c1d95', '#2e1065', '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <Ionicons name="stats-chart" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={styles.loadingText}>Loading Stats...</Text>
        </View>
      </View>
    );
  }

  // Extract scores for chart (reverse order to show oldest to newest)
  const scoreHistory = stats.recentAttempts?.map(a => a.score).reverse() || [0, 0];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#4c1d95', '#2e1065', '#0f172a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Stats</Text>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
          >
            <Ionicons name="share-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Level Card */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.levelCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.levelCardGradient}
            >
              <View style={styles.levelHeader}>
                <View>
                  <Text style={styles.levelLabel}>Current Level</Text>
                  <Text style={styles.levelValue}>{stats.level}</Text>
                </View>
                <View style={styles.trophyContainer}>
                  <Ionicons name="trophy" size={32} color="#FBBF24" />
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressTextRow}>
                  <Text style={styles.xpText}>{stats.xpProgress} XP</Text>
                  <Text style={styles.xpText}>{stats.xpToNextLevel} XP</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <Animated.View style={[styles.progressBarFill, progressStyle]} />
                </View>
                <Text style={styles.xpNextLevel}>
                  {stats.xpToNextLevel - stats.xpProgress} XP to Level {stats.level + 1}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Grid Stats */}
          <View style={styles.gridContainer}>
            {/* Quizzes Taken */}
            <Animated.View entering={ZoomIn.delay(200)} style={styles.gridItem}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                style={styles.gridGradient}
              >
                <Ionicons name="receipt-outline" size={24} color="#60A5FA" />
                <Text style={styles.gridValue}>{stats.totalQuizzes}</Text>
                <Text style={styles.gridLabel}>Quizzes</Text>
              </LinearGradient>
            </Animated.View>

            {/* Avg Score */}
            <Animated.View entering={ZoomIn.delay(300)} style={styles.gridItem}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.1)']}
                style={styles.gridGradient}
              >
                <Ionicons name="locate-outline" size={24} color="#34D399" />
                <Text style={styles.gridValue}>{stats.avgScore.toFixed(0)}%</Text>
                <Text style={styles.gridLabel}>Avg Score</Text>
              </LinearGradient>
            </Animated.View>

            {/* Streak */}
            <Animated.View entering={ZoomIn.delay(400)} style={styles.gridItem}>
              <LinearGradient
                colors={['rgba(249, 115, 22, 0.2)', 'rgba(249, 115, 22, 0.1)']}
                style={styles.gridGradient}
              >
                <Ionicons name="flame-outline" size={24} color="#FB923C" />
                <Text style={styles.gridValue}>{stats.winStreak}</Text>
                <Text style={styles.gridLabel}>Streak</Text>
              </LinearGradient>
            </Animated.View>

            {/* Win Rate */}
            <Animated.View entering={ZoomIn.delay(500)} style={styles.gridItem}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                style={styles.gridGradient}
              >
                <Ionicons name="star-outline" size={24} color="#A78BFA" />
                <Text style={styles.gridValue}>{stats.winRate.toFixed(0)}%</Text>
                <Text style={styles.gridLabel}>Pass Rate</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Performance Chart */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Recent Performance</Text>
            <View style={styles.chartCard}>
              <SimpleLineChart
                data={scoreHistory.length > 0 ? scoreHistory : [0, 0]}
                width={SCREEN_WIDTH - 60}
                height={150}
              />
              <Text style={styles.chartSubtitle}>Last {scoreHistory.length} Quizzes Scores</Text>
            </View>
          </Animated.View>

          {/* Detailed Performance */}
          <Animated.View entering={FadeInDown.delay(700)} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconBg}>
                  <Ionicons name="medal-outline" size={20} color="#FBBF24" />
                </View>
                <Text style={styles.detailLabel}>Total Points</Text>
                <Text style={styles.detailValue}>{stats.totalPoints.toLocaleString()}</Text>
              </View>
              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBg}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#34D399" />
                </View>
                <Text style={styles.detailLabel}>Correct Answers</Text>
                <Text style={styles.detailValue}>{stats.correctAnswers}/{stats.totalAnswers}</Text>
              </View>
              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBg}>
                  <Ionicons name="flash-outline" size={20} color="#F472B6" />
                </View>
                <Text style={styles.detailLabel}>Best Streak</Text>
                <Text style={styles.detailValue}>{stats.bestStreak}</Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
    fontSize: 16,
  },
  // Level Card
  levelCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  levelCardGradient: {
    padding: 24,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  levelLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  levelValue: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 48,
  },
  trophyContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  progressContainer: {
    gap: 8,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 4,
  },
  xpNextLevel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },
  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 52) / 2, // 20 padding * 2 + 12 gap = 52
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gridGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  gridLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  // Section
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  chartCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chartSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 10,
  },
  // Detail Card
  detailCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    
    borderColor: 'rgba(255,255,255,0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  detailIconBg: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  detailValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
