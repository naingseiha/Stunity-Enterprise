import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle, Rect } from 'react-native-svg';

import { learnApi } from '@/api';
import type { InstructorDashboardStats, PerformanceData, InstructorCourseStats } from '@/api/learn';
import { Colors, Typography, Shadows } from '@/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_HORIZONTAL_PADDING = 12;
const CHART_VERTICAL_PADDING = 18;

const StatCard = ({ title, value, icon, color, subValue }: { 
  title: string; 
  value: string; 
  icon: keyof typeof Ionicons.glyphMap; 
  color: string;
  subValue?: string;
}) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color: Colors.gray[900] }]}>{value}</Text>
      {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
    </View>
  </View>
);

const PerformanceChart = ({ data }: { data: PerformanceData[] }) => {
  if (!data || data.length < 2) return null;

  const [chartWidth, setChartWidth] = useState(0);

  const values = useMemo(() => data.map((d) => d.students), [data]);
  const maxStudents = useMemo(() => Math.max(...values, 0), [values]);
  const minStudents = useMemo(() => Math.min(...values, 0), [values]);
  const range = maxStudents - minStudents;
  const hasAnyGrowth = values.some((value) => value > 0);

  const plotWidth = Math.max(chartWidth - CHART_HORIZONTAL_PADDING * 2, 0);
  const plotHeight = Math.max(CHART_HEIGHT - CHART_VERTICAL_PADDING * 2, 0);
  const flatLineY = CHART_VERTICAL_PADDING + plotHeight / 2;

  const points = useMemo(() => {
    if (plotWidth <= 0) return [];

    return data.map((d, i) => {
      const progress = data.length > 1 ? i / (data.length - 1) : 0;
      const x = CHART_HORIZONTAL_PADDING + progress * plotWidth;

      const y = range === 0
        ? flatLineY
        : CHART_VERTICAL_PADDING + ((maxStudents - d.students) / range) * plotHeight;

      return { x, y };
    });
  }, [data, flatLineY, maxStudents, plotHeight, plotWidth, range]);

  const pathContent = useMemo(
    () => points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), ''),
    [points]
  );

  const areaBaseY = CHART_HEIGHT - CHART_VERTICAL_PADDING;
  const areaContent = points.length
    ? `${pathContent} L ${points[points.length - 1].x} ${areaBaseY} L ${points[0].x} ${areaBaseY} Z`
    : '';

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Student Growth</Text>
        <Text style={styles.chartSubtitle}>Last 4 months</Text>
      </View>
      <View
        style={styles.chartSvgWrap}
        onLayout={(event) => {
          const nextWidth = Math.floor(event.nativeEvent.layout.width);
          if (nextWidth > 0 && nextWidth !== chartWidth) {
            setChartWidth(nextWidth);
          }
        }}
      >
        {chartWidth > 0 && (
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Defs>
              <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={Colors.teal[500]} stopOpacity={hasAnyGrowth ? '0.3' : '0.15'} />
                <Stop offset="1" stopColor={Colors.teal[500]} stopOpacity="0" />
              </SvgGradient>
            </Defs>

            {[0, 0.5, 1].map((step) => {
              const y = CHART_VERTICAL_PADDING + step * plotHeight;
              return (
                <Rect
                  key={`grid-${step}`}
                  x={CHART_HORIZONTAL_PADDING}
                  y={y}
                  width={plotWidth}
                  height={1}
                  fill="rgba(148,163,184,0.18)"
                />
              );
            })}

            {areaContent ? <Path d={areaContent} fill="url(#grad)" /> : null}
            {pathContent ? (
              <Path
                d={pathContent}
                fill="none"
                stroke={Colors.teal[500]}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {points.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={Colors.teal[600]} strokeWidth="2" />
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.chartLabels}>
        {data.map((d, i) => (
          <Text key={i} style={styles.chartLabelText}>{d.name}</Text>
        ))}
      </View>
      {!hasAnyGrowth && (
        <Text style={styles.chartHintText}>No enrollment growth yet. Trend will appear after first student joins.</Text>
      )}
    </View>
  );
};

export const InstructorDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<InstructorDashboardStats | null>(null);

  const loadData = useCallback(async () => {
    try {
      const stats = await learnApi.getInstructorStats();
      setData(stats);
    } catch (error) {
      console.error('Error loading instructor stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.teal[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F0FDFA', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instructor Dashboard</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Revenue" 
            value={`$${data?.stats.totalRevenue.toLocaleString()}`} 
            icon="cash-outline" 
            color="#059669"
            subValue="+12% from last month"
          />
          <StatCard 
            title="Total Students" 
            value={data?.stats.totalStudents.toLocaleString() || '0'} 
            icon="people-outline" 
            color="#2563EB"
            subValue="Across all courses"
          />
          <StatCard 
            title="Avg Rating" 
            value={data?.stats.averageRating.toFixed(1) || '0.0'} 
            icon="star-outline" 
            color="#F59E0B"
            subValue="Top 5% instructor"
          />
          <StatCard 
            title="Active Courses" 
            value={data?.stats.activeCourses.toString() || '0'} 
            icon="book-outline" 
            color="#7C3AED"
            subValue="Published content"
          />
        </View>

        {/* Performance Chart */}
        {data?.performance && <PerformanceChart data={data.performance} />}

        {/* Course Performance List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Course Performance</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Detailed View</Text>
          </TouchableOpacity>
        </View>

        {data?.courses.map((course) => (
          <View key={course.id} style={styles.courseItem}>
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
              <View style={styles.courseMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={12} color={Colors.gray[500]} />
                  <Text style={styles.metaText}>{course.students}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.metaText}>{course.rating.toFixed(1)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.courseEarning}>
              <Text style={styles.earningValue}>${course.revenue.toLocaleString()}</Text>
              <Text style={styles.earningLabel}>Revenue</Text>
            </View>
          </View>
        ))}

        {data?.courses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>No data available yet</Text>
            <Text style={styles.emptySubtext}>Publish courses to see your dashboard analytics</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {},
  statTitle: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statSubValue: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  chartSubtitle: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  chartLabelText: {
    fontSize: 11,
    color: Colors.gray[400],
    fontWeight: '500',
  },
  chartSvgWrap: {
    width: '100%',
  },
  chartHintText: {
    marginTop: 10,
    fontSize: 11,
    color: Colors.gray[500],
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.teal[600],
    fontWeight: '600',
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  courseInfo: {
    flex: 1,
    marginRight: 16,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 6,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray[500],
    marginLeft: 4,
    fontWeight: '500',
  },
  courseEarning: {
    alignItems: 'flex-end',
  },
  earningValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  earningLabel: {
    fontSize: 10,
    color: Colors.gray[400],
    marginTop: 2,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray[400],
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});

export default InstructorDashboardScreen;
