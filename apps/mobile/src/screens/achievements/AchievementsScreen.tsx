/**
 * AchievementsScreen
 * 
 * Display all achievements (locked & unlocked)
 * Beautiful grid layout with unlock animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { statsAPI, Achievement, UserAchievement } from '@/services/stats';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export const AchievementsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const [allAchievements, userAch] = await Promise.all([
        statsAPI.getAchievements(),
        statsAPI.getUserAchievements('current-user-id'), // TODO: Get from auth context
      ]);

      setAchievements(allAchievements);
      setUserAchievements(userAch);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAchievements();
    setRefreshing(false);
  };

  const isUnlocked = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievementId === achievementId);
  };

  const getUnlockedDate = (achievementId: string) => {
    const ua = userAchievements.find(ua => ua.achievementId === achievementId);
    return ua ? new Date(ua.unlockedAt).toLocaleDateString() : null;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'streak': return '#ef4444';
      case 'performance': return '#f59e0b';
      case 'milestone': return '#8b5cf6';
      case 'competition': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderAchievement = ({ item, index }: { item: Achievement; index: number }) => {
    const unlocked = isUnlocked(item.id);
    const unlockedDate = getUnlockedDate(item.id);
    const scaleAnim = new Animated.Value(1);

    const handlePress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <Animated.View style={[styles.achievementCard, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          style={[
            styles.achievementContent,
            !unlocked && styles.achievementLocked,
          ]}
        >
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>

          {/* Icon */}
          <Text style={[styles.achievementIcon, !unlocked && styles.lockedIcon]}>
            {unlocked ? item.icon : '🔒'}
          </Text>

          {/* Name */}
          <Text style={[styles.achievementName, !unlocked && styles.lockedText]}>
            {item.name}
          </Text>

          {/* Description */}
          <Text style={[styles.achievementDescription, !unlocked && styles.lockedText]}>
            {item.description}
          </Text>

          {/* XP Reward */}
          <View style={styles.xpBadge}>
            <Ionicons name="flash" size={14} color="#fbbf24" />
            <Text style={styles.xpText}>{item.xpReward} XP</Text>
          </View>

          {/* Unlocked Date */}
          {unlocked && unlockedDate && (
            <View style={styles.unlockedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.unlockedText}>Unlocked {unlockedDate}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => {
    const unlockedCount = userAchievements.length;
    const totalCount = achievements.length;
    const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    return (
      <View style={styles.header}>
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Text style={styles.headerIcon}>🏆</Text>
          <Text style={styles.headerSubtitle}>
            {unlockedCount} of {totalCount} unlocked
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
          </View>
        </LinearGradient>

        {/* Category Filter */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Categories</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity style={[styles.filterButton, { borderColor: '#ef4444' }]}>
              <Text style={styles.filterButtonText}>🔥 Streaks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterButton, { borderColor: '#f59e0b' }]}>
              <Text style={styles.filterButtonText}>⚡ Performance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterButton, { borderColor: '#8b5cf6' }]}>
              <Text style={styles.filterButtonText}>⭐ Milestones</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterButton, { borderColor: '#10b981' }]}>
              <Text style={styles.filterButtonText}>⚔️ Competition</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Fixed Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Achievements</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={achievements}
        renderItem={renderAchievement}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#667eea" />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  // Top Fixed Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  headerGradient: {
    padding: 24,
    paddingTop: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    minWidth: 40,
  },
  filterContainer: {
    padding: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  achievementCard: {
    width: CARD_WIDTH,
  },
  achievementContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  achievementLocked: {
    opacity: 0.6,
    backgroundColor: '#f3f4f6',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  lockedIcon: {
    opacity: 0.5,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  lockedText: {
    color: '#9ca3af',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unlockedText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '500',
  },
});
