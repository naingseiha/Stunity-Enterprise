/**
 * BrowseQuizzesScreen
 *
 * Full-screen quiz browser with:
 * - Search bar with debounced input
 * - Category filter chips (matching dashboard categories)
 * - Paginated quiz list cards (dark glassmorphism theme)
 * - Tap → navigate to TakeQuiz
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { browseQuizzes, QuizItem } from '@/services/quiz';

const BACKGROUND_COLOR = '#0F172A';

const CATEGORIES = [
    { id: 'ALL', label: 'All', icon: 'apps-outline' },
    { id: 'Mathematics', label: 'Math', icon: 'calculator-outline' },
    { id: 'Science', label: 'Science', icon: 'flask-outline' },
    { id: 'Literature', label: 'Literature', icon: 'book-outline' },
    { id: 'History', label: 'History', icon: 'time-outline' },
    { id: 'Technology', label: 'Tech', icon: 'code-slash-outline' },
    { id: 'Language', label: 'Language', icon: 'language-outline' },
];

export default function BrowseQuizzesScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const initialCategory = route.params?.category || 'ALL';
    const initialSearch = route.params?.search || '';

    const [search, setSearch] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentRequestId = useRef(0);

    const load = useCallback(async (newPage: number, cat: string, q: string, reset = false) => {
        const requestId = ++currentRequestId.current;
        if (newPage === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const result = await browseQuizzes({
                category: cat !== 'ALL' ? cat : undefined,
                search: q || undefined,
                page: newPage,
                limit: 15,
            });

            if (requestId !== currentRequestId.current) return; // Stale request

            setQuizzes(prev => reset || newPage === 1 ? result.data : [...prev, ...result.data]);
            setHasMore(newPage < result.pagination.pages);
            setPage(newPage);
        } catch (e) {
            console.warn('[BrowseQuizzes] Load error:', e);
        } finally {
            if (requestId === currentRequestId.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, []);

    // Initial load
    useEffect(() => {
        load(1, selectedCategory, search, true);
    }, []);

    const handleCategoryChange = (cat: string) => {
        Haptics.selectionAsync();
        setSelectedCategory(cat);
        setPage(1);
        setHasMore(true);
        load(1, cat, search, true);
    };

    const handleSearchChange = (text: string) => {
        setSearch(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setPage(1);
            setHasMore(true);
            load(1, selectedCategory, text, true);
        }, 500);
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            load(page + 1, selectedCategory, search);
        }
    };

    const handleQuizPress = (quiz: QuizItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('TakeQuiz', { quiz });
    };

    const renderQuizCard = ({ item }: { item: QuizItem }) => {
        const questionCount = item.questions?.length || 0;
        const hasAttempt = !!item.userAttempt;

        return (
            <TouchableOpacity
                style={styles.quizCard}
                onPress={() => handleQuizPress(item)}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']}
                    style={styles.quizCardGradient}
                >
                    {/* Header */}
                    <View style={styles.quizCardHeader}>
                        <View style={styles.quizIconCircle}>
                            <Ionicons name="rocket" size={20} color="#A78BFA" />
                        </View>
                        {hasAttempt && (
                            <View style={[styles.attemptBadge, { backgroundColor: item.userAttempt!.passed ? '#10B981' + '22' : '#EF4444' + '22' }]}>
                                <Ionicons
                                    name={item.userAttempt!.passed ? 'checkmark-circle' : 'close-circle'}
                                    size={12}
                                    color={item.userAttempt!.passed ? '#10B981' : '#EF4444'}
                                />
                                <Text style={[styles.attemptBadgeText, { color: item.userAttempt!.passed ? '#10B981' : '#EF4444' }]}>
                                    {item.userAttempt!.score}%
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Title */}
                    <Text style={styles.quizTitle} numberOfLines={2}>{item.title}</Text>
                    {item.description ? (
                        <Text style={styles.quizDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}

                    {/* Stats Row */}
                    <View style={styles.quizStatsRow}>
                        <View style={styles.quizStat}>
                            <Ionicons name="document-text-outline" size={13} color="#64748B" />
                            <Text style={styles.quizStatText}>{questionCount} Qs</Text>
                        </View>
                        {item.timeLimit ? (
                            <View style={styles.quizStat}>
                                <Ionicons name="time-outline" size={13} color="#64748B" />
                                <Text style={styles.quizStatText}>{item.timeLimit}m</Text>
                            </View>
                        ) : null}
                        <View style={styles.quizStat}>
                            <Ionicons name="star-outline" size={13} color="#64748B" />
                            <Text style={styles.quizStatText}>{item.totalPoints} pts</Text>
                        </View>
                        {item.topicTags && item.topicTags.length > 0 && (
                            <View style={styles.tagChip}>
                                <Text style={styles.tagChipText}>{item.topicTags[0]}</Text>
                            </View>
                        )}
                    </View>

                    {/* CTA */}
                    <LinearGradient
                        colors={hasAttempt ? ['#6366F1', '#4F46E5'] : ['#8B5CF6', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaButton}
                    >
                        <Ionicons name={hasAttempt ? 'refresh' : 'play-circle'} size={16} color="#fff" />
                        <Text style={styles.ctaButtonText}>{hasAttempt ? 'Retake' : 'Start Quiz'}</Text>
                    </LinearGradient>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={[BACKGROUND_COLOR, '#131B2E']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView edges={['top']} style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Browse Quizzes</Text>
                        <Text style={styles.headerSubtitle}>Find your next challenge</Text>
                    </View>
                </View>

                {/* Search */}
                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search quizzes..."
                        placeholderTextColor="#475569"
                        value={search}
                        onChangeText={handleSearchChange}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearchChange('')}>
                            <Ionicons name="close-circle" size={18} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat.id && styles.categoryChipActive,
                            ]}
                            onPress={() => handleCategoryChange(cat.id)}
                        >
                            <Ionicons
                                name={cat.icon as any}
                                size={14}
                                color={selectedCategory === cat.id ? '#fff' : '#94A3B8'}
                            />
                            <Text style={[
                                styles.categoryChipText,
                                selectedCategory === cat.id && styles.categoryChipTextActive,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Quiz List */}
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color="#A78BFA" />
                    </View>
                ) : quizzes.length === 0 ? (
                    <View style={styles.centerBox}>
                        <Ionicons name="search-outline" size={48} color="#334155" />
                        <Text style={styles.emptyText}>No quizzes found</Text>
                        <Text style={styles.emptySubText}>Try a different search or category</Text>
                    </View>
                ) : (
                    <FlatList
                        data={quizzes}
                        renderItem={renderQuizCard}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={
                            loadingMore ? (
                                <ActivityIndicator size="small" color="#A78BFA" style={{ marginVertical: 16 }} />
                            ) : null
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        gap: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
    headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 1 },

    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
    },
    searchIcon: {},
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#F1F5F9',
        padding: 0,
    },

    categoriesContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        height: 36,
    },
    categoryChipActive: {
        backgroundColor: '#8B5CF6',
        borderColor: '#7C3AED',
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#94A3B8',
    },
    categoryChipTextActive: { color: '#fff' },

    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 12,
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyText: { fontSize: 17, fontWeight: '600', color: '#475569', marginTop: 8 },
    emptySubText: { fontSize: 14, color: '#334155' },

    quizCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    quizCardGradient: {
        padding: 18,
        gap: 12,
    },
    quizCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quizIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(167,139,250,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    attemptBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 50,
        gap: 4,
    },
    attemptBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    quizTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F1F5F9',
        lineHeight: 22,
    },
    quizDesc: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 19,
    },
    quizStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    quizStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    quizStatText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    tagChip: {
        marginLeft: 'auto',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: 'rgba(99,102,241,0.15)',
    },
    tagChipText: {
        fontSize: 11,
        color: '#818CF8',
        fontWeight: '600',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    ctaButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
});
