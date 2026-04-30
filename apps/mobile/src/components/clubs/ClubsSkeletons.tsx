import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/common/Loading';
import { useThemeContext } from '@/contexts';

// ─── Header Skeleton ─────────────────────────────────────────────────────────
export const ClubsHeaderSkeleton = React.memo(function ClubsHeaderSkeleton() {
  const { colors, isDark } = useThemeContext();
  const skeletonStyles = React.useMemo(() => createStyles(colors), [colors, isDark]);

  return (
    <View>
      {/* Shortcuts row: 4 circles */}
      <View style={skeletonStyles.shortcutsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={skeletonStyles.shortcutItem}>
            <Skeleton width={68} height={68} borderRadius={34} />
            <Skeleton width={52} height={12} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Banner placeholder */}
      <View style={skeletonStyles.bannerWrap}>
        <Skeleton width="100%" height={120} borderRadius={24} />
        <View style={skeletonStyles.paginationRow}>
          <Skeleton width={16} height={6} borderRadius={3} />
          <Skeleton width={6} height={6} borderRadius={3} style={{ marginLeft: 6 }} />
          <Skeleton width={6} height={6} borderRadius={3} style={{ marginLeft: 6 }} />
        </View>
      </View>

      {/* Section title + View all */}
      <View style={skeletonStyles.sectionHeaderRow}>
        <Skeleton width={140} height={20} borderRadius={10} />
        <Skeleton width={60} height={16} borderRadius={8} />
      </View>

      {/* Search bar */}
      <Skeleton width="100%" height={52} borderRadius={16} style={skeletonStyles.searchSkeleton} />
    </View>
  );
});

export const ClubCardSkeleton = React.memo(function ClubCardSkeleton() {
  const { colors, isDark } = useThemeContext();
  const skeletonStyles = React.useMemo(() => createStyles(colors), [colors, isDark]);

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.header}>
        <View style={skeletonStyles.icon} />
        <View style={skeletonStyles.titleLine} />
        <View style={skeletonStyles.viewBtn} />
      </View>
      <View style={skeletonStyles.line1} />
      <View style={skeletonStyles.line2} />
      <View style={skeletonStyles.footer}>
        <View style={skeletonStyles.avatars} />
        <View style={skeletonStyles.pill} />
      </View>
      <View style={skeletonStyles.progressBar} />
    </View>
  );
});

const createStyles = (colors: any) => StyleSheet.create({
  // Header skeleton
  shortcutsRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  shortcutItem:    { alignItems: 'center' },
  bannerWrap:      { paddingHorizontal: 12, paddingBottom: 24, alignItems: 'center' },
  paginationRow:   { flexDirection: 'row', marginTop: 16 },
  sectionHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 16 },
  searchSkeleton:  { marginHorizontal: 16, marginBottom: 16 },
  // Card skeleton
  card:        { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginHorizontal: 12, marginBottom: 16, overflow: 'hidden' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon:        { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.skeleton },
  titleLine:   { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.skeleton },
  viewBtn:     { width: 44, height: 14, borderRadius: 7, backgroundColor: colors.skeleton },
  line1:       { marginHorizontal: 12, marginTop: 14, height: 12, borderRadius: 6, backgroundColor: colors.skeleton },
  line2:       { marginHorizontal: 12, marginTop: 8, marginBottom: 16, height: 12, borderRadius: 6, backgroundColor: colors.skeleton, width: '60%' },
  footer:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 16 },
  avatars:     { width: 80, height: 26, borderRadius: 13, backgroundColor: colors.skeleton },
  pill:        { width: 88, height: 34, borderRadius: 20, backgroundColor: colors.skeleton },
  progressBar: { height: 8, backgroundColor: colors.skeleton, marginHorizontal: 12, marginBottom: 20, borderRadius: 4 },
});
