/**
 * Post Analytics Modal
 *
 * Premium analytics sheet following Stunity brand design:
 * - Sky-blue gradient header (#0EA5E9)
 * - Period toggle (24h / 7d / 30d)
 * - Skeleton loading state
 * - Engagement + traffic breakdown
 * - 7-day bar chart
 * - Algorithm relevance score
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useFeedStore, PostAnalytics } from '@/stores/feedStore';
import { Colors, Shadows } from '@/config';
import { formatNumber } from '@/utils';
import { recommendationEngine } from '@/services/recommendation';

interface PostAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

type Period = '24h' | '7d' | '30d';

const { width } = Dimensions.get('window');

// ─── Skeleton block ───────────────────────────────────────────────────────────
const Skeleton: React.FC<{ w?: number | string; h?: number; r?: number; style?: any }> = ({ w = '100%', h = 14, r = 8, style }) => (
  <View style={[{ width: w as any, height: h, borderRadius: r, backgroundColor: '#EFF0F1' }, style]} />
);

const LoadingSkeleton = () => (
  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} scrollEnabled={false}>
    <View style={styles.skeletonSection}>
      <View style={styles.skeletonHeroRow}>
        {[0, 1].map(i => (
          <View key={i} style={styles.skeletonHeroCard}>
            <Skeleton w={40} h={40} r={20} style={{ marginBottom: 12, alignSelf: 'center' }} />
            <Skeleton w="70%" h={24} style={{ alignSelf: 'center', marginBottom: 6 }} />
            <Skeleton w="50%" h={12} style={{ alignSelf: 'center' }} />
          </View>
        ))}
      </View>
    </View>
    <View style={styles.skeletonSection}>
      <Skeleton w="40%" h={14} style={{ marginBottom: 16 }} />
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[styles.skeletonItem, { marginBottom: 10 }]}>
          <Skeleton w={44} h={44} r={22} />
          <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
            <Skeleton w="60%" h={14} />
            <Skeleton w="40%" h={10} />
          </View>
          <Skeleton w={60} h={24} r={12} />
        </View>
      ))}
    </View>
    <View style={styles.skeletonSection}>
      <Skeleton w="40%" h={14} style={{ marginBottom: 16 }} />
      <View style={styles.skeletonChart}>
        {[60, 80, 40, 90, 55, 70, 45].map((h, i) => (
          <View key={i} style={styles.skeletonBarCol}>
            <Skeleton w="80%" h={`${h}%` as any} r={4} />
            <Skeleton w="80%" h={10} r={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  </ScrollView>
);

export const PostAnalyticsModal: React.FC<PostAnalyticsModalProps> = ({
  isOpen,
  onClose,
  postId,
}) => {
  const { fetchPostAnalytics, postAnalytics, isLoadingAnalytics, posts } = useFeedStore();
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);
  const [algoScore, setAlgoScore] = useState<any>(null);
  const [period, setPeriod] = useState<Period>('7d');

  const post = posts.find(p => p.id === postId);

  useEffect(() => {
    if (post) {
      const score = recommendationEngine.calculateScore(post);
      setAlgoScore(score);
    }
  }, [post]);

  const loadAnalytics = useCallback(async (force = false) => {
    if (!postId) return;
    if (!force && postAnalytics[postId]) {
      setAnalytics(postAnalytics[postId]);
      return;
    }
    const data = await fetchPostAnalytics(postId);
    if (data) setAnalytics(data);
  }, [postId, postAnalytics, fetchPostAnalytics]);

  useEffect(() => {
    if (isOpen) loadAnalytics();
  }, [isOpen, postId]);

  // Sync from store cache when it updates
  useEffect(() => {
    if (postAnalytics[postId]) setAnalytics(postAnalytics[postId]);
  }, [postAnalytics[postId]]);

  const isLoading = isLoadingAnalytics[postId] || false;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loadAnalytics(true);
  };

  // Period-specific view count
  const periodViews = analytics
    ? period === '24h' ? analytics.views24h : period === '7d' ? analytics.views7d : analytics.views30d
    : 0;

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ── Gradient Header ────────────────────────────────────────── */}
        <LinearGradient
          colors={['#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerIconRow}>
              <Ionicons name="bar-chart" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.headerTitle}>Post Analytics</Text>
            </View>
            {analytics && (
              <Text style={styles.headerSubtitle}>
                {formatNumber(analytics.totalViews)} total views · {analytics.engagementRate.toFixed(1)}% engagement
              </Text>
            )}
          </View>

          <TouchableOpacity onPress={handleRefresh} style={styles.headerBtn} disabled={isLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isLoading
              ? <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
              : <Ionicons name="refresh" size={20} color="#fff" />}
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Period Toggle ───────────────────────────────────────────── */}
        <View style={styles.periodToggleRow}>
          {(['24h', '7d', '30d'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => { Haptics.selectionAsync(); setPeriod(p); }}
            >
              <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                {p === '24h' ? 'Last 24h' : p === '7d' ? 'Last 7 days' : 'Last 30 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && !analytics ? (
          <LoadingSkeleton />
        ) : analytics ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* ── Hero Stats ─────────────────────────────────────────── */}
            <View style={styles.heroRow}>
              <LinearGradient colors={['#F0F9FF', '#E0F2FE']} style={styles.heroCard}>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="eye" size={22} color="#0EA5E9" />
                </View>
                <Text style={styles.heroValue}>{formatNumber(periodViews)}</Text>
                <Text style={styles.heroLabel}>Views</Text>
              </LinearGradient>

              <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.heroCard}>
                <View style={[styles.heroIconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="people" size={22} color="#10B981" />
                </View>
                <Text style={[styles.heroValue, { color: '#059669' }]}>{formatNumber(analytics.uniqueViewers)}</Text>
                <Text style={styles.heroLabel}>Unique Viewers</Text>
              </LinearGradient>

              <LinearGradient colors={['#FFF7ED', '#FED7AA']} style={styles.heroCard}>
                <View style={[styles.heroIconWrap, { backgroundColor: '#FDE68A' }]}>
                  <Ionicons name="flash" size={22} color="#D97706" />
                </View>
                <Text style={[styles.heroValue, { color: '#D97706' }]}>{analytics.engagementRate.toFixed(1)}%</Text>
                <Text style={styles.heroLabel}>Engagement</Text>
              </LinearGradient>

              <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={styles.heroCard}>
                <View style={[styles.heroIconWrap, { backgroundColor: '#DDD6FE' }]}>
                  <Ionicons name="time" size={22} color="#7C3AED" />
                </View>
                <Text style={[styles.heroValue, { color: '#7C3AED' }]}>{analytics.avgDuration}s</Text>
                <Text style={styles.heroLabel}>Avg Watch</Text>
              </LinearGradient>
            </View>

            {/* ── Engagement Breakdown ───────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Engagement</Text>
              <View style={styles.engagementGrid}>
                {[
                  { icon: 'heart', color: '#EF4444', bg: '#FEE2E2', value: analytics.likes, sub: `+${analytics.likes24h} today`, label: 'Likes' },
                  { icon: 'chatbubble', color: '#3B82F6', bg: '#DBEAFE', value: analytics.comments, sub: `+${analytics.comments24h} today`, label: 'Comments' },
                  { icon: 'arrow-redo', color: '#10B981', bg: '#D1FAE5', value: analytics.shares, sub: 'total reposts', label: 'Reposts' },
                  { icon: 'bookmark', color: '#0EA5E9', bg: '#E0F2FE', value: analytics.bookmarks, sub: 'saved', label: 'Bookmarks' },
                ].map(item => (
                  <View key={item.label} style={[styles.engagCard, Shadows.sm]}>
                    <View style={[styles.engagIcon, { backgroundColor: item.bg }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <Text style={styles.engagValue}>{formatNumber(item.value)}</Text>
                    <Text style={styles.engagLabel}>{item.label}</Text>
                    <Text style={styles.engagSub}>{item.sub}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── 7-Day Trend Chart ─────────────────────────────────── */}
            {analytics.dailyViews?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>7-Day Trend</Text>
                <View style={[styles.chartCard, Shadows.sm]}>
                  {/* Y-axis max label */}
                  {(() => {
                    const maxViews = Math.max(...analytics.dailyViews.map(d => d.views), 1);
                    return (
                      <>
                        <Text style={styles.chartMaxLabel}>{formatNumber(maxViews)}</Text>
                        <View style={styles.chartBars}>
                          {analytics.dailyViews.slice(-7).map((day, idx) => {
                            const pct = maxViews > 0 ? Math.max((day.views / maxViews) * 100, 4) : 4;
                            const isToday = idx === analytics.dailyViews.slice(-7).length - 1;
                            return (
                              <View key={idx} style={styles.chartBarCol}>
                                <Text style={styles.chartBarVal}>{day.views > 0 ? formatNumber(day.views) : ''}</Text>
                                <View style={styles.chartBarTrack}>
                                  <LinearGradient
                                    colors={isToday ? ['#0EA5E9', '#0284C7'] : ['#BAE6FD', '#7DD3FC']}
                                    style={[styles.chartBarFill, { height: `${pct}%` }]}
                                  />
                                </View>
                                <Text style={[styles.chartBarDay, isToday && { color: '#0EA5E9', fontWeight: '700' }]}>
                                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    );
                  })()}
                </View>
              </View>
            )}

            {/* ── Traffic Sources ───────────────────────────────────── */}
            {analytics.viewsBySource && Object.keys(analytics.viewsBySource).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Traffic Sources</Text>
                {Object.entries(analytics.viewsBySource)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, views]) => {
                    const pct = analytics.totalViews > 0 ? (views / analytics.totalViews) * 100 : 0;
                    return (
                      <View key={source} style={[styles.sourceRow, Shadows.sm]}>
                        <View style={styles.sourceLeft}>
                          <Ionicons
                            name={source === 'feed' ? 'home' : source === 'profile' ? 'person' : source === 'search' ? 'search' : 'share-social'}
                            size={16} color="#0EA5E9"
                          />
                          <Text style={styles.sourceLabel}>{source.charAt(0).toUpperCase() + source.slice(1)}</Text>
                        </View>
                        <View style={styles.sourceBarWrap}>
                          <View style={styles.sourceBarBg}>
                            <LinearGradient
                              colors={['#0EA5E9', '#0284C7']}
                              style={[styles.sourceBarFill, { width: `${Math.min(pct, 100)}%` }]}
                            />
                          </View>
                          <Text style={styles.sourcePercent}>{pct.toFixed(0)}%</Text>
                        </View>
                        <Text style={styles.sourceViews}>{formatNumber(views)}</Text>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* ── Algorithm Relevance ───────────────────────────────── */}
            {algoScore && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Algorithm Relevance</Text>
                <LinearGradient colors={['#F8FAFF', '#EFF6FF']} style={[styles.algoCard, Shadows.sm]}>
                  <View style={styles.algoTop}>
                    <LinearGradient colors={['#0EA5E9', '#6366F1']} style={styles.algoScoreCircle}>
                      <Text style={styles.algoScoreVal}>{Math.min(Math.round(algoScore.total), 100)}</Text>
                      <Text style={styles.algoScoreSub}>/ 100</Text>
                    </LinearGradient>
                    <View style={styles.algoTopText}>
                      <Text style={styles.algoTitle}>Stunity Score</Text>
                      <Text style={styles.algoSubtitle}>How the algorithm ranks this post</Text>
                    </View>
                  </View>

                  {[
                    { label: 'Engagement', val: algoScore.breakdown.engagement, colors: ['#8B5CF6', '#7C3AED'] as [string, string] },
                    { label: 'Relevance', val: algoScore.breakdown.relevance, colors: ['#10B981', '#059669'] as [string, string] },
                    { label: 'Quality', val: algoScore.breakdown.quality, colors: ['#0EA5E9', '#0284C7'] as [string, string] },
                    { label: 'Recency', val: algoScore.breakdown.recency, colors: ['#F59E0B', '#D97706'] as [string, string] },
                  ].map(({ label, val, colors }) => {
                    const clamped = Math.min(Math.max(Math.round(val), 0), 100);
                    return (
                      <View key={label} style={styles.algoBarRow}>
                        <Text style={styles.algoBarLabel}>{label}</Text>
                        <View style={styles.algoBarBg}>
                          <LinearGradient colors={colors} style={[styles.algoBarFill, { width: `${clamped}%` }]} />
                        </View>
                        <Text style={styles.algoBarVal}>{clamped}</Text>
                      </View>
                    );
                  })}
                </LinearGradient>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.errorState}>
            <Ionicons name="bar-chart-outline" size={56} color="#D1D5DB" />
            <Text style={styles.errorText}>Couldn't load analytics</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Gradient header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, gap: 8,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Period toggle
  periodToggleRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    gap: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#fff',
  },
  periodTab: {
    flex: 1, paddingVertical: 7, borderRadius: 14, alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  periodTabActive: { backgroundColor: '#0EA5E9' },
  periodTabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  periodTabTextActive: { color: '#fff' },

  content: { flex: 1 },

  // Hero stats row (4 equal cards)
  heroRow: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8,
  },
  heroCard: {
    flex: 1, minWidth: 80, borderRadius: 14, padding: 12, alignItems: 'center',
     borderColor: 'transparent',
  },
  heroIconWrap: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  heroValue: { fontSize: 20, fontWeight: '800', color: '#0EA5E9', marginBottom: 2 },
  heroLabel: { fontSize: 10, color: '#6B7280', fontWeight: '500', textAlign: 'center' },

  section: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 4 },

  // Engagement 2x2 grid
  engagementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  engagCard: {
    flex: 1, minWidth: 130, backgroundColor: '#fff', borderRadius: 14,
    padding: 14, alignItems: 'center',  borderColor: '#F3F4F6',
  },
  engagIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  engagValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  engagLabel: { fontSize: 13, color: '#374151', fontWeight: '600', marginTop: 2 },
  engagSub: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },

  // Chart
  chartCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
     borderColor: '#F3F4F6', height: 200,
  },
  chartMaxLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 4, alignSelf: 'flex-end' },
  chartBars: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6,
  },
  chartBarCol: { flex: 1, alignItems: 'center', height: '100%' },
  chartBarVal: { fontSize: 9, color: '#374151', fontWeight: '600', marginBottom: 3, textAlign: 'center' },
  chartBarTrack: { flex: 1, width: '80%', justifyContent: 'flex-end' },
  chartBarFill: { width: '100%', borderRadius: 4, minHeight: 6 },
  chartBarDay: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginTop: 4 },

  // Traffic sources
  sourceRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8,
     borderColor: '#F3F4F6', gap: 10,
  },
  sourceLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  sourceLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  sourceBarWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceBarBg: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  sourceBarFill: { height: '100%', borderRadius: 3 },
  sourcePercent: { fontSize: 11, color: '#9CA3AF', width: 30, textAlign: 'right' },
  sourceViews: { fontSize: 13, fontWeight: '700', color: '#0EA5E9', width: 40, textAlign: 'right' },

  // Algorithm score
  algoCard: { borderRadius: 16, padding: 16,  borderColor: '#E0F2FE' },
  algoTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  algoScoreCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  algoScoreVal: { fontSize: 20, fontWeight: '900', color: '#fff' },
  algoScoreSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: -2 },
  algoTopText: { flex: 1 },
  algoTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  algoSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  algoBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  algoBarLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', width: 72 },
  algoBarBg: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  algoBarFill: { height: '100%', borderRadius: 4 },
  algoBarVal: { fontSize: 12, fontWeight: '700', color: '#374151', width: 24, textAlign: 'right' },

  // Error state
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  errorText: { fontSize: 16, color: '#9CA3AF', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0EA5E9', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12,
  },
  retryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Skeleton
  skeletonSection: { padding: 16 },
  skeletonHeroRow: { flexDirection: 'row', gap: 10 },
  skeletonHeroCard: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, minHeight: 100 },
  skeletonItem: { flexDirection: 'row', alignItems: 'center' },
  skeletonChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12 },
  skeletonBarCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
});
