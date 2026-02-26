import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Shadows } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    quizzes: any[];
}

export const SuggestedQuizzesCarousel: React.FC<Props> = ({ quizzes }) => {
    const navigation = useNavigation<any>();

    if (!quizzes?.length) return null;

    const renderItem = ({ item }: { item: any }) => {
        if (!item) return null;
        return (
            <TouchableOpacity
                style={[styles.card, Shadows.sm]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('TakeQuiz', { quizId: item.id })}
            >
                <LinearGradient
                    colors={['#1E1B4B', '#312E81']}
                    style={styles.gradientBg}
                />

                {/* Topic Pill */}
                {item.topicTags && item.topicTags.length > 0 && (
                    <View style={styles.topicPill}>
                        <Text style={styles.topicText}>{item.topicTags[0]}</Text>
                    </View>
                )}

                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.metaText}>{item.timeLimit || 10}m</Text>
                        </View>
                        <View style={styles.metaDot} />
                        <View style={styles.metaItem}>
                            <Ionicons name="document-text-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.metaText}>{item.questions?.length || 0} Qs</Text>
                        </View>
                        <View style={styles.metaDot} />
                        <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.metaText}>{item.attemptCount || 0}</Text>
                        </View>
                    </View>

                    <View style={styles.authorRow}>
                        {item.author?.profilePictureUrl ? (
                            <Image
                                source={{ uri: item.author.profilePictureUrl }}
                                style={styles.authorAvatar}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.authorAvatar, { backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                                    {item.author?.firstName?.charAt(0) || 'U'}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.authorName} numberOfLines={1}>
                            {item.author?.firstName} {item.author?.lastName}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="bulb" size={16} color="#4F46E5" />
                    </View>
                    <Text style={styles.headerTitle}>Suggested Quizzes</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'QuizTab' })}>
                    <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={quizzes}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderItem}
                keyExtractor={item => item?.id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                snapToInterval={260 + 12}
                decelerationRate="fast"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
    },
    seeAll: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4F46E5',
    },
    listContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        width: 260,
        height: 140,
        backgroundColor: '#1E1B4B',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#3730A3',
    },
    gradientBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    topicPill: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    topicText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#E0E7FF',
        textTransform: 'uppercase',
    },
    content: {
        flex: 1,
        padding: 14,
        justifyContent: 'flex-end',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#4B5563',
        marginHorizontal: 8,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    authorAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    authorName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D1D5DB',
        flex: 1,
    }
});
