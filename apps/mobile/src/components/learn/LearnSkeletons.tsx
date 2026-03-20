import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Skeleton } from '@/components/common/Loading';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURED_CARD_WIDTH = SCREEN_WIDTH * 0.88;
const FEATURED_CARD_GAP = 16;
const TOP_CATEGORY_LIMIT = 6;

// Header content skeleton — matches renderHeader() output:
//   Suggested courses (horizontal scroll) → Category grid → Stats row
export const LearnHeaderSkeleton = React.memo(function LearnHeaderSkeleton() {
  const cardW = FEATURED_CARD_WIDTH;
  return (
    <View>
      {/* ─ Suggested courses ─ */}
      <View style={skeletonStyles.suggestSection}>
        {/* Section title */}
        <View style={skeletonStyles.suggestHeader}>
          <Skeleton width={160} height={18} borderRadius={8} />
        </View>
        {/* Horizontal card strip — mirrors the real horizontal ScrollView */}
        <View style={skeletonStyles.suggestRow}>
          <Skeleton width={cardW} height={148} borderRadius={24} style={skeletonStyles.suggestCard} />
          <Skeleton width={cardW} height={148} borderRadius={24} style={skeletonStyles.suggestCard} />
        </View>
      </View>

      {/* ─ Category section ─ */}
      <View style={skeletonStyles.categorySurface}>
        {/* Header row */}
        <View style={skeletonStyles.sectionHeaderRow}>
          <Skeleton width={148} height={17} borderRadius={8} />
          <Skeleton width={58} height={28} borderRadius={20} />
        </View>
        {/* 2-column chip grid  — 6 chips matching TOP_CATEGORY_LIMIT */}
        <View style={skeletonStyles.categoryGrid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} style={skeletonStyles.categoryChip} height={76} borderRadius={20} />
          ))}
        </View>
      </View>

      {/* ─ Stats row — 4 cards ─ */}
      <View style={skeletonStyles.statsSection}>
        <Skeleton width={140} height={16} borderRadius={8} style={{ marginBottom: 12 }} />
        <View style={skeletonStyles.statsRow}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} style={skeletonStyles.statCard} height={68} borderRadius={14} />
          ))}
        </View>
      </View>
    </View>
  );
});

// Course card skeleton — mirrors actual CourseCard layout:
//   Thumbnail block (180h) with badge overlays → content area below
export const CourseCardSkeleton = React.memo(function CourseCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      {/* Thumbnail area */}
      <Skeleton width="100%" height={180} borderRadius={0} />
      {/* Content area */}
      <View style={skeletonStyles.cardContent}>
        <Skeleton width="85%" height={16} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={12} borderRadius={6} style={{ marginBottom: 5 }} />
        <Skeleton width="60%" height={12} borderRadius={6} style={{ marginBottom: 14 }} />
        {/* Stats row */}
        <View style={skeletonStyles.metaRow}>
          <Skeleton width={70} height={18} borderRadius={10} />
          <Skeleton width={55} height={18} borderRadius={10} />
          <Skeleton width={75} height={18} borderRadius={10} />
        </View>
        {/* Footer */}
        <View style={skeletonStyles.footerRow}>
          <Skeleton width={90} height={28} borderRadius={14} />
          <Skeleton width={70} height={28} borderRadius={14} />
        </View>
      </View>
    </View>
  );
});

export const skeletonStyles = StyleSheet.create({
  // Suggested courses
  suggestSection:    { marginBottom: 24 },
  suggestHeader:     { paddingHorizontal: 12, marginBottom: 10 },
  suggestRow:        { flexDirection: 'row', gap: FEATURED_CARD_GAP, paddingHorizontal: 12, paddingBottom: 10 },
  suggestCard:       {},
  // Category
  categorySurface:   { marginHorizontal: 12, marginBottom: 24 },
  sectionHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  categoryGrid:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryChip:      { width: '48.5%', marginBottom: 12 },
  // Stats
  statsSection:      { paddingHorizontal: 12, marginBottom: 20 },
  statsRow:          { flexDirection: 'row', gap: 10 },
  statCard:          { flex: 1 },
  // Tab bar row (used in skeleton loading screen)
  tabsRow:           { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, alignItems: 'center' },
  // Course card
  card:              { backgroundColor: '#F0FDFA', borderRadius: 20, borderWidth: 1.5, borderColor: '#E0F2FE', marginBottom: 16, marginHorizontal: 12, overflow: 'hidden' },
  cardContent:       { padding: 16 },
  metaRow:           { flexDirection: 'row', gap: 10, marginBottom: 16 },
  footerRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
