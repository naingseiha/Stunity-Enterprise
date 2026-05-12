import { useTranslation } from 'react-i18next';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Search Screen
 * 
 * Full-featured search with:
 * - Debounced search input
 * - Tabbed results: Posts & People
 * - Post results as compact cards
 * - People results with avatar & follow
 * - Recent searches with AsyncStorage
 * - Education-first filters, ranking controls, and compact rich results
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Keyboard,
    Platform,
    Animated,
    ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Haptics } from '@/services/haptics';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Avatar } from '@/components/common';
import { useThemeContext } from '@/contexts';
import { feedApi } from '@/api/client';
import { Post, PostType } from '@/types';
import { transformPosts } from '@/utils/transformPost';
import { formatRelativeTime, formatNumber } from '@/utils';

const RECENT_SEARCHES_KEY = '@stunity_recent_searches';
const MAX_RECENT = 8;
const SEARCH_DEBOUNCE_MS = 180;
const SEARCH_CACHE_TTL_MS = 90 * 1000;
const SEARCH_POST_LIMIT = 24;
const SEARCH_USER_LIMIT = 12;
const SEARCH_REQUEST_TIMEOUT_MS = 12000;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type SearchScope = 'all' | 'posts' | 'people';
type PostFilter = 'ALL' | Extract<PostType, 'COURSE' | 'QUIZ' | 'QUESTION' | 'RESOURCE' | 'TUTORIAL' | 'RESEARCH' | 'PROJECT'>;
type SortMode = 'top' | 'recent' | 'popular';
type SearchOptions = {
    allowEmpty?: boolean;
    includePeople?: boolean;
    saveRecent?: boolean;
};
type SearchCacheEntry = {
    posts: Post[];
    users: SearchUser[];
    timestamp: number;
};

const POST_FILTERS: Array<{ key: PostFilter; label: string; icon: IoniconName; color: string; bg: string }> = [
    { key: 'ALL', label: 'All', icon: 'sparkles-outline', color: '#0F766E', bg: '#CCFBF1' },
    { key: 'COURSE', label: 'Courses', icon: 'school-outline', color: '#2563EB', bg: '#DBEAFE' },
    { key: 'QUIZ', label: 'Quizzes', icon: 'flash-outline', color: '#B45309', bg: '#FEF3C7' },
    { key: 'QUESTION', label: 'Questions', icon: 'help-circle-outline', color: '#BE123C', bg: '#FFE4E6' },
    { key: 'RESOURCE', label: 'Resources', icon: 'library-outline', color: '#047857', bg: '#D1FAE5' },
    { key: 'TUTORIAL', label: 'Tutorials', icon: 'play-circle-outline', color: '#7C2D12', bg: '#FFEDD5' },
    { key: 'RESEARCH', label: 'Research', icon: 'flask-outline', color: '#6D28D9', bg: '#EDE9FE' },
    { key: 'PROJECT', label: 'Projects', icon: 'construct-outline', color: '#0369A1', bg: '#E0F2FE' },
];

const SORT_OPTIONS: Array<{ key: SortMode; label: string; icon: IoniconName }> = [
    { key: 'top', label: 'Top', icon: 'analytics-outline' },
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'popular', label: 'Popular', icon: 'flame-outline' },
];

const TOPIC_SUGGESTIONS = [
    'Math',
    'Physics',
    'Exam prep',
    'Essay writing',
    'Programming',
    'Research',
    'Scholarship',
    'Study group',
];

const getPostTypeMeta = (type: PostType | string) => {
    const match = POST_FILTERS.find(filter => filter.key === type);
    if (match) return match;
    if (type === 'POLL') return { key: 'ALL' as const, label: 'Poll', icon: 'bar-chart-outline' as IoniconName, color: '#7C3AED', bg: '#EDE9FE' };
    if (type === 'ASSIGNMENT') return { key: 'ALL' as const, label: 'Assignment', icon: 'clipboard-outline' as IoniconName, color: '#0F766E', bg: '#CCFBF1' };
    if (type === 'EXAM') return { key: 'ALL' as const, label: 'Exam', icon: 'document-text-outline' as IoniconName, color: '#B45309', bg: '#FEF3C7' };
    return { key: 'ALL' as const, label: String(type || 'Post').replace(/_/g, ' '), icon: 'document-text-outline' as IoniconName, color: '#334155', bg: '#E2E8F0' };
};

const getRoleMeta = (role: string) => {
    if (role === 'TEACHER') return { label: 'Teacher', icon: 'school-outline' as IoniconName, color: '#2563EB', bg: '#DBEAFE' };
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') return { label: 'Admin', icon: 'shield-checkmark-outline' as IoniconName, color: '#0F766E', bg: '#CCFBF1' };
    if (role === 'STAFF') return { label: 'Staff', icon: 'briefcase-outline' as IoniconName, color: '#7C2D12', bg: '#FFEDD5' };
    return { label: 'Student', icon: 'reader-outline' as IoniconName, color: '#6D28D9', bg: '#EDE9FE' };
};

const normalizePostTypeLabel = (label: string) =>
    label
        .toLowerCase()
        .replace(/(^|\s)\S/g, match => match.toUpperCase());

const getSearchCacheKey = (query: string, postType: PostFilter, includePeople: boolean) =>
    `${query.trim().toLowerCase()}::${postType}::${includePeople ? 'people' : 'posts'}`;

interface SearchUser {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    role: string;
    isVerified?: boolean;
}

export default function SearchScreen() {
    const { t: autoT } = useTranslation();
    const navigation = useNavigation();
    const inputRef = useRef<TextInput>(null);
    const { colors, isDark } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const [query, setQuery] = useState('');
    const [activeScope, setActiveScope] = useState<SearchScope>('all');
    const [selectedType, setSelectedType] = useState<PostFilter>('ALL');
    const [sortMode, setSortMode] = useState<SortMode>('top');
    const [isSearching, setIsSearching] = useState(false);
    const [postResults, setPostResults] = useState<Post[]>([]);
    const [userResults, setUserResults] = useState<SearchUser[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchCacheRef = useRef<Map<string, SearchCacheEntry>>(new Map());
    const searchRequestIdRef = useRef(0);
    const activeSearchControllerRef = useRef<AbortController | null>(null);
    const loadingPulse = useRef(new Animated.Value(0)).current;

    // Load recent searches
    useEffect(() => {
        AsyncStorage.getItem(RECENT_SEARCHES_KEY).then((data) => {
            if (data) setRecentSearches(JSON.parse(data));
        });
        // Auto-focus search input
        const focusTimer = setTimeout(() => inputRef.current?.focus(), 300);

        return () => {
            clearTimeout(focusTimer);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            activeSearchControllerRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        if (!isSearching) {
            loadingPulse.stopAnimation();
            loadingPulse.setValue(0);
            return;
        }

        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(loadingPulse, {
                    toValue: 1,
                    duration: 650,
                    useNativeDriver: true,
                }),
                Animated.timing(loadingPulse, {
                    toValue: 0,
                    duration: 650,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();

        return () => animation.stop();
    }, [isSearching, loadingPulse]);

    const saveRecentSearch = useCallback(async (term: string) => {
        const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }, [recentSearches]);

    const clearRecentSearches = useCallback(async () => {
        setRecentSearches([]);
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    }, []);

    const performSearch = useCallback(async (
        searchQuery: string,
        overrideType: PostFilter = selectedType,
        options: SearchOptions = {},
    ) => {
        const trimmedQuery = searchQuery.trim();
        const selectedPostType = overrideType !== 'ALL' ? overrideType : undefined;
        const shouldBrowseWithoutKeyword = options.allowEmpty || Boolean(selectedPostType);
        const shouldSearchPeople = Boolean(trimmedQuery) && (options.includePeople ?? activeScope !== 'posts');

        if (!trimmedQuery && !shouldBrowseWithoutKeyword) {
            activeSearchControllerRef.current?.abort();
            setPostResults([]);
            setUserResults([]);
            setHasSearched(false);
            setIsSearching(false);
            return;
        }

        const cacheKey = getSearchCacheKey(trimmedQuery, overrideType, shouldSearchPeople);
        const cached = searchCacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
            activeSearchControllerRef.current?.abort();
            searchRequestIdRef.current += 1;
            setPostResults(cached.posts);
            setUserResults(cached.users);
            setHasSearched(true);
            setIsSearching(false);
            if (trimmedQuery && (options.saveRecent ?? true)) {
                saveRecentSearch(trimmedQuery);
            }
            return;
        }

        activeSearchControllerRef.current?.abort();
        const controller = new AbortController();
        const requestId = searchRequestIdRef.current + 1;
        searchRequestIdRef.current = requestId;
        activeSearchControllerRef.current = controller;
        setIsSearching(true);
        setHasSearched(true);

        try {
            const requestHeaders = { 'X-No-Retry': '1' };
            const [postsResponse, usersResponse] = await Promise.allSettled([
                feedApi.get('/posts', {
                    params: {
                        limit: SEARCH_POST_LIMIT,
                        page: 1,
                        fields: 'minimal',
                        ...(trimmedQuery ? { search: trimmedQuery } : {}),
                        ...(selectedPostType ? { type: selectedPostType } : {}),
                    },
                    headers: requestHeaders,
                    signal: controller.signal,
                    timeout: SEARCH_REQUEST_TIMEOUT_MS,
                }),
                shouldSearchPeople
                    ? feedApi.get('/users/search', {
                        params: { q: trimmedQuery, limit: SEARCH_USER_LIMIT },
                        headers: requestHeaders,
                        signal: controller.signal,
                        timeout: SEARCH_REQUEST_TIMEOUT_MS,
                    })
                    : Promise.resolve({ data: { success: true, data: [] } }),
            ]);

            if (requestId !== searchRequestIdRef.current || controller.signal.aborted) return;

            let nextPosts: Post[] = [];
            let nextUsers: SearchUser[] = [];
            if (postsResponse.status === 'fulfilled' && postsResponse.value.data?.success) {
                const rawPosts = postsResponse.value.data.data || [];
                nextPosts = transformPosts(rawPosts);
            }

            if (usersResponse.status === 'fulfilled' && usersResponse.value.data?.success) {
                nextUsers = usersResponse.value.data.data || usersResponse.value.data.users || [];
            }

            setPostResults(nextPosts);
            setUserResults(nextUsers);
            searchCacheRef.current.set(cacheKey, {
                posts: nextPosts,
                users: nextUsers,
                timestamp: Date.now(),
            });
            if (searchCacheRef.current.size > 36) {
                const oldestKey = searchCacheRef.current.keys().next().value;
                if (oldestKey) searchCacheRef.current.delete(oldestKey);
            }

            if (trimmedQuery && (options.saveRecent ?? true)) {
                saveRecentSearch(trimmedQuery);
            }
        } catch (error) {
            if (requestId === searchRequestIdRef.current && !controller.signal.aborted) {
                console.error('Search failed:', error);
            }
        } finally {
            if (requestId === searchRequestIdRef.current) {
                setIsSearching(false);
                if (activeSearchControllerRef.current === controller) {
                    activeSearchControllerRef.current = null;
                }
            }
        }
    }, [activeScope, saveRecentSearch, selectedType]);

    const handleQueryChange = useCallback((text: string) => {
        setQuery(text);
        if (!text.trim()) {
            activeSearchControllerRef.current?.abort();
            setSelectedType('ALL');
            setActiveScope('all');
            setIsSearching(false);
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(text);
        }, SEARCH_DEBOUNCE_MS);
    }, [performSearch]);

    const handleRecentSearchPress = useCallback((term: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setSelectedType('ALL');
        setActiveScope('all');
        setQuery(term);
        performSearch(term, 'ALL');
        Keyboard.dismiss();
    }, [performSearch]);

    const handleFilterPress = useCallback((filter: PostFilter) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedType(filter);
        if (!query.trim()) setActiveScope(filter === 'ALL' ? 'all' : 'posts');
        performSearch(query, filter, { allowEmpty: true, includePeople: Boolean(query.trim()) });
    }, [performSearch, query]);

    const handleBrowseFilter = useCallback((filter: PostFilter) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedType(filter);
        setActiveScope(filter === 'ALL' ? 'all' : 'posts');
        setQuery('');
        performSearch('', filter, { allowEmpty: true, includePeople: false, saveRecent: false });
        Keyboard.dismiss();
    }, [performSearch]);

    const handleSortPress = useCallback((mode: SortMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSortMode(mode);
    }, []);

    const handleSubmitSearch = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        performSearch(query);
        Keyboard.dismiss();
    }, [performSearch, query]);

    const handleClearQuery = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        activeSearchControllerRef.current?.abort();
        setQuery('');
        setSelectedType('ALL');
        setActiveScope('all');
        setPostResults([]);
        setUserResults([]);
        setHasSearched(false);
        setIsSearching(false);
        inputRef.current?.focus();
    }, []);

    const handlePostPress = useCallback((post: Post) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('PostDetail' as any, { postId: post.id });
    }, [navigation]);

    const handleUserPress = useCallback((userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('UserProfile' as any, { userId });
    }, [navigation]);

    const renderPostResult = ({ item, index }: { item: Post; index: number }) => {
        const authorName = `${item.author.lastName || ''} ${item.author.firstName || ''}`.trim() || item.author.name || '';
        const isQuiz = item.postType === 'QUIZ';
        const isPoll = item.postType === 'POLL';
        const typeMeta = getPostTypeMeta(item.postType);
        const relevance = Math.max(0, Math.min(Math.round((item._score || 0) * 100), 100));

        return (
            <Animated.View>
                <TouchableOpacity
                    style={styles.postResultCard}
                    activeOpacity={0.9}
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
                            <View style={styles.postMetaLine}>
                                <Text style={styles.postResultTime}>{formatRelativeTime(item.createdAt)}</Text>
                                {item.mediaUrls?.length > 0 && (
                                    <>
                                        <View style={styles.metaDot} />
                                        <Ionicons name="image-outline" size={12} color={colors.textTertiary} />
                                    </>
                                )}
                            </View>
                        </View>
                        <View style={[styles.postTypeBadge, { backgroundColor: typeMeta.bg }]}>
                            <Ionicons name={typeMeta.icon} size={12} color={typeMeta.color} />
                            <Text style={[styles.postTypeText, { color: typeMeta.color }]} numberOfLines={1}>
                                {normalizePostTypeLabel(typeMeta.label)}
                            </Text>
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
                                            <Text style={styles.quizInfoText}>{questionCount} <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_99c80c8a" /></Text>
                                        </View>
                                    )}
                                    {quiz?.timeLimit ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="timer-outline" size={13} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{quiz.timeLimit}<AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_e5af6899" /></Text>
                                        </View>
                                    ) : null}
                                    {quiz?.totalPoints ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="star" size={13} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{quiz.totalPoints} <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_da04648b" /></Text>
                                        </View>
                                    ) : null}
                                    {quiz?.passingScore ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                                            <Text style={[styles.quizInfoText, { color: '#10B981' }]}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_e9cd1ebe" /> {quiz.passingScore}%</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <View style={styles.quizStartBtn}>
                                    <Ionicons name="play-circle" size={14} color="#fff" />
                                    <Text style={styles.quizStartText}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_74c69c56" /></Text>
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
                                <Text style={styles.pollMoreText}>+{item.pollOptions.length - 3} <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_f016a8c3" /></Text>
                            )}
                        </View>
                    )}

                    <View style={styles.postResultStats}>
                        <View style={styles.postStatItem}>
                            <Ionicons name="heart" size={14} color="#EF4444" />
                            <Text style={styles.postStatText}>{formatNumber(item.likes)}</Text>
                        </View>
                        <View style={styles.postStatItem}>
                            <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.postStatText}>{formatNumber(item.comments)}</Text>
                        </View>
                        <View style={styles.postStatItem}>
                            <Ionicons name="stats-chart" size={14} color="#0F766E" />
                            <Text style={styles.postStatText}>{formatNumber(item.views || 0)}</Text>
                        </View>
                        {item.topicTags && item.topicTags.length > 0 && (
                            <View style={styles.postResultTags}>
                                {item.topicTags.slice(0, 2).map((tag, i) => (
                                    <Text key={i} style={styles.postResultTag}>#{tag}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                    {relevance > 0 && (
                        <View style={styles.relevanceTrack}>
                            <View style={[styles.relevanceFill, { width: `${Math.min(relevance, 100)}%`, backgroundColor: typeMeta.color }]} />
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderUserResult = ({ item, index }: { item: SearchUser; index: number }) => {
        const name = `${item.lastName} ${item.firstName}`;
        const roleMeta = getRoleMeta(item.role);
        return (
            <Animated.View>
                <TouchableOpacity
                    style={styles.userResultCard}
                    activeOpacity={0.9}
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
                        <View style={[styles.rolePill, { backgroundColor: roleMeta.bg }]}>
                            <Ionicons name={roleMeta.icon} size={12} color={roleMeta.color} />
                            <Text style={[styles.userResultRole, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderPeoplePreview = () => {
        if (activeScope !== 'all' || userResults.length === 0) return null;

        return (
            <View style={styles.peoplePreview}>
                <View style={styles.peoplePreviewHeader}>
                    <Text style={styles.peoplePreviewTitle}>People</Text>
                    <TouchableOpacity onPress={() => setActiveScope('people')}>
                        <Ionicons name="arrow-forward" size={18} color="#0F766E" />
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peoplePreviewRow}>
                    {userResults.slice(0, 8).map((user) => {
                        const name = `${user.lastName} ${user.firstName}`;
                        const roleMeta = getRoleMeta(user.role);
                        return (
                            <TouchableOpacity
                                key={user.id}
                                style={styles.peoplePreviewCard}
                                activeOpacity={0.86}
                                onPress={() => handleUserPress(user.id)}
                            >
                                <Avatar uri={user.profilePictureUrl} name={name} size="md" variant="post" />
                                <Text style={styles.peoplePreviewName} numberOfLines={1}>{name}</Text>
                                <View style={[styles.peoplePreviewRole, { backgroundColor: roleMeta.bg }]}>
                                    <Ionicons name={roleMeta.icon} size={11} color={roleMeta.color} />
                                    <Text style={[styles.peoplePreviewRoleText, { color: roleMeta.color }]} numberOfLines={1}>{roleMeta.label}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderEmptyState = () => {
        if (isSearching) return null;
        if (activeScope === 'all' && userResults.length > 0) return null;

        if (hasSearched) {
            return (
                <Animated.View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="search" size={48} color="#D1D5DB" />
                    </View>
                    <Text style={styles.emptyTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_d728da09" /></Text>
                    <Text style={styles.emptySubtitle}>
                        <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_bb6d714c" />
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
                            <Text style={styles.recentTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_986fbbfe" /></Text>
                            <TouchableOpacity onPress={clearRecentSearches}>
                                <Text style={styles.clearText}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_f9d87fdb" /></Text>
                            </TouchableOpacity>
                        </View>
                        {recentSearches.map((term, index) => (
                            <Animated.View
                                key={term}
                            >
                                <TouchableOpacity
                                    style={styles.recentItem}
                                    onPress={() => handleRecentSearchPress(term)}
                                >
                                    <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
                                    <Text style={styles.recentText}>{term}</Text>
                                    <Ionicons name="arrow-forward-outline" size={16} color={colors.textTertiary} />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </>
                )}

                {/* Trending / Suggestion Section */}
                <View style={styles.suggestionsSection}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="trending-up-outline" size={17} color="#0F766E" />
                        <Text style={styles.recentTitle}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_b0e2c843" /></Text>
                    </View>
                    <View style={styles.suggestionChips}>
                        {TOPIC_SUGGESTIONS.map((chip) => (
                            <TouchableOpacity
                                key={chip}
                                style={styles.suggestionChip}
                                onPress={() => handleRecentSearchPress(chip)}
                            >
                                <Ionicons name="search-outline" size={13} color="#0F766E" />
                                <Text style={styles.suggestionChipText}>{chip}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.discoveryGrid}>
                    {POST_FILTERS.slice(1, 7).map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            style={styles.discoveryTile}
                            activeOpacity={0.86}
                            onPress={() => handleBrowseFilter(filter.key)}
                        >
                            <View style={[styles.discoveryIcon, { backgroundColor: filter.bg }]}>
                                <Ionicons name={filter.icon} size={18} color={filter.color} />
                            </View>
                            <Text style={styles.discoveryLabel} numberOfLines={1}>{filter.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const sortedPostResults = React.useMemo(() => {
        const posts = [...postResults];
        if (sortMode === 'recent') {
            return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        if (sortMode === 'popular') {
            return posts.sort((a, b) => ((b.likes || 0) + (b.comments || 0) + (b.views || 0) * 0.2) - ((a.likes || 0) + (a.comments || 0) + (a.views || 0) * 0.2));
        }
        return posts.sort((a, b) => ((b._score || 0) - (a._score || 0)) || ((b.likes || 0) + (b.comments || 0) - (a.likes || 0) - (a.comments || 0)));
    }, [postResults, sortMode]);

    const currentResults = activeScope === 'people' ? userResults : sortedPostResults;
    const postCount = postResults.length;
    const userCount = userResults.length;
    const resultSummary = `${postCount} posts / ${userCount} people`;
    const loadingSkeletonOpacity = loadingPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.45, 0.88],
    });

    const renderSearchLoadingOverlay = () => (
        <BlurView
            intensity={Platform.OS === 'ios' ? 34 : 70}
            tint={isDark ? 'dark' : 'light'}
            style={styles.searchLoadingOverlay}
        >
            <View
                style={[
                    styles.searchLoadingContent,
                    hasSearched && activeScope !== 'people'
                        ? styles.searchLoadingContentWithFilters
                        : styles.searchLoadingContentBase,
                ]}
            >
                <View style={styles.searchLoadingPill}>
                    <ActivityIndicator size="small" color="#0F766E" />
                    <Text style={styles.loadingText}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_dc975d59" /></Text>
                </View>
                {[0, 1, 2].map((item) => (
                    <Animated.View key={item} style={[styles.searchSkeletonCard, { opacity: loadingSkeletonOpacity }]}>
                        <View style={styles.searchSkeletonHeader}>
                            <View style={styles.searchSkeletonAvatar} />
                            <View style={styles.searchSkeletonLines}>
                                <View style={styles.searchSkeletonLineShort} />
                                <View style={styles.searchSkeletonLineTiny} />
                            </View>
                            <View style={styles.searchSkeletonBadge} />
                        </View>
                        <View style={styles.searchSkeletonLineFull} />
                        <View style={styles.searchSkeletonLineMid} />
                        <View style={styles.searchSkeletonStats}>
                            <View style={styles.searchSkeletonStat} />
                            <View style={styles.searchSkeletonStat} />
                            <View style={styles.searchSkeletonStat} />
                        </View>
                    </Animated.View>
                ))}
            </View>
        </BlurView>
    );

    return (
        <View style={styles.container}>
            {/* Search Header - Sticky and Blurred */}
            <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint={isDark ? 'dark' : 'light'} style={styles.headerBlur}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </TouchableOpacity>

                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search" size={20} color={colors.textTertiary} />
                            <TextInput
                                ref={inputRef}
                                style={styles.searchInput}
                                placeholder={autoT("auto.mobile.screens_feed_SearchScreen.k_5bd00d2d")}
                                placeholderTextColor={colors.textTertiary}
                                value={query}
                                onChangeText={handleQueryChange}
                                returnKeyType="search"
                                onSubmitEditing={handleSubmitSearch}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {query.length > 0 && (
                                <TouchableOpacity
                                    onPress={handleClearQuery}
                                    style={styles.clearButton}
                                >
                                    <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Tabs — only show when there are results */}
                    {hasSearched && (
                        <>
                            <View style={styles.tabBar}>
                                {([
                                    { key: 'all', label: 'All', count: postCount + userCount, icon: 'sparkles-outline' as IoniconName },
                                    { key: 'posts', label: 'Posts', count: postCount, icon: 'newspaper-outline' as IoniconName },
                                    { key: 'people', label: 'People', count: userCount, icon: 'people-outline' as IoniconName },
                                ] as const).map((scope) => (
                                    <TouchableOpacity
                                        key={scope.key}
                                        style={[styles.tab, activeScope === scope.key && styles.activeTab]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setActiveScope(scope.key);
                                        }}
                                    >
                                        <Ionicons name={scope.icon} size={15} color={activeScope === scope.key ? '#0F766E' : colors.textTertiary} />
                                        <Text style={[styles.tabText, activeScope === scope.key && styles.activeTabText]} numberOfLines={1}>
                                            {scope.label}{scope.count > 0 ? ` ${scope.count}` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {activeScope !== 'people' && (
                                <View style={styles.filterShell}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                                        {POST_FILTERS.map((filter) => {
                                            const active = selectedType === filter.key;
                                            return (
                                                <TouchableOpacity
                                                    key={filter.key}
                                                    style={[
                                                        styles.filterChip,
                                                        active && { backgroundColor: filter.bg, borderColor: filter.color },
                                                    ]}
                                                    onPress={() => handleFilterPress(filter.key)}
                                                    activeOpacity={0.85}
                                                >
                                                    <Ionicons name={filter.icon} size={14} color={active ? filter.color : colors.textTertiary} />
                                                    <Text style={[styles.filterChipText, active && { color: filter.color }]} numberOfLines={1}>
                                                        {filter.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                    <View style={styles.sortRow}>
                                        <Text style={styles.resultSummary} numberOfLines={1}>{resultSummary}</Text>
                                        <View style={styles.sortCluster}>
                                            {SORT_OPTIONS.map((option) => {
                                                const active = sortMode === option.key;
                                                return (
                                                    <TouchableOpacity
                                                        key={option.key}
                                                        style={[styles.sortButton, active && styles.sortButtonActive]}
                                                        onPress={() => handleSortPress(option.key)}
                                                    >
                                                        <Ionicons name={option.icon} size={13} color={active ? '#0F766E' : colors.textTertiary} />
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </SafeAreaView>
            </BlurView>

            {/* Recent Searches (when no query) */}
            {renderRecentSearches()}

            {/* Results */}
            {hasSearched && (
                <View style={{ flex: 1, zIndex: 0 }}>
                    <FlashList
                        data={currentResults as any[]}
                        renderItem={activeScope === 'people' ? renderUserResult as any : renderPostResult as any}
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={hasSearched && activeScope !== 'people' ? styles.resultsListWithFilters : styles.resultsList}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={renderEmptyState}
                        ListHeaderComponent={renderPeoplePreview}
                        keyboardShouldPersistTaps="handled"
                        estimatedItemSize={activeScope === 'people' ? 86 : 178}
                        getItemType={(item) => activeScope === 'people' ? 'USER' : (item.postType || 'POST')}
                    />
                </View>
            )}

            {isSearching && renderSearchLoadingOverlay()}
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerBlur: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.85)',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        paddingVertical: 8,
    },
    clearButton: {
        padding: 4,
    },

    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
    },
    tab: {
        flex: 1,
        minHeight: 36,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    activeTab: {
        borderColor: '#0F766E',
        backgroundColor: isDark ? 'rgba(20, 184, 166, 0.14)' : '#CCFBF1',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textTertiary,
    },
    activeTabText: {
        color: '#0F766E',
    },
    filterShell: {
        paddingBottom: 10,
    },
    filterRow: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    sortRow: {
        marginTop: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    resultSummary: {
        flex: 1,
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    sortCluster: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sortButton: {
        width: 30,
        height: 30,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
    },
    sortButtonActive: {
        borderColor: '#0F766E',
        backgroundColor: isDark ? 'rgba(20, 184, 166, 0.14)' : '#CCFBF1',
    },

    // Loading
    loadingContainer: {
        paddingVertical: 40,
        paddingTop: Platform.OS === 'ios' ? 150 : 160,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textTertiary,
        fontWeight: '700',
    },
    searchLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 8,
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.42)' : 'rgba(248, 250, 252, 0.52)',
    },
    searchLoadingContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    searchLoadingContentBase: {
        paddingTop: Platform.OS === 'ios' ? 164 : 174,
    },
    searchLoadingContentWithFilters: {
        paddingTop: Platform.OS === 'ios' ? 304 : 314,
    },
    searchLoadingPill: {
        alignSelf: 'center',
        minHeight: 40,
        paddingHorizontal: 16,
        marginBottom: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchSkeletonCard: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchSkeletonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    searchSkeletonAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
    },
    searchSkeletonLines: {
        flex: 1,
        gap: 6,
    },
    searchSkeletonLineShort: {
        width: '54%',
        height: 10,
        borderRadius: 5,
        backgroundColor: isDark ? '#334155' : '#CBD5E1',
    },
    searchSkeletonLineTiny: {
        width: '32%',
        height: 8,
        borderRadius: 4,
        backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
    },
    searchSkeletonBadge: {
        width: 64,
        height: 24,
        borderRadius: 6,
        backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
    },
    searchSkeletonLineFull: {
        width: '92%',
        height: 11,
        borderRadius: 6,
        backgroundColor: isDark ? '#334155' : '#CBD5E1',
        marginBottom: 8,
    },
    searchSkeletonLineMid: {
        width: '68%',
        height: 11,
        borderRadius: 6,
        backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
        marginBottom: 14,
    },
    searchSkeletonStats: {
        flexDirection: 'row',
        gap: 12,
    },
    searchSkeletonStat: {
        width: 42,
        height: 10,
        borderRadius: 5,
        backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
    },

    // Results List
    resultsList: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 150 : 160, // Offset for absolute blur header
        paddingBottom: 40,
    },
    resultsListWithFilters: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 244 : 254,
        paddingBottom: 40,
    },

    // Post Result Card
    postResultCard: {
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
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
        color: colors.text,
    },
    postResultTime: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 1,
    },
    postMetaLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 1,
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textTertiary,
    },
    postTypeBadge: {
        maxWidth: 118,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    postTypeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6366F1',
    },
    postResultContent: {
        fontSize: 14,
        color: colors.text,
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
        color: colors.textSecondary,
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
        color: '#0F766E',
        fontWeight: '700',
    },
    relevanceTrack: {
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: isDark ? 'rgba(148, 163, 184, 0.18)' : '#E2E8F0',
        marginTop: 12,
    },
    relevanceFill: {
        height: '100%',
        borderRadius: 2,
    },

    // User Result Card
    userResultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 14,
        marginBottom: 10,
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
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
        flexShrink: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    verifiedBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1D9BF0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rolePill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 5,
    },
    userResultRole: {
        fontSize: 12,
        fontWeight: '700',
    },
    peoplePreview: {
        marginBottom: 12,
    },
    peoplePreviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    peoplePreviewTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
    },
    peoplePreviewRow: {
        gap: 10,
        paddingRight: 4,
    },
    peoplePreviewCard: {
        width: 118,
        minHeight: 126,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        padding: 12,
    },
    peoplePreviewName: {
        width: '100%',
        marginTop: 8,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '800',
        color: colors.text,
    },
    peoplePreviewRole: {
        marginTop: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 6,
    },
    peoplePreviewRoleText: {
        fontSize: 11,
        fontWeight: '800',
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
        backgroundColor: isDark ? '#251A3D' : '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: 32,
    },

    // Recent Searches
    recentSection: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 150 : 160, // Account for blurred sticky header
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
        color: colors.text,
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
        borderBottomColor: colors.border,
    },
    recentText: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },

    // Suggestions
    suggestionsSection: {
        marginTop: 24,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    suggestionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    suggestionChip: {
        backgroundColor: isDark ? 'rgba(20, 184, 166, 0.12)' : '#ECFDF5',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(45, 212, 191, 0.28)' : '#A7F3D0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    suggestionChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#0F766E',
    },
    discoveryGrid: {
        marginTop: 22,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    discoveryTile: {
        width: '31%',
        minWidth: 96,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 10,
    },
    discoveryIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    discoveryLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.text,
    },

    // Post result title (for quiz/course/resource)
    postResultTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },

    // Quiz info box
    quizInfoBox: {
        backgroundColor: '#FFFBEB',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,

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
        color: colors.text,
    },
    pollMoreText: {
        fontSize: 12,
        color: '#7C3AED',
        fontWeight: '500',
        marginTop: 2,
    },
});
