import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';


import { BlurView } from 'expo-blur';
import { formatNumber } from '@/utils';
import { QuizItem } from '@/services/quiz';
import { Avatar } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { Colors, ColorScale, Typography, Spacing, BorderRadius, Shadows } from '@/config';

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
    const { t } = useTranslation();
    return (
        <Animated.View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
                <View style={styles.headerIconWrap}>
                    <Ionicons name="game-controller" size={20} color="#A78BFA" />
                </View>
                <Text style={styles.headerTitle}>{t('quiz.dashboard.brandTitle')} <Text style={{ color: '#A78BFA' }}>{t('quiz.dashboard.brandPlay')}</Text></Text>
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
    const { t } = useTranslation();
    const glow = React.useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(glow, { toValue: 0.6, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();
    }, [glow]);

    const glowStyle = {
        opacity: glow,
        transform: [{ scale: glow.interpolate({ inputRange: [0.6, 1], outputRange: [0.96, 1] }) }],
    };

    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    // Assume 'streak' days from today going backward
    const today = new Date().getDay(); // 0=Sun, 1=Mon...
    // Create a 7-item ring: mark last 'streak' days as active
    const activeCount = Math.min(streak, 7);

    return (
        <Animated.View style={styles.streakCard}>
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
                        <Ionicons name="flame" size={28} color="#FF6B35" style={styles.streakFireEmoji} />
                    </View>
                    <View>
                        <Text style={styles.streakCount}>{t('quiz.dashboard.dayStreak', { count: streak })}</Text>
                        <Text style={styles.streakSub}>{t('quiz.dashboard.bestDays', { count: longestStreak })}</Text>
                    </View>
                </View>

                <View style={styles.streakDots}>
                    {days.map((d, i) => {
                        const isActive = i < activeCount;
                        return (
                            <View key={i} style={styles.streakDayWrap}>
                                <View style={[styles.streakDot, isActive && styles.streakDotActive]}>
                                    {!!isActive && <Ionicons name="checkmark" size={9} color={Colors.white} />}
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
    const { t } = useTranslation();
    const stats = [
        { label: t('quiz.dashboard.quizzes'), value: quizzesTaken, icon: 'layers' as const, color: '#A78BFA' },
        { label: t('quiz.dashboard.winRate'), value: `${winRate}%`, icon: 'trophy' as const, color: '#FBBF24' },
        { label: t('quiz.dashboard.bestStreak'), value: t('quiz.dashboard.daysShort', { count: bestStreak }), icon: 'flame' as const, color: '#F472B6' },
    ];

    return (
        <Animated.View style={styles.statsRow}>
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
    topPlayer,
}: { onAvatarsPress?: () => void; liveCount?: number; topPlayer?: any }) => {
    const { t } = useTranslation();
    const translateY = React.useRef(new Animated.Value(0)).current;
    const pulse = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateY, { toValue: -5, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(translateY, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.3, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true })
            ])
        ).start();
    }, [translateY, pulse]);

    const floatStyle = { transform: [{ translateY }] };
    const pulseStyle = {
        transform: [{ scale: pulse }],
        opacity: pulse.interpolate({ inputRange: [1, 1.3], outputRange: [1, 0.7] })
    };

    const playerName = topPlayer?.user 
        ? `${topPlayer.user.firstName} ${topPlayer.user.lastName}` 
        : topPlayer?.firstName
            ? `${topPlayer.firstName} ${topPlayer.lastName}`
            : t('quiz.dashboard.featuredPlayer');
    const playerPoints = topPlayer?.totalPoints || topPlayer?.xp 
        ? formatNumber(topPlayer.totalPoints || topPlayer.xp) 
        : '12,000';
    const playerAvatar = topPlayer?.user?.profilePictureUrl 
        || topPlayer?.profilePictureUrl;

    return (
        <Animated.View style={styles.kingContainer}>
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
                            <Ionicons name="flash" size={14} color={Colors.warning.light} style={{ marginRight: Spacing.xs }} />
                            <Text style={styles.kingLabel}>{t('quiz.dashboard.thisWeeksKing')}</Text>
                        </View>
                        {/* Live player count pill */}
                        <TouchableOpacity style={styles.liveCountPill} activeOpacity={0.8}>
                            <Animated.View style={[styles.liveDot, pulseStyle]} />
                            <View style={styles.liveDotSolid} />
                            <Text style={styles.liveCountText}>{t('quiz.dashboard.liveCountFormatted', { countText: formatNumber(liveCount) })}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Winner info */}
                    <View style={styles.kingCenterWrap}>
                        <View style={styles.kingAvatarOuter}>
                            <View style={styles.kingAvatarInner}>
                                <Avatar uri={playerAvatar} name={playerName} size="lg" />
                            </View>
                            <View style={styles.kingBadge}>
                                <Ionicons name="trophy" size={12} color={Colors.white} />
                            </View>
                        </View>

                        <View style={styles.kingUserInfoWrap}>
                            <Text style={styles.kingName} numberOfLines={1}>{playerName}</Text>
                            <View style={styles.kingPointsRow}>
                                <Ionicons name="diamond" size={13} color={Colors.warning.light} style={{ marginRight: Spacing.xs }} />
                                <Text style={styles.kingPoints}>{t('quiz.dashboard.diamondsFormatted', { countText: playerPoints })}</Text>
                            </View>
                            <TouchableOpacity style={styles.challengeBtn} onPress={onAvatarsPress}>
                                <Text style={styles.challengeBtnText}>{t('quiz.dashboard.viewLeaderboard')}</Text>
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
    onJoin, onLeaderboard, onAchievements, onCreate, onManage, onMyJoined,
}: {
    onJoin: () => void;
    onLeaderboard: () => void;
    onAchievements: () => void;
    onCreate: () => void;
    onManage: () => void;
    onMyJoined: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <View style={styles.actionGridContainer}>
            <View style={styles.actionGridRow}>
                <ActionButton
                    title={t('quiz.dashboard.joinQuiz')}
                    icon="add-circle"
                    colors={['#7C3AED', '#9333EA']}
                    onPress={onJoin}
                    delay={360}
                    badge={3}
                />
                <ActionButton
                    title={t('quiz.dashboard.createQuiz')}
                    icon="color-wand"
                    colors={['#EC4899', '#BE185D']}
                    onPress={onCreate}
                    delay={410}
                />
            </View>
            <View style={styles.actionGridRow}>
                <ActionButton
                    title={t('quiz.dashboard.leaderboard')}
                    icon="podium"
                    colors={['#065F46', '#059669']}
                    onPress={onLeaderboard}
                    delay={460}
                />
                <ActionButton
                    title={t('quiz.dashboard.achievements')}
                    icon="ribbon"
                    colors={['#92400E', '#D97706']}
                    onPress={onAchievements}
                    delay={510}
                />
            </View>

            <Animated.View>
                <TouchableOpacity
                    style={styles.manageBtnContainer}
                    activeOpacity={0.8}
                    onPress={onMyJoined}
                >
                    <LinearGradient
                        colors={[ColorScale.teal[700], ColorScale.teal[600]]}
                        style={styles.manageBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.manageBtnContent}>
                            <View style={styles.manageBtnIcon}>
                                <Ionicons name="library" size={20} color={ColorScale.teal[200]} />
                            </View>
                            <View style={styles.manageBtnTextWrap}>
                                <Text style={styles.manageBtnTitle}>{t('quiz.myJoined.title')}</Text>
                                <Text style={styles.manageBtnDesc}>{t('quiz.myJoined.dashboardDesc')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* Manage Quizzes Full-Width Button */}
            <Animated.View>
                <TouchableOpacity
                    style={styles.manageBtnContainer}
                    activeOpacity={0.8}
                    onPress={onManage}
                >
                    <LinearGradient
                        colors={[ColorScale.gray[800], ColorScale.gray[900]]}
                        style={styles.manageBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.manageBtnContent}>
                            <View style={styles.manageBtnIcon}>
                                <Ionicons name="folder-open" size={20} color={ColorScale.primary[400]} />
                            </View>
                            <View style={styles.manageBtnTextWrap}>
                                <Text style={styles.manageBtnTitle}>{t('quiz.dashboard.manageQuizzes')}</Text>
                                <Text style={styles.manageBtnDesc}>{t('quiz.dashboard.manageQuizzesDesc')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const ActionButton = ({ title, icon, colors, onPress, delay = 0, badge }: ActionButtonProps) => {
    const scale = React.useRef(new Animated.Value(1)).current;
    const pressStyle = { transform: [{ scale }] };

    return (
        <Animated.View style={styles.actionBtnWrap}>
            <Animated.View style={pressStyle}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onPress}
                    onPressIn={() => { Animated.spring(scale, { toValue: 0.93, friction: 5, tension: 200, useNativeDriver: true }).start(); }}
                    onPressOut={() => { Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start(); }}
                >
                    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtnBg}>
                        <View style={styles.actionBtnIconWrap}>
                            <Ionicons name={icon} size={32} color={Colors.white} />
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
        </Animated.View>
    );
};

// --------------- Daily Quiz Card -------------------
interface DailyQuizCardProps {
    onPress: () => void;
    dailyQuiz?: QuizItem | null;
}

export const DailyQuizCard = ({ onPress, dailyQuiz }: DailyQuizCardProps) => {
    const { t } = useTranslation();
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

    const shimmer = React.useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(shimmer, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();
    }, [shimmer]);
    const shimmerStyle = {
        transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) }],
        opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0, 0.06] }),
    };

    return (
        <Animated.View style={styles.dailyQuizContainer}>
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
                            <Ionicons name="flame" size={12} color={Colors.white} style={{ marginRight: Spacing.xs }} />
                            <Text style={styles.dailyBadgeText}>{dailyQuiz ? t('quiz.dashboard.todaysPick') : t('quiz.dashboard.availableNow')}</Text>
                        </View>
                        <Text style={styles.dailyTitle}>{dailyQuiz?.title || t('quiz.dashboard.dailyQuiz')}</Text>
                        <Text style={styles.dailySub}>
                            {dailyQuiz
                                ? t('quiz.dashboard.quizSummary', { questions: dailyQuiz.questions?.length || 0, points: dailyQuiz.totalPoints || 100 })
                                : t('quiz.dashboard.playEarnCompete')}
                        </Text>

                        {/* Countdown */}
                        <View style={styles.countdownRow}>
                            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.countdownText}>{t('quiz.dashboard.resetsIn', { time: timeLeft })}</Text>
                        </View>

                        <View style={styles.dailyBtn}>
                            <Text style={styles.dailyBtnText}>{t('quiz.dashboard.joinNow')}</Text>
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
                            <Text style={[styles.qMark2, { fontSize: Typography.fontSize[48], color: '#10B981', marginTop: -Spacing.xs }]}>?</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --------------- Category Grid -------------------
const CATEGORIES = [
    { titleKey: 'quiz.dashboard.categories.science', rawTitle: 'Science', count: 12, icon: 'flask' as const, colors: ['#6D28D9', '#A78BFA'] as [string, string] },
    { titleKey: 'quiz.dashboard.categories.math', rawTitle: 'Math', count: 23, icon: 'calculator' as const, colors: ['#92400E', '#FCD34D'] as [string, string] },
    { titleKey: 'quiz.dashboard.categories.history', rawTitle: 'History', count: 9, icon: 'earth' as const, colors: ['#065F46', '#34D399'] as [string, string] },
    { titleKey: 'quiz.dashboard.categories.music', rawTitle: 'Music', count: 31, icon: 'musical-notes' as const, colors: ['#86198F', '#E879F9'] as [string, string] },
    { titleKey: 'quiz.dashboard.categories.tech', rawTitle: 'Tech', count: 17, icon: 'hardware-chip' as const, colors: ['#1E3A5F', ColorScale.primary[400]] as [string, string] },
    { titleKey: 'quiz.dashboard.categories.english', rawTitle: 'English', count: 8, icon: 'book' as const, colors: ['#7F1D1D', '#FCA5A5'] as [string, string] },
];

export const CategoryGrid = ({ onCategoryPress, variant = 'default' }: { onCategoryPress: (cat: string) => void; variant?: 'default' | 'rail' }) => {
    const { t } = useTranslation();
    const isRail = variant === 'rail';
    return (
        <View style={[styles.categoryWrap, isRail && styles.categoryWrapRail]}>
            <Animated.View>
                <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{t('quiz.dashboard.browseCategories')}</Text>
                    <TouchableOpacity style={styles.seeAllBtn}>
                        <Text style={styles.seeAllText}>{t('common.view')}</Text>
                        <Ionicons name="arrow-forward" size={14} color="#A78BFA" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <View style={[styles.categoryGrid, isRail && styles.categoryGridRail]}>
                {CATEGORIES.map((cat, i) => (
                    <CategoryCard
                        key={i}
                        title={t(cat.titleKey)}
                        subTitle={t('quiz.dashboard.quizCount', { count: cat.count })}
                        icon={cat.icon}
                        colors={cat.colors}
                        onPress={() => onCategoryPress(cat.rawTitle)}
                        delay={580 + i * 50}
                        rail={isRail}
                    />
                ))}
            </View>
        </View>
    );
};

const CategoryCard = ({ title, subTitle, icon, colors, onPress, delay = 0, rail = false }: CategoryCardProps & { rail?: boolean }) => {
    const scale = React.useRef(new Animated.Value(1)).current;
    const pressStyle = { transform: [{ scale }] };

    return (
        <Animated.View
            style={[styles.catCardWrap, rail && styles.catCardWrapRail]}
        >
            <Animated.View style={pressStyle}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onPress}
                    onPressIn={() => { Animated.spring(scale, { toValue: 0.95, friction: 5, tension: 200, useNativeDriver: true }).start(); }}
                    onPressOut={() => { Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start(); }}
                >
                    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.catCardBg, rail && styles.catCardBgRail]}>
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
        paddingHorizontal: Spacing[5],
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[3],
    },
    headerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(167,139,250,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.fontSize[24],
        fontWeight: Typography.fontWeight.extrabold,
        color: ColorScale.gray[50],
        letterSpacing: -0.3,
    },
    pointsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        paddingLeft: Spacing[3],
        paddingRight: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius[20],
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.28)',
        gap: Spacing.xs,
    },
    pointsText: {
        color: ColorScale.gray[50],
        fontWeight: Typography.fontWeight.bold,
        fontSize: Typography.fontSize[14],
    },
    addBtn: {
        width: 24,
        height: 24,
        borderRadius: BorderRadius.full,
        backgroundColor: 'rgba(167,139,250,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Streak Card
    streakCard: {
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius[20],
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(251,146,60,0.2)',
    },
    streakGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing[5],
        paddingVertical: Spacing.md,
    },
    streakGlowBg: {
        position: 'absolute',
        left: -30,
        top: -20,
        width: 100,
        height: 100,
        borderRadius: BorderRadius.full,
        backgroundColor: ColorScale.secondary[400],
        opacity: 0.08,
    },
    streakLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[3],
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
        borderRadius: BorderRadius.full,
        backgroundColor: ColorScale.secondary[400],
        opacity: 0.25,
    },
    streakFireEmoji: {
        fontSize: Typography.fontSize[30],
    },
    streakCount: {
        color: Colors.white,
        fontSize: Typography.fontSize[15],
        fontWeight: Typography.fontWeight.bold,
    },
    streakSub: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: Typography.fontSize[11],
        marginTop: Spacing[0],
    },
    streakDots: {
        flexDirection: 'row',
        gap: Spacing.xs,
        alignItems: 'center',
    },
    streakDayWrap: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    streakDot: {
        width: 22,
        height: 22,
        borderRadius: BorderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakDotActive: {
        backgroundColor: ColorScale.secondary[500],
        borderColor: ColorScale.secondary[400],
    },
    streakDayLabel: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.semibold,
    },
    streakDayLabelActive: {
        color: ColorScale.secondary[400],
    },

    // Quick Stats Row
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: Spacing.md,
        marginBottom: Spacing[5],
        gap: Spacing[3],
    },
    statPill: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing[3],
        paddingHorizontal: Spacing[3],
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: Spacing.xs,
    },
    statIcon: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        color: ColorScale.gray[50],
        fontSize: Typography.fontSize[16],
        fontWeight: Typography.fontWeight.extrabold,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // King Banner
    kingContainer: {
        marginHorizontal: Spacing.md,
        marginBottom: Spacing[5],
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        ...Shadows.xl,
        shadowColor: '#8B5CF6',
    },
    kingGradient: {
        minHeight: 185,
        padding: Spacing[6],
    },
    kingInnerContent: {
        flex: 1,
        zIndex: 2,
    },
    kingTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing[5],
    },
    kingTop: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius[20],
    },
    kingLabel: {
        color: Colors.white,
        fontSize: Typography.fontSize[12],
        fontWeight: Typography.fontWeight.bold,
    },
    liveCountPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        gap: Spacing[2],
    },
    liveDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: BorderRadius.full,
        backgroundColor: '#10B981',
    },
    liveDotSolid: {
        width: 8,
        height: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: '#10B981',
    },
    liveCountText: {
        color: '#10B981',
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.bold,
        marginLeft: Spacing.xs,
    },
    kingCenterWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    kingAvatarOuter: {
        padding: Spacing.xs,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: BorderRadius.full,
        marginRight: Spacing.md,
    },
    kingAvatarInner: {
        padding: Spacing.xs,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.full,
    },
    kingAvatar: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.full,
    },
    kingBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#F59E0B',
        width: 24,
        height: 24,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
    },
    kingUserInfoWrap: {
        flex: 1,
    },
    kingName: {
        color: Colors.white,
        fontSize: Typography.fontSize[20],
        fontWeight: Typography.fontWeight.extrabold,
        marginBottom: Spacing.xs,
    },
    kingPointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing[3],
    },
    kingPoints: {
        color: Colors.warning.light,
        fontSize: Typography.fontSize[13],
        fontWeight: Typography.fontWeight.bold,
    },
    challengeBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        alignSelf: 'flex-start',
    },
    challengeBtnText: {
        color: Colors.white,
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.bold,
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
        paddingHorizontal: Spacing[3],
        marginBottom: Spacing.xs,
        gap: Spacing.sm,
    },
    actionGridRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionBtnWrap: {
        flex: 1,
    },
    actionBtnBg: {
        borderRadius: BorderRadius['2xl'],
        paddingVertical: Spacing[5],
        paddingHorizontal: Spacing.sm,
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
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing[3],
        position: 'relative',
    },
    badgePill: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: Colors.error,
        width: 18,
        height: 18,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#1E1B4B',
    },
    badgeText: {
        color: Colors.white,
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.extrabold,
    },
    actionBtnTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize[12],
        fontWeight: Typography.fontWeight.extrabold,
        textAlign: 'center',
    },

    // Daily Quiz Card
    dailyQuizContainer: {
        marginHorizontal: Spacing.md,
        marginTop: Spacing[5],
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        ...Shadows.xl,
        shadowColor: '#F59E0B',
    },
    dailyQuizGradient: {
        flexDirection: 'row',
        paddingHorizontal: Spacing[6],
        paddingVertical: Spacing[7],
        minHeight: 175,
        overflow: 'hidden',
    },
    shimmerOverlay: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius['2xl'],
        width: 200,
        marginLeft: -Spacing[24],
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
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing[3],
    },
    dailyBadgeText: {
        color: Colors.white,
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.bold,
    },
    dailyTitle: {
        fontSize: Typography.fontSize[30],
        fontWeight: Typography.fontWeight.black,
        color: Colors.white,
        marginBottom: Spacing.xs,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    dailySub: {
        fontSize: Typography.fontSize[13],
        color: 'rgba(255,255,255,0.9)',
        marginBottom: Spacing[3],
        fontWeight: Typography.fontWeight.medium,
    },
    countdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    countdownText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: Typography.fontSize[11],
        fontWeight: Typography.fontWeight.semibold,
    },
    dailyBtn: {
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing[5],
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius[20],
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        ...Shadows.lg,
    },
    dailyBtnText: {
        color: '#D97706',
        fontWeight: Typography.fontWeight.extrabold,
        fontSize: Typography.fontSize[13],
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
        borderRadius: BorderRadius.full,
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
        borderRadius: BorderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qMark1: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: Typography.fontWeight.black,
        fontSize: Typography.fontSize[16],
    },
    qMark2: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: Typography.fontWeight.black,
        fontSize: Typography.fontSize[13],
    },

    // Category Grid
    categoryWrap: {
        marginTop: Spacing[5],
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing[10],
    },
    categoryWrapRail: {
        marginTop: Spacing[0],
        paddingHorizontal: Spacing[0],
        paddingBottom: Spacing[0],
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    categoryTitle: {
        color: ColorScale.gray[50],
        fontSize: Typography.fontSize[17],
        fontWeight: Typography.fontWeight.bold,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    seeAllText: {
        color: '#A78BFA',
        fontSize: Typography.fontSize[13],
        fontWeight: Typography.fontWeight.semibold,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: Spacing[3],
    },
    categoryGridRail: {
        flexDirection: 'column',
        flexWrap: 'nowrap',
        gap: Spacing[3],
    },
    catCardWrap: {
        width: '47.5%',
    },
    catCardWrapRail: {
        width: '100%',
    },
    catCardBg: {
        borderRadius: BorderRadius[20],
        padding: Spacing.md,
        height: 95,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    catCardBgRail: {
        height: 78,
        borderRadius: BorderRadius[20],
    },
    catCardContent: {
        zIndex: 2,
    },
    catTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize[15],
        fontWeight: Typography.fontWeight.bold,
        marginBottom: Spacing[0],
    },
    catSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: Typography.fontSize[11],
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
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    manageBtnContainer: {
        marginTop: Spacing[3],
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    manageBtnGradient: {
        padding: Spacing.md,
    },
    manageBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    manageBtnIcon: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing[3],
    },
    manageBtnTextWrap: {
        flex: 1,
    },
    manageBtnTitle: {
        fontSize: Typography.fontSize[15],
        fontWeight: Typography.fontWeight.semibold,
        color: ColorScale.gray[50],
        marginBottom: Spacing.xs,
    },
    manageBtnDesc: {
        fontSize: Typography.fontSize[12],
        color: ColorScale.gray[400],
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
    const { t } = useTranslation();
    return (
        <View style={{ marginBottom: Spacing.sm }}>
            <Animated.View>
                <View style={[styles.categoryHeader, { paddingHorizontal: Spacing[5], marginBottom: Spacing[3] }]}>
                    <Text style={styles.categoryTitle}>{t('quiz.dashboard.recommendedForYou')}</Text>
                    <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll}>
                        <Text style={styles.seeAllText}>{t('learn.viewAll')}</Text>
                        <Ionicons name="arrow-forward" size={14} color="#A78BFA" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs, gap: Spacing[3] }}
            >
                {quizzes.slice(0, 8).map((quiz, i) => {
                    const qCount = quiz.questions?.length || 0;
                    const hasAttempt = !!quiz.userAttempt;
                    return (
                        <Animated.View key={quiz.id}>
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
                                        <Ionicons name="document-text-outline" size={12} color={ColorScale.gray[500]} />
                                        <Text style={recStyles.statText}>{t('quiz.dashboard.questionsShort', { count: qCount })}</Text>
                                        {quiz.timeLimit ? (
                                            <>
                                                <Ionicons name="time-outline" size={12} color={ColorScale.gray[500]} />
                                                <Text style={recStyles.statText}>{t('feed.sections.minutesShort', { count: quiz.timeLimit })}</Text>
                                            </>
                                        ) : null}
                                    </View>

                                    {/* CTA */}
                                    <View style={[recStyles.ctaBtn, hasAttempt && recStyles.ctaBtnRetake]}>
                                        <Text style={recStyles.ctaBtnText}>{hasAttempt ? t('quiz.dashboard.retake') : t('learn.start')}</Text>
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
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    gradient: {
        padding: Spacing.md,
        gap: Spacing[3],
    },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: BorderRadius.full,
        backgroundColor: 'rgba(167,139,250,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: Typography.fontSize[14],
        fontWeight: Typography.fontWeight.bold,
        color: ColorScale.gray[100],
        lineHeight: 19,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    statText: {
        fontSize: Typography.fontSize[11],
        color: ColorScale.gray[500],
        fontWeight: Typography.fontWeight.medium,
    },
    ctaBtn: {
        backgroundColor: '#8B5CF6',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    ctaBtnRetake: {
        backgroundColor: Colors.secondary,
    },
    ctaBtnText: {
        fontSize: Typography.fontSize[12],
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
});
