/**
 * Performance Tab — Learning Analytics Dashboard
 * 
 * Rich data-driven dashboard showing:
 * - XP & Level Progress Ring
 * - Quiz Performance with trend chart
 * - Learning Streak
 * - Achievement Showcase
 * - Leaderboard Position
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path, Text as SvgText } from 'react-native-svg';
import type { UserStats as QuizUserStats, UserAchievement, Streak } from '@/services/stats';
import type { UserStats as ProfileUserStats } from '@/types';
import { Shadows } from '@/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────────

interface PerformanceTabProps {
    quizStats: QuizUserStats | null;
    profileStats: ProfileUserStats | null;
    streak: Streak | null;
    achievements: UserAchievement[];
    totalAchievements: number;
    level: number;
    totalPoints: number;
    profile: any;
    onViewAchievements?: () => void;
    onViewLeaderboard?: () => void;
    onViewStats?: () => void;
}

// Premium Stat card config with subtle gradients and glassmorphism hints
const STAT_CARDS = [
    { icon: 'book-outline' as const, bgStart: '#F0F9FF', bgEnd: '#E0F2FE', accent: '#0EA5E9', tint: '#0C4A6E' },
    { icon: 'star-outline' as const, bgStart: '#FFF7ED', bgEnd: '#FFEDD5', accent: '#F59E0B', tint: '#92400E' },
    { icon: 'time-outline' as const, bgStart: '#F0FDF4', bgEnd: '#DCFCE7', accent: '#10B981', tint: '#065F46' },
    { icon: 'flame-outline' as const, bgStart: '#FFF1F2', bgEnd: '#FFE4E6', accent: '#F43F5E', tint: '#9F1239' },
    { icon: 'trophy-outline' as const, bgStart: '#FAF5FF', bgEnd: '#F3E8FF', accent: '#8B5CF6', tint: '#5B21B6' },
    { icon: 'code-slash-outline' as const, bgStart: '#EFF6FF', bgEnd: '#DBEAFE', accent: '#3B82F6', tint: '#1E3A8A' },
];

function StatCard({ icon, value, label, index = 0 }: { icon: string; value: string | number; label: string; index?: number }) {
    const cfg = STAT_CARDS[index % STAT_CARDS.length];
    const scale = useSharedValue(0.92);
    const translateY = useSharedValue(12);

    useEffect(() => {
        const d = 200 + index * 50;
        scale.value = withDelay(d, withSpring(1, { damping: 16, stiffness: 140 }));
        translateY.value = withDelay(d, withSpring(0, { damping: 16, stiffness: 140 }));
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
    }));

    return (
        <Animated.View style={[s.statGridCardWrapper, animStyle]}>
            <View style={[s.statGridCard, { backgroundColor: cfg.bgStart }]}>
                <View style={[s.statGridIcon, { backgroundColor: cfg.accent }]}>
                    <Ionicons name={icon as any} size={18} color="#fff" />
                </View>
                <Text style={[s.statGridValue, { color: cfg.tint }]}>{value}</Text>
                <Text style={[s.statGridLabel, { color: cfg.tint, opacity: 0.8 }]}>{label}</Text>
            </View>
        </Animated.View>
    );
}

// ── XP Progress Ring ─────────────────────────────────────────────

function XPProgressRing({ xp, xpToNext, level, quizzes, avgScore }: { xp: number; xpToNext: number; level: number; quizzes?: number; avgScore?: number }) {
    const size = 140;
    const xpPct = xpToNext > 0 ? Math.min(xp / xpToNext, 1) : 0;
    const quizPct = Math.min((quizzes ?? 0) / Math.max((quizzes ?? 0) + 5, 10), 1);
    const scorePct = Math.min((avgScore ?? 0) / 100, 1);

    const rings = [
        { r: 60, sw: 10, pct: xpPct, id: 'xp', c1: '#38BDF8', c2: '#0284C7' },
        { r: 46, sw: 8, pct: quizPct, id: 'quiz', c1: '#34D399', c2: '#059669' },
        { r: 34, sw: 7, pct: scorePct, id: 'score', c1: '#FBBF24', c2: '#F97316' },
    ];

    return (
        <View style={ringStyles.container}>
            <View style={ringStyles.glow} />
            <Svg width={size} height={size}>
                <Defs>
                    {rings.map(ring => (
                        <SvgLinearGradient key={ring.id} id={`pgrad_${ring.id}`} x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={ring.c1} />
                            <Stop offset="1" stopColor={ring.c2} />
                        </SvgLinearGradient>
                    ))}
                </Defs>
                {rings.map(ring => {
                    const circ = 2 * Math.PI * ring.r;
                    return (
                        <React.Fragment key={ring.id}>
                            <Circle cx={size / 2} cy={size / 2} r={ring.r}
                                stroke={`${ring.c1}18`} strokeWidth={ring.sw} fill="none" />
                            <Circle cx={size / 2} cy={size / 2} r={ring.r}
                                stroke={`url(#pgrad_${ring.id})`} strokeWidth={ring.sw} fill="none"
                                strokeDasharray={`${circ}`}
                                strokeDashoffset={circ * (1 - ring.pct)}
                                strokeLinecap="round"
                                transform={`rotate(-90, ${size / 2}, ${size / 2})`} />
                        </React.Fragment>
                    );
                })}
            </Svg>
            <View style={ringStyles.inner}>
                <Text style={ringStyles.levelValue}>{level}</Text>
                <Text style={ringStyles.levelLabel}>LEVEL</Text>
            </View>
        </View>
    );
}

const ringStyles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
    glow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(14,165,233,0.06)' },
    inner: { position: 'absolute', alignItems: 'center' },
    levelLabel: { fontSize: 8, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.2 },
    levelValue: { fontSize: 34, fontWeight: '900', color: '#1F2937', letterSpacing: -1 },
});

// ── Mini Line Chart ──────────────────────────────────────────────

function MiniLineChart({ data, width, height }: { data: number[]; width: number; height: number }) {
    if (data.length < 2) return null;

    const pad = 12;
    const cW = width - pad * 2;
    const cH = height - pad * 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pts = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * cW;
        const y = pad + cH - ((v - min) / range) * cH;
        return { x, y };
    });

    // Create smooth curve
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
        const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 3;
        const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) / 3;
        d += ` C ${cp1x},${pts[i - 1].y} ${cp2x},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }

    // Area fill path
    const areaD = d + ` L ${pts[pts.length - 1].x},${height - pad} L ${pts[0].x},${height - pad} Z`;

    return (
        <Svg width={width} height={height}>
            <Path d={areaD} fill="rgba(14, 165, 233, 0.08)" />
            <Path d={d} fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
            {pts.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#0EA5E9" strokeWidth="2" />
            ))}
        </Svg>
    );
}

// ── Streak Weekly Dots ───────────────────────────────────────────

function WeeklyDots({ streak }: { streak: Streak | null }) {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date().getDay(); // 0=Sun
    const mappedToday = today === 0 ? 6 : today - 1; // 0=Mon

    return (
        <View style={dotStyles.container}>
            {days.map((day, i) => {
                const isActive = i <= mappedToday && streak && streak.currentStreak > (mappedToday - i);
                return (
                    <View key={i} style={dotStyles.dayColumn}>
                        <View style={[dotStyles.dot, isActive && dotStyles.dotActive, i === mappedToday && dotStyles.dotToday]} />
                        <Text style={[dotStyles.dayLabel, isActive && dotStyles.dayLabelActive]}>{day}</Text>
                    </View>
                );
            })}
        </View>
    );
}

const dotStyles = StyleSheet.create({
    container: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20 },
    dayColumn: { alignItems: 'center', gap: 6 },
    dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F4F8' },
    dotActive: { backgroundColor: '#F97316' },
    dotToday: { borderWidth: 2.5, borderColor: '#FB923C' },
    dayLabel: { fontSize: 10, fontWeight: '600', color: '#D1D5DB' },
    dayLabelActive: { color: '#F97316' },
});

// ── Main Performance Tab Component ───────────────────────────────

export default function PerformanceTab({
    quizStats,
    profileStats,
    streak,
    achievements,
    totalAchievements,
    level,
    totalPoints,
    profile,
    onViewAchievements,
    onViewLeaderboard,
    onViewStats,
}: PerformanceTabProps) {
    const cardScale = useSharedValue(0.95);

    useEffect(() => {
        cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
    }));

    const xp = quizStats?.xpProgress ?? 0;
    const xpToNext = quizStats?.xpToNextLevel ?? 1000;
    const scoreHistory = quizStats?.recentAttempts?.map(a => a.score).reverse() || [];

    return (
        <View style={s.container}>
            {/* XP & Level Card */}
            <Animated.View style={[s.card, animStyle]}>
                <LinearGradient
                    colors={['#ffffff', '#F8FAFC']}
                    style={s.cardGradient}
                >
                    <View style={s.xpRow}>
                        <XPProgressRing xp={xp} xpToNext={xpToNext} level={quizStats?.level ?? level} quizzes={quizStats?.totalQuizzes ?? 0} avgScore={quizStats?.avgScore ?? 0} />
                        <View style={s.xpInfo}>
                            <View style={s.xpStatRow}>
                                <View style={[s.xpStatIcon, { backgroundColor: '#F0F4F8' }]}>
                                    <Ionicons name="diamond" size={14} color="#3B82F6" />
                                </View>
                                <View>
                                    <Text style={s.xpStatValue}>{totalPoints.toLocaleString()}</Text>
                                    <Text style={s.xpStatLabel}>Total Points</Text>
                                </View>
                            </View>
                            <View style={s.xpStatRow}>
                                <View style={[s.xpStatIcon, { backgroundColor: '#ECFDF5' }]}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                </View>
                                <View>
                                    <Text style={s.xpStatValue}>{quizStats?.totalQuizzes ?? 0}</Text>
                                    <Text style={s.xpStatLabel}>Quizzes Done</Text>
                                </View>
                            </View>
                            <View style={s.xpStatRow}>
                                <View style={[s.xpStatIcon, { backgroundColor: '#FFF7ED' }]}>
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                </View>
                                <View>
                                    <Text style={s.xpStatValue}>{(quizStats?.avgScore ?? 0).toFixed(0)}%</Text>
                                    <Text style={s.xpStatLabel}>Avg Score</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* XP Progress Bar */}
                    <View style={s.xpBarSection}>
                        <View style={s.xpBarLabels}>
                            <Text style={s.xpBarLeft}>{xp.toLocaleString()} XP</Text>
                            <Text style={s.xpBarRight}>{xpToNext.toLocaleString()} XP</Text>
                        </View>
                        <View style={s.xpBarBg}>
                            <LinearGradient
                                colors={['#38BDF8', '#0EA5E9', '#0284C7']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[s.xpBarFill, { width: `${Math.min((xp / xpToNext) * 100, 100)}%` }]}
                            />
                        </View>
                        <Text style={s.xpBarHint}>{Math.max(xpToNext - xp, 0).toLocaleString()} XP to Level {(quizStats?.level ?? level) + 1}</Text>
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Quiz Performance Card */}
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={[s.cardHeaderIcon, { backgroundColor: '#F0F4F8' }]}>
                        <Ionicons name="analytics" size={18} color="#3B82F6" />
                    </View>
                    <Text style={s.cardTitle}>Quiz Performance</Text>
                    <TouchableOpacity onPress={onViewStats} style={s.viewAllBtn}>
                        <Text style={s.viewAllText}>Details</Text>
                        <Ionicons name="chevron-forward" size={14} color="#0EA5E9" />
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={s.quizStatsRow}>
                    <View style={s.quizStat}>
                        <Text style={[s.quizStatValue, { color: '#10B981' }]}>{(quizStats?.winRate ?? 0).toFixed(0)}%</Text>
                        <Text style={s.quizStatLabel}>Pass Rate</Text>
                    </View>
                    <View style={s.quizStatDivider} />
                    <View style={s.quizStat}>
                        <Text style={[s.quizStatValue, { color: '#F59E0B' }]}>{quizStats?.winStreak ?? 0}</Text>
                        <Text style={s.quizStatLabel}>Win Streak</Text>
                    </View>
                    <View style={s.quizStatDivider} />
                    <View style={s.quizStat}>
                        <Text style={[s.quizStatValue, { color: '#8B5CF6' }]}>{quizStats?.correctAnswers ?? 0}/{quizStats?.totalAnswers ?? 0}</Text>
                        <Text style={s.quizStatLabel}>Correct</Text>
                    </View>
                </View>

                {/* Mini Chart */}
                {scoreHistory.length >= 2 && (
                    <View style={s.chartContainer}>
                        <Text style={s.chartTitle}>Recent Scores</Text>
                        <MiniLineChart data={scoreHistory.slice(-7)} width={SCREEN_WIDTH - 80} height={100} />
                    </View>
                )}
                {scoreHistory.length < 2 && (
                    <View style={s.emptyChart}>
                        <Ionicons name="bar-chart-outline" size={32} color="#E5E7EB" />
                        <Text style={s.emptyChartText}>Complete quizzes to see trends</Text>
                    </View>
                )}
            </View>

            {/* Streak Card */}
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={[s.cardHeaderIcon, { backgroundColor: '#FFF7ED' }]}>
                        <Ionicons name="flame" size={18} color="#F97316" />
                    </View>
                    <Text style={s.cardTitle}>Learning Streak</Text>
                </View>

                <View style={s.streakRow}>
                    <View style={s.streakMain}>
                        <Text style={s.streakNumber}>{streak?.currentStreak ?? 0}</Text>
                        <Text style={s.streakUnit}>day{(streak?.currentStreak ?? 0) !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={s.streakSide}>
                        <View style={s.streakSideRow}>
                            <Ionicons name="trophy" size={14} color="#F59E0B" />
                            <Text style={s.streakSideText}>Best: {streak?.longestStreak ?? 0} days</Text>
                        </View>
                        <View style={s.streakSideRow}>
                            <Ionicons name="snow" size={14} color="#60A5FA" />
                            <Text style={s.streakSideText}>Freezes: {streak?.freezesAvailable ?? 0}</Text>
                        </View>
                    </View>
                </View>

                <WeeklyDots streak={streak} />
            </View>

            {/* Core Stats Overview */}
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={[s.cardHeaderIcon, { backgroundColor: '#F3F4F6' }]}>
                        <Ionicons name="apps" size={18} color="#4B5563" />
                    </View>
                    <Text style={s.cardTitle}>Performance Overview</Text>
                </View>

                <View style={s.statGridWrapper}>
                    <View style={s.statGrid}>
                        <StatCard icon="book-outline" value={quizStats?.totalQuizzes ?? 0} label="Courses" index={0} />
                        <StatCard icon="star-outline" value={quizStats?.totalPoints ?? profile?.totalPoints ?? 0} label="Points" index={1} />
                        <StatCard icon="time-outline" value={profile?.totalLearningHours ?? 0} label="Study Hours" index={2} />
                        <StatCard icon="flame-outline" value={streak?.currentStreak ?? profile?.currentStreak ?? 0} label="Day Streak" index={3} />
                        <StatCard icon="trophy-outline" value={achievements?.length || 0} label="Achievements" index={4} />
                        <StatCard icon="code-slash-outline" value={(profile as any)?.projects?.length ?? 0} label="Projects" index={5} />
                    </View>
                </View>
            </View>

            {/* Achievement Showcase */}
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={[s.cardHeaderIcon, { backgroundColor: '#FAF5FF' }]}>
                        <Ionicons name="medal" size={18} color="#8B5CF6" />
                    </View>
                    <Text style={s.cardTitle}>Achievements</Text>
                    <TouchableOpacity onPress={onViewAchievements} style={s.viewAllBtn}>
                        <Text style={s.viewAllText}>{achievements.length}/{totalAchievements}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#0EA5E9" />
                    </TouchableOpacity>
                </View>

                {achievements.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgeScroll}>
                        {achievements.slice(0, 8).map((ua) => {
                            let color = '#8B5CF6';
                            if (ua.achievement?.category === 'streak') color = '#F97316';
                            if (ua.achievement?.category === 'performance') color = '#10B981';
                            if (ua.achievement?.category === 'competition') color = '#F472B6';

                            return (
                                <View key={ua.id} style={s.badgeItem}>
                                    <View style={[s.badgeCircle, { backgroundColor: color + '20', borderColor: color }]}>
                                        <Text style={s.badgeEmoji}>{ua.achievement?.icon || '🏆'}</Text>
                                    </View>
                                    <Text style={s.badgeName} numberOfLines={1}>{ua.achievement?.name || 'Badge'}</Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <View style={s.emptyChart}>
                        <Ionicons name="ribbon-outline" size={32} color="#E5E7EB" />
                        <Text style={s.emptyChartText}>Complete challenges to earn badges</Text>
                    </View>
                )}
            </View>

            {/* Leaderboard Position */}
            <TouchableOpacity style={s.leaderboardCard} onPress={onViewLeaderboard} activeOpacity={0.8}>
                <LinearGradient
                    colors={['#4F46E5', '#7C3AED', '#9333EA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.leaderboardGradient}
                >
                    <View style={s.leaderboardLeft}>
                        <View style={s.leaderboardIconWrap}>
                            <Ionicons name="podium" size={22} color="#7C3AED" />
                        </View>
                        <View>
                            <Text style={s.leaderboardTitle}>Leaderboard</Text>
                            <Text style={s.leaderboardSub}>See where you rank globally</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: { gap: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
    },
    cardGradient: { padding: 20 },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    cardHeaderIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1 },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    viewAllText: { fontSize: 13, fontWeight: '600', color: '#0EA5E9' },

    // XP Card
    xpRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    xpInfo: { flex: 1, gap: 12 },
    xpStatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    xpStatIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    xpStatValue: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
    xpStatLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
    xpBarSection: { marginTop: 18 },
    xpBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    xpBarLeft: { fontSize: 11, fontWeight: '600', color: '#0EA5E9' },
    xpBarRight: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
    xpBarBg: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
    xpBarFill: { height: '100%', borderRadius: 5 },
    xpBarHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },

    // Quiz Stats
    quizStatsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    quizStat: { flex: 1, alignItems: 'center' },
    quizStatValue: { fontSize: 18, fontWeight: '800' },
    quizStatLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
    quizStatDivider: { width: 1, height: 30, backgroundColor: '#F0F4F8', alignSelf: 'center' },
    chartContainer: { paddingHorizontal: 16, paddingBottom: 16 },
    chartTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 4, paddingLeft: 4 },
    emptyChart: { alignItems: 'center', paddingVertical: 24, paddingBottom: 20, gap: 8 },
    emptyChartText: { fontSize: 13, color: '#D1D5DB' },

    // Streak
    streakRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 20 },
    streakMain: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    streakNumber: { fontSize: 48, fontWeight: '800', color: '#F97316', letterSpacing: -2 },
    streakUnit: { fontSize: 16, fontWeight: '600', color: '#FDBA74' },
    streakSide: { flex: 1, gap: 8 },
    streakSideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    streakSideText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

    // Achievement badges
    badgeScroll: { paddingHorizontal: 16, gap: 14, paddingBottom: 18 },
    badgeItem: { alignItems: 'center', width: 64 },
    badgeCircle: {
        width: 50, height: 50, borderRadius: 25,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, marginBottom: 6,
    },
    badgeEmoji: { fontSize: 22 },
    badgeName: { fontSize: 10, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

    // Leaderboard
    leaderboardCard: { borderRadius: 14, overflow: 'hidden' },
    leaderboardGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 20,
    },
    leaderboardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    leaderboardIconWrap: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
    },
    leaderboardTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    leaderboardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    // Core Stat Grid
    statGridWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    statGridCardWrapper: {
        width: '31%',
        borderRadius: 16,
        ...Shadows.sm,
        shadowOpacity: 0.08,
    },
    statGridCard: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    statGridIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    statGridValue: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 2,
        letterSpacing: -0.5,
    },
    statGridLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    // Attendance Card Styles
    attendanceGradient: {
        padding: 20,
        borderRadius: 24,
    },
    attHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    attIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    attTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    attSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    attBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    attBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    attTimeRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    attTimeBox: {
        flex: 1,
        alignItems: 'center',
    },
    attTimeLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '700',
        marginBottom: 4,
    },
    attTimeValue: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '800',
    },
    attTimeDivider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 10,
    },
    attBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    attBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
});
