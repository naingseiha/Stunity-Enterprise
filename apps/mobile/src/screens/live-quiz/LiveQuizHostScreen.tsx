import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { liveQuizAPI } from '@/services/liveQuiz';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'LiveQuizHost'>;

export const LiveQuizHostScreen: React.FC<Props> = ({ route, navigation }) => {
  const { quizId } = route.params;
  const [sessionCode, setSessionCode] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createSession();
  }, []);

  useEffect(() => {
    if (sessionCode) {
      const interval = setInterval(loadParticipants, 2000);
      return () => clearInterval(interval);
    }
  }, [sessionCode]);

  const createSession = async () => {
    try {
      const session = await liveQuizAPI.createSession(quizId);
      setSessionCode(session.code);
      setQuiz(session.quiz);
      setLoading(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create session');
      navigation.goBack();
    }
  };

  const loadParticipants = async () => {
    try {
      const session = await liveQuizAPI.getSessionStatus(sessionCode);
      setParticipants(session.participants);
    } catch (err: any) {
      console.error('Load participants error:', err);
    }
  };

  const handleStart = async () => {
    if (participants.length < 1) {
      Alert.alert('No Participants', 'Wait for at least one participant to join.');
      return;
    }

    try {
      await liveQuizAPI.startSession(sessionCode);
      navigation.replace('LiveQuizLobby', {
        sessionCode,
        participantId: 'host',
        isHost: true,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start session');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this quiz session?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const renderParticipant = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.participantCard}>
      <View style={styles.participantAvatar}>
        <Text style={styles.participantInitial}>
          {item.nickname.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{item.nickname}</Text>
        <Text style={styles.participantStatus}>Ready</Text>
      </View>
      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
    </View>
  );

  if (loading || !quiz) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Ionicons name="hourglass-outline" size={48} color="#FFF" />
            <Text style={styles.loadingText}>Setting up session...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Host Quiz</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Quiz Info */}
        <View style={styles.quizInfoContainer}>
          <Text style={styles.quizTitle}>{quiz.title}</Text>
          {quiz.description && (
            <Text style={styles.quizDescription}>{quiz.description}</Text>
          )}
        </View>

        {/* Session Code */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Session Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{sessionCode}</Text>
          </View>
          <Text style={styles.codeHint}>
            Share this code with participants
          </Text>
        </View>

        {/* Participants */}
        <View style={styles.participantsHeader}>
          <Ionicons name="people" size={20} color="#FFF" />
          <Text style={styles.participantsTitle}>
            Participants ({participants.length})
          </Text>
        </View>

        {participants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-add-outline" size={48} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.emptyText}>Waiting for participants...</Text>
            <Text style={styles.emptyHint}>
              They can join using the session code
            </Text>
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

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.startButton,
              participants.length === 0 && styles.startButtonDisabled,
            ]}
            onPress={handleStart}
            disabled={participants.length === 0}
          >
            <LinearGradient
              colors={
                participants.length === 0
                  ? ['#94a3b8', '#64748b']
                  : ['#10b981', '#059669']
              }
              style={styles.startButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="play" size={24} color="#FFF" />
              <Text style={styles.startButtonText}>Start Quiz</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  closeButton: {
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
  quizInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  quizDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  startButton: {
    flex: 2,
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
});
