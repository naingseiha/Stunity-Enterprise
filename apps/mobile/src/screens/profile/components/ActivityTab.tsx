/**
 * Activity Tab — Timeline & Contribution Graph
 * 
 * Shows:
 * - Contribution heatmap (28-day grid) based on real streak data
 * - Recent activity timeline from real quiz attempts & achievements
 * - Engagement stats from real UserStats
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserStats } from '@/types';
import type { QuizAttempt, UserAchievement, Streak } from '@/services/stats';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ActivityTabProps {
    stats: UserStats | null;
    posts: number;
    followers: number;
    recentAttempts: QuizAttempt[];
    achievements: UserAchievement[];
    streak: Streak | null;
}

// ── Contribution Grid (28-day heatmap) ───────────────────────────

function ContributionGrid({ streak, recentAttempts }: { streak: Streak | null; recentAttempts: QuizAttempt[] }) {
    const today = new Date();
    const cells: { intensity: number; date: string }[] = [];

    // Build a map of activity per day from real quiz attempts
    const activityMap: Record<string, number> = {};
    for (const attempt of recentAttempts) {
        const day = new Date(attempt.createdAt).toISOString().split('T')[0];
        activityMap[day] = (activityMap[day] || 0) + 1;
    }

    // Generate 28 days
    for (let i = 27; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const count = activityMap[key] || 0;

        // Map count to intensity (0-3)
        let intensity = 0;
        if (count >= 3) intensity = 3;
        else if (count >= 2) intensity = 2;
        else if (count >= 1) intensity = 1;

        // If within streak range, boost intensity by 1
        if (streak && streak.currentStreak > 0 && i < streak.currentStreak && intensity === 0) {
            intensity = 1;
        }

        cells.push({ intensity, date: d.toLocaleDateString() });
    }

    const totalActive = cells.filter(c => c.intensity > 0).length;

    const getColor = (intensity: number) => {
        switch (intensity) {
            case 0: return '#F1F5F9';
            case 1: return '#BAE6FD';
            case 2: return '#38BDF8';
            case 3: return '#0284C7';
            default: return '#F1F5F9';
        }
    };

    const cellSize = (SCREEN_WIDTH - 80 - 6 * 6) / 7;

    return (
        <View style={gridStyles.container}>
            <View style={gridStyles.header}>
                <Text style={gridStyles.title}>Contributions</Text>
                <Text style={gridStyles.subtitle}>{totalActive} active day{totalActive !== 1 ? 's' : ''}</Text>
            </View>
            <View style={gridStyles.grid}>
                {cells.map((cell, i) => (
                    <View
                        key={i}
                        style={[
                            gridStyles.cell,
                            {
                                width: cellSize,
                                height: cellSize,
                                backgroundColor: getColor(cell.intensity),
                                borderRadius: cellSize * 0.25,
                            },
                        ]}
                    />
                ))}
            </View>
            <View style={gridStyles.legend}>
                <Text style={gridStyles.legendText}>Less</Text>
                {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[gridStyles.legendCell, { backgroundColor: getColor(i) }]} />
                ))}
                <Text style={gridStyles.legendText}>More</Text>
            </View>
        </View>
    );
}

const gridStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',

        borderRadius: 14, padding: 20, shadowColor: '#000', elevation: 1
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    subtitle: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    cell: {},
    legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 12 },
    legendCell: { width: 12, height: 12, borderRadius: 3 },
    legendText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
});

// ── Activity Timeline (from real data) ───────────────────────────

interface TimelineItem {
    icon: string;
    color: string;
    title: string;
    subtitle: string;
    time: string;
}

function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffM < 1) return 'Just now';
    if (diffM < 60) return `${diffM}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD === 1) return 'Yesterday';
    if (diffD < 7) return `${diffD} days ago`;
    if (diffD < 30) return `${Math.floor(diffD / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildTimeline(attempts: QuizAttempt[], achievements: UserAchievement[]): TimelineItem[] {
    const items: (TimelineItem & { sortDate: string })[] = [];

    // Add quiz attempts
    for (const attempt of attempts) {
        const scorePercent = attempt.accuracy != null ? Math.round(attempt.accuracy * 100) : attempt.score;
        items.push({
            icon: 'checkmark-circle',
            color: scorePercent >= 80 ? '#10B981' : scorePercent >= 50 ? '#F59E0B' : '#EF4444',
            title: 'Completed quiz',
            subtitle: `Score: ${scorePercent}% · ${attempt.xpEarned || 0} XP earned`,
            time: formatRelativeTime(attempt.createdAt),
            sortDate: attempt.createdAt,
        });
    }

    // Add achievements
    for (const ua of achievements) {
        items.push({
            icon: 'trophy',
            color: '#F59E0B',
            title: 'Achievement unlocked',
            subtitle: ua.achievement?.name || 'New badge earned',
            time: formatRelativeTime(ua.unlockedAt),
            sortDate: ua.unlockedAt,
        });
    }

    // Sort by date (most recent first)
    items.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

    return items.slice(0, 10); // Cap at 10
}

function ActivityTimeline({ items }: { items: TimelineItem[] }) {
    if (items.length === 0) {
        return (
            <View style={timelineStyles.container}>
                <View style={timelineStyles.header}>
                    <View style={[timelineStyles.headerIcon, { backgroundColor: '#FFF7ED' }]}>
                        <Ionicons name="time" size={18} color="#F97316" />
                    </View>
                    <Text style={timelineStyles.title}>Recent Activity</Text>
                </View>
                <View style={timelineStyles.empty}>
                    <Ionicons name="hourglass-outline" size={36} color="#E5E7EB" />
                    <Text style={timelineStyles.emptyText}>No recent activity yet</Text>
                    <Text style={timelineStyles.emptyHint}>Take a quiz or complete a course to see activity here</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={timelineStyles.container}>
            <View style={timelineStyles.header}>
                <View style={[timelineStyles.headerIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="time" size={18} color="#F97316" />
                </View>
                <Text style={timelineStyles.title}>Recent Activity</Text>
            </View>

            {items.map((item, i) => (
                <View key={i} style={timelineStyles.item}>
                    <View style={timelineStyles.lineContainer}>
                        <View style={[timelineStyles.dot, { backgroundColor: item.color }]}>
                            <Ionicons name={item.icon as any} size={12} color="#fff" />
                        </View>
                        {!!(i < items.length - 1) && <View style={timelineStyles.line} />}
                    </View>
                    <View style={timelineStyles.content}>
                        <Text style={timelineStyles.itemTitle}>{item.title}</Text>
                        <Text style={timelineStyles.itemSub}>{item.subtitle}</Text>
                        <Text style={timelineStyles.itemTime}>{item.time}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const timelineStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',

        borderRadius: 14, padding: 20, shadowColor: '#000', elevation: 1
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    item: { flexDirection: 'row', gap: 14 },
    lineContainer: { alignItems: 'center', width: 24 },
    dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    line: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 2 },
    content: { flex: 1, paddingBottom: 20 },
    itemTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
    itemSub: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    itemTime: { fontSize: 11, color: '#D1D5DB', fontWeight: '500' },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    emptyHint: { fontSize: 12, color: '#D1D5DB', textAlign: 'center' },
});

// ── Engagement Stats ─────────────────────────────────────────────

const ENGAGEMENT_ITEMS = [
    { icon: 'heart', color: '#F43F5E', bg: '#FFF1F2', label: 'Total Likes' },
    { icon: 'eye', color: '#06B6D4', bg: '#ECFEFF', label: 'Total Views' },
    { icon: 'document-text', color: '#8B5CF6', bg: '#FAF5FF', label: 'Posts' },
    { icon: 'people', color: '#10B981', bg: '#ECFDF5', label: 'Followers' },
];

function EngagementGrid({ stats, posts, followers }: { stats: UserStats | null; posts: number; followers: number }) {
    const values = [
        stats?.totalLikes ?? 0,
        stats?.totalViews ?? 0,
        posts,
        followers,
    ];

    return (
        <View style={engStyles.container}>
            <View style={engStyles.header}>
                <View style={[engStyles.headerIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="pulse" size={18} color="#10B981" />
                </View>
                <Text style={engStyles.title}>Engagement</Text>
            </View>
            <View style={engStyles.grid}>
                {ENGAGEMENT_ITEMS.map((item, i) => (
                    <View key={i} style={engStyles.item}>
                        <View style={[engStyles.itemIcon, { backgroundColor: item.bg }]}>
                            <Ionicons name={item.icon as any} size={18} color={item.color} />
                        </View>
                        <Text style={engStyles.itemValue}>{values[i].toLocaleString()}</Text>
                        <Text style={engStyles.itemLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const engStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',

        borderRadius: 14, padding: 20, shadowColor: '#000', elevation: 1
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    item: {
        width: '47%' as any,
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
    },
    itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    itemValue: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 2 },
    itemLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase' },
});

// ── Main Activity Tab ────────────────────────────────────────────

export default function ActivityTab({ stats, posts, followers, recentAttempts, achievements, streak }: ActivityTabProps) {
    const timelineItems = buildTimeline(recentAttempts, achievements);

    return (
        <View style={s.container}>
            <ContributionGrid streak={streak} recentAttempts={recentAttempts} />
            <ActivityTimeline items={timelineItems} />
            <EngagementGrid stats={stats} posts={posts} followers={followers} />
        </View>
    );
}

const s = StyleSheet.create({
    container: { gap: 16 },
});
