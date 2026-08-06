/**
 * Loading Component
 * 
 * Various loading states for the app with shimmer animations
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '@/config';
import { useThemeContext } from '@/contexts';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  color,
  message,
  fullScreen = false,
  overlay = false,
}) => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const content = (
    <View style={styles.content}>
      <ActivityIndicator size={size} color={color || colors.primary} />
      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, overlay && styles.overlay]}>
        {content}
      </View>
    );
  }

  return content;
};

// Skeleton Loading Components
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}) => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -280 + progress.value * 560 }],
  }));

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.55)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

// Post Skeleton — LinkedIn-style full-bleed feed row
export const PostSkeleton: React.FC = () => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.postSkeleton}>
      <View style={styles.postHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.postHeaderText}>
          <Skeleton width={132} height={14} borderRadius={7} />
          <Skeleton width={88} height={11} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>
      <Skeleton height={14} style={{ marginTop: 14 }} borderRadius={7} />
      <Skeleton width="92%" height={14} style={{ marginTop: 8 }} borderRadius={7} />
      <Skeleton width="68%" height={14} style={{ marginTop: 8 }} borderRadius={7} />
      <Skeleton height={220} style={{ marginTop: 12, marginHorizontal: 12 }} borderRadius={16} />
      <View style={styles.postActions}>
        <Skeleton width={52} height={22} borderRadius={11} />
        <Skeleton width={52} height={22} borderRadius={11} />
        <Skeleton width={52} height={22} borderRadius={11} />
        <Skeleton width={36} height={22} borderRadius={11} />
      </View>
    </View>
  );
};

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.profileSkeleton}>
      <Skeleton height={150} borderRadius={0} />
      <View style={styles.profileContent}>
        <Skeleton
          width={100}
          height={100}
          borderRadius={50}
          style={styles.profileAvatar}
        />
        <View style={styles.profileInfo}>
          <Skeleton width={160} height={24} style={{ marginTop: 60 }} />
          <Skeleton width={120} height={16} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={14} style={{ marginTop: 16 }} />
          <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
};

export const ListItemSkeleton: React.FC = () => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.listItem}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.listItemContent}>
        <Skeleton width={140} height={16} />
        <Skeleton width={200} height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
};

// Course Detail Skeleton
export const CourseDetailSkeleton: React.FC = () => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.detailSkeleton}>
      <View style={styles.detailHero}>
        <Skeleton width={100} height={20} borderRadius={10} />
        <Skeleton height={32} style={{ marginTop: 12 }} />
        <Skeleton height={32} width="60%" style={{ marginTop: 8 }} />
        <Skeleton height={80} style={{ marginTop: 16 }} borderRadius={16} />
        <View style={styles.detailMetaRows}>
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={100} height={24} borderRadius={12} />
          <Skeleton width={90} height={24} borderRadius={12} />
        </View>
      </View>
      
      <View style={styles.detailTabs}>
        <Skeleton width="48%" height={40} borderRadius={10} />
        <Skeleton width="48%" height={40} borderRadius={10} />
      </View>

      <View style={styles.detailContent}>
        <Skeleton height={100} borderRadius={20} />
        <View style={styles.detailStats}>
          <Skeleton width="48%" height={80} borderRadius={16} />
          <Skeleton width="48%" height={80} borderRadius={16} />
          <Skeleton width="48%" height={80} borderRadius={16} />
          <Skeleton width="48%" height={80} borderRadius={16} />
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.82)' : 'rgba(255, 255, 255, 0.9)',
    zIndex: 999,
  },
  message: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  skeleton: {
    backgroundColor: colors.skeleton,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
  shimmerGradient: {
    width: 300,
    height: '100%',
  },
  postSkeleton: {
    backgroundColor: colors.card,
    paddingTop: 8,
    paddingBottom: 12,
    marginBottom: 0,
    borderRadius: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.16)' : '#E5E7EB',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
  },
  postHeaderText: {
    marginLeft: Spacing[3],
    flex: 1,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: Spacing[4],
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  profileSkeleton: {
    backgroundColor: colors.card,
  },
  profileContent: {
    padding: Spacing[4],
  },
  profileAvatar: {
    position: 'absolute',
    top: -50,
    left: Spacing[4],
    borderWidth: 4,
    borderColor: colors.card,
  },
  profileInfo: {
    paddingTop: Spacing[2],
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemContent: {
    marginLeft: Spacing[3],
    flex: 1,
  },
  // Course Detail Skeleton Styles
  detailSkeleton: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailHero: {
    padding: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  detailMetaRows: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  detailTabs: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  detailContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  detailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
});

export default Loading;
