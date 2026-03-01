/**
 * Live Quiz Join Screen
 * Students enter 6-digit code to join a live quiz session
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { liveQuizService } from '@/services/liveQuiz';

export function LiveQuizJoinScreen() {
  const navigation = useNavigation();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleCodeChange = (text: string) => {
    // Only allow numbers, max 6 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
  };

  const handleJoin = async () => {
    if (code.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid Code', 'Please enter a 6-digit session code');
      return;
    }

    try {
      setIsJoining(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Join the session
      const sessionData = await liveQuizService.joinSession(code);

      // Navigate to lobby
      (navigation as any).navigate('LiveQuizLobby', {
        sessionCode: code,
        quizTitle: sessionData.quizTitle,
        questionCount: sessionData.questionCount,
        hostId: sessionData.hostId,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Join session error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      const message = error.response?.data?.error || 'Failed to join session. Please check the code and try again.';
      Alert.alert('Join Failed', message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBg}>
              <Ionicons name="enter-outline" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Join Live Quiz</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code shared by your instructor
            </Text>
          </View>

          {/* Code Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="000000"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
              editable={!isJoining}
            />
            <Text style={styles.inputHint}>
              {code.length}/6 digits
            </Text>
          </View>

          {/* Join Button */}
          <TouchableOpacity
            onPress={handleJoin}
            disabled={code.length !== 6 || isJoining}
            style={[
              styles.joinButton,
              (code.length !== 6 || isJoining) && styles.joinButtonDisabled,
            ]}
            activeOpacity={0.8}
          >
            {isJoining ? (
              <ActivityIndicator color="#6366F1" size="small" />
            ) : (
              <>
                <Ionicons name="rocket" size={24} color="#6366F1" />
                <Text style={styles.joinButtonText}>Join Session</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#A78BFA" />
            <Text style={styles.infoText}>
              Make sure you have a stable internet connection for the best experience
            </Text>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366F1',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 32,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 20,
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inputHint: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',

    shadowOpacity: 0.3,


  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
  },
  infoCard: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
});
