/**
 * Splash Screen Component
 *
 * Smooth UI-thread animations powered by react-native-reanimated.
 * Logo entrance with spring + subtle breathing, staggered bouncing dots.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

/* ─── Bouncing dot (runs entirely on UI thread) ─── */

const BouncingDot: React.FC<{
  index: number;
  dotsOpacity: Animated.SharedValue<number>;
}> = ({ index, dotsOpacity }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 480 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(progress);
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -10]) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.15]) },
    ],
  }));

  return <Animated.View style={[styles.dot, style]} />;
};

/* ─── Main splash ─── */

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 1800,
}) => {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const logoTranslateY = useSharedValue(15);
  const logoBreath = useSharedValue(0);
  const dotsOpacity = useSharedValue(0);

  useEffect(() => {
    const handleComplete = () => {
      onCompleteRef.current?.();
    };

    // Logo entrance
    logoOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 90 });
    logoTranslateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    // Dots fade in after logo settles
    dotsOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

    // Subtle breathing on logo after entrance
    logoBreath.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
      ),
    );

    // Exit: gentle scale up + fade out
    const exitDelay = Math.max(800, duration - 400);
    const exitTimer = setTimeout(() => {
      cancelAnimation(logoBreath);
      containerScale.value = withTiming(1.06, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      });
      containerOpacity.value = withTiming(
        0,
        { duration: 380, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(handleComplete)();
          }
        },
      );
    }, exitDelay);

    return () => {
      clearTimeout(exitTimer);
      cancelAnimation(logoBreath);
    };
  }, [
    containerOpacity,
    containerScale,
    duration,
    logoOpacity,
    logoScale,
    logoTranslateY,
    logoBreath,
    dotsOpacity,
  ]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      {
        scale:
          logoScale.value +
          interpolate(logoBreath.value, [0, 1], [0, 0.015]),
      },
      {
        translateY:
          logoTranslateY.value +
          interpolate(logoBreath.value, [0, 1], [0, -2]),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require('../../../assets/Stunity.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <BouncingDot key={i} index={i} dotsOpacity={dotsOpacity} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  logo: {
    width: Math.min(width * 0.75, 320),
    height: 100,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f97316',
    shadowColor: '#fb923c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default SplashScreen;
