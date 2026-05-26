import React, { useCallback } from 'react';
import { useThemeContext } from '@/contexts';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Course } from '@/types';
import { Shadows } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface Props {
    courses: Course[];
}

export const SuggestedCoursesCarousel: React.FC<Props> = ({ courses }) => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const { t } = useTranslation();
    const navigation = useNavigation<any>();

    const handleCoursePress = useCallback((courseId: string) => {
        navigation.getParent()?.navigate('LearnTab', {
            screen: 'CourseDetail',
            params: { courseId },
        });
    }, [navigation]);

    if (!courses?.length) return null;

    const renderItem = ({ item }: { item: Course }) => {
        if (!item) return null;
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleCoursePress(item.id)}
            >
                <View style={styles.imageContainer}>
                    <Image source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80' }} style={styles.image} contentFit="cover" />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.footerRow}>
                        <Text style={styles.metaText}>{item.rating?.toFixed(1) || '4.5'} ★ • {t('feed.enrolledCount', { count: item.enrollmentCount || 0 })}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('feed.recommendedCourses')}</Text>
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('LearnTab')}>
                    <Text style={styles.seeAll}>{t('learn.viewAll')}</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={courses}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderItem}
                keyExtractor={(item, index) => item?.id || `suggested-course-${index}`}
                contentContainerStyle={styles.listContent}
                snapToInterval={260 + 12}
                decelerationRate="fast"
            />
        </View>
    );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
        color: colors.text,
    },
    seeAll: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    listContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        width: 240,
        backgroundColor: colors.card,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#E5E7EB',
    },
    imageContainer: {
        height: 135, // 16:9 ratio approximately (240x135)
        width: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surfaceVariant,
    },
    content: {
        padding: 12,
        justifyContent: 'flex-start',
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 18,
    },
    footerRow: {
        marginTop: 6,
    },
    metaText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
