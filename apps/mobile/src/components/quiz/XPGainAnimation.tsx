/**
 * XPGainAnimation
 * 
 * Animated XP gain display with counter animation
 * Shows XP earned with smooth counting effect
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface XPGainAnimationProps {
  xpGained: number;
  delay?: number;
}

export const XPGainAnimation: React.FC<XPGainAnimationProps> = ({
  xpGained,
  delay = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate counter
    Animated.timing(countAnim, {
      toValue: xpGained,
      duration: 1500,
      delay: delay + 200,
      useNativeDriver: false,
    }).start();
  }, [delay, xpGained]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#fbbf24', '#f59e0b', '#d97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Ionicons name="flash" size={24} color="#fff" />
        <View style={styles.textContainer}>
          <Animated.Text style={styles.xpValue}>
            {countAnim.interpolate({
              inputRange: [0, xpGained],
              outputRange: ['0', xpGained.toString()],
              extrapolate: 'clamp',
            })}
          </Animated.Text>
          <Text style={styles.xpLabel}>XP Earned</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
  },
  xpValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  xpLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
});
