import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statsAPI, type LeaderboardEntry } from '@/services/stats';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Leaderboard'>;
type TabType = 'global' | 'weekly';

export const LeaderboardScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  
  const fadeAnims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    try {
      if (activeTab === 'global') {
        const data = await statsAPI.getGlobalLeaderboard(page);
        setGlobalLeaderboard(data.leaderboard);
        
        // Initialize animations
        const newAnims: Animated.Value[] = [];
        data.leaderboard.forEach(() => {
          newAnims.push(new Animated.Value(0));
        });
        fadeAnims.splice(0, fadeAnims.length, ...newAnims);
        
        // Stagger animations
        data.leaderboard.forEach((_, index) => {
          setTimeout(() => {
            Animated.timing(fadeAnims[index], {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }, index * 50);
        });
      } else {
        const data = await statsAPI.getWeeklyLeaderboard();
        setWeeklyLeaderboard(data.leaderboard);
        
        // Initialize animations
        const newAnims: Animated.Value[] = [];
        data.leaderboard.forEach(() => {
          newAnims.push(new Animated.Value(0));
        });
        fadeAnims.splice(0, fadeAnims.length, ...newAnims);
        
        // Stagger animations
        data.leaderboard.forEach((_, index) => {
          setTimeout(() => {
            Animated.timing(fadeAnims[index], {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }, index * 50);
        });
      }
    } catch (error: any) {
      console.error('Load leaderboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#fbbf24'; // Gold
      case 2: return '#94a3b8'; // Silver
      case 3: return '#f97316'; // Bronze
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return 'trophy';
      case 2: return 'medal';
      case 3: return 'ribbon';
      default: return null;
    }
  };

  const renderGlobalItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const icon = getRankIcon(rank);
    
    return (
      <Animated.View
        style={[
          styles.leaderboardCard,
          { opacity: fadeAnims[index] || 1 },
        ]}
      >
        <View style={[styles.rankBadge, { backgroundColor: getRankColor(rank) }]}>
          {icon ? (
            <Ionicons name={icon} size={rank === 1 ? 28 : 24} color="#FFF" />
          ) : (
            <Text style={styles.rankText}>{rank}</Text>
          )}
        </View>

        <View style={styles.userAvatar}>
          <Text style={styles.userInitial}>
            {item.userId.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>User {item.userId.slice(0, 8)}</Text>
          <View style={styles.statsRow}>
            <Ionicons name="flash" size={14} color="#fbbf24" />
            <Text style={styles.xpText}>{item.xp} XP</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.levelText}>Lvl {item.level}</Text>
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

  const renderWeeklyItem = ({ item, index }: { item: any; index: number }) => {
    const rank = index + 1;
    const icon = getRankIcon(rank);
    
    return (
      <Animated.View
        style={[
          styles.leaderboardCard,
          { opacity: fadeAnims[index] || 1 },
        ]}
      >
        <View style={[styles.rankBadge, { backgroundColor: getRankColor(rank) }]}>
          {icon ? (
            <Ionicons name={icon} size={rank === 1 ? 28 : 24} color="#FFF" />
          ) : (
            <Text style={styles.rankText}>{rank}</Text>
          )}
        </View>

        <View style={styles.userAvatar}>
          <Text style={styles.userInitial}>
            {item.userId.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>User {item.userId.slice(0, 8)}</Text>
          <View style={styles.statsRow}>
            <Ionicons name="flash" size={14} color="#fbbf24" />
            <Text style={styles.xpText}>{item._sum.xpEarned} XP</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.levelText}>{item._count.id} quizzes</Text>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      <LinearGradient colors={['#667eea', '#764ba2', '#f093fb']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'global' && styles.tabActive]}
            onPress={() => setActiveTab('global')}
          >
            <Ionicons
              name="globe"
              size={20}
              color={activeTab === 'global' ? '#FFF' : 'rgba(255, 255, 255, 0.6)'}
            />
            <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>
              Global
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
            onPress={() => setActiveTab('weekly')}
          >
            <Ionicons
              name="calendar"
              size={20}
              color={activeTab === 'weekly' ? '#FFF' : 'rgba(255, 255, 255, 0.6)'}
            />
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="podium" size={48} color="#FFF" />
            <Text style={styles.loadingText}>Loading rankings...</Text>
          </View>
        ) : (
          <FlatList
            data={activeTab === 'global' ? globalLeaderboard : weeklyLeaderboard}
            renderItem={activeTab === 'global' ? renderGlobalItem : renderWeeklyItem}
            keyExtractor={(item, index) => `${activeTab}-${index}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
            }
          />
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
    paddingBottom: 20,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabTextActive: {
    color: '#FFF',
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  separator: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  levelText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  trendBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    padding: 6,
    borderRadius: 8,
  },
});
