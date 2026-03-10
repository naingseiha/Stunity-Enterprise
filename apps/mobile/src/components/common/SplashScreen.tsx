/**
 * Splash Screen Component
 *
 * Lightweight JS transition splash shown right after native splash.
 * Uses a single Stunity wordmark for a clean, modern startup experience.
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

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 850,
}) => {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 110,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entrance.start();

    const fadeDelay = Math.max(420, duration - 260);
    const revealTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 230,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }, fadeDelay);

    return () => {
      clearTimeout(revealTimer);
    };
  }, [
    containerOpacity,
    duration,
    logoOpacity,
    logoScale,
    logoTranslateY,
    onComplete,
  ]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/Stunity.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#E0F2FE',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 18,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  logo: {
    width: Math.min(width * 0.82, 420),
    height: 92,
  },
});

export default SplashScreen;
