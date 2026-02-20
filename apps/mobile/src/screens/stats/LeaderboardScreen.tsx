import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statsAPI, type LeaderboardEntry } from '@/services/stats';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withDelay,
  ZoomIn
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<MainStackParamList, 'Leaderboard'>;
type TabType = 'global' | 'weekly';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const LeaderboardScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [topThree, setTopThree] = useState<LeaderboardEntry[]>([]);
  const [restOfList, setRestOfList] = useState<LeaderboardEntry[]>([]);

  // Profile Modal State
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Animation values
  const tabPosition = useSharedValue(0);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  useEffect(() => {
    tabPosition.value = withSpring(activeTab === 'global' ? 0 : 1);
  }, [activeTab]);

  const loadLeaderboard = async () => {
    try {
      if (activeTab === 'global') {
        const data = await statsAPI.getGlobalLeaderboard(page);
        setGlobalLeaderboard(data.leaderboard);
        setTopThree(data.leaderboard.slice(0, 3));
        setRestOfList(data.leaderboard.slice(3));
      } else {
        const data = await statsAPI.getWeeklyLeaderboard();
        setWeeklyLeaderboard(data.leaderboard);
        // Adapt weekly data structure
        const formatted = data.leaderboard.map((item: any) => ({
          userId: item.userId,
          username: item.username,
          avatar: item.avatar,
          xp: item._sum.xpEarned,
          level: item._count.id, // Using quiz count as "level" metaphor for weekly
          totalQuizzes: item._count.id,
          totalPoints: 0, // Not available in weekly summary directly
        }));
        setTopThree(formatted.slice(0, 3));
        setRestOfList(formatted.slice(3));
      }
    } catch (error: any) {
      console.error('Load leaderboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadLeaderboard();
  };

  const handleUserPress = (user: LeaderboardEntry) => {
    Haptics.selectionAsync();
    setSelectedUser(user);
    setModalVisible(true);
  };

  const renderPodiumItem = (item: LeaderboardEntry, index: number) => {
    // 0 = 1st, 1 = 2nd, 2 = 3rd
    // Visual order on screen: 2nd (Left), 1st (Center/Top), 3rd (Right)

    let rank = index + 1;
    let rankColor = '';
    let scale = 1;
    let translateY = 0;

    if (index === 0) { // 1st Place
      rankColor = '#FBBF24'; // Gold
      scale = 1.1;
      translateY = -20;
    } else if (index === 1) { // 2nd Place
      rankColor = '#94A3B8'; // Silver
      scale = 0.9;
      translateY = 0;
    } else { // 3rd Place
      rankColor = '#F97316'; // Bronze
      scale = 0.9;
      translateY = 10;
    }

    return (
      <AnimatedTouchable
        entering={FadeInDown.delay(index * 200).springify()}
        style={[
          styles.podiumItem,
          { transform: [{ translateY }] }
        ]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[rankColor, 'rgba(255,255,255,0.2)']}
            style={styles.avatarGradient}
          >
            <View style={styles.avatarInner}>
              <Text style={[styles.avatarText, { color: rankColor }]}>
                {(item.username || item.userId).charAt(0).toUpperCase()}
              </Text>
            </View>
          </LinearGradient>
          <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
            <Text style={styles.rankBadgeText}>{rank}</Text>
          </View>
        </View>

        <Text style={styles.podiumName} numberOfLines={1}>
          {item.username || `User ${item.userId.slice(0, 4)}`}
        </Text>
        <Text style={styles.podiumXP}>{item.xp.toLocaleString()} XP</Text>
      </AnimatedTouchable>
    );
  };

  const renderListItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 4; // Start from 4th place

    return (
      <AnimatedTouchable
        entering={FadeInUp.delay(index * 50 + 500)}
        style={styles.listItem}
        activeOpacity={0.7}
        onPress={() => handleUserPress(item)}
      >
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>{rank}</Text>
          <Ionicons name="caret-up" size={12} color="#10B981" />
        </View>

        <View style={styles.listAvatar}>
          <Text style={styles.listAvatarText}>{(item.username || item.userId).charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.listContent}>
          <Text style={styles.listName}>{item.username || `User ${item.userId.slice(0, 8)}`}</Text>
          <Text style={styles.listLevel}>Lvl {item.level}</Text>
        </View>

        <View style={styles.listScore}>
          <Text style={styles.listScoreText}>{item.xp.toLocaleString()}</Text>
          <Text style={styles.listScoreLabel}>XP</Text>
        </View>
      </AnimatedTouchable>
    );
  };

  const TopPodium = () => {
    if (topThree.length === 0) return null;

    // Reorder for visual podium: 2nd, 1st, 3rd
    const first = topThree[0];
    const second = topThree[1];
    const third = topThree[2];

    return (
      <View style={styles.podiumContainer}>
        {second && renderPodiumItem(second, 1)}
        {first && renderPodiumItem(first, 0)}
        {third && renderPodiumItem(third, 2)}
      </View>
    );
  };

  const tabStyle = useAnimatedStyle(() => {
    const translateX = tabPosition.value * ((SCREEN_WIDTH - 40) / 2);
    return {
      transform: [{ translateX }]
    };
  });

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
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <Animated.View style={[styles.activeTabIndicator, tabStyle]} />
          <TouchableOpacity
            style={styles.tab}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('global');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'global' && styles.activeTabText]}>Global</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('weekly');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>Weekly</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.loadingText}>Loading Rankings...</Text>
          </View>
        ) : (
          <FlatList
            data={restOfList}
            renderItem={renderListItem}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={<TopPodium />}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
            }
          />
        )}
      </SafeAreaView>

      {/* User Profile Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          />
          <Animated.View
            entering={ZoomIn.duration(300)}
            style={styles.modalContent}
          >
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Player Card</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalAvatarContainer}>
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    style={styles.modalAvatarGradient}
                  >
                    <Text style={styles.modalAvatarText}>
                      {(selectedUser.username || selectedUser.userId).charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <Text style={styles.modalUserName}>{selectedUser.username || `User ${selectedUser.userId.slice(0, 8)}`}</Text>
                  <Text style={styles.modalUserLevel}>Level {selectedUser.level}</Text>
                </View>

                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="flash" size={24} color="#FBBF24" />
                    <Text style={styles.modalStatValue}>{selectedUser.xp.toLocaleString()}</Text>
                    <Text style={styles.modalStatLabel}>Total XP</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStatItem}>
                    <Ionicons name="document-text" size={24} color="#10B981" />
                    <Text style={styles.modalStatValue}>{selectedUser.totalQuizzes}</Text>
                    <Text style={styles.modalStatLabel}>Quizzes</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.challengeButton}
                  onPress={() => {
                    setModalVisible(false);
                    // TODO: Navigate to challenge screen
                    // navigation.navigate('ChallengeUser', { userId: selectedUser.userId });
                  }}
                >
                  <Text style={styles.challengeButtonText}>Challenge Player</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </Modal >
    </View >
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    padding: 4,
    height: 50,
    marginBottom: 20,
    position: 'relative',
  },
  activeTabIndicator: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 23,
    top: 4,
    left: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    zIndex: 1,
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    fontSize: 15,
  },
  activeTabText: {
    color: '#FFF',
    fontWeight: '700',
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
  listContainer: {
    paddingBottom: 30,
  },
  // Podium Styles
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 30,
    paddingHorizontal: 20,
    height: 180,
  },
  podiumItem: {
    alignItems: 'center',
    width: SCREEN_WIDTH / 3.5,
  },
  avatarContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  avatarGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e1b4b',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e1b4b',
  },
  rankBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  podiumName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  podiumXP: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  // List Item Styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  listAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    flex: 1,
  },
  listName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  listLevel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  listScore: {
    alignItems: 'flex-end',
  },
  listScoreText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
  },
  listScoreLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: '#1e1b4b',
    borderRadius: 24,
    padding: 24,
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  modalAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalAvatarText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFF',
  },
  modalUserName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  modalUserLevel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
    marginBottom: 4,
  },
  modalStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  modalStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  challengeButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  challengeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
