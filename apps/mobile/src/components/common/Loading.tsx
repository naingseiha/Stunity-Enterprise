/**
 * Loading Component
 * 
 * Various loading states for the app with shimmer animations
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const shimmerTranslate = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerTranslate, {
        toValue: 300,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

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
      <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}>
        <LinearGradient
          colors={[
            'transparent',
            isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.6)',
            'transparent'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

// Post Skeleton
export const PostSkeleton: React.FC = () => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.postSkeleton}>
      <View style={styles.postHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.postHeaderText}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton height={16} style={{ marginTop: 12 }} />
      <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
      <Skeleton height={200} style={{ marginTop: 12 }} borderRadius={12} />
      <View style={styles.postActions}>
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
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
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderRadius: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postHeaderText: {
    marginLeft: Spacing[3],
    flex: 1,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing[4],
    paddingTop: Spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
