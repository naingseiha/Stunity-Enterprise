import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { QuizListCard } from '@/components/quiz/QuizListCard';
import { EmptyState } from '@/components/common';
import { useThemeContext } from '@/contexts';
import {
  fetchMyJoinedQuizzesCached,
  getCachedJoinedQuizzes,
} from '@/lib/joinedQuizzesCache';
import { getLatestQuizAttempt, QuizItem } from '@/services/quiz';
import { Haptics } from '@/services/haptics';
import { normalizeQuiz } from '@/utils/quiz';

type StatusFilter = 'all' | 'passed' | 'failed';

const TEAL = '#09CFF7';
const TEAL_DARK = '#06A8CC';
const TEAL_LIGHT = '#E0F9FD';

const QuizCardSkeleton = React.memo(function QuizCardSkeleton() {
  const { colors, isDark } = useThemeContext();
  const skeletonStyles = React.useMemo(
    () => createSkeletonStyles(colors, isDark),
    [colors, isDark],
  );

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.accent} />
      <View style={skeletonStyles.body}>
        <View style={skeletonStyles.header}>
          <View style={skeletonStyles.icon} />
          <View style={skeletonStyles.titleBlock}>
            <View style={skeletonStyles.title} />
            <View style={skeletonStyles.subtitle} />
          </View>
        </View>
        <View style={skeletonStyles.statsRow}>
          <View style={skeletonStyles.stat} />
          <View style={skeletonStyles.stat} />
          <View style={skeletonStyles.stat} />
        </View>
        <View style={skeletonStyles.scoreBar} />
        <View style={skeletonStyles.actions}>
          <View style={skeletonStyles.action} />
          <View style={skeletonStyles.action} />
        </View>
      </View>
    </View>
  );
});

export default function MyJoinedQuizzesScreen() {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [quizzes, setQuizzes] = useState<QuizItem[]>(() => {
    const cached = getCachedJoinedQuizzes({ page: 1, limit: 20, status: 'all' });
    return cached?.data ?? [];
  });
  const [loading, setLoading] = useState(() => quizzes.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resultsLoadingId, setResultsLoadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const searchRef = useRef('');
  const statusRef = useRef<StatusFilter>('all');

  const load = useCallback(
    async (
      nextPage: number,
      query: string,
      nextStatus: StatusFilter,
      options: { reset?: boolean; force?: boolean } = {},
    ) => {
      const requestId = ++requestIdRef.current;
      const { reset = false, force = false } = options;

      if (nextPage === 1) {
        if (reset) setRefreshing(true);
        else setLoading(true);
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      try {
        const result = await fetchMyJoinedQuizzesCached(
          {
            page: nextPage,
            limit: 20,
            search: query || undefined,
            status: nextStatus,
          },
          { force },
        );

        if (requestId !== requestIdRef.current) return;

        setQuizzes((prev) => (nextPage === 1 ? result.data : [...prev, ...result.data]));
        setPage(nextPage);
        pageRef.current = nextPage;
        const nextHasMore = nextPage < result.pagination.pages;
        setHasMore(nextHasMore);
        hasMoreRef.current = nextHasMore;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [],
  );

  React.useEffect(() => {
    searchRef.current = search;
    statusRef.current = status;
  }, [search, status]);

  useFocusEffect(
    useCallback(() => {
      const cached = getCachedJoinedQuizzes({
        page: 1,
        limit: 20,
        search: searchRef.current || undefined,
        status: statusRef.current,
      });
      if (cached?.data.length) {
        setQuizzes(cached.data);
        setLoading(false);
      }
      load(1, searchRef.current, statusRef.current, { force: false });
    }, [load]),
  );

  const onSearchChange = (value: string) => {
    setSearch(value);
    searchRef.current = value;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      pageRef.current = 1;
      hasMoreRef.current = true;
      setHasMore(true);
      load(1, value, statusRef.current, { force: true });
    }, 400);
  };

  const onStatusChange = (next: StatusFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus(next);
    statusRef.current = next;
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    load(1, searchRef.current, next, { force: true });
  };

  const onRefresh = useCallback(() => {
    load(1, searchRef.current, statusRef.current, { reset: true, force: true });
  }, [load]);

  const onEndReached = useCallback(() => {
    if (loadingMoreRef.current || !hasMoreRef.current || loading) return;
    load(pageRef.current + 1, searchRef.current, statusRef.current, { force: false });
  }, [load, loading]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleQuizPress = useCallback(
    (quiz: QuizItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('QuizDetails', { quiz });
    },
    [navigation],
  );

  const handleViewResults = useCallback(
    async (quiz: QuizItem) => {
      if (resultsLoadingId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setResultsLoadingId(quiz.id);

      try {
        const attempt = await getLatestQuizAttempt(quiz.id);
        if (!attempt) return;
        const normalized = normalizeQuiz(quiz);
        navigation.navigate('QuizResults', {
          quiz: normalized,
          viewMode: true,
          score: attempt.score,
          passed: attempt.passed,
          pointsEarned: attempt.pointsEarned,
          results: attempt.results,
          answers: attempt.answers,
        });
      } catch {
        navigation.navigate('QuizDetails', { quiz });
      } finally {
        setResultsLoadingId(null);
      }
    },
    [navigation, resultsLoadingId],
  );

  const renderItem = useCallback(
    ({ item }: { item: QuizItem }) => (
      <QuizListCard
        item={item}
        onPress={handleQuizPress}
        onViewResults={handleViewResults}
        isLoadingResults={resultsLoadingId === item.id}
      />
    ),
    [handleQuizPress, handleViewResults, resultsLoadingId],
  );

  const keyExtractor = useCallback((item: QuizItem) => item.id, []);
  const getItemType = useCallback(
    (item: QuizItem) => (item.userAttempt?.passed ? 'passed' : 'failed'),
    [],
  );

  const filters: { id: StatusFilter; labelKey: string }[] = [
    { id: 'all', labelKey: 'quiz.myJoined.filters.all' },
    { id: 'passed', labelKey: 'quiz.myJoined.filters.passed' },
    { id: 'failed', labelKey: 'quiz.myJoined.filters.failed' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={TEAL_DARK} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t('quiz.myJoined.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('quiz.myJoined.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('quiz.myJoined.searchPlaceholder')}
            placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'}
            value={search}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity
              onPress={() => onSearchChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filtersRow}>
          {filters.map((filter) => {
            const active = status === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => onStatusChange(filter.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {t(filter.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && quizzes.length === 0 ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </View>
        ) : (
          <FlashList
            data={quizzes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            estimatedItemSize={280}
            drawDistance={400}
            getItemType={getItemType}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.35}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <EmptyState
                icon="library-outline"
                title={t('quiz.myJoined.emptyTitle')}
                message={t('quiz.myJoined.emptyMessage')}
              />
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <View style={styles.footerSpinner} />
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const createSkeletonStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 12,
      marginBottom: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    accent: {
      height: 3,
      backgroundColor: isDark ? colors.skeleton : '#E0F9FD',
    },
    body: { padding: 16, gap: 12 },
    header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? colors.skeleton : '#F1F5F9',
    },
    titleBlock: { flex: 1, gap: 8 },
    title: {
      height: 16,
      borderRadius: 8,
      backgroundColor: isDark ? colors.skeleton : '#F1F5F9',
    },
    subtitle: {
      height: 12,
      width: '40%',
      borderRadius: 6,
      backgroundColor: isDark ? colors.skeleton : '#F1F5F9',
    },
    statsRow: { flexDirection: 'row', gap: 8 },
    stat: {
      flex: 1,
      height: 72,
      borderRadius: 14,
      backgroundColor: isDark ? colors.skeleton : '#F1F5F9',
    },
    scoreBar: {
      height: 40,
      borderRadius: 50,
      backgroundColor: isDark ? colors.skeleton : '#F1F5F9',
    },
    actions: { flexDirection: 'row', gap: 8 },
    action: {
      flex: 1,
      height: 44,
      borderRadius: 50,
      backgroundColor: isDark ? colors.skeleton : '#F1F5F9',
    },
  });

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
      backgroundColor: isDark ? 'rgba(9,207,247,0.18)' : TEAL_LIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 12,
      marginBottom: 10,
      minHeight: 48,
      backgroundColor: colors.card,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      padding: 0,
    },
    filtersRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: { backgroundColor: TEAL, borderColor: TEAL_DARK },
    filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    filterChipTextActive: { color: '#FFFFFF' },
    skeletonContainer: { flex: 1, paddingTop: 4 },
    listContent: { paddingBottom: 40 },
    footerLoader: { paddingVertical: 16, alignItems: 'center' },
    footerSpinner: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: TEAL,
      borderTopColor: 'transparent',
    },
  });
