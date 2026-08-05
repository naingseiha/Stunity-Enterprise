/**
 * Vertical tab rail for tablet-width layouts (replaces bottom tab bar).
 * Press spring + selection haptic match phone PressableTabBarButton.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { Haptics } from '@/services/haptics';
import { useThemeContext } from '@/contexts';
import { useReducedMotion } from '@/hooks';
import type { MainStackParamList, MainTabParamList } from '@/navigation/types';
import { TABLET_TAB_RAIL_WIDTH } from '@/utils/layout';
import { ProfileTabIcon } from '@/components/navigation/ProfileTabIcon';

type StackNav = NativeStackNavigationProp<MainStackParamList>;

const TAB_ORDER: (keyof MainTabParamList)[] = [
  'FeedTab',
  'ReelsTab',
  'LearnTab',
  // QuizTab intentionally omitted — accessible via the sidebar menu instead.
  'ClubsTab',
  'ProfileTab',
];

const TAB_ICONS: Record<
  keyof MainTabParamList,
  { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap; size: number }
> = {
  FeedTab: { focused: 'home', outline: 'home-outline', size: 28 },
  LearnTab: { focused: 'compass', outline: 'compass-outline', size: 28 },
  ReelsTab: { focused: 'play-circle', outline: 'play-circle-outline', size: 32 },
  QuizTab: { focused: 'game-controller', outline: 'game-controller-outline', size: 27 },
  ClubsTab: { focused: 'school', outline: 'school-outline', size: 28 },
  ProfileTab: { focused: 'person-circle', outline: 'person-circle-outline', size: 28 },
};

const PRESS_SPRING = { damping: 16, stiffness: 420, mass: 0.55 };
const RELEASE_SPRING = { damping: 14, stiffness: 280, mass: 0.7 };

function RailTabButton({
  focused,
  onPress,
  children,
  itemStyle,
  itemActiveStyle,
}: {
  focused: boolean;
  onPress: () => void;
  children: React.ReactNode;
  itemStyle: object;
  itemActiveStyle: object;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    Haptics.selectionAsync();
    if (!reduceMotion) {
      cancelAnimation(scale);
      scale.value = withSpring(0.9, PRESS_SPRING);
    }
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion) {
      cancelAnimation(scale);
      scale.value = withSpring(1, RELEASE_SPRING);
    }
  }, [reduceMotion, scale]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={[itemStyle, focused && itemActiveStyle]}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

export default function TabletTabRail() {
  const navigation = useNavigation<StackNav>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useThemeContext();

  const activeTabName = useNavigationState((state) => {
    const top = state.routes[state.index];
    if (top?.name === 'MainTabs' && top.state && 'index' in top.state) {
      const ts = top.state as { index: number; routes: { name: string }[] };
      return ts.routes[ts.index]?.name as keyof MainTabParamList | undefined;
    }
    return undefined;
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        rail: {
          width: TABLET_TAB_RAIL_WIDTH,
          backgroundColor: colors.card,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: colors.border,
          paddingTop: insets.top + 6,
          paddingBottom: Math.max(insets.bottom, 10),
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 4,
        },
        item: {
          width: 52,
          height: 52,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        itemActive: {
          backgroundColor: isDark ? `${colors.primary}22` : `${colors.primary}14`,
        },
      }),
    [colors.card, colors.border, colors.primary, insets.top, insets.bottom, isDark],
  );

  const goTab = (name: keyof MainTabParamList) => {
    if (name === 'ProfileTab') {
      navigation.navigate('MainTabs', {
        screen: 'ProfileTab',
        params: { screen: 'Profile' },
      });
      return;
    }
    navigation.navigate('MainTabs', {
      screen: name,
      params: undefined,
    } as never);
  };

  return (
    <View style={styles.rail} accessibilityRole="tablist">
      {TAB_ORDER.map((name) => {
        const focused = activeTabName === name;
        const cfg = TAB_ICONS[name];
        const iconName = focused ? cfg.focused : cfg.outline;
        const color = focused ? colors.primary : colors.textSecondary;

        return (
          <RailTabButton
            key={name}
            focused={focused}
            onPress={() => goTab(name)}
            itemStyle={styles.item}
            itemActiveStyle={styles.itemActive}
          >
            {name === 'ProfileTab' ? (
              <ProfileTabIcon focused={focused} color={color} />
            ) : (
              <Ionicons name={iconName} size={cfg.size} color={color} />
            )}
          </RailTabButton>
        );
      })}
    </View>
  );
}
