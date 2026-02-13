import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { liveQuizAPI } from '@/services/liveQuiz';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'LiveQuizLobby'>;

export const LiveQuizLobbyScreen: React.FC<Props> = ({ route, navigation }) => {
  const { sessionCode, participantId, isHost } = route.params;
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadParticipants();
    const interval = setInterval(loadParticipants, 2000); // Poll every 2s
    
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, []);

  const loadParticipants = async () => {
    try {
      const session = await liveQuizAPI.getSessionStatus(sessionCode);
      setParticipants(session.participants);
      
      // If session started, navigate to play screen
      if (session.status === 'active') {
        navigation.replace('LiveQuizPlay', {
          sessionCode,
          participantId,
          isHost,
        });
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load participants');
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      await liveQuizAPI.startSession(sessionCode);
      // Navigate will happen automatically via polling
    } catch (err: any) {
      setError(err.message || 'Failed to start session');
    }
  };

  const handleLeave = () => {
    navigation.goBack();
  };

  const renderParticipant = ({ item, index }: { item: any; index: number }) => (
    <Animated.View
      style={[
        styles.participantCard,
        {
          transform: [{
            scale: pulseAnim.interpolate({
              inputRange: [1, 1.1],
              outputRange: [1, index < 3 ? 1.02 : 1],
            }),
          }],
        },
      ]}
    >
      <View style={styles.participantAvatar}>
        <Text style={styles.participantInitial}>
          {item.nickname.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{item.nickname}</Text>
        <Text style={styles.participantStatus}>Ready</Text>
      </View>
      {index === 0 && (
        <View style={styles.hostBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#FFF" />
        </View>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleLeave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Lobby</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Session Code Display */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Session Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{sessionCode}</Text>
          </View>
          <Text style={styles.codeHint}>
            Share this code with participants
          </Text>
        </View>

        {/* Participants Count */}
        <View style={styles.countContainer}>
          <Ionicons name="people" size={24} color="#FFF" />
          <Text style={styles.countText}>
            {participants.length} {participants.length === 1 ? 'Player' : 'Players'}
          </Text>
        </View>

        {/* Participants List */}
        {loading && participants.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.participantsList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Action Button */}
        {isHost ? (
          <TouchableOpacity
            style={[
              styles.startButton,
              participants.length < 2 && styles.startButtonDisabled,
            ]}
            onPress={handleStart}
            disabled={participants.length < 2}
          >
            <LinearGradient
              colors={
                participants.length < 2
                  ? ['#94a3b8', '#64748b']
                  : ['#10b981', '#059669']
              }
              style={styles.startButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="play" size={24} color="#FFF" />
              <Text style={styles.startButtonText}>
                {participants.length < 2
                  ? 'Waiting for players...'
                  : 'Start Quiz'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="hourglass-outline" size={48} color="#FFF" />
            </Animated.View>
            <Text style={styles.waitingText}>Waiting for host to start...</Text>
          </View>
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
    paddingVertical: 16,
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
  codeContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  codeLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  codeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  codeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 8,
  },
  codeHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  countText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  participantsList: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  participantStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  hostBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  errorText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 14,
  },
  startButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  waitingContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 12,
  },
  waitingText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});
