import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { statsAPI, Streak } from '@/services/stats';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withSpring,
  Easing
} from 'react-native-reanimated';

interface StreakWidgetProps {
  userId: string;
  onPress?: () => void;
  compact?: boolean;
}

export const StreakWidget: React.FC<StreakWidgetProps> = ({
  userId,
  onPress,
  compact = false,
}) => {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);

  // Animation values
  const flameScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    loadStreak();
  }, [userId]);

  useEffect(() => {
    // Pulsing Flame Animation
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Glow pulsing
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const loadStreak = async () => {
    try {
      const data = await statsAPI.getStreak(userId);
      setStreak(data);
    } catch (error) {
      console.error('Failed to load streak:', error);
      // Mock data for demo if API fails
      /*
      setStreak({
        id: '1',
        userId: userId,
        currentStreak: 5,
        longestStreak: 12,
        lastQuizDate: new Date().toISOString(),
        freezesAvailable: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      */
    } finally {
      setLoading(false);
    }
  };

  if (loading || !streak) {
    return null;
    // Or return a skeleton loader if preferred
  }

  const isActive = streak.currentStreak > 0;
  const isOnFire = streak.currentStreak >= 3; // "On Fire" threshold

  const flameAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: flameScale.value }],
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
    };
  });

  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.compactContainer}>
        <Animated.Text style={[styles.compactFlame, flameAnimatedStyle]}>
          🔥
        </Animated.Text>
        <Text style={[styles.compactNumber, { color: isActive ? '#EF4444' : '#6B7280' }]}>
          {streak.currentStreak}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={isActive ? ['#FF4B1F', '#FF9068'] : ['#374151', '#1F2937']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Background Glow for active streak */}
        {isActive && (
          <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
            <LinearGradient
              colors={['rgba(255, 200, 50, 0.3)', 'transparent']}
              style={styles.glow}
            />
          </Animated.View>
        )}

        <View style={styles.content}>
          <View style={styles.leftSection}>
            <Animated.View style={[styles.flameContainer, flameAnimatedStyle]}>
              <Text style={styles.flameEmoji}>{isActive ? '🔥' : '🧊'}</Text>
            </Animated.View>

            <View>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <View style={styles.streakCountRow}>
                <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
                <Text style={styles.streakDays}>days</Text>
              </View>
            </View>
          </View>

          <View style={styles.rightSection}>
            {/* Freeze Status */}
            {streak.freezesAvailable > 0 && (
              <View style={styles.freezeBadge}>
                <Ionicons name="snow" size={12} color="#60A5FA" />
                <Text style={styles.freezeText}>{streak.freezesAvailable} Freezes</Text>
              </View>
            )}

            {/* Best Streak */}
            <View style={styles.bestContainer}>
              <Ionicons name="trophy" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.bestText}>Best: {streak.longestStreak}</Text>
            </View>
          </View>
        </View>

        {/* Motivation Text */}
        <View style={styles.footer}>
          <Text style={styles.motivationText}>
            {isActive
              ? (isOnFire ? "You're on fire! Keep it up! 🚀" : "Great start! Don't break the chain!")
              : "Play a quiz to start your streak!"}
          </Text>
        </View>

      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#000',
    
    
    shadowRadius: 2,
    
  },
  compactFlame: {
    fontSize: 16,
  },
  compactNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  container: {
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#F97316',
    
    shadowOpacity: 0.2,
    
    
    
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glow: {
    flex: 1,
    borderRadius: 14,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    
    borderColor: 'rgba(255,255,255,0.3)',
  },
  flameEmoji: {
    fontSize: 28,
  },
  streakLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  streakNumber: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 24,
  },
  streakDays: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  freezeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bestText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  motivationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
