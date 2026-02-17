import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statsAPI, type Achievement, type UserAchievement } from '@/services/stats';
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
import Svg, { Polygon } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<MainStackParamList, 'Achievements'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Hexagon Badge Component
const HexagonBadge = ({ icon, locked, color }: { icon: string, locked: boolean, color: string }) => {
  return (
    <View style={styles.hexagonContainer}>
      <Svg height="80" width="80" viewBox="0 0 100 100">
        <Polygon
          points="50 5, 95 27.5, 95 72.5, 50 95, 5 72.5, 5 27.5"
          fill={locked ? 'rgba(255,255,255,0.1)' : color}
          stroke={locked ? 'rgba(255,255,255,0.2)' : 'white'}
          strokeWidth="2"
          opacity={locked ? 0.5 : 0.9}
        />
      </Svg>
      <View style={styles.iconContainer}>
        <Text style={{ fontSize: 32, opacity: locked ? 0.3 : 1 }}>{icon}</Text>
      </View>
      {locked && (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.6)" />
        </View>
      )}
    </View>
  );
};

export const AchievementsScreen: React.FC<Props> = ({ navigation }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState('current-user-id');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allData, userData] = await Promise.all([
        statsAPI.getAchievements(),
        statsAPI.getUserAchievements(userId)
      ]);
      setAchievements(allData);
      setUserAchievements(userData);
    } catch (error) {
      console.error('Failed to load achievements:', error);
      // Fallback mock data if API fails
      // setAchievements(MOCK_ACHIEVEMENTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadData();
  };

  const isUnlocked = (id: string) => {
    return userAchievements.some(ua => ua.achievementId === id);
  };

  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

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
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Progress Card */}
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.progressCard}
          >
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <Text style={styles.progressValue}>{unlockedCount}/{totalCount}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressSubtitle}>
              {totalCount - unlockedCount} more to master everything!
            </Text>
          </LinearGradient>

          <Text style={styles.sectionTitle}>All Badges</Text>

          <View style={styles.grid}>
            {achievements.map((item, index) => {
              const unlocked = isUnlocked(item.id);
              // Determine category color
              let color = '#8B5CF6'; // Default purple
              if (item.category === 'streak') color = '#F97316';
              if (item.category === 'performance') color = '#10B981';
              if (item.category === 'competition') color = '#F472B6';

              return (
                <Animated.View
                  key={item.id}
                  entering={ZoomIn.delay(index * 50)}
                  style={styles.badgeItem}
                >
                  <HexagonBadge
                    icon={item.icon}
                    locked={!unlocked}
                    color={color}
                  />
                  <Text style={[styles.badgeName, !unlocked && styles.lockedText]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  {unlocked && (
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpText}>+{item.xpReward} XP</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>

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
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Progress Card
  progressCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  progressValue: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 4,
  },
  progressSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },

  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  badgeItem: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  hexagonContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  badgeName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  lockedText: {
    color: 'rgba(255,255,255,0.5)',
  },
  badgeDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 8,
  },
  xpBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  xpText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '700',
  },
});
