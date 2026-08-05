'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useState, useCallback, useRef, use, useMemo } from 'react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TokenManager } from '@/lib/api/auth';
import { 
  GRADE_SERVICE_URL, 
  SUBJECT_SERVICE_URL, 
  FEED_SERVICE_URL, 
  LEARN_SERVICE_URL 
} from '@/lib/api/config';
import { buildRouteDataCacheKey, writeRouteDataCache } from '@/lib/route-data-cache';
import {
  countPostRows,
  feedApiPostToPost,
  feedPostToCardData,
  flattenPosts,
  mergeFeedRows,
  parseFeedPayloadItems,
  type FeedRow,
} from '@/lib/feed-normalize';
import { isFeedCacheFresh, readFeedCache, writeFeedCache } from '@/lib/feed-cache';
import {
  FeedSuggestedCoursesStrip,
  FeedSuggestedQuizzesStrip,
  FeedSuggestedUsersStrip,
} from '@/components/feed/FeedSuggestionStrip';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import CreatePostModal, { CreatePostData } from '@/components/feed/CreatePostModal';
import PostCard from '@/components/feed/PostCard';
import EducationalValueModal, { EducationalValue } from '@/components/feed/EducationalValueModal';
import PostAnalyticsModal from '@/components/feed/PostAnalyticsModal';
import InsightsDashboard from '@/components/feed/InsightsDashboard';
import TrendingSection from '@/components/feed/TrendingSection';
import ActivityDashboard from '@/components/feed/ActivityDashboard';
import { FeedSkeletonList } from '@/components/feed/FeedPostSkeleton';
import LearningSpotlight from '@/components/feed/LearningSpotlight';
import StudyGroupsWidget from '@/components/feed/StudyGroupsWidget';
import UpcomingEventsWidget from '@/components/feed/UpcomingEventsWidget';
import TopContributorsWidget from '@/components/feed/TopContributorsWidget';
import LearningStreakWidget from '@/components/feed/LearningStreakWidget';
import QuickResourcesWidget from '@/components/feed/QuickResourcesWidget';
import PerformanceCard from '@/components/feed/PerformanceCard';
import { useEventStream, SSEEvent } from '@/hooks/useEventStream';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Image as ImageIcon,
  Send,
  Loader2,
  RefreshCw,
  FileText,
  BarChart3,
  Megaphone,
  HelpCircle,
  Lightbulb,
  Filter,
  Bookmark,
  Activity,
  Flame,
  Eye,
  Settings,
  Calendar,
  Bell,
  MessageCircle,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Zap,
  Trophy,
  Target,
  FolderOpen,
  Rocket,
  Microscope,
  UsersRound,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';

const FEED_API = FEED_SERVICE_URL;

type Post = ReturnType<typeof flattenPosts>[number];

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };
}

const normalizeWarmClub = <T extends { clubType?: string; type?: string; privacy?: string; mode?: string }>(club: T) => ({
  ...club,
  clubType: club.clubType || club.type || 'CASUAL_STUDY_GROUP',
  privacy: club.privacy || club.mode || 'PUBLIC',
});

const POST_TYPE_FILTERS = [
  { id: 'all', labelKey: 'filters.allPosts', icon: TrendingUp },
  { id: 'ARTICLE', labelKey: 'filters.articles', icon: FileText },
  { id: 'POLL', labelKey: 'filters.polls', icon: BarChart3 },
  { id: 'ANNOUNCEMENT', labelKey: 'filters.announcements', icon: Megaphone },
  { id: 'QUESTION', labelKey: 'filters.questions', icon: HelpCircle },
  { id: 'ACHIEVEMENT', labelKey: 'filters.achievements', icon: Award },
  { id: 'TUTORIAL', labelKey: 'filters.tutorials', icon: BookOpen },
  { id: 'RESOURCE', labelKey: 'filters.resources', icon: FolderOpen },
  { id: 'QUIZ', labelKey: 'filters.quizzes', icon: Trophy },
  { id: 'PROJECT', labelKey: 'filters.projects', icon: Rocket },
  { id: 'RESEARCH', labelKey: 'filters.research', icon: Microscope },
  { id: 'COLLABORATION', labelKey: 'filters.collaboration', icon: UsersRound },
  { id: 'CLUB_CREATED', labelKey: 'filters.studyClubs', icon: Users },
  { id: 'EVENT_CREATED', labelKey: 'filters.events', icon: Calendar },
];

const TEACHER_QUIZ_ANALYTICS_ROLES = new Set([
  'TEACHER',
  'ADMIN',
  'STAFF',
  'SCHOOL_ADMIN',
  'SUPER_ADMIN',
]);

const VIRTUALIZATION_DEFAULT_ITEM_HEIGHT = 520;
const VIRTUALIZATION_ITEM_GAP = 12;
const VIRTUALIZATION_THRESHOLD = 12;
const POSTS_PER_PAGE = 18;
const MAX_FEED_ROWS_IN_MEMORY = 800;
const FEED_FIRST_PAGE_TIMEOUT_MS = 12_000;
const FEED_NEXT_PAGE_TIMEOUT_MS = 9_000;
const FEED_WARM_PAGE2_DELAY_MS = 450;
const FEED_DESTINATION_WARM_DELAY_MS = 2_500;

const getFeedNextCursor = (data: any): string | null =>
  data?.nextCursor ?? data?.pagination?.nextCursor ?? data?.meta?.nextCursor ?? null;

const getFeedHasMore = (data: any, nextCursor: string | null, returnedCount: number) => {
  if (typeof data?.pagination?.hasMore === 'boolean') return data.pagination.hasMore;
  if (typeof data?.hasMore === 'boolean') return data.hasMore;
  if (typeof data?.meta?.hasMore === 'boolean') return data.meta.hasMore;
  return Boolean(nextCursor) || returnedCount >= POSTS_PER_PAGE;
};

type VirtualFeedEntry = { id: string; row: FeedRow };

function useVirtualizedFeedList<T extends { id: string }>(items: T[], enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserversRef = useRef<Map<string, ResizeObserver>>(new Map());
  const itemHeightsRef = useRef<Record<string, number>>({});
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(typeof window !== 'undefined' ? window.innerHeight : 800);
  const rangeRef = useRef({ start: 0, end: items.length });
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [rangeVersion, setRangeVersion] = useState(0);

  const measureItem = useCallback((id: string) => (node: HTMLDivElement | null) => {
    const existingObserver = resizeObserversRef.current.get(id);
    if (existingObserver) {
      existingObserver.disconnect();
      resizeObserversRef.current.delete(id);
    }

    if (!node || typeof window === 'undefined') {
      return;
    }

    const updateHeight = () => {
      const nextHeight = node.offsetHeight;
      if (!nextHeight || itemHeightsRef.current[id] === nextHeight) return;
      itemHeightsRef.current[id] = nextHeight;
      setLayoutVersion((value) => value + 1);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(node);
    resizeObserversRef.current.set(id, observer);
  }, []);

  useEffect(() => {
    const resizeObservers = resizeObserversRef.current;
    return () => {
      resizeObservers.forEach((observer) => observer.disconnect());
      resizeObservers.clear();
    };
  }, []);

  const computeRange = useCallback(() => {
    if (!enabled || items.length <= VIRTUALIZATION_THRESHOLD || typeof window === 'undefined') {
      const full = { start: 0, end: items.length };
      if (rangeRef.current.start !== full.start || rangeRef.current.end !== full.end) {
        rangeRef.current = full;
        setRangeVersion((v) => v + 1);
      }
      return;
    }

    const scrollY = scrollYRef.current;
    const viewportHeight = viewportHeightRef.current;
    const containerTop = containerRef.current
      ? window.scrollY + containerRef.current.getBoundingClientRect().top
      : 0;
    const relativeScrollTop = Math.max(0, scrollY - containerTop);
    const overscanPx = Math.max(viewportHeight * 1.75, VIRTUALIZATION_DEFAULT_ITEM_HEIGHT * 5);
    const startThreshold = Math.max(0, relativeScrollTop - overscanPx);
    const endThreshold = relativeScrollTop + viewportHeight + overscanPx;

    const itemSizes = items.map((item) => (itemHeightsRef.current[item.id] ?? VIRTUALIZATION_DEFAULT_ITEM_HEIGHT) + VIRTUALIZATION_ITEM_GAP);
    const prefixOffsets = new Array<number>(itemSizes.length + 1);
    prefixOffsets[0] = 0;
    for (let index = 0; index < itemSizes.length; index += 1) {
      prefixOffsets[index + 1] = prefixOffsets[index] + itemSizes[index];
    }

    let startIndex = 0;
    while (startIndex < items.length && prefixOffsets[startIndex + 1] < startThreshold) {
      startIndex += 1;
    }
    let endIndex = startIndex;
    while (endIndex < items.length && prefixOffsets[endIndex] < endThreshold) {
      endIndex += 1;
    }
    startIndex = Math.max(0, startIndex - 2);
    endIndex = Math.min(items.length, endIndex + 2);

    if (rangeRef.current.start !== startIndex || rangeRef.current.end !== endIndex) {
      rangeRef.current = { start: startIndex, end: endIndex };
      setRangeVersion((v) => v + 1);
    }
  }, [enabled, items]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let rafId = 0;
    const handleViewportChange = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        scrollYRef.current = window.scrollY;
        viewportHeightRef.current = window.innerHeight;
        computeRange();
      });
    };

    scrollYRef.current = window.scrollY;
    viewportHeightRef.current = window.innerHeight;
    computeRange();

    window.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [enabled, computeRange]);

  useEffect(() => {
    computeRange();
  }, [layoutVersion, computeRange]);

  const virtualState = useMemo(() => {
    void rangeVersion;
    void layoutVersion;

    if (!enabled || items.length <= VIRTUALIZATION_THRESHOLD) {
      return {
        visibleItems: items,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        isVirtualized: false,
      };
    }

    const { start: startIndex, end: endIndex } = rangeRef.current;
    const itemSizes = items.map((item) => (itemHeightsRef.current[item.id] ?? VIRTUALIZATION_DEFAULT_ITEM_HEIGHT) + VIRTUALIZATION_ITEM_GAP);
    let top = 0;
    for (let i = 0; i < startIndex; i += 1) top += itemSizes[i];
    let bottom = 0;
    for (let i = endIndex; i < items.length; i += 1) bottom += itemSizes[i];

    return {
      visibleItems: items.slice(startIndex, endIndex),
      topSpacerHeight: top,
      bottomSpacerHeight: bottom,
      isVirtualized: true,
    };
  }, [enabled, items, layoutVersion, rangeVersion]);

  return {
    containerRef,
    measureItem,
    ...virtualState,
  };
}

export default function FeedPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);

  const {
    locale
  } = params;

  const router = useRouter();
  const tFeed = useTranslations('feed');
  const tCommon = useTranslations('common');
  const tProfile = useTranslations('profile');
  const tSettings = useTranslations('settings');
  const tAuth = useTranslations('auth');
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [postTypeFilter, setPostTypeFilter] = useState('all');

  // Feed state — ranked `GET /posts/feed` (mixed posts + carousels) or chronological fallback
  const feedRowsLengthRef = useRef(0);
  const feedWarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchPostsInFlightRef = useRef(false);
  const fetchMorePostsRef = useRef<(() => Promise<void>) | null>(null);
  const nextRankedPageRef = useRef(2);
  const rankedCursorRef = useRef<string | null>(null);
  const [feedRows, setFeedRows] = useState<FeedRow[]>([]);
  feedRowsLengthRef.current = feedRows.length;
  const postsFromFeed = useMemo(() => flattenPosts(feedRows), [feedRows]);
  const [feedPaginationMode, setFeedPaginationMode] = useState<'ranked' | 'chrono'>('ranked');
  const [chronoCursor, setChronoCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [valuePostId, setValuePostId] = useState<string | null>(null);
  const [valuePostType, setValuePostType] = useState<string>('ARTICLE');
  const [isValueSubmitting, setIsValueSubmitting] = useState(false);
  const [createPostTypePreset, setCreatePostTypePreset] = useState<string>('ARTICLE');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Set<string>>(new Set());

  const updatePostInMainFeed = useCallback((postId: string, updater: (p: Post) => Post) => {
    setFeedRows((prev) =>
      prev.map((row) =>
        row.kind === 'post' && row.post.id === postId ? { ...row, post: updater(row.post) } : row
      )
    );
    setMyPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
    setBookmarkedPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
  }, []);

  const removePostFromMainFeed = useCallback((postId: string) => {
    setFeedRows((prev) => prev.filter((row) => row.kind !== 'post' || row.post.id !== postId));
  }, []);

  // Analytics state
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState<string | null>(null);

  // Real-time state
  const [newPostsAvailable, setNewPostsAvailable] = useState(0);
  const pendingPostsRef = useRef<Post[]>([]);
  const warmedRoutesRef = useRef<Set<string>>(new Set());

  // SSE Real-time event handler
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    console.log('📡 SSE Event:', event.type, event.data);

    switch (event.type) {
      case 'NEW_POST':
        // Fetch the new post and add to pending
        if (event.data.postId && event.data.authorId !== user?.id) {
          setNewPostsAvailable(prev => prev + 1);
        }
        break;

      case 'NEW_LIKE':
        // Update like count for the post
        if (event.data.postId) {
          updatePostInMainFeed(event.data.postId, (post) => ({
            ...post,
            likesCount: post.likesCount + 1,
          }));
        }
        break;

      case 'NEW_COMMENT':
        // Update comment count and refresh comments if expanded
        if (event.data.postId) {
          updatePostInMainFeed(event.data.postId, (post) => ({
            ...post,
            commentsCount: post.commentsCount + 1,
          }));
          // Refresh comments in real-time if this post's comments are expanded
          if (event.data.authorId !== user?.id) {
            fetchComments(event.data.postId);
          }
        }
        break;

      case 'POST_UPDATED':
        // Refresh the updated post
        if (event.data.postId) {
          fetchSinglePost(event.data.postId);
        }
        break;

      case 'POST_DELETED':
        // Remove the deleted post
        if (event.data.postId) {
          removePostFromMainFeed(event.data.postId);
          setMyPosts((prev) => prev.filter((post) => post.id !== event.data.postId));
        }
        break;
    }
  }, [user?.id, updatePostInMainFeed, removePostFromMainFeed]);

  // Connect to SSE for real-time updates
  const { isConnected, unreadCounts } = useEventStream(user?.id, {
    onEvent: handleSSEEvent,
    enabled: !!user?.id,
  });

  // Fetch a single post by ID
  const fetchSinglePost = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return null;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        const parsed = feedApiPostToPost(data.data);
        if (parsed) {
          setFeedRows((prev) =>
            prev.map((row) =>
              row.kind === 'post' && row.post.id === postId ? { ...row, post: parsed } : row
            )
          );
        }
        return data.data;
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
    }
    return null;
  };

  // Load new posts when user clicks the "new posts" banner
  const loadNewPosts = async () => {
    await fetchPosts({ refresh: true });
    setNewPostsAvailable(0);
    pendingPostsRef.current = [];
  };

  // Batch track post views (1 request instead of N)
  const trackPostViewsBatch = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) return;
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;
      // Best-effort: fire and forget, don't block UI
      fetch(`${FEED_API}/posts/views/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ postIds, source: 'feed' }),
      }).catch(() => {});
    } catch {
      // Silent fail - view tracking shouldn't break UX
    }
  }, []);

  const fetchWithTimeout = useCallback(async (url: string, token: string, timeoutMs: number) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  const fetchPosts = useCallback(async (opts?: { refresh?: boolean; silent?: boolean }) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;
    if (fetchPostsInFlightRef.current && !opts?.refresh) return;

    const userId = user?.id as string | undefined;
    const refresh = Boolean(opts?.refresh);
    let silent = Boolean(opts?.silent);

    // Stale-while-revalidate: paint cached feed immediately on cold open.
    if (userId && feedRowsLengthRef.current === 0) {
      const cached = readFeedCache(userId);
      if (cached?.rows?.length) {
        setFeedRows(cached.rows.slice(0, MAX_FEED_ROWS_IN_MEMORY));
        setFeedPaginationMode(cached.mode);
        if (cached.mode === 'chrono') setChronoCursor(cached.cursor);
        else rankedCursorRef.current = cached.cursor;
        setHasMore(true);
        if (!refresh && isFeedCacheFresh(userId)) {
          setLoadingPosts(false);
          return;
        }
        // Keep painted cache visible while we revalidate in the background.
        silent = true;
      }
    } else if (feedRowsLengthRef.current > 0 && refresh) {
      silent = true;
    }

    fetchPostsInFlightRef.current = true;
    if (!silent) setLoadingPosts(true);
    nextRankedPageRef.current = 2;
    rankedCursorRef.current = null;
    if (feedWarmTimerRef.current) {
      clearTimeout(feedWarmTimerRef.current);
      feedWarmTimerRef.current = null;
    }

    try {
      const rankedParams = new URLSearchParams({
        limit: String(POSTS_PER_PAGE),
        page: '1',
        mode: 'FOR_YOU',
        fields: 'minimal',
      });

      let res: Response | null = null;
      let data: any = null;
      try {
        res = await fetchWithTimeout(
          `${FEED_API}/posts/feed?${rankedParams}`,
          token,
          FEED_FIRST_PAGE_TIMEOUT_MS,
        );
        data = await res.json();
      } catch (rankedError) {
        console.warn('Ranked feed stalled, falling back to recent:', rankedError);
        data = { success: false };
      }

      let rows: FeedRow[] = data?.success ? parseFeedPayloadItems(data.data) : [];
      let mode: 'ranked' | 'chrono' = 'ranked';
      let nextCursor: string | null = null;

      if (!data?.success || countPostRows(rows) === 0) {
        res = await fetchWithTimeout(
          `${FEED_API}/posts?limit=${POSTS_PER_PAGE}&fields=minimal`,
          token,
          FEED_FIRST_PAGE_TIMEOUT_MS,
        );
        data = await res.json();
        if (data.success) {
          rows = parseFeedPayloadItems(data.data);
          mode = 'chrono';
          nextCursor = getFeedNextCursor(data);
          setFeedPaginationMode('chrono');
          setChronoCursor(nextCursor);
          setHasMore(getFeedHasMore(data, nextCursor, countPostRows(rows)));
        }
      } else {
        mode = 'ranked';
        nextCursor = getFeedNextCursor(data);
        setFeedPaginationMode('ranked');
        setChronoCursor(null);
        rankedCursorRef.current = nextCursor;
        setHasMore(getFeedHasMore(data, nextCursor, countPostRows(rows)));
      }

      if (data?.success) {
        const capped = rows.slice(0, MAX_FEED_ROWS_IN_MEMORY);
        setFeedRows(capped);
        if (userId) writeFeedCache(userId, capped, { mode, cursor: nextCursor });
        trackPostViewsBatch(flattenPosts(capped).slice(0, 5).map((p) => p.id));

        // Warm page 2 after first paint (mobile parity).
        if (getFeedHasMore(data, nextCursor, countPostRows(capped))) {
          feedWarmTimerRef.current = setTimeout(() => {
            feedWarmTimerRef.current = null;
            if (!loadingMoreRef.current) {
              void fetchMorePostsRef.current?.();
            }
          }, FEED_WARM_PAGE2_DELAY_MS);
        }
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      fetchPostsInFlightRef.current = false;
      setLoadingPosts(false);
    }
  }, [trackPostViewsBatch, fetchWithTimeout, user?.id]);

  const fetchMorePosts = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    const token = TokenManager.getAccessToken();
    if (!token) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      let res: Response;
      if (feedPaginationMode === 'chrono') {
        const cursorParam = chronoCursor ? `&cursor=${encodeURIComponent(chronoCursor)}` : '';
        res = await fetchWithTimeout(
          `${FEED_API}/posts?limit=${POSTS_PER_PAGE}&fields=minimal${cursorParam}`,
          token,
          FEED_NEXT_PAGE_TIMEOUT_MS,
        );
      } else {
        const rankedParams = new URLSearchParams({
          limit: String(POSTS_PER_PAGE),
          page: String(nextRankedPageRef.current),
          mode: 'FOR_YOU',
          fields: 'minimal',
        });
        if (rankedCursorRef.current) {
          rankedParams.set('cursor', rankedCursorRef.current);
        }
        res = await fetchWithTimeout(
          `${FEED_API}/posts/feed?${rankedParams}`,
          token,
          FEED_NEXT_PAGE_TIMEOUT_MS,
        );
      }

      const data = await res.json();
      if (data.success) {
        const incoming = parseFeedPayloadItems(data.data);
        setFeedRows((prev) => {
          const merged = mergeFeedRows(prev, incoming, MAX_FEED_ROWS_IN_MEMORY);
          if (user?.id) {
            writeFeedCache(user.id, merged, {
              mode: feedPaginationMode,
              cursor:
                feedPaginationMode === 'chrono'
                  ? getFeedNextCursor(data)
                  : getFeedNextCursor(data) ?? rankedCursorRef.current,
            });
          }
          return merged;
        });

        if (feedPaginationMode === 'chrono') {
          const nextCursor = getFeedNextCursor(data);
          setChronoCursor(nextCursor);
          setHasMore(getFeedHasMore(data, nextCursor, countPostRows(incoming)));
        } else {
          nextRankedPageRef.current += 1;
          const nextCursor = getFeedNextCursor(data);
          rankedCursorRef.current = nextCursor;
          setHasMore(getFeedHasMore(data, nextCursor, countPostRows(incoming)));
        }

        trackPostViewsBatch(flattenPosts(incoming).slice(0, 3).map((p) => p.id));
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, feedPaginationMode, chronoCursor, trackPostViewsBatch, fetchWithTimeout, user?.id]);

  fetchMorePostsRef.current = fetchMorePosts;

  const fetchMyPosts = useCallback(async () => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/my-posts?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const normalized = (Array.isArray(data.data) ? data.data : [])
          .map((raw: unknown) => feedApiPostToPost(raw))
          .filter(Boolean) as Post[];
        setMyPosts(normalized);
      }
    } catch (error) {
      console.error('Failed to fetch my posts:', error);
    }
  }, []);

  const fetchBookmarks = useCallback(async () => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/bookmarks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const normalized = (Array.isArray(data.data) ? data.data : [])
          .map((raw: unknown) => feedApiPostToPost(raw))
          .filter(Boolean) as Post[];
        setBookmarkedPosts(normalized);
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    }
  }, []);

  const prefetchFeedRoute = useCallback((href: string) => {
    if (!href || warmedRoutesRef.current.has(href)) return;
    warmedRoutesRef.current.add(href);
    router.prefetch(href);
  }, [router]);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);

    // Refresh user data from server (localStorage may have stale profile picture)
    const AUTH_API = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;
    
    // Fetch from Auth Service for basic verification and core data
    fetch(`${AUTH_API}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data?.user) {
          const freshUser = { ...userData.user, ...res.data.user };
          setUser(freshUser);
          TokenManager.setUserData(freshUser, res.data.school || userData.school);
        }
      })
      .catch(() => { });

    // Fetch from Feed Service for enriched profile data (like cover photo)
    fetch(`${FEED_API}/users/me/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.profile) {
          setUser((prev: any) => ({ ...prev, ...res.profile }));
        }
      })
      .catch(() => { });
  }, [locale, router]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchPosts();
    // Intentionally keyed by user id — avoid refetch loops when callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const staticRoutes = [
      `/${locale}/profile/me`,
      `/${locale}/clubs`,
      `/${locale}/events`,
      `/${locale}/learn`,
      `/${locale}/leaderboard`,
      `/${locale}/live-quiz/join`,
    ];
    const authorRoutes = postsFromFeed.slice(0, 6).map((post) => `/${locale}/profile/${post.author.id}`);
    const postRoutes = postsFromFeed.slice(0, 6).map((post) => `/${locale}/feed/post/${post.id}`);
    const clubRoutes = postsFromFeed
      .map((post) => post.studyClubId ? `/${locale}/clubs/${post.studyClubId}` : null)
      .filter((route): route is string => Boolean(route))
      .slice(0, 4);

    const routesToWarm = Array.from(new Set([
      ...staticRoutes,
      ...authorRoutes,
      ...postRoutes,
      ...clubRoutes,
    ]));

    const warmRoutes = () => {
      routesToWarm.forEach(prefetchFeedRoute);
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(warmRoutes, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmRoutes, 250);
    return () => window.clearTimeout(timeoutId);
  }, [locale, postsFromFeed, prefetchFeedRoute, user]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;

    const sessionKey = `stunity:feed-destination-data-warmed:${user.id}`;
    if (sessionStorage.getItem(sessionKey) === 'true') return;

    const warmDestinationData = async () => {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      sessionStorage.setItem(sessionKey, 'true');

      const headers = { Authorization: `Bearer ${token}` };
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [
        myClubsRes,
        clubTypesRes,
        discoverClubsRes,
        eventsRes,
        upcomingEventsRes,
        coursesRes,
        enrolledCoursesRes,
        createdCoursesRes,
        learningPathsRes,
        learningStatsRes,
        subjectsRes,
        gradesRes,
      ] = await Promise.allSettled([
        fetch(`${FEED_API}/clubs?limit=20`, { headers }),
        fetch(`${FEED_API}/clubs/types`, { headers }),
        fetch(`${FEED_API}/clubs/discover?limit=20`, { headers }),
        fetch(`${FEED_API}/calendar?limit=20&startAfter=${encodeURIComponent(startOfToday.toISOString())}`, { headers }),
        fetch(`${FEED_API}/calendar/upcoming?limit=5`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/courses`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/courses/my-courses`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/courses/my-created`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/learning-paths/paths`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/courses/stats/my-learning`, { headers }),
        fetch(`${SUBJECT_SERVICE_URL}/subjects?isActive=true`, { headers }),
        user.role === 'STUDENT'
          ? fetch(`${GRADE_SERVICE_URL}/grades/student/${user.id}`, { headers })
          : Promise.resolve(null),
      ]);

      const parseJson = async (result: PromiseSettledResult<Response | null>) => {
        if (result.status !== 'fulfilled' || !result.value || !result.value.ok) return null;
        try {
          return await result.value.json();
        } catch {
          return null;
        }
      };

      const [
        myClubsData,
        clubTypesData,
        discoverClubsData,
        eventsData,
        upcomingEventsData,
        coursesData,
        enrolledCoursesData,
        createdCoursesData,
        learningPathsData,
        learningStatsData,
        subjectsData,
        gradesData,
      ] = await Promise.all([
        parseJson(myClubsRes),
        parseJson(clubTypesRes),
        parseJson(discoverClubsRes),
        parseJson(eventsRes),
        parseJson(upcomingEventsRes),
        parseJson(coursesRes),
        parseJson(enrolledCoursesRes),
        parseJson(createdCoursesRes),
        parseJson(learningPathsRes),
        parseJson(learningStatsRes),
        parseJson(subjectsRes),
        parseJson(gradesRes),
      ]);

      if (myClubsData?.clubs) {
        writeRouteDataCache(
          buildRouteDataCacheKey('clubs', 'my'),
          myClubsData.clubs.map(normalizeWarmClub)
        );
      }
      if (clubTypesData) {
        writeRouteDataCache(buildRouteDataCacheKey('clubs', 'types'), clubTypesData);
      }
      if (discoverClubsData?.clubs) {
        writeRouteDataCache(
          buildRouteDataCacheKey('clubs', 'discover', 'all', 'all'),
          discoverClubsData.clubs.map(normalizeWarmClub)
        );
      }
      if (eventsData?.events) {
        writeRouteDataCache(
          buildRouteDataCacheKey('events', 'list', 'upcoming', 'all', 'all'),
          eventsData.events
        );
      }
      if (upcomingEventsData) {
        writeRouteDataCache(buildRouteDataCacheKey('events', 'upcoming'), upcomingEventsData);
      }

      writeRouteDataCache(buildRouteDataCacheKey('learn', 'hub', user.id), {
        courses: coursesData?.courses || [],
        enrolledCourses: enrolledCoursesData?.courses || [],
        createdCourses: createdCoursesData?.courses || [],
        learningPaths: learningPathsData?.paths || [],
        subjects: Array.isArray(subjectsData) ? subjectsData : [],
        myGrades: gradesData?.grades || gradesData || [],
        stats: {
          enrolledCourses: Number(learningStatsData?.enrolledCourses ?? enrolledCoursesData?.courses?.length ?? 0),
          completedCourses: Number(learningStatsData?.completedCourses ?? enrolledCoursesData?.courses?.filter((course: any) => course.progress === 100).length ?? 0),
          hoursLearned: Number(learningStatsData?.hoursLearned ?? 28),
          currentStreak: Number(learningStatsData?.currentStreak ?? 7),
          certificates: 1,
        },
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        warmDestinationData().catch(() => {
          sessionStorage.removeItem(sessionKey);
        });
      }, { timeout: FEED_DESTINATION_WARM_DELAY_MS });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => {
      warmDestinationData().catch(() => {
        sessionStorage.removeItem(sessionKey);
      });
    }, FEED_DESTINATION_WARM_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [user]);

  // Infinite scroll: early trigger (~0.6 viewport) like mobile FlashList threshold
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Don't block load-more while a background SWR refresh is running
        // if we already have posts on screen.
        const initialBlocking = loadingPosts && feedRowsLengthRef.current === 0;
        if (entries[0].isIntersecting && hasMore && !loadingMore && !initialBlocking) {
          fetchMorePosts();
        }
      },
      { rootMargin: '900px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingPosts, fetchMorePosts]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'posts') {
      fetchMyPosts();
    } else if (activeTab === 'bookmarks') {
      fetchBookmarks();
    }
  }, [activeTab, user, fetchMyPosts, fetchBookmarks]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${locale}/auth/login`);
  };

  const handleCreatePost = async (data: CreatePostData) => {
    const token = TokenManager.getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${FEED_API}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        content: data.content,
        title: data.title,
        deadline: data.deadline,
        visibility: data.visibility,
        postType: data.postType,
        pollOptions: data.pollOptions,
        mediaUrls: data.mediaUrls,
        mediaDisplayMode: data.mediaDisplayMode,
        quizData: data.quizData,
      })
    });
    const result = await res.json();
    if (result.success) {
      setShowCreateModal(false);
      fetchPosts({ refresh: true, silent: true });
      if (activeTab === 'posts') fetchMyPosts();
    } else {
      throw new Error(result.error || 'Failed to create post');
    }
  };

  const handleBookmark = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        updatePostInMainFeed(postId, (p) => ({ ...p, isBookmarked: data.bookmarked }));
        if (data.bookmarked) {
          fetchBookmarks();
        } else {
          setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
        }
      }
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const handleShare = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      await fetch(`${FEED_API}/posts/${postId}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleRepost = async (postId: string) => {
    // PostCard RepostComposerModal owns the API + local UI count.
    // Parent refreshes silently so the new repost appears in feed.
    fetchPosts({ refresh: true, silent: true });
  };

  const handleEditPost = async (postId: string, content: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        updatePostInMainFeed(postId, (p) => ({ ...p, content }));
        setMyPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, content } : p
        ));
      }
    } catch (error) {
      console.error('Edit error:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Remove from local state
        removePostFromMainFeed(postId);
        setMyPosts(prev => prev.filter(p => p.id !== postId));
        setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleVote = async (postId: string, optionId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ optionId })
      });
      const data = await res.json();
      if (data.success) {
        // Update the post with new vote counts
        updatePostInMainFeed(postId, (post) => ({
          ...post,
          userVotedOptionId: optionId,
          pollOptions: post.pollOptions?.map((opt) => ({
            ...opt,
            _count: {
              votes:
                opt.id === optionId ? (opt._count?.votes || 0) + 1 : opt._count?.votes || 0,
            },
          })),
        }));
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleReact = async (postId: string, type: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    const current =
      (feedRows.find((row) => row.kind === 'post' && row.post.id === postId) as any)?.post ||
      myPosts.find((p) => p.id === postId) ||
      bookmarkedPosts.find((p) => p.id === postId);
    const prevReaction = current?.myReaction ?? (current?.isLiked ? 'LIKE' : null);
    const prevLiked = Boolean(current?.isLiked ?? current?.isLikedByMe);
    const prevCount = current?.likesCount ?? 0;
    const prevCounts = { ...(current?.reactionCounts || {}) };

    // Optimistic
    let nextReaction: string | null = type;
    let nextCount = prevCount;
    const nextCounts = { ...prevCounts };
    if (prevReaction === type) {
      nextReaction = null;
      nextCount = Math.max(0, prevCount - 1);
      if (nextCounts[type]) {
        nextCounts[type] = Math.max(0, nextCounts[type] - 1);
        if (nextCounts[type] === 0) delete nextCounts[type];
      }
    } else if (!prevReaction) {
      nextCount = prevCount + 1;
      nextCounts[type] = (nextCounts[type] || 0) + 1;
    } else {
      if (nextCounts[prevReaction]) {
        nextCounts[prevReaction] = Math.max(0, nextCounts[prevReaction] - 1);
        if (nextCounts[prevReaction] === 0) delete nextCounts[prevReaction];
      }
      nextCounts[type] = (nextCounts[type] || 0) + 1;
    }

    updatePostInMainFeed(postId, (post) => ({
      ...post,
      myReaction: nextReaction,
      isLiked: Boolean(nextReaction),
      isLikedByMe: Boolean(nextReaction),
      likesCount: nextCount,
      reactionCounts: nextCounts,
    }));

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('react failed');
      updatePostInMainFeed(postId, (post) => ({
        ...post,
        myReaction: data.myReaction ?? null,
        isLiked: Boolean(data.myReaction),
        isLikedByMe: Boolean(data.myReaction),
      }));
    } catch (error) {
      console.error('Failed to react to post:', error);
      updatePostInMainFeed(postId, (post) => ({
        ...post,
        myReaction: prevReaction,
        isLiked: prevLiked,
        isLikedByMe: prevLiked,
        likesCount: prevCount,
        reactionCounts: prevCounts,
      }));
    }
  };

  const handleLike = async (postId: string) => {
    // Default tap = toggle LIKE reaction (parity with detail / mobile)
    return handleReact(postId, 'LIKE');
  };

  const handleValueClick = useCallback((postId: string) => {
    let postToValue: Post | undefined;
    
    // Check main feed rows
    const mainRow = feedRows.find(row => row.kind === 'post' && row.post.id === postId);
    if (mainRow && mainRow.kind === 'post') {
      postToValue = mainRow.post;
    }
    
    // Check my posts
    if (!postToValue) {
      postToValue = myPosts.find(p => p.id === postId);
    }
    
    // Check bookmarked
    if (!postToValue) {
      postToValue = bookmarkedPosts.find(p => p.id === postId);
    }
    
    if (postToValue) {
      setValuePostId(postId);
      setValuePostType(postToValue.postType || 'ARTICLE');
    }
  }, [feedRows, myPosts, bookmarkedPosts]);

  const handleSubmitValue = useCallback(async (value: EducationalValue) => {
    if (!valuePostId) return;
    
    const token = TokenManager.getAccessToken();
    if (!token) return;
    
    setIsValueSubmitting(true);
    try {
      const res = await fetch(`${FEED_API}/posts/${valuePostId}/value`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          accuracy: value.accuracy,
          helpfulness: value.helpfulness,
          clarity: value.clarity,
          depth: value.depth,
          difficulty: value.difficulty,
          wouldRecommend: value.recommend,
        })
      });
      
      const data = await res.json();
      if (data.success) {
        // Update state in main feed
        updatePostInMainFeed(valuePostId, (p) => ({
          ...p,
          isValued: true,
          valuesCount: (p.valuesCount || 0) + 1,
        }));
        
        // Update my posts
        setMyPosts(prev => prev.map(p => p.id === valuePostId ? {
          ...p,
          isValued: true,
          valuesCount: (p.valuesCount || 0) + 1,
        } : p));
        
        // Update bookmarked posts
        setBookmarkedPosts(prev => prev.map(p => p.id === valuePostId ? {
          ...p,
          isValued: true,
          valuesCount: (p.valuesCount || 0) + 1,
        } : p));
        
        setValuePostId(null);
      } else {
        alert(data.error || 'Failed to submit evaluation');
      }
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      alert('Failed to submit evaluation. Please check your connection.');
    } finally {
      setIsValueSubmitting(false);
    }
  }, [valuePostId, updatePostInMainFeed]);

  const openCreateModalWithPreset = useCallback((type: string) => {
    setCreatePostTypePreset(type);
    setShowCreateModal(true);
  }, []);

  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      if (!comments[postId]) {
        await fetchComments(postId);
      }
    }
    setExpandedComments(newExpanded);
  };

  const fetchComments = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    setLoadingComments(prev => new Set(prev).add(postId));
    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => ({ ...prev, [postId]: data.data || [] }));
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = newComment[postId]?.trim();
    if (!content) return;

    const token = TokenManager.getAccessToken();
    if (!token) return;

    setSubmittingComment(prev => new Set(prev).add(postId));
    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.success) {
        setNewComment(prev => ({ ...prev, [postId]: '' }));
        setComments(prev => ({
          ...prev,
          [postId]: [data.data, ...(prev[postId] || [])]
        }));
        updatePostInMainFeed(postId, (post) => ({
          ...post,
          commentsCount: post.commentsCount + 1,
        }));
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmittingComment(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Check if current user liked a post
  const isPostLiked = (post: Post) => {
    if (post.isLikedByMe !== undefined) return post.isLikedByMe;
    if (post.isLiked !== undefined) return post.isLiked;
    return post.likes?.some(like => like.userId === user?.id) || false;
  };

  const selectedFilter = POST_TYPE_FILTERS.find((f) => f.id === postTypeFilter) || POST_TYPE_FILTERS[0];
  const selectedFilterLabel = tFeed(selectedFilter.labelKey);

  const filteredVirtualFeedEntries = useMemo<VirtualFeedEntry[]>(() => {
    if (postTypeFilter === 'all') {
      return feedRows.map((row) => ({ id: row.key, row }));
    }
    return feedRows
      .filter((row) => row.kind !== 'post' || row.post.postType === postTypeFilter)
      .map((row) => ({ id: row.key, row }));
  }, [feedRows, postTypeFilter]);

  const filteredMainFeedPostCount = useMemo(
    () => filteredVirtualFeedEntries.filter((entry) => entry.row.kind === 'post').length,
    [filteredVirtualFeedEntries]
  );

  const feedVirtualizer = useVirtualizedFeedList(filteredVirtualFeedEntries, activeTab === 'feed');

  const findPostById = useCallback(
    (postId: string): Post | undefined => {
      const fromFeed = postsFromFeed.find((item) => item.id === postId);
      if (fromFeed) return fromFeed;
      return myPosts.find((item) => item.id === postId) ?? bookmarkedPosts.find((item) => item.id === postId);
    },
    [postsFromFeed, myPosts, bookmarkedPosts],
  );

  // Show skeleton layout immediately for perceived performance
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 scrollbar-hide">
        <UnifiedNavigation />
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Sidebar Skeleton */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-20 space-y-3">
                <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-[28rem] animate-pulse" />
                <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-48 animate-pulse" />
              </div>
            </aside>

            {/* Center Main Feed Skeleton */}
            <main className="lg:col-span-6 space-y-3">
              <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-24 animate-pulse" />
              <div className="bg-white dark:bg-gray-900/80 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 h-16 animate-pulse" />
              <FeedSkeletonList count={3} />
            </main>

            {/* Right Sidebar Skeleton */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-20 space-y-4">
                <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-64 animate-pulse" />
                <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-64 animate-pulse" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const handleViewAnalytics = (postId: string) => {
    const post = findPostById(postId);
    if (
      post?.postType === 'QUIZ' &&
      user?.role &&
      TEACHER_QUIZ_ANALYTICS_ROLES.has(user.role)
    ) {
      const quizId = post.quiz?.id;
      const qs = quizId ? `?quizId=${encodeURIComponent(quizId)}` : '';
      router.push(`/${locale}/teacher/quizzes/analytics${qs}`);
      return;
    }
    setSelectedPostForAnalytics(postId);
    setShowAnalyticsModal(true);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return tProfile('roles.admin');
      case 'SUPER_ADMIN':
        return tProfile('roles.superAdmin');
      case 'TEACHER':
        return tProfile('roles.teacher');
      case 'STUDENT':
        return tProfile('roles.student');
      case 'STAFF':
        return tProfile('roles.staff');
      default:
        return role?.toLowerCase().replace('_', ' ') || tCommon('unknown');
    }
  };
  const viewProfileLabel = (() => {
    const translated = tProfile('viewProfile');
    return translated === 'profile.viewProfile'
      ? `${tCommon('view')} ${tCommon('profile')}`
      : translated;
  })();
  const tabs = [
    { id: 'feed', label: tFeed('tabs.feed'), icon: TrendingUp },
    { id: 'posts', label: tFeed('tabs.myPosts'), icon: BookOpen },
    { id: 'insights', label: tFeed('tabs.insights'), icon: BarChart3 },
    { id: 'activity', label: tFeed('tabs.activity'), icon: Activity },
    { id: 'bookmarks', label: tFeed('tabs.saved'), icon: Bookmark },
  ];

  const sidebarTabs = [
    { id: 'feed', label: tFeed('tabs.feed'), icon: TrendingUp },
    { id: 'bookmarks', label: tFeed('tabs.saved'), icon: Bookmark },
    { id: 'posts', label: tFeed('tabs.myPosts'), icon: BookOpen },
    { id: 'insights', label: tFeed('tabs.analytics'), icon: BarChart3 },
    { id: 'activity', label: tFeed('tabs.activity'), icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-none dark:bg-gray-950 scrollbar-hide text-gray-900 dark:text-gray-100">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      {/* LinkedIn-style 3-column layout - cleaner proportions */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left Sidebar - Compact Profile & Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-3">
              {/* Profile Card - Education-Focused Design */}
              <div className="bg-white dark:bg-none dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-hidden hover:shadow-lg dark:hover:shadow-black/20">
                {/* Cover - Gradient with role-based accent */}
                <div className="h-32 relative overflow-hidden">
                  {user.coverPhotoUrl ? (
                    <NextImage
                      src={user.coverPhotoUrl}
                      alt=""
                      fill
                      sizes="(max-width:1024px) 0px, 25vw"
                      className="object-cover"
                      priority={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#F9A825] via-[#FFB74D] to-[#F9A825]">
                      {/* Decorative education icons - only show on gradient fallback */}
                      <div className="absolute inset-0 opacity-15">
                        <GraduationCap className="absolute top-2 left-3 w-6 h-6 text-white" />
                        <BookOpen className="absolute top-3 right-4 w-5 h-5 text-white" />
                        <Award className="absolute bottom-2 left-1/3 w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar - Centered, overlapping cover */}
                <div className="flex justify-center -mt-8 relative z-10">
                  {user.profilePictureUrl ? (
                    <NextImage
                      src={user.profilePictureUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover border-3 border-white dark:border-gray-900 shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white text-xl font-bold border-3 border-white dark:border-gray-900 shadow-lg">
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                  )}
                </div>

                {/* User Info - Centered */}
                <div className="text-center px-4 pt-2 pb-3">
                  <Link href={`/${locale}/profile/me`} className="hover:underline">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{user.firstName} {user.lastName}</h3>
                  </Link>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && <Settings className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'TEACHER' && <GraduationCap className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'STUDENT' && <BookOpen className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'STAFF' && <Users className="w-3 h-3 text-[#F9A825]" />}
                    <span className="text-xs text-[#F9A825] font-medium">
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  <Link
                    href={`/${locale}/profile/me`}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <User className="w-3 h-3" />
                    {viewProfileLabel}
                  </Link>
                </div>

                {/* Education Metrics - 2x2 Grid */}
                <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Engagement Score */}
                    <button
                      onClick={() => setActiveTab('insights')}
                      className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-lg p-2.5 text-center group hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{postsFromFeed.reduce((sum, p) => sum + (p.likesCount || 0), 0)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{tFeed('profileMetrics.engagement')}</p>
                    </button>

                    {/* Impact Score - Role-based */}
                    <button
                      onClick={() => setActiveTab('activity')}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg p-2.5 text-center group hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Target className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {user.role === 'TEACHER' ? Math.floor(postsFromFeed.reduce((sum, p) => sum + (p.commentsCount || 0), 0) * 1.5) :
                            (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? Math.floor((myPosts.length || 0) * 2.5) :
                              postsFromFeed.reduce((sum, p) => sum + (p.commentsCount || 0), 0)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.role === 'TEACHER'
                          ? tFeed('profileMetrics.impact')
                          : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
                            ? tFeed('profileMetrics.reach')
                            : tFeed('profileMetrics.learning')}
                      </p>
                    </button>

                    {/* Contributions */}
                    <button
                      onClick={() => setActiveTab('posts')}
                      className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-lg p-2.5 text-center group hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{myPosts.length || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.role === 'TEACHER'
                          ? tFeed('profileMetrics.lessons')
                          : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
                            ? tFeed('profileMetrics.updates')
                            : tFeed('profileMetrics.shares')}
                      </p>
                    </button>

                    {/* Achievement/Level */}
                    <button
                      onClick={() => setActiveTab('insights')}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg p-2.5 text-center group hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {user.role === 'TEACHER'
                            ? tFeed('profileMetrics.expert')
                            : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
                              ? tFeed('profileMetrics.leader')
                              : user.role === 'STUDENT'
                                ? tFeed('profileMetrics.rising')
                                : tFeed('profileMetrics.active')}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.role === 'TEACHER'
                          ? tFeed('profileMetrics.educator')
                          : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
                            ? tFeed('profileMetrics.role')
                            : user.role === 'STUDENT'
                              ? tFeed('profileMetrics.star')
                              : tFeed('profileMetrics.status')}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex items-center justify-between text-[10px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>
                      {tFeed('profileMetrics.viewsThisWeek', { count: postsFromFeed.length * 12 + myPosts.length * 5 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">+{Math.min(15, Math.max(5, (myPosts.length || 1) + (postsFromFeed.length % 10)))}%</span>
                  </div>
                </div>
              </div>

              {/* Quick Links - Minimal */}
              <div className="bg-white dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-hidden">
                <nav className="py-1">
                  {sidebarTabs.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${activeTab === item.id
                          ? 'bg-amber-50 dark:bg-amber-900/30 text-[#F9A825] font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Center - Main Feed */}
          <main className="lg:col-span-6">
            {/* Tab Navigation - Mobile only */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 lg:hidden scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium text-xs transition-all whitespace-nowrap ${activeTab === tab.id
                      ? 'bg-[#F9A825] text-white'
                      : 'bg-white dark:bg-none dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Performance Card - XP, Level, Streak */}
            <div className="mb-3 transform hover:scale-[1.01] transition-transform duration-300">
              <PerformanceCard user={user} locale={locale} />
            </div>

            {/* Create Post Card — E-Learning Focused */}
            <div className="bg-white dark:bg-none dark:bg-gray-900/80 backdrop-blur-xl rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-3 transition-all duration-300 hover:border-[#F9A825]/30">
              <div className="flex items-center gap-3">
                {user.profilePictureUrl ? (
                  <NextImage
                    src={user.profilePictureUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                )}
                <button
                  onClick={() => openCreateModalWithPreset('ARTICLE')}
                  className="flex-1 text-left px-4 py-2.5 bg-gray-50 dark:bg-none dark:bg-gray-800/50 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-none dark:bg-gray-800 dark:hover:bg-gray-700/80 transition-all duration-300 text-sm border border-gray-200 dark:border-gray-700/50"
                >
                  {tFeed('createPost.askMind')}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => openCreateModalWithPreset('QUESTION')}
                  className="flex-1 flex flex-col items-center justify-center gap-2 px-2 py-2 rounded-xl transition-all duration-300 group hover:bg-sky-50 dark:hover:bg-sky-900/20"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-sky-300 to-sky-500 shadow-md shadow-sky-500/20 group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-sky-500">{tFeed('ask')}</span>
                </button>

                <button
                  onClick={() => openCreateModalWithPreset('QUIZ')}
                  className="flex-1 flex flex-col items-center justify-center gap-2 px-2 py-2 rounded-xl transition-all duration-300 group hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-500">{tFeed('quiz')}</span>
                </button>

                <button
                  onClick={() => openCreateModalWithPreset('POLL')}
                  className="flex-1 flex flex-col items-center justify-center gap-2 px-2 py-2 rounded-xl transition-all duration-300 group hover:bg-violet-50 dark:hover:bg-violet-900/20"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-400 to-violet-600 shadow-md shadow-violet-500/20 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-violet-500">{tFeed('postTypes.poll')}</span>
                </button>

                <button
                  onClick={() => openCreateModalWithPreset('RESOURCE')}
                  className="flex-1 flex flex-col items-center justify-center gap-2 px-2 py-2 rounded-xl transition-all duration-300 group hover:bg-pink-50 dark:hover:bg-pink-900/20"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-pink-600 shadow-md shadow-pink-500/20 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-pink-500">{tFeed('resource')}</span>
                </button>
              </div>
            </div>

            {/* Feed Content */}
            {activeTab === 'feed' && (
              <div className="space-y-3">
                {/* Post Type Filters & Refresh - Minimal */}
                <div className="flex items-center justify-between gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${postTypeFilter !== 'all'
                        ? 'bg-amber-50 dark:bg-amber-900/30 border-[#F9A825] text-[#F9A825]'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {selectedFilterLabel}
                      </span>
                    </button>

                    {showFilters && (
                      <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        {POST_TYPE_FILTERS.map((filter) => {
                          const Icon = filter.icon;
                          return (
                            <button
                              key={filter.id}
                              onClick={() => {
                                setPostTypeFilter(filter.id);
                                setShowFilters(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors ${postTypeFilter === filter.id ? 'bg-gradient-to-r from-amber-50 to-[#F9A825]/10 dark:from-amber-900/20 dark:to-[#F9A825]/20 border-l-2 border-[#F9A825]' : ''
                                }`}
                            >
                              <Icon className={`w-4 h-4 ${postTypeFilter === filter.id ? 'text-[#F9A825]' : 'text-gray-500 dark:text-gray-400'}`} />
                              <span className={`text-sm ${postTypeFilter === filter.id ? 'text-[#F9A825] font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                {tFeed(filter.labelKey)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => fetchPosts({ refresh: true })}
                    disabled={loadingPosts}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#F9A825] hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-all duration-200"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingPosts ? 'animate-spin' : ''}`} />
                    {tFeed('actions.refresh')}
                  </button>

                  {/* Real-time connection indicator */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${isConnected
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                    {isConnected ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        <span className="hidden sm:inline">{tFeed('connection.live')}</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        <span className="hidden sm:inline">{tFeed('connection.offline')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* New Posts Available Banner */}
                {newPostsAvailable > 0 && (
                  <button
                    onClick={loadNewPosts}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-md hover:from-amber-600 hover:to-orange-600 transition-all animate-pulse"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">
                      {newPostsAvailable === 1
                        ? tFeed('connection.oneNewPost')
                        : tFeed('connection.manyNewPosts', { count: newPostsAvailable })}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* Loading State - Use Skeleton */}
                {loadingPosts && feedRows.length === 0 && (
                  <FeedSkeletonList count={3} />
                )}

                {/* Empty State - Stunity Design */}
                {!loadingPosts && feedRows.length === 0 && (
                  <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-10 h-10 text-[#F9A825]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{tFeed('empty.welcomeTitle')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">{tFeed('empty.welcomeMessage')}</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#F9A825] to-[#FFB74D] text-white rounded-full font-semibold hover:from-[#E89A1E] hover:to-[#FF9800] transition-all shadow-lg shadow-emerald-200 transform hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                      {tFeed('empty.createFirstPost')}
                    </button>
                  </div>
                )}

                {/* Posts List with virtualization for large scroll sessions */}
                <div ref={feedVirtualizer.containerRef}>
                  {feedVirtualizer.isVirtualized && feedVirtualizer.topSpacerHeight > 0 && (
                    <div style={{ height: `${feedVirtualizer.topSpacerHeight}px` }} aria-hidden="true" />
                  )}

                  <div className="space-y-3">
                    {feedVirtualizer.visibleItems.map((entry, index) => (
                      <div
                        key={entry.id}
                        ref={feedVirtualizer.measureItem(entry.id)}
                        className="animate-fadeInUp"
                        style={{ animationDelay: index < 4 ? `${index * 20}ms` : '0ms' }}
                      >
                        {entry.row.kind === 'suggested_users' && (
                          <FeedSuggestedUsersStrip locale={locale} users={entry.row.users} />
                        )}
                        {entry.row.kind === 'suggested_courses' && (
                          <FeedSuggestedCoursesStrip locale={locale} courses={entry.row.courses} />
                        )}
                        {entry.row.kind === 'suggested_quizzes' && (
                          <FeedSuggestedQuizzesStrip locale={locale} quizzes={entry.row.quizzes} />
                        )}
                        {entry.row.kind === 'post' && (
                        <PostCard
                          post={feedPostToCardData(entry.row.post, {
                            isLiked: isPostLiked(entry.row.post),
                            comments: comments[entry.row.post.id]?.map(c => ({
                              id: c.id,
                              content: c.content,
                              author: {
                                firstName: c.author.firstName,
                                lastName: c.author.lastName,
                              },
                              createdAt: c.createdAt,
                            })),
                          })}
                          onLike={handleLike}
                          onReact={handleReact}
                          onValue={handleValueClick}
                          onComment={async (postId, content, parentId) => {
                            const token = TokenManager.getAccessToken();
                            if (!token || !content.trim()) return;

                            try {
                              const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ content: content.trim(), parentId: parentId || null })
                              });
                              const data = await res.json();
                              if (data.success) {
                                setComments(prev => {
                                  const existing = prev[postId] || [];
                                  if (parentId) {
                                    return {
                                      ...prev,
                                      [postId]: existing.map((c: any) =>
                                        c.id === parentId
                                          ? { ...c, replies: [...(c.replies || []), data.data] }
                                          : c,
                                      ),
                                    };
                                  }
                                  return {
                                    ...prev,
                                    [postId]: [data.data, ...existing],
                                  };
                                });
                                updatePostInMainFeed(postId, (p) => ({
                                  ...p,
                                  commentsCount: p.commentsCount + 1,
                                }));
                              }
                            } catch (error) {
                              console.error('Failed to add comment:', error);
                            }
                          }}
                          onToggleComments={(postId) => {
                            if (!comments[postId]) {
                              fetchComments(postId);
                            }
                          }}
                          loadingComments={loadingComments.has(entry.row.post.id)}
                          onVote={handleVote}
                          onBookmark={handleBookmark}
                          onShare={handleShare}
                          onRepost={handleRepost}
                          onEdit={handleEditPost}
                          onDelete={handleDeletePost}
                          onViewAnalytics={handleViewAnalytics}
                          currentUserId={user?.id}
                        />
                        )}
                      </div>
                    ))}
                  </div>

                  {feedVirtualizer.isVirtualized && feedVirtualizer.bottomSpacerHeight > 0 && (
                    <div style={{ height: `${feedVirtualizer.bottomSpacerHeight}px` }} aria-hidden="true" />
                  )}
                </div>

                {/* Infinite scroll sentinel + load-more skeletons (mobile parity) */}
                {activeTab === 'feed' && (
                  <>
                    <div ref={sentinelRef} className="h-24" aria-hidden="true" />
                    {loadingMore && (
                      <div className="mt-1">
                        <FeedSkeletonList count={2} />
                      </div>
                    )}
                  </>
                )}

                {/* Empty Filter State */}
                {!loadingPosts && postsFromFeed.length > 0 && filteredMainFeedPostCount === 0 && (
                  <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center">
                      <Filter className="w-8 h-8 text-[#F9A825]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {tFeed('empty.noPostsForFilter', { filter: selectedFilterLabel })}
                    </h3>
                    <p className="text-gray-600 mb-4">{tFeed('empty.tryDifferentFilter')}</p>
                    <button
                      onClick={() => setPostTypeFilter('all')}
                      className="text-[#F9A825] hover:text-[#E89A1E] font-medium"
                    >
                      {tFeed('empty.showAllPosts')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* My Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {myPosts.length === 0 ? (
                  <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[#F9A825]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{tFeed('empty.noMyPosts')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{tFeed('empty.shareFirstPost')}</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#F9A825] to-[#FFB74D] text-white rounded-full font-semibold hover:from-[#E89A1E] hover:to-[#FF9800] transition-all shadow-lg shadow-emerald-200 transform hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                      {tFeed('createPost.title')}
                    </button>
                  </div>
                ) : (
                  myPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className="animate-fadeInUp"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <PostCard
                        post={feedPostToCardData(post, {
                          isLiked: isPostLiked(post),
                          comments: comments[post.id]?.map(c => ({
                            id: c.id,
                            content: c.content,
                            author: {
                              firstName: c.author.firstName,
                              lastName: c.author.lastName,
                            },
                            createdAt: c.createdAt,
                          })),
                        })}
                        onLike={handleLike}
                        onReact={handleReact}
                        onValue={handleValueClick}
                        onComment={async (postId, content, parentId) => {
                          const token = TokenManager.getAccessToken();
                          if (!token || !content.trim()) return;
                          try {
                            const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ content: content.trim(), parentId: parentId || null })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setComments(prev => ({
                                ...prev,
                                [postId]: [data.data, ...(prev[postId] || [])]
                              }));
                              setMyPosts(prev => prev.map(p =>
                                p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
                              ));
                            }
                          } catch (error) {
                            console.error('Failed to add comment:', error);
                          }
                        }}
                        onToggleComments={(postId) => {
                          if (!comments[postId]) {
                            fetchComments(postId);
                          }
                        }}
                        loadingComments={loadingComments.has(post.id)}
                        onVote={handleVote}
                        onBookmark={handleBookmark}
                        onShare={handleShare}
                        onRepost={handleRepost}
                        onEdit={handleEditPost}
                        onDelete={handleDeletePost}
                        onViewAnalytics={handleViewAnalytics}
                        currentUserId={user?.id}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <InsightsDashboard apiUrl={FEED_API} />
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <ActivityDashboard apiUrl={FEED_API} />
            )}

            {/* Bookmarks Tab */}
            {activeTab === 'bookmarks' && (
              <div className="space-y-4">
                {bookmarkedPosts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 dark:from-amber-900/40 to-yellow-100 dark:to-yellow-900/40 flex items-center justify-center">
                      <Bookmark className="w-10 h-10 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{tFeed('empty.noSavedPosts')}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{tFeed('empty.savedPostsHint')}</p>
                  </div>
                ) : (
                  bookmarkedPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className="animate-fadeInUp"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <PostCard
                        post={feedPostToCardData(post, {
                          isLiked: isPostLiked(post),
                          isBookmarked: true,
                          comments: comments[post.id]?.map(c => ({
                            id: c.id,
                            content: c.content,
                            author: {
                              firstName: c.author.firstName,
                              lastName: c.author.lastName,
                            },
                            createdAt: c.createdAt,
                          })),
                        })}
                        onLike={handleLike}
                        onReact={handleReact}
                        onValue={handleValueClick}
                        onComment={async (postId, content, parentId) => {
                          const token = TokenManager.getAccessToken();
                          if (!token || !content.trim()) return;
                          try {
                            const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ content: content.trim(), parentId: parentId || null })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setComments(prev => ({
                                ...prev,
                                [postId]: [data.data, ...(prev[postId] || [])]
                              }));
                              setBookmarkedPosts(prev => prev.map(p =>
                                p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
                              ));
                            }
                          } catch (error) {
                            console.error('Failed to add comment:', error);
                          }
                        }}
                        onToggleComments={(postId) => {
                          if (!comments[postId]) {
                            fetchComments(postId);
                          }
                        }}
                        loadingComments={loadingComments.has(post.id)}
                        onVote={handleVote}
                        onBookmark={handleBookmark}
                        onShare={handleShare}
                        onRepost={handleRepost}
                        onEdit={handleEditPost}
                        onDelete={handleDeletePost}
                        onViewAnalytics={handleViewAnalytics}
                        currentUserId={user?.id}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar - Compact Widgets */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Learning Spotlight */}
              <LearningSpotlight />

              {/* Study Groups */}
              <StudyGroupsWidget />

              {/* Upcoming Events */}
              <UpcomingEventsWidget />

              {/* Top Contributors */}
              <TopContributorsWidget />

              {/* Quick Resources */}
              <QuickResourcesWidget />

              {/* Footer Links */}
              <div className="text-xs text-gray-400 dark:text-gray-500 px-2 pt-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <a href="#" className="hover:text-[#F9A825] transition-colors">{tSettings('about')}</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">{tSettings('helpCenter')}</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">{tAuth('privacyPolicy')}</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">{tAuth('termsOfService')}</a>
                </div>
                <p className="mt-3 flex items-center gap-1">
                  <span className="font-semibold text-[#F9A825]"><AutoI18nText i18nKey="auto.web.app_locale_feed_page.k_ea0c5fdb" /></span> © 2026
                </p>
              </div>
            </div>
          </aside>

        </div>
      </div>



      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        user={user}
        initialPostType={createPostTypePreset}
      />

      {/* Educational Value Modal */}
      <EducationalValueModal
        isOpen={valuePostId !== null}
        postType={valuePostType}
        onClose={() => setValuePostId(null)}
        onSubmit={handleSubmitValue}
        isSubmitting={isValueSubmitting}
      />

      {/* Post Analytics Modal */}
      {selectedPostForAnalytics && (
        <PostAnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => { setShowAnalyticsModal(false); setSelectedPostForAnalytics(null); }}
          postId={selectedPostForAnalytics}
          apiUrl={FEED_API}
        />
      )}
    </div>
  );
}
