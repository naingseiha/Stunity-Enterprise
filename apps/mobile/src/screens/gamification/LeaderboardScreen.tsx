import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    Platform,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLeaderboardStore } from '../../stores';
import { LeaderboardEntry } from '../../api/leaderboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


export const LeaderboardScreen = ({ navigation }: any) => {
    const { globalLeaderboard, userGlobalStanding, isLoading, isRefreshing, fetchGlobalLeaderboard } = useLeaderboardStore();
    const [activeTab, setActiveTab] = useState<'GLOBAL' | 'SCHOOL'>('GLOBAL');

    useEffect(() => {
        fetchGlobalLeaderboard();
    }, []);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchGlobalLeaderboard(true);
    }, [fetchGlobalLeaderboard]);

    const getRankBadgeProps = (rank: number) => {
        switch (rank) {
            case 1: return { color: '#FBBF24', name: 'medal', bg: 'rgba(251, 191, 36, 0.2)' }; // Gold
            case 2: return { color: '#9CA3AF', name: 'medal', bg: 'rgba(156, 163, 175, 0.2)' }; // Silver
            case 3: return { color: '#B45309', name: 'medal', bg: 'rgba(180, 83, 9, 0.2)' }; // Bronze
            default: return { color: 'rgba(255,255,255,0.6)', name: 'ribbon', bg: 'transparent' };
        }
    };

    const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry, index: number }) => {
        const isTop3 = item.rank <= 3;
        const badge = getRankBadgeProps(item.rank);

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
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
                            <Text style={styles.userStats}>Lvl {item.level}  •  {item.xp.toLocaleString()} XP</Text>
                        </View>

                        {isTop3 && (
                            <View style={styles.glowEffect}>
                                <Ionicons name="sparkles" size={16} color={badge.color} />
                            </View>
                        )}
                    </LinearGradient>
                </View>
            </Animated.View>
        );
    };

    const renderHeader = () => (
        <Animated.View entering={ZoomIn.duration(800)} style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleMain}>Global Leaderboard</Text>
            <Text style={styles.headerSubtitle}>Compete with students worldwide</Text>
        </Animated.View>
    );

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
                    <Text style={styles.navTitle}>Rankings</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Tab Selectors */}
                <View style={styles.tabContainerWrapper}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'GLOBAL' && styles.activeTab]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setActiveTab('GLOBAL');
                            }}
                        >
                            <Text style={[styles.tabText, activeTab === 'GLOBAL' && styles.activeTabText]}>Global XP</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'SCHOOL' && styles.activeTab]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setActiveTab('SCHOOL');
                            }}
                        >
                            <Text style={[styles.tabText, activeTab === 'SCHOOL' && styles.activeTabText]}>My School</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {isLoading && !isRefreshing && globalLeaderboard.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.loadingText}>Fetching Ranks...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={globalLeaderboard}
                        keyExtractor={(item: any) => item.userId}
                        renderItem={renderLeaderboardItem}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFF" />}
                    />
                )}
            </SafeAreaView>

            {/* Sticky User Position Card */}
            {userGlobalStanding && (
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.stickyFooterOverlay}>
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
                                    <Text style={[styles.rankNumber, { color: '#FFF' }]}>{userGlobalStanding.rank || '-'}</Text>
                                </View>
                                <View style={styles.avatarContainer}>
                                    <View style={[styles.avatar, styles.myAvatarPlaceholder]}>
                                        <Ionicons name="person" size={24} color="#FFF" />
                                    </View>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={[styles.userName, { color: '#FFF' }]} numberOfLines={1}>
                                        You
                                    </Text>
                                    <Text style={[styles.userStats, { color: 'rgba(255,255,255,0.8)' }]}>
                                        Lvl {userGlobalStanding.level}  •  {userGlobalStanding.xp.toLocaleString()} XP
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
