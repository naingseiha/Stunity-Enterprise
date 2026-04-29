import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '@/components/common/Avatar';
import { feedApi } from '@/api/client';
import { User } from '@/types';
import { Shadows } from '@/config';
import { useTranslation } from 'react-i18next';

interface SuggestedUser extends Partial<User> {
    isFollowing?: boolean;
}

interface Props {
    users: SuggestedUser[];
}

export const SuggestedUsersCarousel: React.FC<Props> = ({ users }) => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const initialFollowing = new Set<string>();
        users?.forEach(user => {
            if (user?.id && user.isFollowing) {
                initialFollowing.add(user.id);
            }
        });
        setFollowingIds(initialFollowing);
    }, [users]);

    const handleFollow = useCallback(async (userId: string) => {
        if (loadingIds.has(userId)) return;

        const wasFollowing = followingIds.has(userId);
        setLoadingIds(prev => new Set(prev).add(userId));
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
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    }, [followingIds, loadingIds]);

    if (!users?.length) return null;

    const renderItem = ({ item }: { item: SuggestedUser }) => {
        if (!item) return null;
        const name = `${item.lastName || ''} ${item.firstName || ''}`.trim() || item.name || '';
        const subtitle = item.headline || (
            item.role === 'TEACHER' ? 'Teacher' :
                (item.role === 'ADMIN' || item.role === 'SUPER_ADMIN' || item.role === 'SCHOOL_ADMIN') ? 'Admin' :
                    'Student'
        );
        const isFollowing = item.id ? followingIds.has(item.id) : false;
        const isLoading = item.id ? loadingIds.has(item.id) : false;

        return (
            <TouchableOpacity
                style={[styles.card, Shadows.sm]}
                activeOpacity={0.8}
                onPress={() => item.id && navigation.navigate('UserProfile', { userId: item.id })}
            >
                <Avatar uri={item.profilePictureUrl} name={name} size="lg" />
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.role} numberOfLines={1}>{subtitle}</Text>
                <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followingBtn]}
                    onPress={(event) => {
                        event.stopPropagation?.();
                        item.id && handleFollow(item.id);
                    }}
                    disabled={!item.id || isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={isFollowing ? '#4B5563' : '#0284C7'} />
                    ) : (
                        <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                            {isFollowing ? t('common.following') : t('common.follow')}
                        </Text>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('feed.suggestedConnections')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('SuggestedUsers')}>
                    <Text style={styles.seeAll}>{t('learn.viewAll')}</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={users}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderItem}
                keyExtractor={(item, index) => item?.id || `suggested-user-${index}`}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginHorizontal: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    seeAll: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0EA5E9',
    },
    listContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        width: 130,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    name: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 10,
        textAlign: 'center',
    },
    role: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
        marginBottom: 12,
    },
    followBtn: {
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
        minHeight: 30,
        justifyContent: 'center',
    },
    followingBtn: {
        backgroundColor: '#F3F4F6',
    },
    followBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0284C7',
    },
    followingBtnText: {
        color: '#4B5563',
    },
});
