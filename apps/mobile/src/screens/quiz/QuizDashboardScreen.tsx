import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores';
import { statsAPI } from '@/services/stats';
import { fetchDailyQuiz, fetchRecommendedQuizzes, QuizItem } from '@/services/quiz';
import { fetchLeaderboard } from '@/api/profileApi';
import { NetworkStatus } from '@/components/common';
import {
    QuizHeader,
    StreakCard,
    QuickStatsRow,
    KingBanner,
    ActionGrid,
    DailyQuizCard,
    CategoryGrid,
    RecommendedQuizzesSection,
} from '@/components/quiz/QuizDashboardComponents';
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint';

const BACKGROUND_COLOR = '#0F172A';

export default function QuizDashboardScreen() {
    const navigation = useNavigation<any>();
    const layout = useLayoutBreakpoint();
    const { width, height } = useWindowDimensions();
    const isThreeColumnTablet = layout.isTablet && width > height && width >= 1180;
    const isPortraitTablet = layout.isTablet && height >= width && width >= 820;
    const { user } = useAuthStore();

    const [refreshing, setRefreshing] = useState(false);
    const [userStats, setUserStats] = useState({
        points: 0,
        level: 1,
        streak: 0,
        longestStreak: 0,
        quizzesTaken: 0,
        winRate: 0,
    });
    const [dailyQuiz, setDailyQuiz] = useState<QuizItem | null>(null);
    const [recommendedQuizzes, setRecommendedQuizzes] = useState<QuizItem[]>([]);
    const [topPlayer, setTopPlayer] = useState<any>(null);

    const loadStats = useCallback(async () => {
        if (!user?.id) return;
        try {
            const stats = await statsAPI.getUserStats(user.id);
            setUserStats(prev => ({
                ...prev,
                points: stats.totalPoints || 0,
                level: stats.level || 1,
                streak: stats.winStreak || 0,
                longestStreak: stats.bestStreak || 0,
                quizzesTaken: stats.totalQuizzes || 0,
                winRate: Math.round(stats.winRate || 0),
            }));
        } catch (e) {
            // Keep defaults on error
        }
    }, [user?.id]);

    const loadQuizData = useCallback(async () => {
        try {
            const [daily, recommended, leaderboardData] = await Promise.all([
                fetchDailyQuiz(),
                fetchRecommendedQuizzes(8),
                fetchLeaderboard(1).catch(() => null),
            ]);
            setDailyQuiz(daily);
            setRecommendedQuizzes(recommended);
            if (leaderboardData && leaderboardData.length > 0) {
                setTopPlayer(leaderboardData[0]);
            }
        } catch (e) {
            console.warn('⚠️ [QuizDashboard] Failed to load quiz data:', e);
        }
    }, []);

    useEffect(() => {
        loadStats();
        loadQuizData();
    }, [loadStats, loadQuizData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadStats(), loadQuizData()]);
        setRefreshing(false);
    };

    const handleDailyQuizPress = useCallback(() => {
        if (dailyQuiz) {
            navigation.navigate('QuizDetails', { quiz: dailyQuiz });
        } else {
            // Fallback: navigate to browse
            navigation.navigate('BrowseQuizzes');
        }
    }, [dailyQuiz, navigation]);

    const handleCategoryPress = useCallback((category: string) => {
        navigation.navigate('BrowseQuizzes', { category });
    }, [navigation]);

    const handleQuizPress = useCallback((quiz: QuizItem) => {
        navigation.navigate('QuizDetails', { quiz });
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <NetworkStatus onRetry={onRefresh} />

            {/* Background Gradient */}
            <LinearGradient
                colors={[BACKGROUND_COLOR, '#131B2E', '#1A1040']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.3, y: 1 }}
            />

            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        layout.isTablet && styles.scrollContentTablet,
                    ]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A78BFA" />
                    }
                >
                    {isThreeColumnTablet ? (
                        <View style={styles.threeColumnLayout}>
                            <View style={styles.leftColumn}>
                                <QuizHeader points={userStats.points} />
                                <StreakCard streak={userStats.streak} longestStreak={userStats.longestStreak} />
                                <QuickStatsRow
                                    quizzesTaken={userStats.quizzesTaken}
                                    winRate={userStats.winRate}
                                    bestStreak={userStats.longestStreak}
                                />
                            </View>
                            <View style={styles.centerColumn}>
                                <KingBanner
                                    onAvatarsPress={() => navigation.navigate('Leaderboard')}
                                    liveCount={238}
                                    topPlayer={topPlayer}
                                />
                                <ActionGrid
                                    onJoin={() => navigation.navigate('LiveQuizJoin')}
                                    onCreate={() => navigation.navigate('CreatePost', { initialPostType: 'QUIZ' })}
                                    onManage={() => navigation.navigate('QuizStudio')}
                                    onLeaderboard={() => navigation.navigate('Leaderboard')}
                                    onAchievements={() => navigation.navigate('Achievements')}
                                />
                                <DailyQuizCard
                                    onPress={handleDailyQuizPress}
                                    dailyQuiz={dailyQuiz}
                                />
                                {recommendedQuizzes.length > 0 && (
                                    <RecommendedQuizzesSection
                                        quizzes={recommendedQuizzes}
                                        onQuizPress={handleQuizPress}
                                        onSeeAll={() => navigation.navigate('BrowseQuizzes')}
                                    />
                                )}
                            </View>
                            <View style={styles.rightColumn}>
                                <CategoryGrid onCategoryPress={handleCategoryPress} />
                            </View>
                        </View>
                    ) : isPortraitTablet ? (
                        <>
                            <QuizHeader points={userStats.points} />
                            <View style={styles.portraitTabletLayout}>
                                <View style={styles.portraitMainColumn}>
                                    <KingBanner
                                        onAvatarsPress={() => navigation.navigate('Leaderboard')}
                                        liveCount={238}
                                        topPlayer={topPlayer}
                                    />
                                    <ActionGrid
                                        onJoin={() => navigation.navigate('LiveQuizJoin')}
                                        onCreate={() => navigation.navigate('CreatePost', { initialPostType: 'QUIZ' })}
                                        onManage={() => navigation.navigate('QuizStudio')}
                                        onLeaderboard={() => navigation.navigate('Leaderboard')}
                                        onAchievements={() => navigation.navigate('Achievements')}
                                    />
                                    <DailyQuizCard
                                        onPress={handleDailyQuizPress}
                                        dailyQuiz={dailyQuiz}
                                    />
                                    {recommendedQuizzes.length > 0 && (
                                        <RecommendedQuizzesSection
                                            quizzes={recommendedQuizzes}
                                            onQuizPress={handleQuizPress}
                                            onSeeAll={() => navigation.navigate('BrowseQuizzes')}
                                        />
                                    )}
                                </View>
                                <View style={styles.portraitSideColumn}>
                                    <StreakCard streak={userStats.streak} longestStreak={userStats.longestStreak} />
                                    <QuickStatsRow
                                        quizzesTaken={userStats.quizzesTaken}
                                        winRate={userStats.winRate}
                                        bestStreak={userStats.longestStreak}
                                    />
                                    <CategoryGrid onCategoryPress={handleCategoryPress} variant="rail" />
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <QuizHeader points={userStats.points} />
                            <StreakCard streak={userStats.streak} longestStreak={userStats.longestStreak} />
                            <QuickStatsRow
                                quizzesTaken={userStats.quizzesTaken}
                                winRate={userStats.winRate}
                                bestStreak={userStats.longestStreak}
                            />
                            <KingBanner
                                onAvatarsPress={() => navigation.navigate('Leaderboard')}
                                liveCount={238}
                                topPlayer={topPlayer}
                            />
                            <ActionGrid
                                onJoin={() => navigation.navigate('LiveQuizJoin')}
                                onCreate={() => navigation.navigate('CreatePost', { initialPostType: 'QUIZ' })}
                                onManage={() => navigation.navigate('QuizStudio')}
                                onLeaderboard={() => navigation.navigate('Leaderboard')}
                                onAchievements={() => navigation.navigate('Achievements')}
                            />
                            <DailyQuizCard
                                onPress={handleDailyQuizPress}
                                dailyQuiz={dailyQuiz}
                            />
                            {recommendedQuizzes.length > 0 && (
                                <RecommendedQuizzesSection
                                    quizzes={recommendedQuizzes}
                                    onQuizPress={handleQuizPress}
                                    onSeeAll={() => navigation.navigate('BrowseQuizzes')}
                                />
                            )}
                            <CategoryGrid onCategoryPress={handleCategoryPress} />
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    scrollContentTablet: {
        width: '100%',
        maxWidth: 1180,
        alignSelf: 'center',
        paddingHorizontal: 24,
        paddingBottom: 72,
    },
    portraitTabletLayout: {
        flexDirection: 'row',
        gap: 14,
        alignItems: 'flex-start',
    },
    portraitMainColumn: {
        flex: 1,
        minWidth: 0,
    },
    portraitSideColumn: {
        width: 300,
    },
    threeColumnLayout: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-start',
    },
    leftColumn: {
        width: 300,
    },
    centerColumn: {
        flex: 1,
        minWidth: 0,
    },
    rightColumn: {
        width: 300,
    },
});
