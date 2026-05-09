import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    Platform,
    FlatList, Animated} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { Haptics } from '@/services/haptics';
import { useLeaderboardStore } from '../../stores';
import { LeaderboardEntry } from '../../api/leaderboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type LeaderboardTab = 'ALL_TIME' | 'WEEKLY';

const getRankBadgeProps = (rank: number) => {
    switch (rank) {
        case 1: return { color: '#FBBF24', name: 'medal', bg: 'rgba(251, 191, 36, 0.2)' };
        case 2: return { color: '#9CA3AF', name: 'medal', bg: 'rgba(156, 163, 175, 0.2)' };
        case 3: return { color: '#B45309', name: 'medal', bg: 'rgba(180, 83, 9, 0.2)' };
        default: return { color: 'rgba(255,255,255,0.6)', name: 'ribbon', bg: 'transparent' };
    }
};

const LeaderboardRow = React.memo(({ item }: { item: LeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;
    const badge = getRankBadgeProps(item.rank);

    return (
        <View style={[styles.entryCard, isTop3 && styles.top3Card]}>
            <LinearGradient
                colors={isTop3 ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.entryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.rankContainer}>
                    {isTop3 ? (
                        <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
                            <Ionicons name={badge.name as any} size={20} color={badge.color} />
                        </View>
                    ) : (
                        <Text style={styles.rankNumber}>{item.rank}</Text>
                    )}
                </View>

                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: item.user.profilePictureUrl || `https://ui-avatars.com/api/?name=${item.user.firstName}+${item.user.lastName}&background=random` }}
                        style={[styles.avatar, isTop3 && { borderColor: badge.color, borderWidth: 2 }]}
                    />
                </View>

                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                        {item.user.firstName} {item.user.lastName}
                    </Text>
                    <Text style={styles.userStats}><AutoI18nText i18nKey="auto.mobile.screens_gamification_LeaderboardScreen.k_aea670d4" /> {item.level}  •  {item.xp.toLocaleString()} XP</Text>
                </View>

                {isTop3 && (
                    <View style={styles.glowEffect}>
                        <Ionicons name="sparkles" size={16} color={badge.color} />
                    </View>
                )}
            </LinearGradient>
        </View>
    );
});


export const LeaderboardScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const {
        globalLeaderboard,
        weeklyLeaderboard,
        userGlobalStanding,
        userWeeklyStanding,
        isLoading,
        isRefreshing,
        fetchGlobalLeaderboard,
        fetchWeeklyLeaderboard,
    } = useLeaderboardStore();
    const [activeTab, setActiveTab] = useState<LeaderboardTab>('ALL_TIME');

    useEffect(() => {
        void fetchGlobalLeaderboard();
        setTimeout(() => {
            void fetchWeeklyLeaderboard();
        }, 250);
    }, [fetchGlobalLeaderboard, fetchWeeklyLeaderboard]);

    useEffect(() => {
        if (activeTab === 'WEEKLY') {
            void fetchWeeklyLeaderboard();
        }
    }, [activeTab, fetchWeeklyLeaderboard]);

    const normalizedWeeklyLeaderboard = useMemo<LeaderboardEntry[]>(() => {
        return weeklyLeaderboard.map((entry: any) => {
            const xp = Number(entry._sum?.xpEarned || 0);
            return {
                id: `weekly-${entry.userId}`,
                userId: entry.userId,
                xp,
                level: Math.max(1, Math.floor(xp / 100) + 1),
                totalQuizzes: Number(entry._count?.id || 0),
                totalPoints: Number(entry._sum?.score || 0),
                correctAnswers: 0,
                totalAnswers: 0,
                liveQuizWins: 0,
                liveQuizTotal: 0,
                createdAt: '',
                updatedAt: '',
                rank: Number(entry.rank || 0),
                user: {
                    id: entry.user?.id || entry.userId,
                    firstName: entry.user?.firstName || '',
                    lastName: entry.user?.lastName || '',
                    profilePictureUrl: entry.user?.profilePictureUrl || null,
                    email: entry.user?.email || '',
                },
            };
        });
    }, [weeklyLeaderboard]);

    const visibleLeaderboard = activeTab === 'WEEKLY' ? normalizedWeeklyLeaderboard : globalLeaderboard;
    const visibleStanding = activeTab === 'WEEKLY' ? userWeeklyStanding : userGlobalStanding;

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeTab === 'WEEKLY') {
            void fetchWeeklyLeaderboard(true);
        } else {
            void fetchGlobalLeaderboard(true);
        }
    }, [activeTab, fetchGlobalLeaderboard, fetchWeeklyLeaderboard]);

    const renderLeaderboardItem = useCallback(({ item }: { item: LeaderboardEntry }) => (
        <LeaderboardRow item={item} />
    ), []);
    const keyExtractor = useCallback((item: LeaderboardEntry) => `${activeTab}-${item.userId}`, [activeTab]);

    const renderHeader = useCallback(() => (
        <Animated.View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleMain}><AutoI18nText i18nKey="auto.mobile.screens_gamification_LeaderboardScreen.k_49e3a225" /></Text>
            <Text style={styles.headerSubtitle}><AutoI18nText i18nKey="auto.mobile.screens_gamification_LeaderboardScreen.k_08ef8bfb" /></Text>
        </Animated.View>
    ), []);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#4c1d95', '#2e1065', '#0f172a']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Navigation Bar */}
                <View style={styles.navigationBar}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}><AutoI18nText i18nKey="auto.mobile.screens_gamification_LeaderboardScreen.k_826c3dd0" /></Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Tab Selectors */}
                <View style={styles.tabContainerWrapper}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'ALL_TIME' && styles.activeTab]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setActiveTab('ALL_TIME');
                            }}
                        >
                            <Text style={[styles.tabText, activeTab === 'ALL_TIME' && styles.activeTabText]}>
                                {t('leaderboard.tabs.allTime', { defaultValue: 'All time' })}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'WEEKLY' && styles.activeTab]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setActiveTab('WEEKLY');
                            }}
                        >
                            <Text style={[styles.tabText, activeTab === 'WEEKLY' && styles.activeTabText]}>
                                {t('leaderboard.tabs.weekly', { defaultValue: 'Weekly' })}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {isLoading && !isRefreshing && visibleLeaderboard.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.loadingText}><AutoI18nText i18nKey="auto.mobile.screens_gamification_LeaderboardScreen.k_2df13328" /></Text>
                    </View>
                ) : (
                    <FlatList
                        data={visibleLeaderboard}
                        keyExtractor={keyExtractor}
                        renderItem={renderLeaderboardItem}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFF" />}
                        initialNumToRender={12}
                        windowSize={7}
                        removeClippedSubviews={Platform.OS === 'android'}
                    />
                )}
            </SafeAreaView>

            {/* Sticky User Position Card */}
            {visibleStanding && (
                <Animated.View style={styles.stickyFooterOverlay}>
                    <LinearGradient
                        colors={['rgba(15, 23, 42, 0.9)', 'rgba(15, 23, 42, 0.95)']}
                        style={styles.stickyFooterGradient}
                    >
                        <View style={[styles.entryCard, styles.myRankingCard]}>
                            <LinearGradient
                                colors={['#8B5CF6', '#6D28D9']}
                                style={styles.entryGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.rankContainer}>
                                    <Text style={[styles.rankNumber, { color: '#FFF' }]}>{visibleStanding.rank || '-'}</Text>
                                </View>
                                <View style={styles.avatarContainer}>
                                    <View style={[styles.avatar, styles.myAvatarPlaceholder]}>
                                        <Ionicons name="person" size={24} color="#FFF" />
                                    </View>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={[styles.userName, { color: '#FFF' }]} numberOfLines={1}>
                                        <AutoI18nText i18nKey="auto.mobile.screens_gamification_LeaderboardScreen.k_57f1a860" />
                                    </Text>
                                    <Text style={[styles.userStats, { color: 'rgba(255,255,255,0.8)' }]}>
                                        <AutoI18nText i18nKey="auto.mobile.screens_gamification_LeaderboardScreen.k_aea670d4" /> {visibleStanding.level || 1}  •  {Number(visibleStanding.xp || visibleStanding._sum?.xpEarned || 0).toLocaleString()} XP
                                    </Text>
                                </View>
                                <View style={styles.glowEffect}>
                                    <Ionicons name="arrow-up" size={20} color="#34D399" />
                                </View>
                            </LinearGradient>
                        </View>
                    </LinearGradient>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    safeArea: {
        flex: 1,
    },
    navigationBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    tabContainerWrapper: {
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#8B5CF6',
        ...Platform.select({
            ios: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
            android: { elevation: 4 }
        })
    },
    tabText: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        color: '#FFF',
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120, // Leave space for sticky position
    },
    headerTitleContainer: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    headerTitleMain: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.5)',
        marginTop: 12,
        fontSize: 16,
        fontWeight: '500',
    },
    entryCard: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
    },
    top3Card: {
        borderColor: 'rgba(251, 191, 36, 0.3)',
        ...Platform.select({
            ios: { shadowColor: '#FBBF24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
            android: { elevation: 4 }
        })
    },
    entryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    myRankingCard: {
        marginBottom: 0,
        borderColor: 'transparent',
    },
    myAvatarPlaceholder: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankContainer: {
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    rankNumber: {
        fontSize: 18,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.8)',
    },
    badgeContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    userStats: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    glowEffect: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    stickyFooterOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    stickyFooterGradient: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    }
});
