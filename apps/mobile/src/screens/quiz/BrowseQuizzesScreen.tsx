import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * BrowseQuizzesScreen — Optimized for performance
 *
 * Perf changes (mirrors FeedScreen patterns):
 * - FlatList → FlashList (cell recycling, 120fps capable)
 * - estimatedItemSize for immediate layout measurement
 * - drawDistance pre-renders off-screen cells
 * - getItemType bucketing by quiz shape (with/without attempt)
 * - QuizCard extracted as React.memo component
 * - All event handlers wrapped in useCallback
 * - Skeleton loading on initial load instead of full-page ActivityIndicator
 * - removeClippedSubviews on Android only
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Haptics } from '@/services/haptics';
import { useTranslation } from 'react-i18next';

import { browseQuizzes, QuizItem } from '@/services/quiz';
import { useThemeContext } from '@/contexts';

const TEAL      = '#09CFF7';
const TEAL_DARK = '#06A8CC';
const TEAL_LIGHT= '#E0F9FD';

const CATEGORIES = [
  { id: 'ALL',         labelKey: 'quiz.browse.categories.all',        icon: 'apps-outline'       },
  { id: 'Mathematics', labelKey: 'quiz.browse.categories.math',       icon: 'calculator-outline' },
  { id: 'Science',     labelKey: 'quiz.browse.categories.science',    icon: 'flask-outline'      },
  { id: 'Literature',  labelKey: 'quiz.browse.categories.literature', icon: 'book-outline'       },
  { id: 'History',     labelKey: 'quiz.browse.categories.history',    icon: 'time-outline'       },
  { id: 'Technology',  labelKey: 'quiz.browse.categories.tech',       icon: 'code-slash-outline' },
  { id: 'Language',    labelKey: 'quiz.browse.categories.language',   icon: 'language-outline'   },
];

// ─── Skeleton Card ──────────────────────────────────────────────────────────
const QuizCardSkeleton = React.memo(function QuizCardSkeleton() {
  const { colors, isDark } = useThemeContext();
  const skeletonStyles = React.useMemo(() => createSkeletonStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.header}>
        <View style={skeletonStyles.icon} />
        <View style={skeletonStyles.badge} />
      </View>
      <View style={skeletonStyles.title} />
      <View style={skeletonStyles.desc} />
      <View style={skeletonStyles.statsRow}>
        <View style={skeletonStyles.stat} />
        <View style={skeletonStyles.stat} />
        <View style={skeletonStyles.stat} />
      </View>
      <View style={skeletonStyles.cta} />
    </View>
  );
});

const createSkeletonStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  card:     { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginHorizontal: 12, marginBottom: 12, padding: 16 },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  icon:     { width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? colors.skeleton : '#F1F5F9' },
  badge:    { width: 64, height: 24, borderRadius: 12, backgroundColor: isDark ? colors.skeleton : '#F1F5F9' },
  title:    { height: 16, borderRadius: 8, backgroundColor: isDark ? colors.skeleton : '#F1F5F9', marginBottom: 8 },
  desc:     { height: 12, borderRadius: 6, backgroundColor: isDark ? colors.skeleton : '#F1F5F9', width: '70%', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stat:     { width: 56, height: 18, borderRadius: 9, backgroundColor: isDark ? colors.skeleton : '#F1F5F9' },
  cta:      { height: 42, borderRadius: 12, backgroundColor: isDark ? colors.skeleton : '#F1F5F9' },
});

// ─── Quiz Card (memoized) ──────────────────────────────────────────────────
interface QuizCardProps {
  item: QuizItem;
  onPress: (quiz: QuizItem) => void;
  t: (key: string, options?: Record<string, any>) => string;
}

const QuizCard = React.memo(function QuizCard({ item, onPress, t }: QuizCardProps) {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const questionCount = item.questions?.length || 0;
  const hasAttempt    = !!item.userAttempt;

  return (
    <TouchableOpacity
      style={styles.quizCard}
      onPress={() => onPress(item)}
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
            <Ionicons name="document-text-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.quizStatText}>{t('quiz.dashboard.questionsShort', { count: questionCount })}</Text>
          </View>
          {item.timeLimit ? (
            <View style={styles.quizStat}>
              <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.quizStatText}>{item.timeLimit}<AutoI18nText i18nKey="auto.mobile.screens_quiz_BrowseQuizzesScreen.k_6409bad8" /></Text>
            </View>
          ) : null}
          <View style={styles.quizStat}>
            <Ionicons name="star-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.quizStatText}>{t('quiz.takeQuiz.ptsWithCount', { count: item.totalPoints })}</Text>
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
          <Ionicons name={hasAttempt ? 'refresh' : 'play-circle'} size={16} color="#FFFFFF" />
          <Text style={styles.ctaText}>{hasAttempt ? t('quiz.dashboard.retake') : t('quiz.browse.startQuiz')}</Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function BrowseQuizzesScreen() {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();

  const initialCategory = route.params?.category || 'ALL';
  const initialSearch   = route.params?.search   || '';
  const classId         = route.params?.classId;

  const [search,           setSearch]           = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [quizzes,          setQuizzes]          = useState<QuizItem[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [page,             setPage]             = useState(1);
  const [hasMore,          setHasMore]          = useState(true);

  const searchTimeout    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRequestId = useRef(0);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  // ── Data loading ──────────────────────────────────────────────────────
  const load = useCallback(async (newPage: number, cat: string, q: string, reset = false) => {
    const requestId = ++currentRequestId.current;
    if (newPage === 1) setLoading(true);
    else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    try {
      const result = await browseQuizzes({
        category: cat !== 'ALL' ? cat : undefined,
        search:   q || undefined,
        classId:  classId || undefined,
        page:     newPage,
        limit:    15,
      });

      if (requestId !== currentRequestId.current) return; // Stale request

      setQuizzes((prev) => (reset || newPage === 1 ? result.data : [...prev, ...result.data]));
      const nextHasMore = newPage < result.pagination.pages;
      setHasMore(nextHasMore);
      hasMoreRef.current = nextHasMore;
      setPage(newPage);
      pageRef.current = newPage;
    } catch (e) {
      console.warn('[BrowseQuizzes] Load error:', e);
    } finally {
      if (requestId === currentRequestId.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    load(1, selectedCategory, search, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCategoryChange = useCallback((cat: string) => {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    load(1, cat, search, true);
  }, [load, search]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      pageRef.current = 1;
      setHasMore(true);
      hasMoreRef.current = true;
      load(1, selectedCategory, text, true);
    }, 500);
  }, [load, selectedCategory]);

  const loadMore = useCallback(() => {
    if (!loadingMoreRef.current && hasMoreRef.current) {
      loadingMoreRef.current = true;
      load(pageRef.current + 1, selectedCategory, search);
    }
  }, [load, selectedCategory, search]);

  const handleQuizPress = useCallback((quiz: QuizItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('TakeQuiz', { quiz });
  }, [navigation]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  // ── Render helpers ────────────────────────────────────────────────────
  const renderQuizCard = useCallback(
    ({ item }: { item: QuizItem }) => <QuizCard item={item} onPress={handleQuizPress} t={t} />,
    [handleQuizPress, t]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <View style={styles.footerSpinner} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => (
    <View style={styles.centerBox}>
      <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
      <Text style={styles.emptyText}>{t('quiz.browse.noQuizzesFound')}</Text>
      <Text style={styles.emptySubText}>{t('quiz.browse.tryDifferentSearch')}</Text>
    </View>
  ), [t, colors.textTertiary]);

  // Bucket by attempt state so cells of similar height are recycled together
  const getItemType = useCallback((item: QuizItem) => (item.userAttempt ? 'attempted' : 'fresh'), []);
  const keyExtractor = useCallback((item: QuizItem) => item.id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={TEAL_DARK} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{classId ? t('quiz.browse.classQuizzes') : t('quiz.browse.browseQuizzes')}</Text>
            <Text style={styles.headerSubtitle}>{classId ? t('quiz.browse.quizzesForClass') : t('quiz.browse.findNextChallenge')}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('quiz.browse.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => handleCategoryChange(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={selectedCategory === cat.id ? '#FFFFFF' : colors.textTertiary}
              />
              <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quiz list */}
        {loading ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((i) => <QuizCardSkeleton key={i} />)}
          </View>
        ) : (
          // @ts-ignore FlashList types omit some valid props
          <FlashList
            data={quizzes}
            renderItem={renderQuizCard}
            keyExtractor={keyExtractor}
            estimatedItemSize={220}
            drawDistance={600}
            getItemType={getItemType}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            // iOS: removeClippedSubviews causes native layer hide/show jank — Android only
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => load(1, selectedCategory, search, true)}
                tintColor={TEAL}
                colors={[TEAL]}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea:  { flex: 1 },

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
  headerTitleContainer: { flex: 1 },
  headerTitle:    { fontSize: 20, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
  },
  categoryChipActive:     { backgroundColor: TEAL, borderColor: TEAL_DARK },
  categoryChipText:       { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  categoryChipTextActive: { color: '#FFFFFF' },

  skeletonContainer: {
    flex: 1,
    paddingTop: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText:    { fontSize: 17, fontWeight: '600', color: colors.textSecondary, marginTop: 8 },
  emptySubText: { fontSize: 14, color: colors.textTertiary },

  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TEAL,
    borderTopColor: 'transparent',
  },

  // Quiz cards
  quizCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  quizCardBody:   { padding: 16, gap: 12 },
  quizCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quizIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(9,207,247,0.18)' : TEAL_LIGHT,
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
  attemptBadgeText: { fontSize: 12, fontWeight: '700' },
  quizTitle:        { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
  quizDesc:         { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  quizStatsRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  quizStat:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quizStatText:     { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  tagChip:          { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: isDark ? 'rgba(9,207,247,0.16)' : TEAL_LIGHT },
  tagChipText:      { fontSize: 11, color: isDark ? '#67E8F9' : TEAL_DARK, fontWeight: '600' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  ctaText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
