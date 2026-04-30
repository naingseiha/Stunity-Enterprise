import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '@/components/common/Avatar';
import { useThemeContext } from '@/contexts';
import { feedApi } from '@/api/client';
import { User } from '@/types';
import { Shadows } from '@/config';

interface SuggestedUser extends Partial<User> {
    isFollowing?: boolean;
    mutualConnectionsCount?: number;
}

export const SuggestedUsersScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { colors, isDark } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loadingFollowIds, setLoadingFollowIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const fetchSuggestions = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const res = await feedApi.get('/users/suggested?limit=50');
            const suggestedUsers: SuggestedUser[] = res.data?.users || [];
            setUsers(suggestedUsers);
            setFollowingIds(new Set(suggestedUsers.filter(user => user?.id && user.isFollowing).map(user => user.id!)));
        } catch (e: any) {
            setError('Could not load suggestions. Pull down to retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    const handleFollow = useCallback(async (userId: string) => {
        if (loadingFollowIds.has(userId)) return;

        const wasFollowing = followingIds.has(userId);
        setLoadingFollowIds(prev => new Set(prev).add(userId));
        setFollowingIds(prev => {
            const next = new Set(prev);
            wasFollowing ? next.delete(userId) : next.add(userId);
            return next;
        });
        try {
            const res = await feedApi.post(`/users/${userId}/follow`);
            const isFollowing = Boolean(res.data?.isFollowing);
            setFollowingIds(prev => {
                const next = new Set(prev);
                isFollowing ? next.add(userId) : next.delete(userId);
                return next;
            });
        } catch {
            setFollowingIds(prev => {
                const next = new Set(prev);
                wasFollowing ? next.add(userId) : next.delete(userId);
                return next;
            });
        } finally {
            setLoadingFollowIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    }, [followingIds, loadingFollowIds]);

    const renderUser = ({ item, index }: { item: SuggestedUser; index: number }) => {
        if (!item?.id) return null;
        const name = `${item.lastName || ''} ${item.firstName || ''}`.trim() || item.name || 'Unknown';
        const subtitle =
            item.headline ||
            (item.role === 'TEACHER' ? 'Teacher' :
                item.role === 'ADMIN' || item.role === 'SCHOOL_ADMIN' ? 'Admin' : 'Student');
        const isFollowing = followingIds.has(item.id);
        const isFollowLoading = loadingFollowIds.has(item.id);

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
                            <Ionicons name="people" size={11} color={colors.textSecondary} /> {item.mutualConnectionsCount} <AutoI18nText i18nKey="auto.mobile.screens_feed_SuggestedUsersScreen.k_a85323c6" />
                        </Text>
                    ) : null}
                </View>
                <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followingBtn]}
                    onPress={(event) => {
                        event.stopPropagation?.();
                        handleFollow(item.id!);
                    }}
                    disabled={isFollowLoading}
                    activeOpacity={0.8}
                >
                    {isFollowLoading ? (
                        <ActivityIndicator size="small" color={isFollowing ? colors.textSecondary : colors.primary} />
                    ) : (
                        <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_SuggestedUsersScreen.k_30612fa9" /></Text>
                        {users.length > 0 && (
                            <Text style={styles.headerSub}>{users.length} <AutoI18nText i18nKey="auto.mobile.screens_feed_SuggestedUsersScreen.k_3ce49616" /></Text>
                        )}
                    </View>
                    <View style={{ width: 36 }} />
                </View>
            </SafeAreaView>

            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}><AutoI18nText i18nKey="auto.mobile.screens_feed_SuggestedUsersScreen.k_add7f950" /></Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#94A3B8" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSuggestions()}>
                        <Text style={styles.retryText}><AutoI18nText i18nKey="auto.mobile.screens_feed_SuggestedUsersScreen.k_3184ef0c" /></Text>
                    </TouchableOpacity>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="people-outline" size={56} color="#C7D2FE" />
                    <Text style={styles.emptyTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_SuggestedUsersScreen.k_5620442e" /></Text>
                    <Text style={styles.emptySubtitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_SuggestedUsersScreen.k_5a0d9259" /></Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item, index) => item?.id || `suggested-user-${index}`}
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

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerSafe: {
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    headerSub: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
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
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    info: {
        flex: 1,
        gap: 2,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    mutual: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    followBtn: {
        backgroundColor: isDark ? '#1D2B45' : '#EEF2FF',
        borderWidth: 1,
        borderColor: isDark ? colors.primary : '#E0E7FF',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 7,
        minWidth: 92,
        alignItems: 'center',
        justifyContent: 'center',
    },
    followingBtn: {
        backgroundColor: colors.surfaceVariant,
        borderColor: colors.border,
    },
    followBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    followingBtnText: {
        color: colors.textSecondary,
    },
    separator: {
        height: 12,
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
        color: colors.textSecondary,
        marginTop: 8,
    },
    errorText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        backgroundColor: '#6366F1',
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
        color: colors.text,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
