import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores';
import { statsAPI } from '@/services/stats';
import { fetchDailyQuiz, fetchRecommendedQuizzes, QuizItem } from '@/services/quiz';
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

const BACKGROUND_COLOR = '#0F172A';

export default function QuizDashboardScreen() {
    const navigation = useNavigation<any>();
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
            const [daily, recommended] = await Promise.all([
                fetchDailyQuiz(),
                fetchRecommendedQuizzes(8),
            ]);
            setDailyQuiz(daily);
            setRecommendedQuizzes(recommended);
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
            navigation.navigate('TakeQuiz', { quiz: dailyQuiz });
        } else {
            // Fallback: navigate to browse
            navigation.navigate('BrowseQuizzes');
        }
    }, [dailyQuiz, navigation]);

    const handleCategoryPress = useCallback((category: string) => {
        navigation.navigate('BrowseQuizzes', { category });
    }, [navigation]);

    const handleQuizPress = useCallback((quiz: QuizItem) => {
        navigation.navigate('TakeQuiz', { quiz });
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
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A78BFA" />
                    }
                >
                    {/* 1. Header */}
                    <QuizHeader points={userStats.points} />

                    {/* 2. Streak Card */}
                    <StreakCard streak={userStats.streak} longestStreak={userStats.longestStreak} />

                    {/* 3. Quick Stats */}
                    <QuickStatsRow
                        quizzesTaken={userStats.quizzesTaken}
                        winRate={userStats.winRate}
                        bestStreak={userStats.longestStreak}
                    />

                    {/* 4. King of the Quiz Banner */}
                    <KingBanner
                        onAvatarsPress={() => navigation.navigate('Leaderboard')}
                        liveCount={238}
                    />

                    {/* 5. Main Action Buttons */}
                    <ActionGrid
                        onJoin={() => navigation.navigate('LiveQuizJoin')}
                        onLeaderboard={() => navigation.navigate('Leaderboard')}
                        onAchievements={() => navigation.navigate('Achievements')}
                    />

                    {/* 6. Daily Quiz Call to Action */}
                    <DailyQuizCard
                        onPress={handleDailyQuizPress}
                        dailyQuiz={dailyQuiz}
                    />

                    {/* 7. Recommended Quizzes */}
                    {recommendedQuizzes.length > 0 && (
                        <RecommendedQuizzesSection
                            quizzes={recommendedQuizzes}
                            onQuizPress={handleQuizPress}
                            onSeeAll={() => navigation.navigate('BrowseQuizzes')}
                        />
                    )}

                    {/* 8. Browse Categories */}
                    <CategoryGrid onCategoryPress={handleCategoryPress} />
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
});
