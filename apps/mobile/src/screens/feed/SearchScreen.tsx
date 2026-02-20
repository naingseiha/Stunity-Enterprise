/**
 * Search Screen
 * 
 * Full-featured search with:
 * - Debounced search input
 * - Tabbed results: Posts & People
 * - Post results as compact cards
 * - People results with avatar & follow
 * - Recent searches with AsyncStorage
 * - Premium indigo/purple design
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Avatar } from '@/components/common';
import { feedApi } from '@/api/client';
import { Post } from '@/types';
import { transformPosts } from '@/utils/transformPost';
import { formatRelativeTime, formatNumber } from '@/utils';

const RECENT_SEARCHES_KEY = '@stunity_recent_searches';
const MAX_RECENT = 8;

type SearchTab = 'posts' | 'people';

interface SearchUser {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    role: string;
    isVerified?: boolean;
}

export default function SearchScreen() {
    const navigation = useNavigation();
    const inputRef = useRef<TextInput>(null);

    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTab>('posts');
    const [isSearching, setIsSearching] = useState(false);
    const [postResults, setPostResults] = useState<Post[]>([]);
    const [userResults, setUserResults] = useState<SearchUser[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load recent searches
    useEffect(() => {
        AsyncStorage.getItem(RECENT_SEARCHES_KEY).then((data) => {
            if (data) setRecentSearches(JSON.parse(data));
        });
        // Auto-focus search input
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    const saveRecentSearch = useCallback(async (term: string) => {
        const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }, [recentSearches]);

    const clearRecentSearches = useCallback(async () => {
        setRecentSearches([]);
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    }, []);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setPostResults([]);
            setUserResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        try {
            // Search posts and users in parallel
            const [postsResponse, usersResponse] = await Promise.allSettled([
                feedApi.get('/posts', {
                    params: { search: searchQuery.trim(), limit: 20, page: 1 },
                }),
                feedApi.get('/users/search', {
                    params: { q: searchQuery.trim(), limit: 15 },
                }),
            ]);

            if (postsResponse.status === 'fulfilled' && postsResponse.value.data?.success) {
                const rawPosts = postsResponse.value.data.data || [];
                setPostResults(transformPosts(rawPosts));
            } else {
                setPostResults([]);
            }

            if (usersResponse.status === 'fulfilled' && usersResponse.value.data?.success) {
                setUserResults(usersResponse.value.data.data || usersResponse.value.data.users || []);
            } else {
                setUserResults([]);
            }

            // Save to recent searches
            saveRecentSearch(searchQuery.trim());
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    }, [saveRecentSearch]);

    const handleQueryChange = useCallback((text: string) => {
        setQuery(text);

        // Debounce search — 300ms
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(text);
        }, 300);
    }, [performSearch]);

    const handleRecentSearchPress = useCallback((term: string) => {
        setQuery(term);
        performSearch(term);
        Keyboard.dismiss();
    }, [performSearch]);

    const handlePostPress = useCallback((post: Post) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('PostDetail' as any, { postId: post.id });
    }, [navigation]);

    const handleUserPress = useCallback((userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('UserProfile' as any, { userId });
    }, [navigation]);

    const renderPostResult = ({ item, index }: { item: Post; index: number }) => {
        const authorName = item.author.name || `${item.author.firstName} ${item.author.lastName}`;
        const isQuiz = item.postType === 'QUIZ';
        const isPoll = item.postType === 'POLL';

        return (
            <Animated.View entering={FadeInDown.delay(30 * Math.min(index, 10)).duration(300)}>
                <TouchableOpacity
                    style={styles.postResultCard}
                    activeOpacity={0.7}
                    onPress={() => handlePostPress(item)}
                >
                    <View style={styles.postResultHeader}>
                        <Avatar
                            uri={item.author.profilePictureUrl}
                            name={authorName}
                            size="sm"
                            variant="post"
                        />
                        <View style={styles.postResultAuthorInfo}>
                            <Text style={styles.postResultAuthor} numberOfLines={1}>{authorName}</Text>
                            <Text style={styles.postResultTime}>{formatRelativeTime(item.createdAt)}</Text>
                        </View>
                        <View style={[styles.postTypeBadge, {
                            backgroundColor: isQuiz ? '#FEF3C7' : isPoll ? '#EDE9FE' : '#EEF2FF'
                        }]}>
                            <Text style={[styles.postTypeText, {
                                color: isQuiz ? '#D97706' : isPoll ? '#7C3AED' : '#6366F1'
                            }]}>{item.postType}</Text>
                        </View>
                    </View>

                    {/* Title (for quiz/course/resource posts) */}
                    {item.title ? (
                        <Text style={styles.postResultTitle} numberOfLines={1}>{item.title}</Text>
                    ) : null}

                    <Text style={styles.postResultContent} numberOfLines={isQuiz || isPoll ? 2 : 3}>
                        {item.content}
                    </Text>

                    {/* ── Quiz Info Card ── */}
                    {isQuiz && item.quizData && (() => {
                        const quiz = item.quizData;
                        const questionCount = quiz?.questions?.length || 0;
                        return (
                            <View style={styles.quizInfoBox}>
                                <View style={styles.quizInfoRow}>
                                    {questionCount > 0 && (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="help-circle" size={13} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{questionCount} Qs</Text>
                                        </View>
                                    )}
                                    {quiz?.timeLimit ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="timer-outline" size={13} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{quiz.timeLimit}m</Text>
                                        </View>
                                    ) : null}
                                    {quiz?.totalPoints ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="star" size={13} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{quiz.totalPoints} pts</Text>
                                        </View>
                                    ) : null}
                                    {quiz?.passingScore ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                                            <Text style={[styles.quizInfoText, { color: '#10B981' }]}>Pass: {quiz.passingScore}%</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <View style={styles.quizStartBtn}>
                                    <Ionicons name="play-circle" size={14} color="#fff" />
                                    <Text style={styles.quizStartText}>Take Quiz</Text>
                                </View>
                            </View>
                        );
                    })()}

                    {/* ── Poll Preview ── */}
                    {isPoll && item.pollOptions && item.pollOptions.length > 0 && (
                        <View style={styles.pollPreview}>
                            {item.pollOptions.slice(0, 3).map((opt: any, i: number) => (
                                <View key={opt.id || i} style={styles.pollOptionRow}>
                                    <View style={styles.pollOptionDot} />
                                    <Text style={styles.pollOptionText} numberOfLines={1}>{opt.text}</Text>
                                </View>
                            ))}
                            {item.pollOptions.length > 3 && (
                                <Text style={styles.pollMoreText}>+{item.pollOptions.length - 3} more options</Text>
                            )}
                        </View>
                    )}

                    <View style={styles.postResultStats}>
                        <View style={styles.postStatItem}>
                            <Ionicons name="heart" size={14} color="#EF4444" />
                            <Text style={styles.postStatText}>{formatNumber(item.likes)}</Text>
                        </View>
                        <View style={styles.postStatItem}>
                            <Ionicons name="chatbubble" size={14} color="#6B7280" />
                            <Text style={styles.postStatText}>{formatNumber(item.comments)}</Text>
                        </View>
                        {item.topicTags && item.topicTags.length > 0 && (
                            <View style={styles.postResultTags}>
                                {item.topicTags.slice(0, 2).map((tag, i) => (
                                    <Text key={i} style={styles.postResultTag}>#{tag}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderUserResult = ({ item, index }: { item: SearchUser; index: number }) => {
        const name = `${item.firstName} ${item.lastName}`;
        return (
            <Animated.View entering={FadeInDown.delay(30 * Math.min(index, 10)).duration(300)}>
                <TouchableOpacity
                    style={styles.userResultCard}
                    activeOpacity={0.7}
                    onPress={() => handleUserPress(item.id)}
                >
                    <Avatar
                        uri={item.profilePictureUrl}
                        name={name}
                        size="lg"
                        variant="post"
                    />
                    <View style={styles.userResultInfo}>
                        <View style={styles.userNameRow}>
                            <Text style={styles.userResultName}>{name}</Text>
                            {item.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark" size={10} color="#fff" />
                                </View>
                            )}
                        </View>
                        <Text style={styles.userResultRole}>
                            {item.role === 'TEACHER' ? '👨‍🏫 Teacher' :
                                item.role === 'ADMIN' ? '🛡️ Admin' : '🎓 Student'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderEmptyState = () => {
        if (isSearching) return null;

        if (hasSearched) {
            return (
                <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="search" size={48} color="#D1D5DB" />
                    </View>
                    <Text style={styles.emptyTitle}>No results found</Text>
                    <Text style={styles.emptySubtitle}>
                        Try different keywords or check the spelling
                    </Text>
                </Animated.View>
            );
        }

        return null;
    };

    const renderRecentSearches = () => {
        if (hasSearched || query.length > 0) return null;

        return (
            <View style={styles.recentSection}>
                {recentSearches.length > 0 && (
                    <>
                        <View style={styles.recentHeader}>
                            <Text style={styles.recentTitle}>Recent Searches</Text>
                            <TouchableOpacity onPress={clearRecentSearches}>
                                <Text style={styles.clearText}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                        {recentSearches.map((term, index) => (
                            <Animated.View
                                key={term}
                                entering={FadeInDown.delay(30 * index).duration(300)}
                            >
                                <TouchableOpacity
                                    style={styles.recentItem}
                                    onPress={() => handleRecentSearchPress(term)}
                                >
                                    <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                                    <Text style={styles.recentText}>{term}</Text>
                                    <Ionicons name="arrow-forward-outline" size={16} color="#D1D5DB" />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </>
                )}

                {/* Trending / Suggestion Section */}
                <View style={styles.suggestionsSection}>
                    <Text style={styles.recentTitle}>Try Searching</Text>
                    <View style={styles.suggestionChips}>
                        {['Math', 'Physics', 'Essay', 'Quiz', 'Project', 'Study Group'].map((chip) => (
                            <TouchableOpacity
                                key={chip}
                                style={styles.suggestionChip}
                                onPress={() => handleRecentSearchPress(chip)}
                            >
                                <Text style={styles.suggestionChipText}>{chip}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    const currentResults = activeTab === 'posts' ? postResults : userResults;
    const postCount = postResults.length;
    const userCount = userResults.length;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Search Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color="#374151" />
                </TouchableOpacity>

                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search posts, people, topics..."
                        placeholderTextColor="#9CA3AF"
                        value={query}
                        onChangeText={handleQueryChange}
                        returnKeyType="search"
                        onSubmitEditing={() => performSearch(query)}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                setQuery('');
                                setPostResults([]);
                                setUserResults([]);
                                setHasSearched(false);
                                inputRef.current?.focus();
                            }}
                            style={styles.clearButton}
                        >
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Tabs — only show when there are results */}
            {hasSearched && (
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
                        onPress={() => setActiveTab('posts')}
                    >
                        <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                            Posts {postCount > 0 ? `(${postCount})` : ''}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'people' && styles.activeTab]}
                        onPress={() => setActiveTab('people')}
                    >
                        <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
                            People {userCount > 0 ? `(${userCount})` : ''}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Loading */}
            {isSearching && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            )}

            {/* Recent Searches (when no query) */}
            {renderRecentSearches()}

            {/* Results */}
            {!isSearching && hasSearched && (
                <FlatList
                    data={currentResults as any[]}
                    renderItem={activeTab === 'posts' ? renderPostResult as any : renderUserResult as any}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.resultsList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmptyState}
                    keyboardShouldPersistTaps="handled"
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F3FF',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
        paddingVertical: 8,
    },
    clearButton: {
        padding: 4,
    },

    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingHorizontal: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#6366F1',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    activeTabText: {
        color: '#6366F1',
    },

    // Loading
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#9CA3AF',
    },

    // Results List
    resultsList: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 40,
    },

    // Post Result Card
    postResultCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    postResultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    postResultAuthorInfo: {
        flex: 1,
    },
    postResultAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    postResultTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 1,
    },
    postTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    postTypeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6366F1',
        textTransform: 'capitalize',
    },
    postResultContent: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 10,
    },
    postResultStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    postStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    postStatText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    postResultTags: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 6,
    },
    postResultTag: {
        fontSize: 11,
        color: '#6366F1',
        fontWeight: '500',
    },

    // User Result Card
    userResultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        gap: 14,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    userResultInfo: {
        flex: 1,
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userResultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    verifiedBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1D9BF0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userResultRole: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },

    // Empty State
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingHorizontal: 32,
    },

    // Recent Searches
    recentSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    recentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    clearText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366F1',
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    recentText: {
        flex: 1,
        fontSize: 15,
        color: '#374151',
    },

    // Suggestions
    suggestionsSection: {
        marginTop: 24,
    },
    suggestionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    suggestionChip: {
        backgroundColor: '#EEF2FF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    suggestionChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366F1',
    },

    // Post result title (for quiz/course/resource)
    postResultTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },

    // Quiz info box
    quizInfoBox: {
        backgroundColor: '#FFFBEB',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#FDE68A',
        gap: 8,
    },
    quizInfoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    quizInfoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    quizInfoText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#D97706',
    },
    quizStartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F59E0B',
        paddingVertical: 7,
        borderRadius: 8,
    },
    quizStartText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },

    // Poll preview
    pollPreview: {
        backgroundColor: '#F5F3FF',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: '#EDE9FE',
    },
    pollOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pollOptionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#7C3AED',
    },
    pollOptionText: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
    },
    pollMoreText: {
        fontSize: 12,
        color: '#7C3AED',
        fontWeight: '500',
        marginTop: 2,
    },
});
