import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statsAPI, type Challenge } from '@/services/stats';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Challenges'>;

export const ChallengeScreen: React.FC<Props> = ({ navigation }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId] = useState('current-user-id'); // Get from auth context

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const data = await statsAPI.getMyChallenges();
      setChallenges(data);
    } catch (error: any) {
      console.error('Load challenges error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChallenges();
  };

  const handleAcceptChallenge = async (challengeId: string) => {
    try {
      await statsAPI.acceptChallenge(challengeId);
      Alert.alert('Success', 'Challenge accepted! Take the quiz to compete.');
      loadChallenges();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept challenge');
    }
  };

  const handleStartChallenge = (challenge: Challenge) => {
    // Navigate to quiz with challenge mode
    // navigation.navigate('TakeQuiz', { quiz: challenge.quizId, challengeId: challenge.id });
    Alert.alert('Coming Soon', 'Challenge quiz will start here');
  };

  const handleViewResult = (challenge: Challenge) => {
    navigation.navigate('ChallengeResult', { challenge });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'active': return '#10b981';
      case 'completed': return '#8b5cf6';
      case 'expired': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'hourglass-outline';
      case 'active': return 'play-circle';
      case 'completed': return 'checkmark-circle';
      case 'expired': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderChallenge = (challenge: Challenge) => {
    const isChallenger = challenge.challengerId === userId;
    const isPending = challenge.status === 'pending';
    const isActive = challenge.status === 'active';
    const isCompleted = challenge.status === 'completed';
    const isWinner = challenge.winnerId === userId;
    
    return (
      <View key={challenge.id} style={styles.challengeCard}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(challenge.status) }]}>
          <Ionicons name={getStatusIcon(challenge.status)} size={16} color="#FFF" />
          <Text style={styles.statusText}>{challenge.status.toUpperCase()}</Text>
        </View>

        {/* Opponent Info */}
        <View style={styles.opponentSection}>
          <View style={styles.opponentAvatar}>
            <Ionicons name="person" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.opponentInfo}>
            <Text style={styles.opponentLabel}>
              {isChallenger ? 'Challenging' : 'Challenge from'}
            </Text>
            <Text style={styles.opponentName}>
              {isChallenger ? 'Opponent' : 'Challenger'}
            </Text>
          </View>
          {isCompleted && (
            <View style={[styles.resultBadge, { backgroundColor: isWinner ? '#10b981' : '#ef4444' }]}>
              <Ionicons name={isWinner ? 'trophy' : 'close'} size={20} color="#FFF" />
            </View>
          )}
        </View>

        {/* Scores */}
        {(isActive || isCompleted) && (
          <View style={styles.scoresSection}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>You</Text>
              <Text style={styles.scoreValue}>
                {isChallenger
                  ? challenge.challengerScore ?? '-'
                  : challenge.opponentScore ?? '-'}
              </Text>
            </View>
            <View style={styles.vsText}>
              <Text style={styles.vsLabel}>VS</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>
                {isChallenger ? 'Opponent' : 'Challenger'}
              </Text>
              <Text style={styles.scoreValue}>
                {isChallenger
                  ? challenge.opponentScore ?? '-'
                  : challenge.challengerScore ?? '-'}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          {isPending && !isChallenger && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptChallenge(challenge.id)}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Accept Challenge</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isActive && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => handleStartChallenge(challenge)}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="play" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Start Quiz</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isCompleted && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewResult(challenge)}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="eye" size={20} color="#FFF" />
                <Text style={styles.buttonText}>View Results</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Expiry */}
        {isPending && (
          <Text style={styles.expiryText}>
            Expires: {new Date(challenge.expiresAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  const pendingChallenges = challenges.filter(c => c.status === 'pending');
  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

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
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Challenges</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => Alert.alert('Coming Soon', 'Create challenge feature')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="trophy" size={48} color="#FFF" />
              <Text style={styles.loadingText}>Loading challenges...</Text>
            </View>
          ) : challenges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={64} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.emptyTitle}>No Challenges Yet</Text>
              <Text style={styles.emptyText}>
                Challenge your friends to compete in quizzes!
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => Alert.alert('Coming Soon', 'Create challenge')}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.createButtonGradient}
                >
                  <Ionicons name="add-circle" size={24} color="#FFF" />
                  <Text style={styles.createButtonText}>Create Challenge</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              {/* Pending */}
              {pendingChallenges.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Pending ({pendingChallenges.length})
                  </Text>
                  {pendingChallenges.map(renderChallenge)}
                </View>
              )}

              {/* Active */}
              {activeChallenges.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Active ({activeChallenges.length})
                  </Text>
                  {activeChallenges.map(renderChallenge)}
                </View>
              )}

              {/* Completed */}
              {completedChallenges.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Completed ({completedChallenges.length})
                  </Text>
                  {completedChallenges.map(renderChallenge)}
                </View>
              )}
            </View>
          )}

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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    width: '100%',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  challengeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  opponentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  opponentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  opponentInfo: {
    flex: 1,
  },
  opponentLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  opponentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  resultBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoresSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  vsText: {
    paddingHorizontal: 16,
  },
  vsLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionsSection: {
    gap: 12,
  },
  acceptButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  expiryText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
    textAlign: 'center',
  },
});
