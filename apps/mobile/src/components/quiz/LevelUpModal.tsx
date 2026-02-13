/**
 * LevelUpModal
 * 
 * Celebration modal shown when user levels up
 * Includes confetti, level badge, and XP progress
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

interface LevelUpModalProps {
  visible: boolean;
  newLevel: number;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  visible,
  newLevel,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      // Fire confetti
      setTimeout(() => {
        confettiRef.current?.start();
      }, 300);

      // Animate badge
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: width / 2, y: -10 }}
          autoStart={false}
          fadeOut
          colors={['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#667eea']}
        />

        {/* Content */}
        <View style={styles.container}>
          <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>Level Up!</Text>
            <Text style={styles.subtitle}>You've reached a new level!</Text>

            {/* Level Badge */}
            <Animated.View
              style={[
                styles.badgeContainer,
                {
                  transform: [
                    { scale: scaleAnim },
                    { rotate },
                  ],
                },
              ]}
            >
              <View style={styles.badge}>
                <Text style={styles.levelLabel}>LEVEL</Text>
                <Text style={styles.levelNumber}>{newLevel}</Text>
              </View>
            </Animated.View>

            {/* Message */}
            <Text style={styles.message}>
              Keep learning to unlock more achievements and rewards!
            </Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="flash" size={20} color="#fbbf24" />
                <Text style={styles.statText}>More XP per quiz</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trophy" size={20} color="#fbbf24" />
                <Text style={styles.statText}>Higher leaderboard rank</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="star" size={20} color="#fbbf24" />
                <Text style={styles.statText}>Special profile badge</Text>
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <LinearGradient
                colors={['#fbbf24', '#f59e0b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Continue 🎉</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width - 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 24,
  },
  badgeContainer: {
    marginBottom: 24,
  },
  badge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#fff',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    letterSpacing: 2,
  },
  levelNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 24,
    lineHeight: 24,
  },
  statsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
