import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown, FadeIn, FadeInRight, useSharedValue, useAnimatedStyle, withRepeat,
    withTiming, Easing, withSequence, withDelay, withSpring, ZoomIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { formatNumber } from '@/utils';
import { QuizItem } from '@/services/quiz';

const { width } = Dimensions.get('window');

// --------------- Types -------------------
interface ActionButtonProps {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    colors: [string, string, ...string[]];
    onPress: () => void;
    delay?: number;
    badge?: number;
}

interface CategoryCardProps {
    title: string;
    subTitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    colors: [string, string, ...string[]];
    onPress: () => void;
    delay?: number;
}

// --------------- Header -------------------
export const QuizHeader = ({ points }: { points: number }) => {
    return (
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.headerContainer}>
            <View style={styles.headerLeft}>
                <View style={styles.headerIconWrap}>
                    <Ionicons name="game-controller" size={20} color="#A78BFA" />
                </View>
                <Text style={styles.headerTitle}>Stunity <Text style={{ color: '#A78BFA' }}>Play</Text></Text>
            </View>

            <View style={styles.pointsPill}>
                <Ionicons name="diamond" size={13} color="#A78BFA" />
                <Text style={styles.pointsText}>{formatNumber(points)}</Text>
                <View style={styles.addBtn}>
                    <Ionicons name="add" size={14} color="#A78BFA" />
                </View>
            </View>
        </Animated.View>
    );
};

// --------------- Streak Card -------------------
export const StreakCard = ({ streak = 7, longestStreak = 14 }: { streak?: number; longestStreak?: number }) => {
    const glow = useSharedValue(0.6);

    useEffect(() => {
        glow.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1, true
        );
    }, []);

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glow.value,
        transform: [{ scale: 0.9 + glow.value * 0.1 }],
    }));

    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    // Assume 'streak' days from today going backward
    const today = new Date().getDay(); // 0=Sun, 1=Mon...
    // Create a 7-item ring: mark last 'streak' days as active
    const activeCount = Math.min(streak, 7);

    return (
        <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.streakCard}>
            <LinearGradient
                colors={['rgba(251,146,60,0.18)', 'rgba(239,68,68,0.10)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.streakGradient}
            >
                {/* Glow */}
                <Animated.View style={[styles.streakGlowBg, glowStyle]} />

                <View style={styles.streakLeft}>
                    <View style={styles.streakFireWrap}>
                        <Animated.View style={[styles.streakFireGlow, glowStyle]} />
                        <Text style={styles.streakFireEmoji}>🔥</Text>
                    </View>
                    <View>
                        <Text style={styles.streakCount}>{streak} Day Streak</Text>
                        <Text style={styles.streakSub}>Best: {longestStreak} days</Text>
                    </View>
                </View>

                <View style={styles.streakDots}>
                    {days.map((d, i) => {
                        const isActive = i < activeCount;
                        return (
                            <View key={i} style={styles.streakDayWrap}>
                                <View style={[styles.streakDot, isActive && styles.streakDotActive]}>
                                    {isActive && <Ionicons name="checkmark" size={9} color="#FFF" />}
                                </View>
                                <Text style={[styles.streakDayLabel, isActive && styles.streakDayLabelActive]}>{d}</Text>
                            </View>
                        );
                    })}
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

// --------------- Quick Stats Row -------------------
export const QuickStatsRow = ({
    quizzesTaken = 42,
    winRate = 68,
    bestStreak = 14,
}: {
    quizzesTaken?: number; winRate?: number; bestStreak?: number;
}) => {
    const stats = [
        { label: 'Quizzes', value: quizzesTaken, icon: 'layers' as const, color: '#A78BFA' },
        { label: 'Win Rate', value: `${winRate}%`, icon: 'trophy' as const, color: '#FBBF24' },
        { label: 'Best Streak', value: `${bestStreak}d`, icon: 'flame' as const, color: '#F472B6' },
    ];

    return (
        <Animated.View entering={FadeInDown.delay(220).duration(500)} style={styles.statsRow}>
            {stats.map((s, i) => (
                <View key={i} style={styles.statPill}>
                    <View style={[styles.statIcon, { backgroundColor: `${s.color}22` }]}>
                        <Ionicons name={s.icon} size={14} color={s.color} />
                    </View>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                </View>
            ))}
        </Animated.View>
    );
};

// --------------- King of the Quiz Banner -------------------
export const KingBanner = ({
    onAvatarsPress,
    liveCount = 238,
}: { onAvatarsPress?: () => void; liveCount?: number }) => {
    const translateY = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-5, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
            ),
            -1, true
        );
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.3, { duration: 900 }),
                withTiming(1, { duration: 900 })
            ),
            -1, true
        );
    }, []);

    const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: 2 - pulse.value }));

    return (
        <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.kingContainer}>
            <LinearGradient
                colors={['#7C3AED', '#A855F7', '#EC4899']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.kingGradient}
            >
                {/* Dark overlay */}
                <LinearGradient
                    colors={['rgba(15, 23, 42, 0.35)', 'rgba(15, 23, 42, 0.0)']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Floating trophy */}
                <Animated.View style={[styles.crownIconWrap, floatStyle]}>
                    <Ionicons name="trophy" size={100} color="rgba(255,255,255,0.12)" />
                </Animated.View>

                <View style={styles.kingInnerContent}>
                    {/* Top row: label + live count */}
                    <View style={styles.kingTopRow}>
                        <View style={styles.kingTop}>
                            <Ionicons name="flash" size={14} color="#FDE047" style={{ marginRight: 5 }} />
                            <Text style={styles.kingLabel}>This Week's King</Text>
                        </View>
                        {/* Live player count pill */}
                        <TouchableOpacity style={styles.liveCountPill} activeOpacity={0.8}>
                            <Animated.View style={[styles.liveDot, pulseStyle]} />
                            <View style={styles.liveDotSolid} />
                            <Text style={styles.liveCountText}>{formatNumber(liveCount)} Live</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Winner info */}
                    <View style={styles.kingCenterWrap}>
                        <View style={styles.kingAvatarOuter}>
                            <View style={styles.kingAvatarInner}>
                                <Image source={{ uri: 'https://i.pravatar.cc/150?img=11' }} style={styles.kingAvatar} />
                            </View>
                            <View style={styles.kingBadge}>
                                <Text style={{ fontSize: 10 }}>👑</Text>
                            </View>
                        </View>

                        <View style={styles.kingUserInfoWrap}>
                            <Text style={styles.kingName}>Maktum Talukdar</Text>
                            <View style={styles.kingPointsRow}>
                                <Ionicons name="diamond" size={13} color="#FDE047" style={{ marginRight: 4 }} />
                                <Text style={styles.kingPoints}>12,000 Diamonds</Text>
                            </View>
                            <TouchableOpacity style={styles.challengeBtn} onPress={onAvatarsPress}>
                                <Text style={styles.challengeBtnText}>View Leaderboard →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

// --------------- Action Grid -------------------
export const ActionGrid = ({
    onJoin, onLeaderboard, onAchievements, onCreate,
}: { onJoin: () => void; onLeaderboard: () => void; onAchievements: () => void; onCreate: () => void }) => {
    return (
        <View style={styles.actionGridContainer}>
            <View style={styles.actionGridRow}>
                <ActionButton
                    title="Join Quiz"
                    icon="add-circle"
                    colors={['#7C3AED', '#9333EA']}
                    onPress={onJoin}
                    delay={360}
                    badge={3}
                />
                <ActionButton
                    title="Create Quiz"
                    icon="color-wand"
                    colors={['#EC4899', '#BE185D']}
                    onPress={onCreate}
                    delay={410}
                />
            </View>
            <View style={styles.actionGridRow}>
                <ActionButton
                    title="Leaderboard"
                    icon="podium"
                    colors={['#065F46', '#059669']}
                    onPress={onLeaderboard}
                    delay={460}
                />
                <ActionButton
                    title="Achievements"
                    icon="ribbon"
                    colors={['#92400E', '#D97706']}
                    onPress={onAchievements}
                    delay={510}
                />
            </View>
        </View>
    );
};

const ActionButton = ({ title, icon, colors, onPress, delay = 0, badge }: ActionButtonProps) => {
    const scale = useSharedValue(1);
    const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()} style={[styles.actionBtnWrap, pressStyle]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.93); }}
                onPressOut={() => { scale.value = withSpring(1); }}
            >
                <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtnBg}>
                    <View style={styles.actionBtnIconWrap}>
                        <Ionicons name={icon} size={32} color="#FFF" />
                        {badge != null && (
                            <View style={styles.badgePill}>
                                <Text style={styles.badgeText}>{badge}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.actionBtnTitle}>{title}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --------------- Daily Quiz Card -------------------
interface DailyQuizCardProps {
    onPress: () => void;
    dailyQuiz?: QuizItem | null;
}

export const DailyQuizCard = ({ onPress, dailyQuiz }: DailyQuizCardProps) => {
    // Time remaining until midnight
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calc = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            const diffMs = midnight.getTime() - now.getTime();
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            setTimeLeft(`${h}h ${m}m`);
        };
        calc();
        const id = setInterval(calc, 60000);
        return () => clearInterval(id);
    }, []);

    const shimmer = useSharedValue(0);
    useEffect(() => {
        shimmer.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true);
    }, []);
    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: (shimmer.value - 0.5) * 60 }],
        opacity: shimmer.value * 0.06,
    }));

    return (
        <Animated.View entering={FadeInDown.delay(520).duration(500)} style={styles.dailyQuizContainer}>
            <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
                <LinearGradient
                    colors={['#B45309', '#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.8 }}
                    style={styles.dailyQuizGradient}
                >
                    {/* Shimmer highlight */}
                    <Animated.View style={[StyleSheet.absoluteFill, styles.shimmerOverlay, shimmerStyle]} />

                    <View style={styles.dailyContent}>
                        <View style={styles.dailyBadge}>
                            <Ionicons name="flame" size={12} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.dailyBadgeText}>{dailyQuiz ? 'Today\'s Pick' : 'Available Now'}</Text>
                        </View>
                        <Text style={styles.dailyTitle}>{dailyQuiz?.title || 'Daily Quiz'}</Text>
                        <Text style={styles.dailySub}>{dailyQuiz ? `${dailyQuiz.questions?.length || 0} Questions · ${dailyQuiz.totalPoints || 100} pts` : 'Play · Earn · Compete'}</Text>

                        {/* Countdown */}
                        <View style={styles.countdownRow}>
                            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.countdownText}>Resets in {timeLeft}</Text>
                        </View>

                        <View style={styles.dailyBtn}>
                            <Text style={styles.dailyBtnText}>Join Now</Text>
                            <Ionicons name="arrow-forward" size={14} color="#D97706" />
                        </View>
                    </View>

                    {/* Right graphic */}
                    <View style={styles.dailyGraphic}>
                        <View style={styles.qMarkCircle1}>
                            <Text style={styles.qMark1}>?</Text>
                        </View>
                        <View style={styles.qMarkCircle2}>
                            <Text style={styles.qMark2}>?</Text>
                        </View>
                        <View style={styles.qMarkMain}>
                            <Ionicons name="chatbubble" size={110} color="rgba(255,255,255,0.15)" style={{ position: 'absolute' }} />
                            <Text style={[styles.qMark2, { fontSize: 54, color: '#10B981', marginTop: -5 }]}>?</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --------------- Category Grid -------------------
const CATEGORIES = [
    { title: 'Science', subTitle: '12 Quizzes', icon: 'flask' as const, colors: ['#6D28D9', '#A78BFA'] as [string, string] },
    { title: 'Math', subTitle: '23 Quizzes', icon: 'calculator' as const, colors: ['#92400E', '#FCD34D'] as [string, string] },
    { title: 'History', subTitle: '9 Quizzes', icon: 'earth' as const, colors: ['#065F46', '#34D399'] as [string, string] },
    { title: 'Music', subTitle: '31 Quizzes', icon: 'musical-notes' as const, colors: ['#86198F', '#E879F9'] as [string, string] },
    { title: 'Tech', subTitle: '17 Quizzes', icon: 'hardware-chip' as const, colors: ['#1E3A5F', '#38BDF8'] as [string, string] },
    { title: 'English', subTitle: '8 Quizzes', icon: 'book' as const, colors: ['#7F1D1D', '#FCA5A5'] as [string, string] },
];

export const CategoryGrid = ({ onCategoryPress }: { onCategoryPress: (cat: string) => void }) => {
    return (
        <View style={styles.categoryWrap}>
            <Animated.View entering={FadeIn.delay(580)}>
                <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>Browse Categories</Text>
                    <TouchableOpacity style={styles.seeAllBtn}>
                        <Text style={styles.seeAllText}>See All</Text>
                        <Ionicons name="arrow-forward" size={14} color="#A78BFA" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat, i) => (
                    <CategoryCard
                        key={i}
                        title={cat.title}
                        subTitle={cat.subTitle}
                        icon={cat.icon}
                        colors={cat.colors}
                        onPress={() => onCategoryPress(cat.title)}
                        delay={580 + i * 50}
                    />
                ))}
            </View>
        </View>
    );
};

const CategoryCard = ({ title, subTitle, icon, colors, onPress, delay = 0 }: CategoryCardProps) => {
    const scale = useSharedValue(1);
    const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400).springify()}
            style={[styles.catCardWrap, pressStyle]}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.95); }}
                onPressOut={() => { scale.value = withSpring(1); }}
            >
                <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catCardBg}>
                    <Ionicons name={icon} size={52} color="rgba(255,255,255,0.18)" style={styles.catIcon} />
                    <View style={styles.catCardContent}>
                        <Text style={styles.catTitle}>{title}</Text>
                        <Text style={styles.catSub}>{subTitle}</Text>
                    </View>
                    <View style={styles.catArrow}>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --------------- Styles -------------------
const styles = StyleSheet.create({
    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 6,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(167,139,250,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: -0.3,
    },
    pointsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        paddingLeft: 12,
        paddingRight: 6,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.28)',
        gap: 5,
    },
    pointsText: {
        color: '#F8FAFC',
        fontWeight: '700',
        fontSize: 14,
    },
    addBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(167,139,250,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Streak Card
    streakCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(251,146,60,0.2)',
    },
    streakGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    streakGlowBg: {
        position: 'absolute',
        left: -30,
        top: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FB923C',
        opacity: 0.08,
    },
    streakLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    streakFireWrap: {
        position: 'relative',
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakFireGlow: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FB923C',
        opacity: 0.25,
    },
    streakFireEmoji: {
        fontSize: 28,
    },
    streakCount: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    streakSub: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 11,
        marginTop: 1,
    },
    streakDots: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
    },
    streakDayWrap: {
        alignItems: 'center',
        gap: 3,
    },
    streakDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakDotActive: {
        backgroundColor: '#F97316',
        borderColor: '#FB923C',
    },
    streakDayLabel: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 9,
        fontWeight: '600',
    },
    streakDayLabelActive: {
        color: '#FB923C',
    },

    // Quick Stats Row
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 18,
        gap: 10,
    },
    statPill: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: 5,
    },
    statIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '800',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // King Banner
    kingContainer: {
        marginHorizontal: 16,
        marginBottom: 18,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 12,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
    },
    kingGradient: {
        minHeight: 185,
        padding: 22,
    },
    kingInnerContent: {
        flex: 1,
        zIndex: 2,
    },
    kingTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    kingTop: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    kingLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    liveCountPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        gap: 6,
    },
    liveDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },
    liveDotSolid: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
    },
    liveCountText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4,
    },
    kingCenterWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    kingAvatarOuter: {
        padding: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 40,
        marginRight: 14,
    },
    kingAvatarInner: {
        padding: 2,
        backgroundColor: '#FFF',
        borderRadius: 35,
    },
    kingAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    kingBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#F59E0B',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    kingUserInfoWrap: {
        flex: 1,
    },
    kingName: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    kingPointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    kingPoints: {
        color: '#FDE047',
        fontSize: 13,
        fontWeight: '700',
    },
    challengeBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    challengeBtnText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    crownIconWrap: {
        position: 'absolute',
        right: -18,
        bottom: -18,
        zIndex: 1,
    },

    // Action Grid
    actionGridContainer: {
        flexDirection: 'column',
        paddingHorizontal: 12,
        marginBottom: 4,
        gap: 8,
    },
    actionGridRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtnWrap: {
        flex: 1,
    },
    actionBtnBg: {
        borderRadius: 22,
        paddingVertical: 18,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    actionBtnIconWrap: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    badgePill: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#EF4444',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#1E1B4B',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '800',
    },
    actionBtnTitle: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
    },

    // Daily Quiz Card
    dailyQuizContainer: {
        marginHorizontal: 16,
        marginTop: 18,
        marginBottom: 6,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 10,
    },
    dailyQuizGradient: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 28,
        minHeight: 175,
        overflow: 'hidden',
    },
    shimmerOverlay: {
        backgroundColor: '#FFF',
        borderRadius: 60,
        width: 200,
        marginLeft: -100,
    },
    dailyContent: {
        flex: 1,
        justifyContent: 'center',
        zIndex: 2,
    },
    dailyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        marginBottom: 10,
    },
    dailyBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    dailyTitle: {
        fontSize: 30,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    dailySub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 10,
        fontWeight: '500',
    },
    countdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 16,
    },
    countdownText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 11,
        fontWeight: '600',
    },
    dailyBtn: {
        backgroundColor: '#FFF',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dailyBtnText: {
        color: '#D97706',
        fontWeight: '800',
        fontSize: 13,
    },
    dailyGraphic: {
        position: 'absolute',
        right: 0,
        top: -10,
        width: 180,
        height: 180,
        zIndex: 1,
    },
    qMarkMain: {
        position: 'absolute',
        right: 15,
        top: 38,
        width: 110,
        height: 110,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qMarkCircle1: {
        position: 'absolute',
        right: 125,
        top: 55,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qMarkCircle2: {
        position: 'absolute',
        right: 20,
        top: 12,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qMark1: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '900',
        fontSize: 16,
    },
    qMark2: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '900',
        fontSize: 13,
    },

    // Category Grid
    categoryWrap: {
        marginTop: 20,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    categoryTitle: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '700',
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    seeAllText: {
        color: '#A78BFA',
        fontSize: 13,
        fontWeight: '600',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    catCardWrap: {
        width: '47.5%',
    },
    catCardBg: {
        borderRadius: 20,
        padding: 14,
        height: 95,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    catCardContent: {
        zIndex: 2,
    },
    catTitle: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 1,
    },
    catSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
    },
    catIcon: {
        position: 'absolute',
        top: -8,
        right: -8,
        transform: [{ rotate: '-10deg' }],
    },
    catArrow: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// --------------- Recommended Quizzes Section -------------------
interface RecommendedSectionProps {
    quizzes: Array<{
        id: string;
        title: string;
        description?: string;
        questions?: any[];
        totalPoints?: number;
        timeLimit?: number | null;
        userAttempt?: { score: number; passed: boolean } | null;
        topicTags?: string[];
    }>;
    onQuizPress: (quiz: any) => void;
    onSeeAll: () => void;
}

export const RecommendedQuizzesSection = ({ quizzes, onQuizPress, onSeeAll }: RecommendedSectionProps) => {
    return (
        <View style={{ marginBottom: 8 }}>
            <Animated.View entering={FadeIn.delay(560)}>
                <View style={[styles.categoryHeader, { paddingHorizontal: 20, marginBottom: 12 }]}>
                    <Text style={styles.categoryTitle}>Recommended for You</Text>
                    <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll}>
                        <Text style={styles.seeAllText}>See All</Text>
                        <Ionicons name="arrow-forward" size={14} color="#A78BFA" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4, gap: 12 }}
            >
                {quizzes.slice(0, 8).map((quiz, i) => {
                    const qCount = quiz.questions?.length || 0;
                    const hasAttempt = !!quiz.userAttempt;
                    return (
                        <Animated.View key={quiz.id} entering={FadeInRight.delay(i * 60).duration(400)}>
                            <TouchableOpacity
                                style={recStyles.card}
                                onPress={() => onQuizPress(quiz)}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                                    style={recStyles.gradient}
                                >
                                    {/* Icon */}
                                    <View style={recStyles.iconCircle}>
                                        <Ionicons name="rocket" size={18} color="#A78BFA" />
                                    </View>

                                    {/* Title */}
                                    <Text style={recStyles.title} numberOfLines={2}>{quiz.title}</Text>

                                    {/* Stats */}
                                    <View style={recStyles.statsRow}>
                                        <Ionicons name="document-text-outline" size={12} color="#64748B" />
                                        <Text style={recStyles.statText}>{qCount} Qs</Text>
                                        {quiz.timeLimit ? (
                                            <>
                                                <Ionicons name="time-outline" size={12} color="#64748B" />
                                                <Text style={recStyles.statText}>{quiz.timeLimit}m</Text>
                                            </>
                                        ) : null}
                                    </View>

                                    {/* CTA */}
                                    <View style={[recStyles.ctaBtn, hasAttempt && recStyles.ctaBtnRetake]}>
                                        <Text style={recStyles.ctaBtnText}>{hasAttempt ? 'Retake' : 'Start'}</Text>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

// Add ScrollView import note: it's already available via react-native above
// but we need to make sure it's imported in the file imports section.
// Since ScrollView is imported from react-native at the top of this file,
// RecommendedQuizzesSection is good to go.

const recStyles = StyleSheet.create({
    card: {
        width: 180,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    gradient: {
        padding: 14,
        gap: 10,
    },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(167,139,250,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F1F5F9',
        lineHeight: 19,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    ctaBtn: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
    },
    ctaBtnRetake: {
        backgroundColor: '#6366F1',
    },
    ctaBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
});
