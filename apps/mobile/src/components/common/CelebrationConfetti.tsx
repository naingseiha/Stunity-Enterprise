import React, { useEffect, useMemo } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

interface CelebrationConfettiProps {
  count?: number;
  origin?: { x: number; y: number };
  fallSpeed?: number;
  fadeOut?: boolean;
}

const COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function CelebrationConfetti({
  count = 90,
  origin = { x: Dimensions.get('window').width / 2, y: -10 },
  fallSpeed = 3000,
  fadeOut = true,
}: CelebrationConfettiProps) {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const drift = (Math.random() - 0.5) * width;
        const startDelay = Math.random() * 500;
        const size = 5 + Math.random() * 7;
        return {
          id: index,
          progress: new Animated.Value(0),
          color: COLORS[index % COLORS.length],
          drift,
          rotation: 180 + Math.random() * 720,
          size,
          startDelay,
          duration: fallSpeed + Math.random() * 900,
        };
      }),
    [count, fallSpeed, width]
  );

  useEffect(() => {
    const animations = pieces.map((piece) =>
      Animated.timing(piece.progress, {
        toValue: 1,
        duration: piece.duration,
        delay: piece.startDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, index) => {
        const translateX = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [origin.x, origin.x + piece.drift],
        });
        const translateY = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [origin.y, height + 40],
        });
        const rotate = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${piece.rotation}deg`],
        });
        const opacity = fadeOut
          ? piece.progress.interpolate({
              inputRange: [0, 0.75, 1],
              outputRange: [1, 1, 0],
            })
          : 1;

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.piece,
              {
                width: piece.size,
                height: piece.size * 1.7,
                backgroundColor: piece.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});
