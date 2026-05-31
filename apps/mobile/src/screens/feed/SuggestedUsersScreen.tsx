import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Platform,
    Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
        return (
            <React.Fragment key={item.id || index}>
                <UserRow
                    item={item}
                    colors={colors}
                    styles={styles}
                    isDark={isDark}
                    followingIds={followingIds}
                    loadingFollowIds={loadingFollowIds}
                    handleFollow={handleFollow}
                    navigation={navigation}
                />
                {index < users.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
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
                <View style={styles.sectionCard}>
                    <FlashList
                        data={users}
                        keyExtractor={(item, index) => item?.id || `suggested-user-${index}`}
                        renderItem={renderUser}
                        estimatedItemSize={72}
                        refreshing={refreshing}
                        onRefresh={() => fetchSuggestions(true)}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
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
    listContainer: {
        paddingVertical: 4,
    },
    sectionCard: {
        backgroundColor: colors.card,
        borderRadius: 14,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 32,
        overflow: 'hidden',
        ...Shadows.sm,
        shadowOpacity: 0.04,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
        gap: 12,
    },
    settingContent: {
        flex: 1,
        justifyContent: 'center',
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        letterSpacing: -0.1,
    },
    settingSublabel: {
        fontSize: 13,
        color: colors.textTertiary,
        marginTop: 2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginLeft: 62,
    },
    mutual: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
    },
    followBtn: {
        backgroundColor: isDark ? 'rgba(29,155,240,0.14)' : '#EEF6FF',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 6,
        minWidth: 84,
        alignItems: 'center',
        justifyContent: 'center',
    },
    followingBtn: {
        backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    },
    followBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    followingBtnText: {
        color: colors.textSecondary,
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

function UserRow({
    item,
    colors,
    styles,
    isDark,
    followingIds,
    loadingFollowIds,
    handleFollow,
    navigation,
}: any) {
    const scale = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.97, friction: 5, tension: 300, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 300, useNativeDriver: true }).start();
    };

    if (!item?.id) return null;
    const name = `${item.lastName || ''} ${item.firstName || ''}`.trim() || item.name || 'Unknown';
    const subtitle =
        item.headline ||
        (item.role === 'TEACHER' ? 'Teacher' :
            item.role === 'ADMIN' || item.role === 'SCHOOL_ADMIN' ? 'Admin' : 'Student');
    const isFollowing = followingIds.has(item.id);
    const isFollowLoading = loadingFollowIds.has(item.id);

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <Avatar uri={item.profilePictureUrl} name={name} size="md" />
                <View style={styles.settingContent}>
                    <Text style={styles.settingLabel} numberOfLines={1}>{name}</Text>
                    <Text style={styles.settingSublabel} numberOfLines={1}>{subtitle}</Text>
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
        </Animated.View>
    );
}
