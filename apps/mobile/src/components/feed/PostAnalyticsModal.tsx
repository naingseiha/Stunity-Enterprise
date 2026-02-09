/**
 * Post Analytics Modal
 * 
 * Displays comprehensive analytics for a post:
 * - Overview metrics (views, engagement rate)
 * - Engagement breakdown (likes, comments, shares)
 * - Time period comparisons (24h, 7d, 30d)
 * - Daily trends chart
 */

import React, { useEffect, useState } from 'react';
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

interface PostAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

const { width } = Dimensions.get('window');

export const PostAnalyticsModal: React.FC<PostAnalyticsModalProps> = ({
  isOpen,
  onClose,
  postId,
}) => {
  const { fetchPostAnalytics, postAnalytics, isLoadingAnalytics } = useFeedStore();
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);
  
  useEffect(() => {
    if (isOpen && postId) {
      // Check if we already have analytics cached
      if (postAnalytics[postId]) {
        setAnalytics(postAnalytics[postId]);
      } else {
        // Fetch fresh analytics
        fetchPostAnalytics(postId).then((data) => {
          if (data) setAnalytics(data);
        });
      }
    }
  }, [isOpen, postId]);
  
  const isLoading = isLoadingAnalytics[postId] || false;
  
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Post Analytics</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#262626" />
          </TouchableOpacity>
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066FF" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : analytics ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Overview Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.overviewGrid}>
                <View style={[styles.statCard, Shadows.md]}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient
                      colors={['#0066FF', '#0052CC']}
                      style={styles.statIconGradient}
                    >
                      <Ionicons name="eye" size={22} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>{formatNumber(analytics.totalViews)}</Text>
                  <Text style={styles.statLabel}>Total Views</Text>
                </View>
                
                <View style={[styles.statCard, Shadows.md]}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.statIconGradient}
                    >
                      <Ionicons name="people" size={22} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>{formatNumber(analytics.uniqueViewers)}</Text>
                  <Text style={styles.statLabel}>Unique Viewers</Text>
                </View>
                
                <View style={[styles.statCard, Shadows.md]}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={styles.statIconGradient}
                    >
                      <Ionicons name="flash" size={22} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>{analytics.engagementRate.toFixed(1)}%</Text>
                  <Text style={styles.statLabel}>Engagement Rate</Text>
                </View>
                
                <View style={[styles.statCard, Shadows.md]}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient
                      colors={['#8B5CF6', '#7C3AED']}
                      style={styles.statIconGradient}
                    >
                      <Ionicons name="time" size={22} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>{Math.round(analytics.avgDuration)}s</Text>
                  <Text style={styles.statLabel}>Avg Duration</Text>
                </View>
              </View>
            </View>
            
            {/* Time Period Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Views by Period</Text>
              <View style={styles.periodGrid}>
                <View style={[styles.periodCard, Shadows.sm]}>
                  <Text style={styles.periodValue}>{formatNumber(analytics.views24h)}</Text>
                  <Text style={styles.periodLabel}>Last 24 hours</Text>
                </View>
                <View style={[styles.periodCard, Shadows.sm]}>
                  <Text style={styles.periodValue}>{formatNumber(analytics.views7d)}</Text>
                  <Text style={styles.periodLabel}>Last 7 days</Text>
                </View>
                <View style={[styles.periodCard, Shadows.sm]}>
                  <Text style={styles.periodValue}>{formatNumber(analytics.views30d)}</Text>
                  <Text style={styles.periodLabel}>Last 30 days</Text>
                </View>
              </View>
            </View>
            
            {/* Engagement Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Engagement</Text>
              <View style={styles.engagementList}>
                <View style={[styles.engagementItem, Shadows.sm]}>
                  <View style={styles.engagementLeft}>
                    <View style={[styles.engagementIcon, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="heart" size={20} color="#EF4444" />
                    </View>
                    <View>
                      <Text style={styles.engagementValue}>{formatNumber(analytics.likes)}</Text>
                      <Text style={styles.engagementLabel}>Likes</Text>
                    </View>
                  </View>
                  <Text style={styles.engagementBadge}>+{analytics.likes24h} today</Text>
                </View>
                
                <View style={[styles.engagementItem, Shadows.sm]}>
                  <View style={styles.engagementLeft}>
                    <View style={[styles.engagementIcon, { backgroundColor: '#DBEAFE' }]}>
                      <Ionicons name="chatbubble" size={20} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={styles.engagementValue}>{formatNumber(analytics.comments)}</Text>
                      <Text style={styles.engagementLabel}>Comments</Text>
                    </View>
                  </View>
                  <Text style={styles.engagementBadge}>+{analytics.comments24h} today</Text>
                </View>
                
                <View style={[styles.engagementItem, Shadows.sm]}>
                  <View style={styles.engagementLeft}>
                    <View style={[styles.engagementIcon, { backgroundColor: '#D1FAE5' }]}>
                      <Ionicons name="share-social" size={20} color="#10B981" />
                    </View>
                    <View>
                      <Text style={styles.engagementValue}>{formatNumber(analytics.shares)}</Text>
                      <Text style={styles.engagementLabel}>Shares</Text>
                    </View>
                  </View>
                </View>
                
                <View style={[styles.engagementItem, Shadows.sm]}>
                  <View style={styles.engagementLeft}>
                    <View style={[styles.engagementIcon, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="bookmark" size={20} color="#F59E0B" />
                    </View>
                    <View>
                      <Text style={styles.engagementValue}>{formatNumber(analytics.bookmarks)}</Text>
                      <Text style={styles.engagementLabel}>Bookmarks</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Daily Trend (Simple Bar Chart) */}
            {analytics.dailyViews && analytics.dailyViews.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>7-Day Trend</Text>
                <View style={[styles.chartContainer, Shadows.sm]}>
                  {analytics.dailyViews.slice(-7).map((day, index) => {
                    const maxViews = Math.max(...analytics.dailyViews.map(d => d.views));
                    const heightPercent = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                    
                    return (
                      <View key={index} style={styles.chartBar}>
                        <View style={styles.barWrapper}>
                          <LinearGradient
                            colors={['#0066FF', '#0052CC']}
                            style={[styles.bar, { height: `${heightPercent}%` }]}
                          />
                        </View>
                        <Text style={styles.chartLabel}>
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </Text>
                        <Text style={styles.chartValue}>{day.views}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            
            {/* Traffic Sources */}
            {analytics.viewsBySource && Object.keys(analytics.viewsBySource).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Traffic Sources</Text>
                <View style={styles.sourcesList}>
                  {Object.entries(analytics.viewsBySource).map(([source, views]) => {
                    const percentage = ((views / analytics.totalViews) * 100).toFixed(1);
                    
                    return (
                      <View key={source} style={[styles.sourceItem, Shadows.sm]}>
                        <Text style={styles.sourceName}>{source}</Text>
                        <View style={styles.sourceRight}>
                          <Text style={styles.sourceViews}>{formatNumber(views)}</Text>
                          <Text style={styles.sourcePercent}>{percentage}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            
            {/* Footer spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#E5E5E5" />
            <Text style={styles.errorText}>Failed to load analytics</Text>
            <TouchableOpacity onPress={() => fetchPostAnalytics(postId)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  
  // Content
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
  },
  
  // Overview Grid
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Period Grid
  periodGrid: {
    gap: 12,
  },
  periodCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  periodValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0066FF',
    marginBottom: 4,
  },
  periodLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  
  // Engagement List
  engagementList: {
    gap: 12,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  engagementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
  },
  engagementLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  engagementBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  
  // Chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    height: 200,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barWrapper: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
  },
  chartValue: {
    fontSize: 11,
    color: '#262626',
    fontWeight: '700',
  },
  
  // Sources List
  sourcesList: {
    gap: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    textTransform: 'capitalize',
  },
  sourceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceViews: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0066FF',
  },
  sourcePercent: {
    fontSize: 13,
    color: '#8E8E93',
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  retryButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
