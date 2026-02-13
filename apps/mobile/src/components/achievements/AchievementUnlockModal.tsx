/**
 * AchievementUnlockModal
 * 
 * Beautiful modal shown when user unlocks an achievement
 * Includes confetti, animations, and XP reward display
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
import { Achievement } from '@/services/stats';

const { width, height } = Dimensions.get('window');

interface AchievementUnlockModalProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  visible,
  achievement,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible && achievement) {
      // Fire confetti
      setTimeout(() => {
        confettiRef.current?.start();
      }, 300);

      // Animate achievement badge
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible, achievement]);

  if (!achievement) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'streak': return ['#ef4444', '#dc2626'];
      case 'performance': return ['#f59e0b', '#d97706'];
      case 'milestone': return ['#8b5cf6', '#7c3aed'];
      case 'competition': return ['#10b981', '#059669'];
      default: return ['#6b7280', '#4b5563'];
    }
  };

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
          count={100}
          origin={{ x: width / 2, y: -10 }}
          autoStart={false}
          fadeOut
        />

        {/* Content */}
        <View style={styles.container}>
          <LinearGradient
            colors={getCategoryColor(achievement.category)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>Achievement Unlocked!</Text>

            {/* Badge */}
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
                <Text style={styles.icon}>{achievement.icon}</Text>
              </View>
            </Animated.View>

            {/* Achievement Name */}
            <Text style={styles.achievementName}>{achievement.name}</Text>

            {/* Description */}
            <Text style={styles.description}>{achievement.description}</Text>

            {/* XP Reward */}
            <View style={styles.xpContainer}>
              <Ionicons name="flash" size={24} color="#fbbf24" />
              <Text style={styles.xpText}>+{achievement.xpReward} XP</Text>
            </View>

            {/* Category Badge */}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {achievement.category.toUpperCase()}
              </Text>
            </View>

            {/* Continue Button */}
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <LinearGradient
                colors={['#fff', '#f3f4f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Awesome! 🎉</Text>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  badgeContainer: {
    marginBottom: 24,
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  icon: {
    fontSize: 64,
  },
  achievementName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  xpText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
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
    color: '#1f2937',
  },
});
