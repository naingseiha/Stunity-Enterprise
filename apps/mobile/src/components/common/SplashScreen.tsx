/**
 * Splash Screen Component
 * 
 * Beautiful animated splash screen matching web version:
 * - Animated logo entrance with smooth zoom
 * - Bouncing loading dots
 * - Floating bubble background particles
 * - Smooth fade out transition
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

const LoadingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(val, {
            toValue: -10,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(val, {
            toValue: 0,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
};

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 2800,
}) => {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ultra-premium spring entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Reveal sequence
    const revealTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 2.5,
          duration: 700,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }, duration - 800);

    return () => clearTimeout(revealTimer);
  }, [onComplete, duration]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
        },
      ]}
    >
      <View style={styles.background}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/Stunity.png')}
            style={{
              width: width * 0.82,
              height: undefined,
              aspectRatio: 2045 / 512,
            }}
            resizeMode="contain"
          />
        </Animated.View>
        <View style={styles.footer}>
          <LoadingDots />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#E0F2FE', // Set directly to prevent white flash
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 100,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#09CFF7',
  },
});

export default SplashScreen;
