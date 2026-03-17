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

const BACKGROUND_COLOR = '#F6F8FB';
// Stunity brand teal (from logo)
const TEAL = '#09CFF7';
const TEAL_DARK = '#06A8CC';
const TEAL_LIGHT = '#E0F9FD';


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
                <View style={styles.quizCardBody}>
                    {/* Header */}
                    <View style={styles.quizCardHeader}>
                        <View style={styles.quizIconCircle}>
                            <Ionicons name="rocket" size={20} color={TEAL_DARK} />
                        </View>
                        {hasAttempt && (
                            <View style={[styles.attemptBadge, { backgroundColor: item.userAttempt!.passed ? '#10B98122' : '#EF444422' }]}>
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
                            <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
                            <Text style={styles.quizStatText}>{questionCount} Qs</Text>
                        </View>
                        {item.timeLimit ? (
                            <View style={styles.quizStat}>
                                <Ionicons name="time-outline" size={13} color="#94A3B8" />
                                <Text style={styles.quizStatText}>{item.timeLimit}m</Text>
                            </View>
                        ) : null}
                        <View style={styles.quizStat}>
                            <Ionicons name="star-outline" size={13} color="#94A3B8" />
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
                        colors={[TEAL, TEAL_DARK]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaButton}
                    >
                        <Ionicons name={hasAttempt ? 'refresh' : 'play-circle'} size={16} color="#fff" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{hasAttempt ? 'Retake' : 'Start Quiz'}</Text>
                    </LinearGradient>
                </View>
            </TouchableOpacity>
        );
    };


    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <SafeAreaView edges={['top']} style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={TEAL_DARK} />
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
                        <ActivityIndicator size="large" color={TEAL} />
                    </View>
                ) : quizzes.length === 0 ? (
                    <View style={styles.centerBox}>
                        <Ionicons name="search-outline" size={48} color="#CBD5E1" />
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
                                <ActivityIndicator size="small" color={TEAL} style={{ marginVertical: 16 }} />
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
        backgroundColor: TEAL_LIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 1 },

    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
    },
    searchIcon: {},
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        padding: 0,
    },

    categoriesContainer: {
        paddingHorizontal: 12,
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
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        height: 36,
    },
    categoryChipActive: {
        backgroundColor: TEAL,
        borderColor: TEAL_DARK,
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
    },
    categoryChipTextActive: { color: '#fff' },

    listContent: {
        paddingHorizontal: 0,
        paddingBottom: 40,
        gap: 0,
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyText: { fontSize: 17, fontWeight: '600', color: '#94A3B8', marginTop: 8 },
    emptySubText: { fontSize: 14, color: '#CBD5E1' },

    // Quiz cards — white, flat border (matching PostCard feed style)
    quizCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 12,
        marginBottom: 12,
    },
    quizCardBody: {
        padding: 16,
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
        borderRadius: 12,
        backgroundColor: TEAL_LIGHT,
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
        color: '#1E293B',
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
        backgroundColor: TEAL_LIGHT,
    },
    tagChipText: {
        fontSize: 11,
        color: TEAL_DARK,
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
});

