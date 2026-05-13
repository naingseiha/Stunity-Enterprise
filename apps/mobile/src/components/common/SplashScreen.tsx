/**
 * Splash Screen Component
 *
 * Clean splash powered by react-native-reanimated (UI-thread animations).
 * Smooth logo entrance with spring + breathing, staggered bouncing dots.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Image, useWindowDimensions } from 'react-native';
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

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

/* ─── Bouncing dot ─── */

const BouncingDot: React.FC<{
  index: number;
  dotsOpacity: Animated.SharedValue<number>;
}> = ({ index, dotsOpacity }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value =       withDelay(
        index * 120,
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
  duration = 1400,
}) => {
  const { width } = useWindowDimensions();
  const logoWidth = useMemo(() => Math.min(width * 0.75, 320), [width]);
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

    // Logo entrance (kept tight for handoff from native splash)
    logoOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 100 });
    logoTranslateY.value = withTiming(0, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });

    // Dots fade in after logo settles
    dotsOpacity.value = withDelay(320, withTiming(1, { duration: 320 }));

    // Subtle breathing on logo
    logoBreath.value = withDelay(
      560,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );

    // Exit: gentle scale up + fade out
    const exitDelay = Math.max(700, duration - 380);
    const exitTimer = setTimeout(() => {
      cancelAnimation(logoBreath);
      containerScale.value = withTiming(1.06, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      containerOpacity.value = withTiming(
        0,
        { duration: 320, easing: Easing.out(Easing.cubic) },
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
        <Animated.View style={logoStyle}>
          <Image
            source={require('../../../assets/Stunity.png')}
            style={[styles.logo, { width: logoWidth }]}
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
  logo: {
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
  },
});

export default SplashScreen;
