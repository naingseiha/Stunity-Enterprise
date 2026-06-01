/**
 * Horizontal swipe between bottom tabs — Instagram / Facebook style, with
 * an interactive drag-follow animation.
 *
 * Animation phases:
 *   1. Pan progress: the current tab's content translates with the finger
 *      (clamped & rubber-banded at the ends).
 *   2. Pan release with a committed swipe: content animates off-screen in the
 *      swipe direction, then `navigation.navigate` switches the tab.
 *   3. Pan release uncommitted: content springs back to 0.
 *   4. New tab gains focus: slides in from the opposite side via `useFocusEffect`
 *      so the destination feels continuous with the gesture.
 *
 * Coexistence with inner scrollables:
 *   • Vertical scrolls (FlashList, ScrollView) — failOffsetY cancels the pan
 *   • In-screen horizontal carousels — activeOffsetX threshold lets the inner
 *     gesture win first
 *   • Deep stack screens (PostDetail, Comments, …) — disabled via NO_SWIPE_ROUTES
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  useNavigation,
  useNavigationState,
  useFocusEffect,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';
import { Haptics } from '@/services/haptics';
import type { MainTabParamList } from '@/navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SWIPEABLE_TAB_ORDER: (keyof MainTabParamList)[] = [
  'FeedTab',
  'ReelsTab',
  'LearnTab',
  'ClubsTab',
  'ProfileTab',
];

const NO_SWIPE_ROUTES = new Set<string>([
  'Comments',
  'PostDetail',
  'CreatePost',
  'EditPost',
  'CourseDetail',
  'LessonViewer',
  'BountyDetail',
  'CreateBounty',
  'EditProfile',
  'Settings',
  'PasswordSecurity',
]);

const ACTIVATION_OFFSET_X = 25;
const FAIL_OFFSET_Y = 18;
const COMMIT_DISTANCE = SCREEN_WIDTH * 0.22;
const COMMIT_VELOCITY = 500;
const COMMIT_ANIM_MS = 220;
const ENTRANCE_ANIM_MS = 260;
const RUBBER_BAND_FACTOR = 0.35;

interface Props {
  tabName: keyof MainTabParamList;
  children: React.ReactNode;
}

// Shared across tab containers so when a swipe lands we know which direction
// the *destination* should slide in from. Stored as a plain `let` (not a
// `{ current }` object) so Reanimated's freeze-detection doesn't mistake it
// for a useRef when `doNavigate` is captured by runOnJS.
let lastSwipeDirection: -1 | 0 | 1 = 0;

export const SwipeableTabContainer: React.FC<Props> = ({ tabName, children }) => {
  const navigation = useNavigation<any>();
  const translateX = useSharedValue(0);
  // isCommitting is read/written from inside Pan worklets (.onUpdate / .onEnd)
  // — it MUST be a SharedValue, not a useRef. Using useRef captures the ref
  // object as a shareable and Reanimated rejects subsequent `.current = …`
  // writes ("Tried to modify key `current` of an object…").
  const isCommitting = useSharedValue(false);

  const focusedRoute = useNavigationState((state) => {
    const top = state.routes[state.index];
    return getFocusedRouteNameFromRoute(top) ?? top.name;
  });

  const currentIdx = SWIPEABLE_TAB_ORDER.indexOf(tabName);
  const hasNext = currentIdx >= 0 && currentIdx < SWIPEABLE_TAB_ORDER.length - 1;
  const hasPrev = currentIdx > 0;

  const swipeEnabled = useMemo(() => {
    if (NO_SWIPE_ROUTES.has(focusedRoute)) return false;
    return true;
  }, [focusedRoute]);

  // Slide-in entrance when this tab becomes focused after a committed swipe.
  useFocusEffect(
    useCallback(() => {
      if (lastSwipeDirection !== 0) {
        const from = lastSwipeDirection === 1 ? SCREEN_WIDTH : -SCREEN_WIDTH;
        translateX.value = from;
        translateX.value = withTiming(0, { duration: ENTRANCE_ANIM_MS });
        lastSwipeDirection = 0;
      } else {
        // Defensive: ensure the screen is on-screen even without a recent swipe
        // (e.g. when the user taps the tab icon directly).
        translateX.value = 0;
      }
      isCommitting.value = false;
      return () => {};
    }, [translateX, isCommitting]),
  );

  const doNavigate = useCallback(
    (direction: 'next' | 'prev') => {
      const targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
      if (targetIdx < 0 || targetIdx >= SWIPEABLE_TAB_ORDER.length) return;
      const target = SWIPEABLE_TAB_ORDER[targetIdx];
      lastSwipeDirection = direction === 'next' ? 1 : -1;
      Haptics.selectionAsync();
      navigation.navigate('MainTabs', { screen: target });
    },
    [navigation, currentIdx],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(swipeEnabled)
        .activeOffsetX([-ACTIVATION_OFFSET_X, ACTIVATION_OFFSET_X])
        .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
        .onUpdate((e) => {
          'worklet';
          if (isCommitting.value) return;
          let dx = e.translationX;
          // Rubber-band at the edges (no next/prev to slide to).
          if ((dx < 0 && !hasNext) || (dx > 0 && !hasPrev)) {
            dx = dx * RUBBER_BAND_FACTOR;
          }
          translateX.value = dx;
        })
        .onEnd((e) => {
          'worklet';
          const dx = e.translationX;
          const vx = e.velocityX;
          const committedLeft = (dx < -COMMIT_DISTANCE || vx < -COMMIT_VELOCITY) && hasNext;
          const committedRight = (dx > COMMIT_DISTANCE || vx > COMMIT_VELOCITY) && hasPrev;

          if (committedLeft) {
            isCommitting.value = true;
            translateX.value = withTiming(-SCREEN_WIDTH, { duration: COMMIT_ANIM_MS }, () => {
              runOnJS(doNavigate)('next');
            });
          } else if (committedRight) {
            isCommitting.value = true;
            translateX.value = withTiming(SCREEN_WIDTH, { duration: COMMIT_ANIM_MS }, () => {
              runOnJS(doNavigate)('prev');
            });
          } else {
            translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
          }
        }),
    [swipeEnabled, hasNext, hasPrev, doNavigate, translateX, isCommitting],
  );

  const animatedStyle = useAnimatedStyle(() => {
    // Tiny scale + opacity falloff at the extremes mirrors Instagram's polish.
    const progress = Math.min(Math.abs(translateX.value) / SCREEN_WIDTH, 1);
    const opacity = interpolate(progress, [0, 1], [1, 0.6], Extrapolation.CLAMP);
    const scale = interpolate(progress, [0, 1], [1, 0.96], Extrapolation.CLAMP);
    return {
      transform: [{ translateX: translateX.value }, { scale }],
      opacity,
    };
  });

  // Reset translate when this tab unmounts unexpectedly (defensive).
  useEffect(() => {
    return () => {
      translateX.value = 0;
    };
  }, [translateX]);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
});

export function withSwipeableTab<P extends object>(
  Component: React.ComponentType<P>,
  tabName: keyof MainTabParamList,
): React.FC<P> {
  return (props: P) => (
    <SwipeableTabContainer tabName={tabName}>
      <Component {...props} />
    </SwipeableTabContainer>
  );
}
