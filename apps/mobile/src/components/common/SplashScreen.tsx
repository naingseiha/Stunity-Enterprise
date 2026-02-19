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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Import Stunity logo from mobile assets
const StunityLogo = require('../../../assets/Stunity.png');

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 2800,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // Floating bubbles
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;

  // Bouncing dots
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance animation - Twitter style zoom in
    Animated.sequence([
      // First: fade in while scaling from small
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Show dots after logo appears
    setTimeout(() => {
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 600);

    // Floating bubbles animation
    const createBubbleAnimation = (anim: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createBubbleAnimation(bubble1Anim, 6000).start();
    setTimeout(() => createBubbleAnimation(bubble2Anim, 8000).start(), 1000);

    // Bouncing dots animation
    const createBounceAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(500 - delay),
        ])
      );
    };

    createBounceAnimation(dot1Anim, 0).start();
    createBounceAnimation(dot2Anim, 150).start();
    createBounceAnimation(dot3Anim, 300).start();

    // Twitter-style zoom out fade - logo scales up as it fades
    const fadeOutTimer = setTimeout(() => {
      Animated.parallel([
        // Fade out the whole screen
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        // Zoom the logo up (Twitter signature effect)
        Animated.timing(logoScale, {
          toValue: 2.5,
          duration: 400,
          useNativeDriver: true,
        }),
        // Also scale whole container slightly
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }, duration - 400);

    return () => {
      clearTimeout(fadeOutTimer);
    };
  }, [duration, onComplete]);

  // Bubble transform interpolations
  const bubble1Transform = {
    translateX: bubble1Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 15, 0],
    }),
    translateY: bubble1Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, -15, 0],
    }),
    scale: bubble1Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 1.08, 1],
    }),
  };

  const bubble2Transform = {
    translateX: bubble2Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, -12, 0],
    }),
    translateY: bubble2Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 12, 0],
    }),
    scale: bubble2Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.95, 1],
    }),
  };

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
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Floating bubbles - subtle background */}
        <Animated.View
          style={[
            styles.bubble,
            styles.bubble1,
            {
              transform: [
                { translateX: bubble1Transform.translateX },
                { translateY: bubble1Transform.translateY },
                { scale: bubble1Transform.scale },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            styles.bubble2,
            {
              transform: [
                { translateX: bubble2Transform.translateX },
                { translateY: bubble2Transform.translateY },
                { scale: bubble2Transform.scale },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            styles.bubble3,
            {
              transform: [
                { translateX: bubble1Transform.translateY },
                { translateY: bubble1Transform.translateX },
                { scale: bubble2Transform.scale },
              ],
            },
          ]}
        />

        {/* Center content - Logo only, no box */}
        <View style={styles.content}>
          {/* Logo with smooth zoom animation */}
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
              source={StunityLogo}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Loading dots */}
          <Animated.View style={[styles.dotsContainer, { opacity: dotsOpacity }]}>
            {[dot1Anim, dot2Anim, dot3Anim].map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -8],
                        }),
                      },
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.15],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#38BDF8', '#0EA5E9']}
                  style={styles.dotGradient}
                />
              </Animated.View>
            ))}
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
  bubble1: {
    top: '15%',
    left: '8%',
    width: 100,
    height: 100,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  bubble2: {
    top: '25%',
    right: '12%',
    width: 120,
    height: 120,
    backgroundColor: 'rgba(56, 189, 248, 0.10)',
  },
  bubble3: {
    bottom: '25%',
    left: '15%',
    width: 90,
    height: 90,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 260,
    height: 85,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  dotGradient: {
    flex: 1,
    borderRadius: 5,
  },
});

export default SplashScreen;
