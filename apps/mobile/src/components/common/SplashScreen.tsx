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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StunityLogo from '../../../assets/Stunity.svg';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 2000,
}) => {
  // Animation values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start the sequences
    const animationSequence = Animated.sequence([
      // Hold for a moment to let the app fully mount behind the scenes
      Animated.delay(1000),
      // Perform the professional zoom-out animation
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 12, // Significant zoom for the Twitter-style "reveal-through-logo" effect
          duration: 600,
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
      ]),
    ]);

    animationSequence.start(() => {
      onComplete?.();
    });
  }, [onComplete]);

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
          <StunityLogo width={260} height={85} />
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  background: {
    flex: 1,
    backgroundColor: '#E0F2FE', // Matches native splash perfectly
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SplashScreen;
