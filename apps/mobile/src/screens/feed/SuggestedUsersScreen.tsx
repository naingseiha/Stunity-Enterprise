import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '@/components/common/Avatar';
import { feedApi } from '@/api/client';
import { User } from '@/types';
import { Shadows } from '@/config';

interface SuggestedUser extends Partial<User> {
    isFollowing?: boolean;
}

export const SuggestedUsersScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const fetchSuggestions = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const res = await feedApi.get('/suggestions/users?limit=50');
            setUsers(res.data?.data || []);
        } catch (e: any) {
            setError('Could not load suggestions. Pull down to retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchSuggestions();
    }, []);

    const handleFollow = useCallback(async (userId: string) => {
        setFollowingIds(prev => {
            const next = new Set(prev);
            next.has(userId) ? next.delete(userId) : next.add(userId);
            return next;
        });
        try {
            const isNowFollowing = !followingIds.has(userId);
            if (isNowFollowing) {
                await feedApi.post(`/users/${userId}/follow`);
            } else {
                await feedApi.delete(`/users/${userId}/follow`);
            }
        } catch {
            // Revert optimistic update
            setFollowingIds(prev => {
                const next = new Set(prev);
                next.has(userId) ? next.delete(userId) : next.add(userId);
                return next;
            });
        }
    }, [followingIds]);

    const renderUser = ({ item, index }: { item: SuggestedUser; index: number }) => {
        if (!item?.id) return null;
        const name = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown';
        const subtitle =
            item.headline ||
            (item.role === 'TEACHER' ? 'Teacher' :
                item.role === 'ADMIN' || item.role === 'SCHOOL_ADMIN' ? 'Admin' : 'Student');
        const isFollowing = followingIds.has(item.id);

        return (
            <TouchableOpacity
                style={[styles.card, Shadows.sm]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
            >
                <Avatar uri={item.profilePictureUrl} name={name} size="lg" />
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                    {item.mutualConnectionsCount ? (
                        <Text style={styles.mutual}>
                            <Ionicons name="people" size={11} color="#6B7280" /> {item.mutualConnectionsCount} mutual
                        </Text>
                    ) : null}
                </View>
                <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followingBtn]}
                    onPress={() => handleFollow(item.id!)}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>People You May Know</Text>
                            {users.length > 0 && (
                                <Text style={styles.headerSub}>{users.length} suggestions</Text>
                            )}
                        </View>
                        <View style={{ width: 38 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Finding people for you…</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#94A3B8" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSuggestions()}>
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="people-outline" size={56} color="#C7D2FE" />
                    <Text style={styles.emptyTitle}>No suggestions yet</Text>
                    <Text style={styles.emptySubtitle}>Check back later as more people join your school</Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item?.id || Math.random().toString()}
                    renderItem={renderUser}
                    refreshing={refreshing}
                    onRefresh={() => fetchSuggestions(true)}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingBottom: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 12 : 4,
        paddingBottom: 4,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    headerSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        textAlign: 'center',
        marginTop: 2,
    },
    list: {
        padding: 16,
        paddingBottom: 32,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        gap: 12,
    },
    info: {
        flex: 1,
        gap: 2,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    subtitle: {
        fontSize: 13,
        color: '#6B7280',
    },
    mutual: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    followBtn: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1.5,
        borderColor: '#BFDBFE',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 7,
    },
    followingBtn: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    followBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2563EB',
    },
    followingBtnText: {
        color: '#FFFFFF',
    },
    separator: {
        height: 10,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 40,
    },
    loadingText: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 8,
    },
    retryText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
});
