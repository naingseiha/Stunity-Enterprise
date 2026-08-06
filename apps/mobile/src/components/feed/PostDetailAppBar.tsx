/**
 * PostDetailAppBar — LinkedIn / Facebook-style sticky header.
 * Shows "Post" at rest; crossfades to compact author row on scroll.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, ScalePressable, ScreenBackButton } from '@/components/common';
import { Haptics } from '@/services/haptics';

export const POST_DETAIL_AUTHOR_COLLAPSE_Y = 80;

export interface PostDetailAppBarProps {
  title: string;
  onBack: () => void;
  scrollY?: Animated.Value;
  authorName?: string;
  authorAvatarUri?: string;
  onAuthorPress?: () => void;
  bookmarked?: boolean;
  onBookmark?: () => void;
  onMenu?: () => void;
  showActions?: boolean;
  bookmarkAnimStyle?: Animated.WithAnimatedObject<ViewStyle>;
  colors: {
    text: string;
    textSecondary: string;
    card: string;
    border: string;
  };
  isDark: boolean;
}

export function PostDetailAppBar({
  title,
  onBack,
  scrollY,
  authorName,
  authorAvatarUri,
  onAuthorPress,
  bookmarked = false,
  onBookmark,
  onMenu,
  showActions = true,
  bookmarkAnimStyle,
  colors,
  isDark,
}: PostDetailAppBarProps) {
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const defaultTitleOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 36, POST_DETAIL_AUTHOR_COLLAPSE_Y],
        outputRange: [1, 0.15, 0],
        extrapolate: 'clamp',
      })
    : 1;

  const authorOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [24, 52, POST_DETAIL_AUTHOR_COLLAPSE_Y],
        outputRange: [0, 0.55, 1],
        extrapolate: 'clamp',
      })
    : 0;

  const shadowOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 8, 20],
        outputRange: [0, 0.08, 1],
        extrapolate: 'clamp',
      })
    : 0;

  const handleBack = () => {
    onBack();
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBookmark?.();
  };

  const handleMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMenu?.();
  };

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shadowLayer,
          { opacity: shadowOpacity },
        ]}
      />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.bar}>
          <View style={styles.sideSlot}>
            <ScreenBackButton
              onPress={handleBack}
              color={colors.text}
              backgroundColor={colors.card}
            />
          </View>

          <View style={styles.centerSlot} pointerEvents="box-none">
            <Animated.Text
              style={[styles.title, { opacity: defaultTitleOpacity }]}
              numberOfLines={1}
            >
              {title}
            </Animated.Text>

            {!!authorName && scrollY && (
              <Animated.View
                style={[styles.authorRow, { opacity: authorOpacity }]}
                pointerEvents="box-none"
              >
                <ScalePressable
                  pressScale={0.96}
                  pressOpacity={false}
                  onPress={onAuthorPress}
                  style={styles.authorTap}
                  accessibilityRole="button"
                  accessibilityLabel={authorName}
                >
                  <Avatar uri={authorAvatarUri} name={authorName} size="xs" variant="post" />
                  <Text style={styles.authorName} numberOfLines={1}>
                    {authorName}
                  </Text>
                </ScalePressable>
              </Animated.View>
            )}
          </View>

          <View style={[styles.sideSlot, styles.sideSlotRight]}>
            {showActions ? (
              <>
                <Animated.View style={bookmarkAnimStyle}>
                  <ScalePressable
                    pressScale={0.9}
                    onPress={handleBookmark}
                    style={styles.iconBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Bookmark"
                  >
                    <Ionicons
                      name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                      size={22}
                      color={bookmarked ? '#6366F1' : colors.textSecondary}
                    />
                  </ScalePressable>
                </Animated.View>
                <ScalePressable
                  pressScale={0.9}
                  onPress={handleMenu}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                >
                  <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
                </ScalePressable>
              </>
            ) : (
              <View style={styles.iconBtnSpacer} />
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

type StyleMap = {
  wrap: ViewStyle;
  shadowLayer: ViewStyle;
  safe: ViewStyle;
  bar: ViewStyle;
  sideSlot: ViewStyle;
  sideSlotRight: ViewStyle;
  centerSlot: ViewStyle;
  title: TextStyle;
  authorRow: ViewStyle;
  authorTap: ViewStyle;
  authorName: TextStyle;
  iconBtn: ViewStyle;
  iconBtnSpacer: ViewStyle;
};

const createStyles = (colors: { card: string; border: string; text: string }) =>
  StyleSheet.create<StyleMap>({
    wrap: {
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      zIndex: 100,
    },
    shadowLayer: {
      ...StyleSheet.absoluteFillObject,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          shadowOpacity: 0.12,
        },
        android: { elevation: 3 },
      }),
    },
    safe: {
      backgroundColor: colors.card,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    sideSlot: {
      width: 40,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sideSlotRight: {
      width: 80,
      justifyContent: 'flex-end',
      gap: 0,
    },
    centerSlot: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    title: {
      position: 'absolute',
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.1,
      maxWidth: '100%',
    },
    authorRow: {
      position: 'absolute',
      maxWidth: '100%',
    },
    authorTap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 20,
    },
    authorName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
      maxWidth: 180,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnSpacer: {
      width: 40,
      height: 40,
    },
  });

export default PostDetailAppBar;
