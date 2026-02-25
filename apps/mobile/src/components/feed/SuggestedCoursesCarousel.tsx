import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Course } from '@/types';
import { Shadows } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    courses: Course[];
}

export const SuggestedCoursesCarousel: React.FC<Props> = ({ courses }) => {
    const navigation = useNavigation<any>();

    if (!courses?.length) return null;

    const renderItem = ({ item }: { item: Course }) => {
        if (!item) return null;
        return (
            <TouchableOpacity
                style={[styles.card, Shadows.sm]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
            >
                <Image source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80' }} style={styles.image} />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />
                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.meta}>
                        <Ionicons name="star" size={12} color="#FBBF24" />
                        <Text style={styles.metaText}>{item.rating?.toFixed(1) || '4.5'}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Ionicons name="people" size={12} color="#D1D5DB" />
                        <Text style={styles.metaText}>{item.enrollmentCount || 0} enrolled</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Recommended Courses</Text>
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('LearnTab')}>
                    <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={courses}
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
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    image: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
    },
    content: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 6,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    metaDot: {
        fontSize: 11,
        color: '#9CA3AF',
        marginHorizontal: 2,
    },
});
