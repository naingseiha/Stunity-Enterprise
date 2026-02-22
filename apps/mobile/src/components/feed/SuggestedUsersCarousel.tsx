import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '@/components/common/Avatar';
import { User } from '@/types';
import { Shadows } from '@/config';

interface Props {
    users: Partial<User>[];
}

export const SuggestedUsersCarousel: React.FC<Props> = ({ users }) => {
    const navigation = useNavigation<any>();

    if (!users?.length) return null;

    const renderItem = ({ item }: { item: Partial<User> }) => {
        if (!item) return null;
        const name = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim();
        const subtitle = item.headline || (
            item.role === 'TEACHER' ? 'Teacher' :
                item.role === 'ADMIN' || item.role === 'SCHOOL_ADMIN' ? 'Admin' :
                    'Student'
        );
        return (
            <TouchableOpacity
                style={[styles.card, Shadows.sm]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
            >
                <Avatar uri={item.profilePictureUrl} name={name} size="lg" />
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.role} numberOfLines={1}>{subtitle}</Text>
                <TouchableOpacity style={styles.followBtn}>
                    <Text style={styles.followBtnText}>Follow</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Suggested Connections</Text>
                <TouchableOpacity>
                    <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={users}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderItem}
                keyExtractor={item => item?.id || Math.random().toString()}
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
    },
    followBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0284C7',
    },
});
