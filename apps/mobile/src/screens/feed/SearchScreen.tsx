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
    ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeIn,
    FadeInDown,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Haptics } from '@/services/haptics';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Avatar } from '@/components/common';
import { useThemeContext } from '@/contexts';
import { ColorScale } from '@/config/theme';
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
    { key: 'ALL', label: 'All', icon: 'sparkles-outline', color: ColorScale.primary[700], bg: ColorScale.primary[50] },
    { key: 'COURSE', label: 'Courses', icon: 'school-outline', color: ColorScale.primary[800], bg: ColorScale.primary[100] },
    { key: 'QUIZ', label: 'Quizzes', icon: 'flash-outline', color: ColorScale.secondary[800], bg: ColorScale.secondary[100] },
    { key: 'QUESTION', label: 'Questions', icon: 'help-circle-outline', color: ColorScale.teal[800], bg: ColorScale.teal[100] },
    { key: 'RESOURCE', label: 'Resources', icon: 'library-outline', color: ColorScale.teal[700], bg: ColorScale.teal[50] },
    { key: 'TUTORIAL', label: 'Tutorials', icon: 'play-circle-outline', color: ColorScale.secondary[700], bg: ColorScale.secondary[50] },
    { key: 'RESEARCH', label: 'Research', icon: 'flask-outline', color: ColorScale.primary[900], bg: ColorScale.primary[100] },
    { key: 'PROJECT', label: 'Projects', icon: 'construct-outline', color: ColorScale.primary[600], bg: ColorScale.primary[50] },
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
    if (type === 'POLL') return { key: 'ALL' as const, label: 'Poll', icon: 'bar-chart-outline' as IoniconName, color: ColorScale.teal[800], bg: ColorScale.teal[100] };
    if (type === 'ASSIGNMENT') return { key: 'ALL' as const, label: 'Assignment', icon: 'clipboard-outline' as IoniconName, color: ColorScale.primary[700], bg: ColorScale.primary[50] };
    if (type === 'EXAM') return { key: 'ALL' as const, label: 'Exam', icon: 'document-text-outline' as IoniconName, color: ColorScale.secondary[800], bg: ColorScale.secondary[100] };
    return { key: 'ALL' as const, label: String(type || 'Post').replace(/_/g, ' '), icon: 'document-text-outline' as IoniconName, color: ColorScale.gray[700], bg: ColorScale.gray[100] };
};

const getRoleMeta = (role: string) => {
    if (role === 'TEACHER') return { label: 'Teacher', icon: 'school-outline' as IoniconName, color: ColorScale.primary[800], bg: ColorScale.primary[100] };
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') return { label: 'Admin', icon: 'shield-checkmark-outline' as IoniconName, color: ColorScale.primary[700], bg: ColorScale.primary[50] };
    if (role === 'STAFF') return { label: 'Staff', icon: 'briefcase-outline' as IoniconName, color: ColorScale.secondary[800], bg: ColorScale.secondary[100] };
    return { label: 'Student', icon: 'reader-outline' as IoniconName, color: ColorScale.teal[800], bg: ColorScale.teal[100] };
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
    const insets = useSafeAreaInsets();
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
    const [searchFocused, setSearchFocused] = useState(false);
    const [stickyHeaderHeight, setStickyHeaderHeight] = useState(
        insets.top + (Platform.OS === 'ios' ? 132 : 138),
    );

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchCacheRef = useRef<Map<string, SearchCacheEntry>>(new Map());
    const searchRequestIdRef = useRef(0);
    const activeSearchControllerRef = useRef<AbortController | null>(null);
    const loadingPulse = useSharedValue(0);

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
            loadingPulse.value = 0;
            return;
        }

        loadingPulse.value = withTiming(1, { duration: 650 });
        const interval = setInterval(() => {
            loadingPulse.value = loadingPulse.value === 0 ? withTiming(1, { duration: 650 }) : withTiming(0, { duration: 650 });
        }, 650);

        return () => clearInterval(interval);
    }, [isSearching]);

    const saveRecentSearch = useCallback(async (term: string) => {
        const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }, [recentSearches]);

    const clearRecentSearches = useCallback(async () => {
        setRecentSearches([]);
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    }, []);

    const removeRecentSearch = useCallback(async (term: string) => {
        const updated = recentSearches.filter((s) => s !== term);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }, [recentSearches]);

    const handleIdleScopePress = useCallback((scope: SearchScope) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveScope(scope);
        if (scope === 'posts' && !query.trim()) {
            setSelectedType('ALL');
        }
    }, [query]);

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
                if (__DEV__) { console.error('Search failed:', error); }
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
            <Animated.View 
                entering={FadeInDown.delay(index * 40).springify().damping(15)}
                layout={Layout.springify()}
            >
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
                        <LinearGradient 
                            colors={[typeMeta.bg, typeMeta.bg + 'CC'] as any}
                            style={styles.postTypeBadge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name={typeMeta.icon} size={11} color={typeMeta.color} />
                            <Text style={[styles.postTypeText, { color: typeMeta.color }]} numberOfLines={1}>
                                {normalizePostTypeLabel(typeMeta.label)}
                            </Text>
                        </LinearGradient>
                    </View>

                    {item.title ? (
                        <Text style={styles.postResultTitle} numberOfLines={1}>{item.title}</Text>
                    ) : null}

                    <Text style={styles.postResultContent} numberOfLines={isQuiz || isPoll ? 2 : 3}>
                        {item.content}
                    </Text>

                    {isQuiz && item.quizData && (() => {
                        const quiz = item.quizData;
                        const questionCount = quiz?.questions?.length || 0;
                        return (
                            <View style={styles.quizInfoBox}>
                                <View style={styles.quizInfoRow}>
                                    {questionCount > 0 && (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="help-circle" size={12} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{questionCount} <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_99c80c8a" /></Text>
                                        </View>
                                    )}
                                    {quiz?.timeLimit ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="timer-outline" size={12} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{quiz.timeLimit}<AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_e5af6899" /></Text>
                                        </View>
                                    ) : null}
                                    {quiz?.passingScore ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                                            <Text style={[styles.quizInfoText, { color: '#10B981' }]}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_e9cd1ebe" /> {quiz.passingScore}%</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <TouchableOpacity style={styles.quizStartBtn} activeOpacity={0.8} onPress={() => handlePostPress(item)}>
                                    <Ionicons name="play" size={14} color="#fff" />
                                    <Text style={styles.quizStartText}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_74c69c56" /></Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })()}

                    {isPoll && item.pollOptions && item.pollOptions.length > 0 && (
                        <View style={styles.pollPreview}>
                            {item.pollOptions.slice(0, 2).map((opt: any, i: number) => (
                                <View key={opt.id || i} style={styles.pollOptionRow}>
                                    <View style={styles.pollOptionDot} />
                                    <Text style={styles.pollOptionText} numberOfLines={1}>{opt.text}</Text>
                                </View>
                            ))}
                            {item.pollOptions.length > 2 && (
                                <Text style={styles.pollMoreText}>+{item.pollOptions.length - 2} <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_f016a8c3" /></Text>
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
                            <Ionicons name="stats-chart-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.postStatText}>{formatNumber(item.views || 0)}</Text>
                        </View>
                        {item.topicTags && item.topicTags.length > 0 && (
                            <View style={styles.postResultTags}>
                                {item.topicTags.slice(0, 2).map((tag, i) => (
                                    <View key={i} style={styles.tagBadge}>
                                        <Text style={styles.postResultTag}>#{tag}</Text>
                                    </View>
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
            <Animated.View 
                entering={FadeInDown.delay(index * 30).springify().damping(15)}
                layout={Layout.springify()}
            >
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
                                <LinearGradient 
                                    colors={['#0EA5E9', '#0284C7']}
                                    style={styles.verifiedBadge}
                                >
                                    <Ionicons name="checkmark" size={8} color="#fff" />
                                </LinearGradient>
                            )}
                        </View>
                        <View style={[styles.rolePill, { backgroundColor: roleMeta.bg }]}>
                            <Ionicons name={roleMeta.icon} size={11} color={roleMeta.color} />
                            <Text style={[styles.userResultRole, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                        </View>
                    </View>
                    <View style={styles.userResultAction}>
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderPeoplePreview = () => {
        if (activeScope !== 'all' || userResults.length === 0) return null;

        return (
            <Animated.View 
                entering={FadeInDown.springify()}
                style={styles.peoplePreview}
            >
                <View style={styles.peoplePreviewHeader}>
                    <Text style={styles.peoplePreviewTitle}>People</Text>
                    <TouchableOpacity onPress={() => setActiveScope('people')} style={styles.seeAllBtn}>
                        <Text style={styles.seeAllText}>See all</Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </TouchableOpacity>
                </View>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.peoplePreviewRow}
                    decelerationRate="fast"
                >
                    {userResults.slice(0, 8).map((user, index) => {
                        const name = `${user.lastName} ${user.firstName}`;
                        const roleMeta = getRoleMeta(user.role);
                        return (
                            <Animated.View
                                key={user.id}
                                entering={FadeIn.delay(index * 50)}
                            >
                                <TouchableOpacity
                                    style={styles.peoplePreviewCard}
                                    activeOpacity={0.86}
                                    onPress={() => handleUserPress(user.id)}
                                >
                                    <View style={styles.peoplePreviewAvatarWrap}>
                                        <Avatar uri={user.profilePictureUrl} name={name} size="md" variant="post" />
                                        {user.isVerified && (
                                            <View style={styles.verifiedBadgeSmall}>
                                                <Ionicons name="checkmark" size={6} color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.peoplePreviewName} numberOfLines={1}>{name}</Text>
                                    <View style={[styles.peoplePreviewRole, { backgroundColor: roleMeta.bg }]}>
                                        <Ionicons name={roleMeta.icon} size={9} color={roleMeta.color} />
                                        <Text style={[styles.peoplePreviewRoleText, { color: roleMeta.color }]} numberOfLines={1}>{roleMeta.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </ScrollView>
            </Animated.View>
        );
    };

    const renderEmptyState = () => {
        if (isSearching) return null;
        if (activeScope === 'all' && userResults.length > 0) return null;

        if (hasSearched) {
            return (
                <Animated.View style={styles.emptyContainer} entering={FadeInDown.springify()}>
                    <LinearGradient
                        colors={
                            isDark
                                ? [ColorScale.primary[900], '#0F172A']
                                : [ColorScale.primary[50], ColorScale.primary[100]]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.emptyIconRing}
                    >
                        <View style={[styles.emptyIconInner, { backgroundColor: colors.card }]}>
                            <Ionicons name="search" size={36} color={colors.primary} />
                        </View>
                    </LinearGradient>
                    <Text style={styles.emptyTitle}>
                        <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_d728da09" />
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_bb6d714c" />
                    </Text>
                    <View style={styles.emptyActions}>
                        <TouchableOpacity
                            style={styles.emptyPrimaryBtn}
                            activeOpacity={0.88}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleBrowseFilter('COURSE');
                            }}
                        >
                            <Ionicons name="compass-outline" size={18} color="#fff" />
                            <Text style={styles.emptyPrimaryBtnText}>Browse courses</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.emptyGhostBtn}
                            activeOpacity={0.8}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleClearQuery();
                            }}
                        >
                            <Text style={styles.emptyGhostBtnText}>Clear search</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            );
        }

        return null;
    };

    const renderRecentSearches = () => {
        if (hasSearched || query.length > 0) return null;

        const contentTop = stickyHeaderHeight + 8;
        const scrollBottomPad = insets.bottom + 56;

        return (
            <ScrollView
                style={styles.recentSection}
                contentContainerStyle={{
                    paddingTop: contentTop,
                    paddingBottom: scrollBottomPad,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled
            >
                <View style={styles.idleScopeSection}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.idleScopeRow}
                    >
                        {(
                            [
                                { key: 'all' as const, label: 'Everything', icon: 'layers-outline' as IoniconName },
                                { key: 'posts' as const, label: 'Posts', icon: 'newspaper-outline' as IoniconName },
                                { key: 'people' as const, label: 'People', icon: 'people-outline' as IoniconName },
                            ] as const
                        ).map((scope) => {
                            const active = activeScope === scope.key;
                            return (
                                <TouchableOpacity
                                    key={scope.key}
                                    style={[styles.idleScopeChip, active && styles.idleScopeChipActive]}
                                    onPress={() => handleIdleScopePress(scope.key)}
                                    activeOpacity={0.88}
                                >
                                    <Ionicons
                                        name={scope.icon}
                                        size={16}
                                        color={active ? colors.primary : colors.textTertiary}
                                    />
                                    <Text
                                        style={[
                                            styles.idleScopeChipText,
                                            active && styles.idleScopeChipTextActive,
                                        ]}
                                    >
                                        {scope.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {recentSearches.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.recentHeader}>
                            <Text style={styles.recentTitle}>
                                <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_986fbbfe" />
                            </Text>
                            <TouchableOpacity onPress={clearRecentSearches} style={styles.clearAllBtn}>
                                <Text style={styles.clearText}>
                                    <AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_f9d87fdb" />
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.recentList}>
                            {recentSearches.map((term) => (
                                <View key={term} style={styles.recentItem}>
                                    <TouchableOpacity
                                        style={styles.recentItemMain}
                                        onPress={() => handleRecentSearchPress(term)}
                                        activeOpacity={0.72}
                                    >
                                        <View style={styles.recentIconWrap}>
                                            <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                                        </View>
                                        <Text style={styles.recentText}>{term}</Text>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={16}
                                            color={colors.textTertiary}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.recentRemoveBtn}
                                        onPress={() => removeRecentSearch(term)}
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                        accessibilityLabel="Remove from history"
                                    >
                                        <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.suggestionsSection}>
                    <View style={styles.sectionTitleRow}>
                        <LinearGradient colors={[ColorScale.primary[400], ColorScale.primary[600]]} style={styles.trendingIcon}>
                            <Ionicons name="trending-up" size={12} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.recentTitle}>Trending topics</Text>
                    </View>
                    <View style={styles.suggestionChips}>
                        {TOPIC_SUGGESTIONS.map((chip, index) => (
                            <Animated.View key={chip} entering={FadeInDown.delay(index * 30)}>
                                <TouchableOpacity
                                    style={styles.suggestionChip}
                                    onPress={() => handleRecentSearchPress(chip)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.suggestionChipText}>{chip}</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </View>

                <View style={styles.discoverySection}>
                    <Text style={styles.recentTitle}>Explore by type</Text>
                    <View style={styles.discoveryGrid}>
                        {POST_FILTERS.slice(1, 7).map((filter) => (
                            <TouchableOpacity
                                key={filter.key}
                                style={styles.discoveryTile}
                                activeOpacity={0.86}
                                onPress={() => handleBrowseFilter(filter.key)}
                            >
                                <LinearGradient
                                    colors={[filter.bg, `${filter.bg}DD`] as [string, string]}
                                    style={styles.discoveryIcon}
                                >
                                    <Ionicons name={filter.icon} size={22} color={filter.color} />
                                </LinearGradient>
                                <Text style={styles.discoveryLabel} numberOfLines={2}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
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
    const resultSummary =
        postCount === 0 && userCount === 0
            ? 'No results yet'
            : `${postCount} post${postCount === 1 ? '' : 's'} · ${userCount} ${
                  userCount === 1 ? 'person' : 'people'
              }`;
    const skeletonAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: 0.45 + (loadingPulse.value * (0.88 - 0.45))
        };
    });

    const renderSearchLoadingOverlay = () => {
        const padTop = stickyHeaderHeight + 16;
        return (
        <BlurView
            intensity={Platform.OS === 'ios' ? 28 : 56}
            tint={isDark ? 'dark' : 'light'}
            style={styles.searchLoadingOverlay}
        >
            <View
                style={[
                    styles.searchLoadingContent,
                    { paddingTop: padTop },
                ]}
            >
                <View style={styles.searchLoadingPill}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}><AutoI18nText i18nKey="auto.mobile.screens_feed_SearchScreen.k_dc975d59" /></Text>
                </View>
                {[0, 1, 2].map((item) => (
                    <Animated.View key={item} style={[styles.searchSkeletonCard, skeletonAnimatedStyle]}>
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
    };

    return (
        <View style={styles.container}>
            {/* Search row: no card; controls card only after a search */}
            <View style={styles.headerSticky}>
                <View
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        if (h > 48) setStickyHeaderHeight(h);
                    }}
                >
                    <SafeAreaView edges={['top']}>
                        <View style={styles.headerSection}>
                            <View style={styles.searchRow}>
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    style={styles.searchBackBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                                </TouchableOpacity>
                                <View
                                    style={[
                                        styles.searchInputInner,
                                        searchFocused && styles.searchInputInnerFocused,
                                    ]}
                                >
                                    <TextInput
                                        ref={inputRef}
                                        style={styles.searchInput}
                                        placeholder={autoT('auto.mobile.screens_feed_SearchScreen.k_5bd00d2d')}
                                        placeholderTextColor={colors.textTertiary}
                                        value={query}
                                        onChangeText={handleQueryChange}
                                        returnKeyType="search"
                                        onSubmitEditing={handleSubmitSearch}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        onFocus={() => setSearchFocused(true)}
                                        onBlur={() => setSearchFocused(false)}
                                    />
                                </View>
                                {query.length > 0 ? (
                                    <TouchableOpacity
                                        onPress={handleClearQuery}
                                        style={styles.searchCircleBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close" size={22} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.searchCircleBtn}
                                        onPress={() => inputRef.current?.focus()}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="search" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {hasSearched && (
                                <View style={styles.searchControlsCard}>
                                    <LinearGradient
                                        colors={['transparent', colors.border, 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.searchStoryDivider}
                                    />
                                    <View style={styles.searchCardFooter}>
                                        <View style={styles.tabBarWrap}>
                                            <View style={styles.tabBar}>
                                        {(
                                            [
                                                {
                                                    key: 'all',
                                                    label: 'All',
                                                    count: postCount + userCount,
                                                    icon: 'sparkles-outline' as IoniconName,
                                                },
                                                {
                                                    key: 'posts',
                                                    label: 'Posts',
                                                    count: postCount,
                                                    icon: 'newspaper-outline' as IoniconName,
                                                },
                                                {
                                                    key: 'people',
                                                    label: 'People',
                                                    count: userCount,
                                                    icon: 'people-outline' as IoniconName,
                                                },
                                            ] as const
                                        ).map((scope) => {
                                            const active = activeScope === scope.key;
                                            return (
                                                <TouchableOpacity
                                                    key={scope.key}
                                                    style={[styles.tab, active && styles.tabActive]}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setActiveScope(scope.key);
                                                    }}
                                                    activeOpacity={0.88}
                                                >
                                                    {active ? (
                                                        <LinearGradient
                                                            colors={[ColorScale.primary[500], ColorScale.primary[600]]}
                                                            start={{ x: 0, y: 0 }}
                                                            end={{ x: 1, y: 1 }}
                                                            style={styles.tabGradientFill}
                                                        >
                                                            <Ionicons name={scope.icon} size={15} color="#fff" />
                                                            <Text style={styles.tabTextOnAccent} numberOfLines={1}>
                                                                {scope.label}
                                                                {scope.count > 0 ? ` · ${scope.count}` : ''}
                                                            </Text>
                                                        </LinearGradient>
                                                    ) : (
                                                        <View style={styles.tabInnerMuted}>
                                                            <Ionicons
                                                                name={scope.icon}
                                                                size={15}
                                                                color={colors.textTertiary}
                                                            />
                                                            <Text style={styles.tabTextMuted} numberOfLines={1}>
                                                                {scope.label}
                                                                {scope.count > 0 ? ` ${scope.count}` : ''}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                            </View>
                                        </View>
                                        {activeScope !== 'people' && (
                                            <View style={styles.filterShell}>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.filterRow}
                                            >
                                                {POST_FILTERS.map((filter) => {
                                                    const active = selectedType === filter.key;
                                                    return (
                                                        <TouchableOpacity
                                                            key={filter.key}
                                                            style={[
                                                                styles.filterChip,
                                                                active && {
                                                                    backgroundColor: filter.bg,
                                                                    borderColor: filter.color,
                                                                },
                                                            ]}
                                                            onPress={() => handleFilterPress(filter.key)}
                                                            activeOpacity={0.85}
                                                        >
                                                            <Ionicons
                                                                name={filter.icon}
                                                                size={14}
                                                                color={active ? filter.color : colors.textTertiary}
                                                            />
                                                            <Text
                                                                style={[
                                                                    styles.filterChipText,
                                                                    active && { color: filter.color },
                                                                ]}
                                                                numberOfLines={1}
                                                            >
                                                                {filter.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>
                                            <View style={styles.sortRow}>
                                                <Text style={styles.resultSummary} numberOfLines={1}>
                                                    {resultSummary}
                                                </Text>
                                                <View style={styles.sortCluster}>
                                                    {SORT_OPTIONS.map((option) => {
                                                        const active = sortMode === option.key;
                                                        return (
                                                            <TouchableOpacity
                                                                key={option.key}
                                                                style={[
                                                                    styles.sortPill,
                                                                    active && styles.sortPillActive,
                                                                ]}
                                                                onPress={() => handleSortPress(option.key)}
                                                                activeOpacity={0.85}
                                                            >
                                                                <Ionicons
                                                                    name={option.icon}
                                                                    size={13}
                                                                    color={
                                                                        active ? colors.primary : colors.textTertiary
                                                                    }
                                                                />
                                                                <Text
                                                                    style={[
                                                                        styles.sortPillLabel,
                                                                        active && styles.sortPillLabelActive,
                                                                    ]}
                                                                >
                                                                    {option.label}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        </View>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    </SafeAreaView>
                </View>
            </View>

            {/* Recent Searches (when no query) */}
            {renderRecentSearches()}

            {/* Results */}
            {hasSearched && (
                <View style={{ flex: 1, zIndex: 0 }}>
                    <FlashList
                        data={currentResults as any[]}
                        renderItem={activeScope === 'people' ? renderUserResult as any : renderPostResult as any}
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingBottom: 40 + insets.bottom + 8,
                            paddingTop: stickyHeaderHeight + (activeScope !== 'people' ? 8 : 12),
                        }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={renderEmptyState}
                        ListHeaderComponent={renderPeoplePreview}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        estimatedItemSize={activeScope === 'people' ? 86 : 178}
                        getItemType={(item) => (activeScope === 'people' ? 'USER' : item.postType || 'POST')}
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
    headerSticky: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: colors.background,
    },
    headerSection: {
        paddingTop: 8,
        paddingBottom: 4,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
    },
    searchBackBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    searchControlsCard: {
        backgroundColor: colors.card,
        marginHorizontal: 12,
        marginTop: 4,
        marginBottom: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    searchCircleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? colors.surfaceVariant : ColorScale.teal[50],
    },
    searchInputInner: {
        flex: 1,
        backgroundColor: isDark ? colors.surfaceVariant : ColorScale.teal[50],
        borderRadius: 24,
        paddingHorizontal: 16,
        justifyContent: 'center',
        minHeight: 44,
        borderWidth: 0,
    },
    searchInputInnerFocused: {
        borderWidth: 1,
        borderColor: isDark ? colors.primary : ColorScale.teal[100],
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : ColorScale.teal[50],
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        paddingVertical: 10,
    },
    searchStoryDivider: {
        height: 1,
        marginHorizontal: 16,
        marginTop: 2,
        marginBottom: 6,
    },
    searchCardFooter: {
        paddingBottom: 4,
    },

    // Tab Bar
    tabBarWrap: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    tabBar: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 999,
        gap: 6,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tab: {
        flex: 1,
        minHeight: 40,
        borderRadius: 999,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabActive: {},
    tabGradientFill: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 999,
    },
    tabTextOnAccent: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
    tabTextMuted: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textTertiary,
    },
    tabInnerMuted: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },

    filterShell: {
        paddingBottom: 12,
    },
    filterRow: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    sortRow: {
        marginTop: 12,
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
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sortCluster: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 6,
        maxWidth: '62%',
    },
    sortPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sortPillActive: {
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.18)' : ColorScale.primary[50],
        borderColor: colors.primary,
    },
    sortPillLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sortPillLabelActive: {
        color: colors.primary,
    },

    // Post Result Card
    postResultCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    postResultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    postResultAuthorInfo: {
        flex: 1,
    },
    postResultAuthor: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    postResultTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    postResultTime: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    postMetaLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textQuaternary || '#CBD5E1',
    },
    postTypeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    postTypeText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    postResultContent: {
        fontSize: 15,
        color: colors.text,
        lineHeight: 22,
        marginBottom: 12,
        opacity: 0.9,
    },
    postResultStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    postStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    postStatText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    postResultTags: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    tagBadge: {
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : ColorScale.primary[50],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    postResultTag: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: '800',
    },
    relevanceTrack: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
        marginTop: 14,
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
        borderRadius: 20,
        padding: 14,
        marginBottom: 10,
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
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
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
    },
    verifiedBadge: {
        width: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rolePill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        marginTop: 4,
    },
    userResultRole: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    userResultAction: {
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },

    // People Preview
    peoplePreview: {
        marginBottom: 20,
        marginTop: 4,
    },
    peoplePreviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    peoplePreviewTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.3,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.08)' : ColorScale.primary[50],
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    peoplePreviewRow: {
        gap: 12,
        paddingRight: 16,
    },
    peoplePreviewCard: {
        width: 120,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        padding: 16,
    },
    peoplePreviewAvatarWrap: {
        position: 'relative',
        marginBottom: 10,
    },
    verifiedBadgeSmall: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#0EA5E9',
        borderWidth: 1,
        borderColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    peoplePreviewName: {
        width: '100%',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    peoplePreviewRole: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    peoplePreviewRoleText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },

    // Recent Section
    recentSection: {
        flex: 1,
    },
    idleScopeSection: {
        marginBottom: 16,
        marginTop: 4,
        paddingHorizontal: 16,
    },
    idleScopeRow: {
        gap: 10,
        paddingRight: 8,
    },
    idleScopeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    idleScopeChipActive: {
        borderColor: colors.primary,
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : ColorScale.primary[50],
    },
    idleScopeChipText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    idleScopeChipTextActive: {
        color: colors.primary,
    },
    sectionContainer: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    recentTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.3,
    },
    clearAllBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
        borderWidth: 1,
        borderColor: colors.border,
    },
    clearText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366F1',
    },
    recentList: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 20,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    recentItemMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 12,
    },
    recentRemoveBtn: {
        paddingRight: 10,
        paddingVertical: 8,
    },
    recentIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    recentText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },

    // Suggestions Section
    suggestionsSection: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    trendingIcon: {
        width: 24,
        height: 24,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    suggestionChip: {
        backgroundColor: colors.card,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    suggestionChipText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
    },

    // Discovery Section
    discoverySection: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    discoveryGrid: {
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    discoveryTile: {
        width: '47%',
        borderRadius: 18,
        backgroundColor: colors.card,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    discoveryIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    discoveryLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
    },

    // Search Loading
    searchLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 8,
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.6)' : 'rgba(248, 250, 252, 0.7)',
    },
    searchLoadingContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    searchLoadingPill: {
        alignSelf: 'center',
        height: 42,
        paddingHorizontal: 18,
        marginBottom: 20,
        borderRadius: 999,
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    searchSkeletonCard: {
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchSkeletonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    searchSkeletonAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? '#334155' : '#E2E8F0',
    },
    searchSkeletonLines: {
        flex: 1,
        gap: 6,
    },
    searchSkeletonLineShort: {
        width: '50%',
        height: 12,
        borderRadius: 6,
        backgroundColor: isDark ? '#334155' : '#E2E8F0',
    },
    searchSkeletonLineTiny: {
        width: '30%',
        height: 10,
        borderRadius: 5,
        backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
    },
    searchSkeletonBadge: {
        width: 70,
        height: 28,
        borderRadius: 10,
        backgroundColor: isDark ? '#334155' : '#E2E8F0',
    },
    searchSkeletonLineFull: {
        width: '100%',
        height: 14,
        borderRadius: 7,
        backgroundColor: isDark ? '#334155' : '#E2E8F0',
        marginBottom: 10,
    },
    searchSkeletonLineMid: {
        width: '70%',
        height: 14,
        borderRadius: 7,
        backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
        marginBottom: 16,
    },
    searchSkeletonStats: {
        flexDirection: 'row',
        gap: 16,
    },
    searchSkeletonStat: {
        width: 40,
        height: 12,
        borderRadius: 6,
        backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
    },

    // Empty State
    emptyContainer: {
        paddingVertical: 56,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    emptyIconRing: {
        width: 108,
        height: 108,
        borderRadius: 54,
        padding: 4,
        marginBottom: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconInner: {
        width: 92,
        height: 92,
        borderRadius: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyActions: {
        marginTop: 22,
        width: '100%',
        maxWidth: 320,
        gap: 12,
    },
    emptyPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    emptyPrimaryBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    emptyGhostBtn: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.08)' : ColorScale.primary[50],
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyGhostBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    emptySubtitle: {
        fontSize: 15,
        color: colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 22,
    },

    // Quiz Info
    quizInfoBox: {
        backgroundColor: isDark ? 'rgba(217, 119, 6, 0.08)' : '#FFFBEB',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
    },
    quizInfoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    quizInfoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(217, 119, 6, 0.25)' : '#FDE68A',
    },
    quizInfoText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D97706',
    },
    quizStartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F59E0B',
        height: 38,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#D97706',
    },
    quizStartText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },

    // Poll Info
    pollPreview: {
        backgroundColor: isDark ? 'rgba(124, 58, 237, 0.08)' : '#F5F3FF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#EDE9FE',
    },
    pollOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    pollOptionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#7C3AED',
    },
    pollOptionText: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    pollMoreText: {
        fontSize: 12,
        color: '#7C3AED',
        fontWeight: '700',
        marginTop: 2,
        marginLeft: 18,
    },
});
