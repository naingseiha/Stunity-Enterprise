import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown,
    FadeInUp,
    ZoomIn,
} from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { Skeleton } from '@/components/common/Loading';
import { User } from '@/types';
import { fetchLeaderboard } from '@/api/profileApi';
import { formatNumber } from '@/utils';

const { width } = Dimensions.get('window');

// Custom colors for podium
const PODIUM_COLORS = {
    1: { grad: ['#FEF3C7', '#FDE68A', '#F59E0B'], border: '#F59E0B', text: '#B45309', icon: 'medal' },
    2: { grad: ['#F1F5F9', '#E2E8F0', '#94A3B8'], border: '#94A3B8', text: '#475569', icon: 'medal-outline' },
    3: { grad: ['#FFEDD5', '#FED7AA', '#F97316'], border: '#F97316', text: '#C2410C', icon: 'medal-outline' },
};

export function LeaderboardScreen() {
    const navigation = useNavigation();
    const [users, setUsers] = useState<User[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const data = await fetchLeaderboard(50);
            setUsers(data);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const renderPodium = () => {
        if (users.length < 3) return null;
        const [first, second, third] = users;

        return (
            <View style={styles.podiumContainer}>
                {/* Silver - 2nd Place */}
                <Animated.View entering={FadeInUp.delay(200).duration(500).springify()} style={[styles.podiumItem, { marginTop: 40 }]}>
                    <View style={styles.podiumAvatarWrapper}>
                        <Avatar uri={second.profilePictureUrl} name={`${second.firstName} ${second.lastName}`} size="xl" />
                        <View style={[styles.podiumRankBadge, { backgroundColor: PODIUM_COLORS[2].border }]}>
                            <Text style={styles.podiumRankText}>2</Text>
                        </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{second.firstName}</Text>
                    <View style={styles.pointsBadge}>
                        <Ionicons name="star" size={12} color="#0EA5E9" />
                        <Text style={styles.pointsText}>{formatNumber(second.totalPoints || 0)}</Text>
                    </View>
                </Animated.View>

                {/* Gold - 1st Place */}
                <Animated.View entering={ZoomIn.delay(100).duration(500).springify()} style={[styles.podiumItem, { zIndex: 10 }]}>
                    <View style={styles.podiumAvatarWrapper}>
                        <LinearGradient
                            colors={PODIUM_COLORS[1].grad as any}
                            style={styles.goldGlow}
                        />
                        <Avatar uri={first.profilePictureUrl} name={`${first.firstName} ${first.lastName}`} size="2xl" />
                        <View style={[styles.podiumRankBadge, { backgroundColor: PODIUM_COLORS[1].border, width: 32, height: 32, borderRadius: 16, bottom: -12 }]}>
                            <Ionicons name="trophy" size={16} color="#FFF" />
                        </View>
                    </View>
                    <Text style={[styles.podiumName, { fontSize: 18, marginTop: 16 }]} numberOfLines={1}>{first.firstName} {first.lastName}</Text>
                    <View style={[styles.pointsBadge, { backgroundColor: '#F0F9FF' }]}>
                        <Ionicons name="star" size={14} color="#0EA5E9" />
                        <Text style={[styles.pointsText, { fontSize: 14, color: '#0369A1', fontWeight: '700' }]}>{formatNumber(first.totalPoints || 0)} pts</Text>
                    </View>
                </Animated.View>

                {/* Bronze - 3rd Place */}
                <Animated.View entering={FadeInUp.delay(300).duration(500).springify()} style={[styles.podiumItem, { marginTop: 50 }]}>
                    <View style={styles.podiumAvatarWrapper}>
                        <Avatar uri={third.profilePictureUrl} name={`${third.firstName} ${third.lastName}`} size="xl" />
                        <View style={[styles.podiumRankBadge, { backgroundColor: PODIUM_COLORS[3].border }]}>
                            <Text style={styles.podiumRankText}>3</Text>
                        </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{third.firstName}</Text>
                    <View style={styles.pointsBadge}>
                        <Ionicons name="star" size={12} color="#0EA5E9" />
                        <Text style={styles.pointsText}>{formatNumber(third.totalPoints || 0)}</Text>
                    </View>
                </Animated.View>
            </View>
        );
    };

    const renderItem = ({ item, index }: { item: User; index: number }) => {
        const actualRank = index + 1; // full list rank
        // Skip first 3 if they are in podium
        if (actualRank <= 3) return null;

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
                <TouchableOpacity
                    style={styles.listItem}
                    activeOpacity={0.7}
                    onPress={() => (navigation.navigate as any)('UserProfile', { userId: item.id })}
                >
                    <View style={styles.rankCol}>
                        <Text style={styles.rankNum}>{actualRank}</Text>
                    </View>

                    <Avatar uri={item.profilePictureUrl} name={`${item.firstName} ${item.lastName}`} size="md" />

                    <View style={styles.userInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.listName} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
                            {!!item.isVerified && <Ionicons name="checkmark-circle" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />}
                        </View>
                        <View style={styles.levelRow}>
                            <Ionicons name="school-outline" size={12} color="#6B7280" />
                            <Text style={styles.levelText}>Level {item.level || 1}</Text>
                        </View>
                    </View>

                    <View style={styles.scoreCol}>
                        <Text style={styles.scoreNum}>{formatNumber(item.totalPoints || 0)}</Text>
                        <Text style={styles.scoreLabel}>pts</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Leaderboard</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Skeleton width={120} height={120} borderRadius={60} />
                    <View style={{ marginTop: 24, gap: 16 }}>
                        <Skeleton width={width - 48} height={70} borderRadius={16} />
                        <Skeleton width={width - 48} height={70} borderRadius={16} />
                        <Skeleton width={width - 48} height={70} borderRadius={16} />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            <SafeAreaView style={{ backgroundColor: '#FFF' }} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Top Scholars</Text>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Ionicons name="information-circle-outline" size={24} color="#0F172A" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <FlashList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                // @ts-ignore - estimatedItemSize type missing in this FlashList version
                estimatedItemSize={80}
                ListHeaderComponent={renderPodium}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    iconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    listContent: {
        paddingBottom: 40,
    },
    podiumContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingVertical: 32,
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 24,
    },
    podiumItem: {
        alignItems: 'center',
        width: width / 3.2,
    },
    podiumAvatarWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    goldGlow: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        opacity: 0.8,
    },
    podiumRankBadge: {
        position: 'absolute',
        bottom: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    podiumRankText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    podiumName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 12,
        textAlign: 'center',
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        gap: 4,
    },
    pointsText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    rankCol: {
        width: 32,
        alignItems: 'center',
        marginRight: 8,
    },
    rankNum: {
        fontSize: 16,
        fontWeight: '700',
        color: '#475569',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    levelText: {
        fontSize: 12,
        color: '#64748B',
    },
    scoreCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    scoreNum: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0EA5E9',
    },
    scoreLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
});
