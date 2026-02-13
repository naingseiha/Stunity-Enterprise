/**
 * StreakWidget
 * 
 * Compact widget showing current streak
 * Can be displayed in Profile, Feed, or other screens
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { statsAPI, Streak } from '@/services/stats';

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
  const flameAnim = new Animated.Value(1);

  useEffect(() => {
    loadStreak();
    startFlameAnimation();
  }, [userId]);

  const loadStreak = async () => {
    try {
      const data = await statsAPI.getStreak(userId);
      setStreak(data);
    } catch (error) {
      console.error('Failed to load streak:', error);
    } finally {
      setLoading(false);
    }
  };

  const startFlameAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  if (loading || !streak) {
    return null;
  }

  const isActive = streak.currentStreak > 0;
  const isOnFire = streak.currentStreak >= 7;

  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.compactContainer}>
        <Animated.Text style={[styles.compactFlame, { transform: [{ scale: isOnFire ? flameAnim : 1 }] }]}>
          🔥
        </Animated.Text>
        <Text style={styles.compactNumber}>{streak.currentStreak}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={isActive ? ['#ef4444', '#dc2626', '#b91c1c'] : ['#6b7280', '#4b5563']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Flame Icon */}
          <Animated.View style={{ transform: [{ scale: isOnFire ? flameAnim : 1 }] }}>
            <Text style={styles.flame}>🔥</Text>
          </Animated.View>

          {/* Streak Info */}
          <View style={styles.info}>
            <View style={styles.row}>
              <Text style={styles.number}>{streak.currentStreak}</Text>
              <Text style={styles.label}>Day Streak</Text>
            </View>

            {/* Best Streak */}
            <View style={styles.bestStreakContainer}>
              <Ionicons name="trophy" size={12} color="#fbbf24" />
              <Text style={styles.bestStreakText}>
                Best: {streak.longestStreak} days
              </Text>
            </View>
          </View>

          {/* Freeze Badge */}
          {streak.freezesAvailable > 0 && (
            <View style={styles.freezeBadge}>
              <Ionicons name="snow" size={16} color="#60a5fa" />
              <Text style={styles.freezeText}>{streak.freezesAvailable}</Text>
            </View>
          )}
        </View>

        {/* Status Message */}
        {isOnFire && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>🔥 You're on fire!</Text>
          </View>
        )}

        {!isActive && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Take a quiz to start your streak!</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  compactFlame: {
    fontSize: 16,
  },
  compactNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flame: {
    fontSize: 48,
  },
  info: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  number: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  label: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  bestStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bestStreakText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  freezeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  freezeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
});
