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
import { getClubs, type Club } from '@/api/clubs';
import { getCourses, type LearnCourse } from '@/api/learn';
import { Post, PostType } from '@/types';
import { transformPosts } from '@/utils/transformPost';
import { formatRelativeTime, formatNumber } from '@/utils';
import { feedBodyPreferKhmer, feedTextStyle } from '@/config/feedTypography';
import { renderPostBodyText } from '@/utils/renderEmojiText';

const RECENT_SEARCHES_KEY = '@stunity_recent_searches';
const MAX_RECENT = 8;
const SEARCH_DEBOUNCE_MS = 180;
const SEARCH_CACHE_TTL_MS = 90 * 1000;
const SEARCH_POST_LIMIT = 24;
const SEARCH_USER_LIMIT = 12;
const SEARCH_REQUEST_TIMEOUT_MS = 12000;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type SearchScope = 'all' | 'posts' | 'people' | 'clubs' | 'courses';
type PostFilter = 'ALL' | Extract<PostType, 'COURSE' | 'QUIZ' | 'QUESTION' | 'RESOURCE' | 'TUTORIAL' | 'RESEARCH' | 'PROJECT'>;
type SortMode = 'top' | 'recent' | 'popular';
type SearchOptions = {
    allowEmpty?: boolean;
    includePeople?: boolean;
    includeClubs?: boolean;
    includeCourses?: boolean;
    saveRecent?: boolean;
};
type SearchCacheEntry = {
    posts: Post[];
    users: SearchUser[];
    clubs: Club[];
    courses: LearnCourse[];
    timestamp: number;
};

const POST_FILTERS: Array<{ key: PostFilter; labelKey: string; icon: IoniconName; color: string; bg: string }> = [
    { key: 'ALL', labelKey: 'all', icon: 'sparkles-outline', color: ColorScale.primary[700], bg: ColorScale.primary[50] },
    { key: 'COURSE', labelKey: 'course', icon: 'school-outline', color: ColorScale.primary[800], bg: ColorScale.primary[100] },
    { key: 'QUIZ', labelKey: 'quiz', icon: 'flash-outline', color: ColorScale.secondary[800], bg: ColorScale.secondary[100] },
    { key: 'QUESTION', labelKey: 'question', icon: 'help-circle-outline', color: ColorScale.teal[800], bg: ColorScale.teal[100] },
    { key: 'RESOURCE', labelKey: 'resource', icon: 'library-outline', color: ColorScale.teal[700], bg: ColorScale.teal[50] },
    { key: 'TUTORIAL', labelKey: 'tutorial', icon: 'play-circle-outline', color: ColorScale.secondary[700], bg: ColorScale.secondary[50] },
    { key: 'RESEARCH', labelKey: 'research', icon: 'flask-outline', color: ColorScale.primary[900], bg: ColorScale.primary[100] },
    { key: 'PROJECT', labelKey: 'project', icon: 'construct-outline', color: ColorScale.primary[600], bg: ColorScale.primary[50] },
];

const SORT_OPTIONS: Array<{ key: SortMode; labelKey: string; icon: IoniconName }> = [
    { key: 'top', labelKey: 'sortTop', icon: 'sparkles-outline' },
    { key: 'recent', labelKey: 'sortLatest', icon: 'time-outline' },
    { key: 'popular', labelKey: 'sortPopular', icon: 'flame-outline' },
];

const TOPIC_SUGGESTIONS = [
    'math',
    'physics',
    'examPrep',
    'essayWriting',
    'programming',
    'research',
    'scholarship',
    'studyGroup',
];

const getPostTypeMeta = (type: PostType | string) => {
    const match = POST_FILTERS.find(filter => filter.key === type);
    if (match) return { ...match, labelKey: `feed.postTypes.${match.labelKey.toLowerCase()}` };
    if (type === 'POLL') return { key: 'ALL' as const, labelKey: 'feed.postTypes.poll', icon: 'bar-chart-outline' as IoniconName, color: ColorScale.teal[800], bg: ColorScale.teal[100] };
    if (type === 'ASSIGNMENT') return { key: 'ALL' as const, labelKey: 'feed.postTypes.assignment', icon: 'clipboard-outline' as IoniconName, color: ColorScale.primary[700], bg: ColorScale.primary[50] };
    if (type === 'EXAM') return { key: 'ALL' as const, labelKey: 'feed.postTypes.exam', icon: 'document-text-outline' as IoniconName, color: ColorScale.secondary[800], bg: ColorScale.secondary[100] };
    return { key: 'ALL' as const, labelKey: 'common.post', icon: 'document-text-outline' as IoniconName, color: ColorScale.gray[700], bg: ColorScale.gray[100] };
};

const getRoleMeta = (role: string) => {
    if (role === 'TEACHER') return { labelKey: 'profile.roles.teacher', icon: 'school-outline' as IoniconName, color: ColorScale.primary[700], bg: ColorScale.primary[50] };
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') return { labelKey: 'profile.roles.admin', icon: 'shield-checkmark-outline' as IoniconName, color: ColorScale.primary[700], bg: ColorScale.primary[50] };
    if (role === 'STAFF') return { labelKey: 'profile.roles.staff', icon: 'briefcase-outline' as IoniconName, color: ColorScale.gray[700], bg: ColorScale.gray[100] };
    return { labelKey: 'profile.roles.student', icon: 'person-outline' as IoniconName, color: ColorScale.teal[700], bg: ColorScale.teal[50] };
};

const normalizePostTypeLabel = (label: string) =>
    label
        .toLowerCase()
        .replace(/(^|\s)\S/g, match => match.toUpperCase());

const getSearchCacheKey = (
    query: string,
    postType: PostFilter,
    includePeople: boolean,
    includeClubs: boolean,
    includeCourses: boolean,
) =>
    `${query.trim().toLowerCase()}::${postType}::${includePeople ? 'people' : 'posts'}::${includeClubs ? 'clubs' : '-'}::${includeCourses ? 'courses' : '-'}`;

interface SearchUser {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    role: string;
    isVerified?: boolean;
}

export default function SearchScreen() {
    const { t, i18n } = useTranslation();
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
    const [clubResults, setClubResults] = useState<Club[]>([]);
    const [courseResults, setCourseResults] = useState<LearnCourse[]>([]);
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

    const performSearch = useCallback(async (
        searchQuery: string,
        overrideType: PostFilter = selectedType,
        options: SearchOptions = {},
    ) => {
        const trimmedQuery = searchQuery.trim();
        const selectedPostType = overrideType !== 'ALL' ? overrideType : undefined;
        const shouldBrowseWithoutKeyword = options.allowEmpty || Boolean(selectedPostType);
        const shouldSearchPeople = Boolean(trimmedQuery) && (options.includePeople ?? true);
        const shouldSearchClubs = Boolean(trimmedQuery) && (options.includeClubs ?? true);
        const shouldSearchCourses = Boolean(trimmedQuery) && (options.includeCourses ?? true);

        if (!trimmedQuery && !shouldBrowseWithoutKeyword) {
            activeSearchControllerRef.current?.abort();
            setPostResults([]);
            setUserResults([]);
            setClubResults([]);
            setCourseResults([]);
            setHasSearched(false);
            setIsSearching(false);
            return;
        }

        const cacheKey = getSearchCacheKey(
            trimmedQuery,
            overrideType,
            shouldSearchPeople,
            shouldSearchClubs,
            shouldSearchCourses,
        );
        const cached = searchCacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
            activeSearchControllerRef.current?.abort();
            searchRequestIdRef.current += 1;
            setPostResults(cached.posts);
            setUserResults(cached.users);
            setClubResults(cached.clubs);
            setCourseResults(cached.courses);
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
            const [postsResponse, usersResponse, clubsResponse, coursesResponse] = await Promise.allSettled([
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
                shouldSearchClubs
                    ? getClubs({ discover: true, search: trimmedQuery, limit: 12 })
                    : Promise.resolve([] as Club[]),
                shouldSearchCourses
                    ? getCourses({ search: trimmedQuery, limit: 12 })
                    : Promise.resolve([] as LearnCourse[]),
            ]);

            if (requestId !== searchRequestIdRef.current || controller.signal.aborted) return;

            let nextPosts: Post[] = [];
            let nextUsers: SearchUser[] = [];
            let nextClubs: Club[] = [];
            let nextCourses: LearnCourse[] = [];
            if (postsResponse.status === 'fulfilled' && (postsResponse.value as any).data?.success) {
                const rawPosts = (postsResponse.value as any).data.data || [];
                nextPosts = transformPosts(rawPosts);
            }

            if (usersResponse.status === 'fulfilled' && (usersResponse.value as any).data?.success) {
                nextUsers = (usersResponse.value as any).data.data || (usersResponse.value as any).data.users || [];
            }

            if (clubsResponse.status === 'fulfilled' && Array.isArray(clubsResponse.value)) {
                nextClubs = clubsResponse.value;
            }

            if (coursesResponse.status === 'fulfilled' && Array.isArray(coursesResponse.value)) {
                nextCourses = coursesResponse.value;
            }

            setPostResults(nextPosts);
            setUserResults(nextUsers);
            setClubResults(nextClubs);
            setCourseResults(nextCourses);
            searchCacheRef.current.set(cacheKey, {
                posts: nextPosts,
                users: nextUsers,
                clubs: nextClubs,
                courses: nextCourses,
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
        setClubResults([]);
        setCourseResults([]);
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

    const handleClubPress = useCallback((clubId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('ClubsTab' as any, {
            screen: 'ClubDetails',
            params: { clubId },
        });
    }, [navigation]);

    const handleCoursePress = useCallback((courseId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('LearnTab' as any, {
            screen: 'CourseDetail',
            params: { courseId },
        });
    }, [navigation]);

    const renderPostResult = ({ item, index }: { item: Post; index: number }) => {
        const authorName = `${item.author.lastName || ''} ${item.author.firstName || ''}`.trim() || item.author.name || '';
        const isQuiz = item.postType === 'QUIZ';
        const isPoll = item.postType === 'POLL';
        const typeMeta = getPostTypeMeta(item.postType);
        const relevance = Math.max(0, Math.min(Math.round((item._score || 0) * 100), 100));
        const preferKhmer = feedBodyPreferKhmer(item.content, i18n.resolvedLanguage || i18n.language);

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
                                {t(typeMeta.labelKey || '')}
                            </Text>
                        </LinearGradient>
                    </View>

                    {item.title ? (
                        <Text style={styles.postResultTitle} numberOfLines={1}>{item.title}</Text>
                    ) : null}

                    {renderPostBodyText(
                        item.content,
                        [styles.postResultContent, feedTextStyle('body', { preferKhmer, color: colors.text })],
                        isQuiz || isPoll ? 2 : 3,
                    )}

                    {isQuiz && item.quizData && (() => {
                        const quiz = item.quizData;
                        const questionCount = quiz?.questions?.length || 0;
                        return (
                            <View style={styles.quizInfoBox}>
                                <View style={styles.quizInfoRow}>
                                    {questionCount > 0 && (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="help-circle" size={12} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{questionCount} {t('common.search.questionsCount')}</Text>
                                        </View>
                                    )}
                                    {quiz?.timeLimit ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="timer-outline" size={12} color="#D97706" />
                                            <Text style={styles.quizInfoText}>{quiz.timeLimit} {t('feed.time.m')}</Text>
                                        </View>
                                    ) : null}
                                    {quiz?.passingScore ? (
                                        <View style={styles.quizInfoChip}>
                                            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                                            <Text style={[styles.quizInfoText, { color: '#10B981' }]}>{t('feed.suggestions.passScore', { score: quiz.passingScore })}</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <TouchableOpacity style={styles.quizStartBtn} activeOpacity={0.8} onPress={() => handlePostPress(item)}>
                                    <Ionicons name="play" size={14} color="#fff" />
                                    <Text style={styles.quizStartText}>{t('feed.actions.takeQuiz')}</Text>
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
                                <Text style={styles.pollMoreText}>+{item.pollOptions.length - 2} {t('common.more')}</Text>
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
                        <Text style={[styles.peopleListRole, { color: roleMeta.color }]}>
                            {t(roleMeta.labelKey)}
                        </Text>
                    </View>
                    <View style={styles.userResultAction}>
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderClubResult = ({ item, index }: { item: Club; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 30).springify().damping(15)}>
            <TouchableOpacity
                style={styles.userResultCard}
                activeOpacity={0.9}
                onPress={() => handleClubPress(item.id)}
            >
                <View style={[styles.entityIconWrap, { backgroundColor: ColorScale.primary[50] }]}>
                    <Ionicons name="people-circle-outline" size={28} color={ColorScale.primary[700]} />
                </View>
                <View style={styles.userResultInfo}>
                    <Text style={styles.userResultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.entityMeta} numberOfLines={1}>
                        {item.subject || item.type?.replace(/_/g, ' ') || t('common.search.clubs')}
                        {typeof item.memberCount === 'number' ? ` · ${item.memberCount}` : ''}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderCourseResult = ({ item, index }: { item: LearnCourse; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 30).springify().damping(15)}>
            <TouchableOpacity
                style={styles.userResultCard}
                activeOpacity={0.9}
                onPress={() => handleCoursePress(item.id)}
            >
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.courseThumb} contentFit="cover" />
                ) : (
                    <View style={[styles.entityIconWrap, { backgroundColor: ColorScale.teal[50] }]}>
                        <Ionicons name="book-outline" size={24} color={ColorScale.teal[700]} />
                    </View>
                )}
                <View style={styles.userResultInfo}>
                    <Text style={styles.userResultName} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.entityMeta} numberOfLines={1}>
                        {item.category || item.level || t('common.search.courses')}
                        {typeof item.enrolledCount === 'number' ? ` · ${item.enrolledCount}` : ''}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderAllHeader = () => {
        if (activeScope !== 'all') return null;

        return (
            <View>
                {userResults.length > 0 && (
                    <Animated.View
                        entering={FadeInDown.springify()}
                        style={styles.peoplePreview}
                    >
                        <View style={styles.peoplePreviewHeader}>
                            <Text style={styles.peoplePreviewTitle}>{t('common.search.people')}</Text>
                            <TouchableOpacity onPress={() => setActiveScope('people')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={styles.seeAllText}>{t('common.search.seeAllPeople')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.peopleListCard}>
                            {userResults.slice(0, 4).map((user, index) => {
                                const name = `${user.lastName} ${user.firstName}`.trim();
                                const roleMeta = getRoleMeta(user.role);
                                return (
                                    <TouchableOpacity
                                        key={user.id}
                                        style={[
                                            styles.peopleListRow,
                                            index < Math.min(userResults.length, 4) - 1 && styles.peopleListRowBorder,
                                        ]}
                                        activeOpacity={0.75}
                                        onPress={() => handleUserPress(user.id)}
                                    >
                                        <Avatar uri={user.profilePictureUrl} name={name} size="md" variant="post" />
                                        <View style={styles.userResultInfo}>
                                            <Text style={styles.userResultName} numberOfLines={1}>{name}</Text>
                                            <Text style={[styles.peopleListRole, { color: roleMeta.color }]} numberOfLines={1}>
                                                {t(roleMeta.labelKey)}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                )}

                {clubResults.length > 0 && (
                    <View style={styles.entitySection}>
                        <View style={styles.peoplePreviewHeader}>
                            <Text style={styles.peoplePreviewTitle}>{t('common.search.clubs')}</Text>
                            <TouchableOpacity onPress={() => setActiveScope('clubs')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        {clubResults.slice(0, 3).map((club, index) => (
                            <View key={club.id}>{renderClubResult({ item: club, index })}</View>
                        ))}
                    </View>
                )}

                {courseResults.length > 0 && (
                    <View style={styles.entitySection}>
                        <View style={styles.peoplePreviewHeader}>
                            <Text style={styles.peoplePreviewTitle}>{t('common.search.courses')}</Text>
                            <TouchableOpacity onPress={() => setActiveScope('courses')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        {courseResults.slice(0, 3).map((course, index) => (
                            <View key={course.id}>{renderCourseResult({ item: course, index })}</View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const renderEmptyState = () => {
        if (isSearching) return null;
        if (
            activeScope === 'all' &&
            (userResults.length > 0 || clubResults.length > 0 || courseResults.length > 0)
        ) {
            return null;
        }

        if (hasSearched) {
            const noResultsSub = t('common.search.noResultsSub');
            const preferKhmer = feedBodyPreferKhmer(noResultsSub, i18n.resolvedLanguage || i18n.language);

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
                        {t('common.search.noResults')}
                    </Text>
                    <Text style={[styles.emptySubtitle, feedTextStyle('body', { preferKhmer, color: colors.textTertiary })]}>
                        {noResultsSub}
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
                            <Text style={styles.emptyPrimaryBtnText}>{t('common.browseCourses')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.emptyGhostBtn}
                            activeOpacity={0.8}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleClearQuery();
                            }}
                        >
                            <Text style={styles.emptyGhostBtnText}>{t('common.clearSearch')}</Text>
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
                {recentSearches.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.recentHeader}>
                            <Text style={styles.recentTitle}>
                                {t('common.search.recentSearches')}
                            </Text>
                            <TouchableOpacity onPress={clearRecentSearches} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={styles.clearText}>
                                    {t('common.search.clearAll')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.recentList}>
                            {recentSearches.map((term, index) => (
                                <View
                                    key={term}
                                    style={[
                                        styles.recentItem,
                                        index === recentSearches.length - 1 && styles.recentItemLast,
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.recentItemMain}
                                        onPress={() => handleRecentSearchPress(term)}
                                        activeOpacity={0.72}
                                    >
                                        <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
                                        <Text style={styles.recentText}>{term}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.recentRemoveBtn}
                                        onPress={() => removeRecentSearch(term)}
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                        accessibilityLabel="Remove from history"
                                    >
                                        <Ionicons name="close" size={18} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.suggestionsSection}>
                    <Text style={[styles.recentTitle, { marginBottom: 12 }]}>{t('common.search.trending')}</Text>
                    <View style={styles.suggestionChips}>
                        {TOPIC_SUGGESTIONS.map((chip) => (
                            <TouchableOpacity
                                key={chip}
                                style={styles.suggestionChip}
                                onPress={() => handleRecentSearchPress(chip)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.suggestionChipText}>{t(`feed.subjects.${chip}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.discoverySection}>
                    <Text style={[styles.recentTitle, { marginBottom: 12 }]}>{t('common.search.exploreByType')}</Text>
                    <View style={styles.discoveryGrid}>
                        {POST_FILTERS.slice(1, 5).map((filter) => (
                            <TouchableOpacity
                                key={filter.key}
                                style={styles.discoveryTile}
                                activeOpacity={0.86}
                                onPress={() => handleBrowseFilter(filter.key)}
                            >
                                <View style={[styles.discoveryIcon, { backgroundColor: filter.bg }]}>
                                    <Ionicons name={filter.icon} size={20} color={filter.color} />
                                </View>
                                <Text style={styles.discoveryLabel} numberOfLines={1}>
                                    {normalizePostTypeLabel(t(`feed.postTypes.${filter.labelKey.toLowerCase()}`))}
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

    const currentResults =
        activeScope === 'people'
            ? userResults
            : activeScope === 'clubs'
                ? clubResults
                : activeScope === 'courses'
                    ? courseResults
                    : sortedPostResults;
    const postCount = postResults.length;
    const userCount = userResults.length;
    const clubCount = clubResults.length;
    const courseCount = courseResults.length;
    const totalResults = postCount + userCount + clubCount + courseCount;
    const resultSummary =
        totalResults === 0
            ? t('common.search.noResultsYet')
            : t('common.search.resultsCompact', { total: totalResults });
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

    const scopeTabs = (
        [
            { key: 'all' as const, labelKey: 'everything', count: totalResults },
            { key: 'people' as const, labelKey: 'people', count: userCount },
            { key: 'posts' as const, labelKey: 'posts', count: postCount },
            { key: 'clubs' as const, labelKey: 'clubs', count: clubCount },
            { key: 'courses' as const, labelKey: 'courses', count: courseCount },
        ] as const
    );

    return (
        <View style={styles.container}>
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
                                    <Ionicons
                                        name="search"
                                        size={18}
                                        color={searchFocused ? colors.primary : colors.textTertiary}
                                    />
                                    <TextInput
                                        ref={inputRef}
                                        style={styles.searchInput}
                                        placeholder={t('common.search.placeholder')}
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
                                    {query.length > 0 && (
                                        <TouchableOpacity
                                            onPress={handleClearQuery}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={styles.clearInlineBtn}
                                        >
                                            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {hasSearched && (
                                <View style={styles.controlsBlock}>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.scopeTabRow}
                                    >
                                        {scopeTabs.map((scope) => {
                                            const active = activeScope === scope.key;
                                            return (
                                                <TouchableOpacity
                                                    key={scope.key}
                                                    style={styles.scopeTab}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setActiveScope(scope.key);
                                                    }}
                                                    activeOpacity={0.85}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.scopeTabLabel,
                                                            active && styles.scopeTabLabelActive,
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {t(`common.search.${scope.labelKey}`)}
                                                    </Text>
                                                    {scope.count > 0 && (
                                                        <Text
                                                            style={[
                                                                styles.scopeTabCount,
                                                                active && styles.scopeTabCountActive,
                                                            ]}
                                                        >
                                                            {scope.count}
                                                        </Text>
                                                    )}
                                                    {active && <View style={styles.scopeTabUnderline} />}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    {(activeScope === 'all' || activeScope === 'posts') && (
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
                                                            active && styles.filterChipActive,
                                                        ]}
                                                        onPress={() => handleFilterPress(filter.key)}
                                                        activeOpacity={0.85}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.filterChipText,
                                                                active && styles.filterChipTextActive,
                                                            ]}
                                                            numberOfLines={1}
                                                        >
                                                            {normalizePostTypeLabel(
                                                                t(`feed.postTypes.${filter.labelKey.toLowerCase()}`),
                                                            )}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    )}

                                    <View style={styles.metaRow}>
                                        <Text style={styles.resultSummary} numberOfLines={1}>
                                            {resultSummary}
                                        </Text>
                                        {(activeScope === 'all' || activeScope === 'posts') && (
                                            <View style={styles.sortTrack}>
                                                {SORT_OPTIONS.map((option) => {
                                                    const active = sortMode === option.key;
                                                    return (
                                                        <TouchableOpacity
                                                            key={option.key}
                                                            style={[
                                                                styles.sortSegment,
                                                                active && styles.sortSegmentActive,
                                                            ]}
                                                            onPress={() => handleSortPress(option.key)}
                                                            activeOpacity={0.85}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.sortSegmentLabel,
                                                                    active && styles.sortSegmentLabelActive,
                                                                ]}
                                                            >
                                                                {t(`common.search.${option.labelKey}`)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
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
                        renderItem={
                            (activeScope === 'people'
                                ? renderUserResult
                                : activeScope === 'clubs'
                                    ? renderClubResult
                                    : activeScope === 'courses'
                                        ? renderCourseResult
                                        : renderPostResult) as any
                        }
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingBottom: 40 + insets.bottom + 8,
                            paddingTop: stickyHeaderHeight + (activeScope === 'all' || activeScope === 'posts' ? 8 : 12),
                        }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={renderEmptyState}
                        ListHeaderComponent={renderAllHeader}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        estimatedItemSize={
                            activeScope === 'people' || activeScope === 'clubs' || activeScope === 'courses'
                                ? 86
                                : 178
                        }
                        getItemType={(item) =>
                            activeScope === 'people'
                                ? 'USER'
                                : activeScope === 'clubs'
                                    ? 'CLUB'
                                    : activeScope === 'courses'
                                        ? 'COURSE'
                                        : item.postType || 'POST'
                        }
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
        paddingTop: 4,
        paddingBottom: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 4,
    },
    searchBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInputInner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: isDark ? colors.surfaceVariant : ColorScale.gray[100],
        borderRadius: 14,
        paddingHorizontal: 12,
        minHeight: 44,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    searchInputInnerFocused: {
        borderColor: ColorScale.primary[200],
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#fff',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    clearInlineBtn: {
        padding: 2,
    },
    controlsBlock: {
        paddingBottom: 10,
        gap: 10,
    },
    scopeTabRow: {
        paddingHorizontal: 16,
        gap: 18,
        paddingTop: 2,
    },
    scopeTab: {
        paddingBottom: 10,
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    scopeTabLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textTertiary,
    },
    scopeTabLabelActive: {
        color: colors.text,
        fontWeight: '700',
    },
    scopeTabCount: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textTertiary,
        backgroundColor: isDark ? colors.surfaceVariant : ColorScale.gray[100],
        overflow: 'hidden',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        minWidth: 20,
        textAlign: 'center',
    },
    scopeTabCountActive: {
        color: colors.primary,
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.16)' : ColorScale.primary[50],
    },
    scopeTabUnderline: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 2.5,
        borderRadius: 2,
        backgroundColor: colors.primary,
    },
    filterRow: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: isDark ? colors.surfaceVariant : ColorScale.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.18)' : ColorScale.primary[50],
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    metaRow: {
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    resultSummary: {
        flexShrink: 1,
        fontSize: 13,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    sortTrack: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceVariant : ColorScale.gray[100],
        borderRadius: 10,
        padding: 2,
    },
    sortSegment: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    sortSegmentActive: {
        backgroundColor: colors.card,
        shadowColor: '#0F172A',
        shadowOpacity: isDark ? 0 : 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: isDark ? 0 : 1,
    },
    sortSegmentLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textTertiary,
    },
    sortSegmentLabelActive: {
        color: colors.text,
        fontWeight: '700',
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
        borderRadius: 9999,
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
        borderRadius: 9999,
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
        borderRadius: 16,
        padding: 14,
        marginBottom: 8,
        gap: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    entityIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    courseThumb: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: colors.surfaceVariant,
    },
    entityMeta: {
        marginTop: 4,
        fontSize: 12,
        color: colors.textTertiary,
        textTransform: 'capitalize',
    },
    entitySection: {
        marginBottom: 18,
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
        fontSize: 15,
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
    userResultAction: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
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
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    peoplePreviewTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.2,
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    peopleListCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    peopleListRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    peopleListRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    peopleListRole: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
    },

    // Recent Section
    recentSection: {
        flex: 1,
    },
    sectionContainer: {
        marginBottom: 28,
        paddingHorizontal: 16,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    recentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.2,
    },
    clearText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    recentList: {
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    recentItemLast: {
        borderBottomWidth: 0,
    },
    recentItemMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    recentRemoveBtn: {
        paddingRight: 14,
        paddingVertical: 10,
    },
    recentText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },

    // Suggestions Section
    suggestionsSection: {
        marginBottom: 28,
        paddingHorizontal: 16,
    },
    suggestionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 0,
    },
    suggestionChip: {
        backgroundColor: colors.card,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    suggestionChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    // Discovery Section
    discoverySection: {
        marginBottom: 28,
        paddingHorizontal: 16,
    },
    discoveryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    discoveryTile: {
        width: '48%',
        flexGrow: 1,
        borderRadius: 14,
        backgroundColor: colors.card,
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    discoveryIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    discoveryLabel: {
        fontSize: 13,
        fontWeight: '700',
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
        borderRadius: 9999,
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
        borderRadius: 9999,
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
        borderRadius: 9999,
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
        textAlign: 'center',
        paddingHorizontal: 40,
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
        borderRadius: 9999,
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
        borderRadius: 9999,
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
