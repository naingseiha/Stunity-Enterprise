/**
 * Feed Store
 * 
 * State management for social feed, posts, and stories
 */

import { create } from 'zustand';
import { Post, Story, StoryGroup, PaginationParams, Comment, FeedItem, MediaMetadata } from '@/types';
import { transformPost, transformPosts } from '@/utils/transformPost';
import { feedApi, quizApi, learnApi } from '@/api/client';
import { Image, InteractionManager } from 'react-native';
import { mockPosts, mockStories } from '@/api/mockData';
import { recommendationEngine, UserInterestProfile } from '@/services/recommendation';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { seedDatabase } from '@/lib/seed';
import { cacheFeedPosts, loadCachedFeed, isCacheStale } from '@/services/feedCache';
import { useAuthStore } from './authStore';
import { metadataForUris, primaryMediaAspectRatio } from '@/utils/mediaMetadata';
// TEMPORARY: Disabled until native module rebuilt with EAS
// import { networkQualityService } from '@/services/networkQuality';

// ── Batched view tracking ──
// Buffer post views and flush in one HTTP request every 60 seconds.
// Phase 1 Optimization: Increased from 10s to 60s = 6x reduction in write load
// At 10K users × 20 posts = 400K individual requests → ~7K batched requests (was 40K).
const VIEW_FLUSH_INTERVAL = 60_000; // 60 seconds (Free Tier optimization)

// Probabilistic sampling: Only track 20% of views, extrapolate total on server side
// This provides 95% confidence interval while reducing writes by 80%
// Example: 10K users × 20 posts × 20% = 40K tracked views (represents 200K actual views)
const VIEW_SAMPLE_RATE = 0.2; // Track 20% of views (1 in 5)
let viewFlushTimer: ReturnType<typeof setTimeout> | null = null;
const viewBuffer = new Map<string, { postId: string; duration: number; source: string; timestamp: number }>();

// Feed cold-start resilience (Cloud Run free-tier friendly)
const FEED_FIRST_PAGE_TIMEOUT_MS = 20_000;
const FEED_RETRY_TIMEOUT_MS = 25_000;
const FEED_NEXT_PAGE_TIMEOUT_MS = 12_000;
const INITIAL_RETRY_BASE_DELAY_MS = 1_200;
const MAX_INITIAL_FEED_RETRIES = 2;
let initialFeedRetryAttempts = 0;
let initialFeedRetryTimer: ReturnType<typeof setTimeout> | null = null;

// Realtime fallback: if Supabase channel is subscribed but not delivering events,
// poll RECENT feed periodically so users still receive "New posts" updates.
const REALTIME_FALLBACK_POLL_INTERVAL_MS = 20_000;
let realtimeLivenessTimer: ReturnType<typeof setTimeout> | null = null;
let realtimeFallbackPollTimer: ReturnType<typeof setInterval> | null = null;
let realtimeFallbackPollInFlight = false;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isWrappedFeedItem = (item: any): item is { type: string; data: any } =>
  !!item && typeof item === 'object' && typeof item.type === 'string' && 'data' in item;

const normalizeFeedItems = (rawItems: any[]): FeedItem[] => {
  const normalized: FeedItem[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem) continue;

    if (isWrappedFeedItem(rawItem)) {
      if (rawItem.type === 'POST') {
        const transformedPost = transformPost(rawItem.data);
        if (transformedPost) {
          normalized.push({ type: 'POST', data: transformedPost });
        }
        continue;
      }

      if (
        rawItem.type === 'SUGGESTED_USERS' ||
        rawItem.type === 'SUGGESTED_COURSES' ||
        rawItem.type === 'SUGGESTED_QUIZZES'
      ) {
        normalized.push(rawItem as FeedItem);
      }
      continue;
    }

    // Backward compatibility: some endpoints can still return raw post objects.
    const transformedPost = transformPost(rawItem);
    if (transformedPost) {
      normalized.push({ type: 'POST', data: transformedPost });
    }
  }

  return normalized;
};

async function flushViewBuffer() {
  viewFlushTimer = null;
  if (viewBuffer.size === 0) return;

  const views = Array.from(viewBuffer.values());
  viewBuffer.clear();

  try {
    // Bulk endpoint — single request for all buffered views
    await feedApi.post('/feed/track-views', { views });
  } catch {
    // Fallback: fire individual requests if bulk endpoint not available
    for (const view of views) {
      feedApi.post(`/posts/${view.postId}/view`, { source: view.source }).catch(() => { });
      feedApi.post('/feed/track-action', { action: 'VIEW', postId: view.postId, duration: view.duration, source: view.source }).catch(() => { });
    }
  }
}

// Analytics types
export interface PostAnalytics {
  totalViews: number;
  uniqueViewers: number;
  avgDuration: number;
  views24h: number;
  views7d: number;
  views30d: number;
  likes: number;
  likes24h: number;
  comments: number;
  comments24h: number;
  shares: number;
  bookmarks: number;
  engagementRate: number;
  viewsBySource: Record<string, number>;
  dailyViews: { date: string; views: number }[];
  createdAt: string;
}

export interface TrendingPost extends Post {
  trendScore: number;
  growthRate: number;
}

export type TrendingPeriod = '24h' | '7d' | '30d';

interface FeedState {
  // Posts

  // Feed Items
  feedItems: FeedItem[];
  isLoadingPosts: boolean;
  hasMorePosts: boolean;
  postsPage: number;
  nextCursor: string | null;
  feedMode: 'FOR_YOU' | 'FOLLOWING' | 'RECENT';
  userInterestProfile: UserInterestProfile | null;
  pendingPosts: Post[];
  lastFeedTimestamp: string | null; // ISO timestamp of newest post in feed

  // My Posts
  myPosts: Post[];
  isLoadingMyPosts: boolean;

  // Bookmarks
  bookmarkedPosts: Post[];
  isLoadingBookmarks: boolean;

  // Trending
  trendingPosts: TrendingPost[];
  isLoadingTrending: boolean;
  trendingPeriod: TrendingPeriod;

  // Stories
  storyGroups: StoryGroup[];
  isLoadingStories: boolean;
  activeStoryGroupIndex: number | null;
  activeStoryIndex: number;

  // Comments
  comments: Record<string, Comment[]>;
  isLoadingComments: Record<string, boolean>;
  isSubmittingComment: Record<string, boolean>;

  // Analytics
  postAnalytics: Record<string, PostAnalytics>;
  isLoadingAnalytics: Record<string, boolean>;

  // Actions
  fetchPosts: (refresh?: boolean, subject?: string) => Promise<void>;
  fetchPostById: (postId: string) => Promise<Post | null>;
  fetchStories: () => Promise<void>;
  createPost: (content: string, mediaUrls?: string[], postType?: string, pollOptions?: string[], quizData?: any, title?: string, visibility?: string, pollSettings?: any, courseData?: any, projectData?: any, topicTags?: string[], deadline?: string, questionBounty?: number, mediaMetadata?: MediaMetadata[]) => Promise<boolean>;
  updatePost: (postId: string, data: { content: string; visibility?: string; mediaUrls?: string[]; mediaDisplayMode?: string; mediaMetadata?: MediaMetadata[]; mediaAspectRatio?: number; pollOptions?: string[]; quizData?: any; pollSettings?: any; deadline?: string }) => Promise<boolean>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;

  // Comments actions
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string, parentId?: string) => Promise<boolean>;
  toggleCommentLike: (postId: string, commentId: string) => Promise<boolean>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;
  verifyAnswer: (postId: string, commentId: string) => Promise<boolean>;

  // Engagement actions
  voteOnPoll: (postId: string, optionId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;
  trackPostView: (postId: string) => Promise<void>;

  // Analytics actions
  fetchPostAnalytics: (postId: string) => Promise<PostAnalytics | null>;

  // Discovery actions
  fetchMyPosts: () => Promise<void>;
  fetchBookmarks: () => Promise<void>;

  fetchTrending: (period?: TrendingPeriod) => Promise<void>;
  toggleFeedMode: (mode: 'FOR_YOU' | 'FOLLOWING' | 'RECENT') => void;

  initializeRecommendations: () => void;
  // Real-time
  subscribeToFeed: () => void;
  unsubscribeFromFeed: () => void;
  applyPendingPosts: () => number; // returns count of applied posts
  seedFeed: () => Promise<void>;

  // Story actions
  viewStory: (storyId: string) => Promise<void>;
  createStory: (data: Partial<Story>) => Promise<boolean>;
  setActiveStoryGroup: (index: number | null) => void;
  nextStory: () => void;
  previousStory: () => void;

  // Optimistic updates
  addOptimisticPost: (post: Post) => void;
  removeOptimisticPost: (tempId: string) => void;

  // Reset
  // Reset
  reset: () => void;

  realtimeSubscription: RealtimeChannel | null;
}

const initialState = {
  isLoadingPosts: false,
  hasMorePosts: true,
  postsPage: 1,
  nextCursor: null,
  feedItems: [],
  userInterestProfile: null,
  feedMode: 'FOR_YOU' as const,
  myPosts: [],
  isLoadingMyPosts: false,
  bookmarkedPosts: [],
  isLoadingBookmarks: false,
  trendingPosts: [],
  isLoadingTrending: false,
  trendingPeriod: '7d' as TrendingPeriod,
  storyGroups: [],
  isLoadingStories: false,
  activeStoryGroupIndex: null,
  activeStoryIndex: 0,
  pendingPosts: [],
  lastFeedTimestamp: null,
  comments: {},
  isLoadingComments: {},
  isSubmittingComment: {},
  postAnalytics: {},
  isLoadingAnalytics: {},
  realtimeSubscription: null,
};

export const useFeedStore = create<FeedState>()((set, get) => ({
  ...initialState,

  // Fetch a single post by ID from the API
  fetchPostById: async (postId: string) => {
    try {
      const response = await feedApi.get(`/posts/${postId}`);
      if (response.data.success && response.data.data) {
        const transformed = transformPost(response.data.data);
        if (!transformed) return null;
        // Upsert into local posts array
        const { feedItems } = get();

        // Find if post exists inside a POST feedItem
        const idx = feedItems.findIndex(i => i.type === 'POST' && i.data.id === postId);

        if (idx >= 0) {
          const updated = [...feedItems];
          updated[idx] = { type: 'POST', data: transformed };
          set({ feedItems: updated });
        } else {
          set({ feedItems: [{ type: 'POST', data: transformed }, ...feedItems] });
        }
        return transformed;
      }
      return null;
    } catch (error) {
      console.error('❌ [FeedStore] fetchPostById error:', error);
      return null;
    }
  },

  // Fetch posts with pagination
  fetchPosts: async (refresh = false, subject?: string) => {
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated || authState.isLoggingOut || !authState.user) {
      if (initialFeedRetryTimer) {
        clearTimeout(initialFeedRetryTimer);
        initialFeedRetryTimer = null;
      }
      set({ isLoadingPosts: false });
      return;
    }

    const { isLoadingPosts, postsPage, feedItems, hasMorePosts } = get();

    if (isLoadingPosts || (!refresh && !hasMorePosts)) return;

    const page = refresh ? 1 : postsPage;

    set({ isLoadingPosts: true });

    // Stale-while-revalidate: show cached feed instantly on cold-start
    if (page === 1 && feedItems.length === 0) {
      const cached = await loadCachedFeed(authState.user.id);
      if (cached && cached.length > 0) {
        set({ feedItems: cached.map(p => ({ type: 'POST' as const, data: p })) });
      }
    }

    try {
      // Network-adaptive batch size (Phase 1 Day 5 optimization)
      // TEMPORARY: Use static batch size until native module is rebuilt
      const adaptiveBatchSize = 20; // networkQualityService.getConfig().batchSize;

      // Use personalized feed endpoint for FOR_YOU and FOLLOWING modes
      const feedMode = get().feedMode;
      const usePersonalizedFeed = feedMode === 'FOR_YOU' || feedMode === 'FOLLOWING';
      const endpoint = usePersonalizedFeed ? '/posts/feed' : '/posts';

      // Personalized feed is page-based, so keep the page size stable across requests.
      const limit = usePersonalizedFeed ? 10 : (page === 1 ? 10 : Math.max(10, adaptiveBatchSize));

      console.log('📶 [FeedStore] Network: excellent (static) | Batch size:', limit);

      const params: any = { page, limit };

      // Use cursor-based pagination when available (O(1) vs O(N) for offset)
      const cursor = refresh ? null : get().nextCursor;
      if (cursor) {
        params.cursor = cursor;
      }

      // Send fields=minimal to reduce payload by ~76%
      params.fields = 'minimal';

      // Add subject filter if provided
      if (subject && subject !== 'ALL') {
        params.subject = subject;
      }

      if (usePersonalizedFeed) {
        params.mode = feedMode;
      }

      let response;
      try {
        response = await feedApi.get(endpoint, {
          params,
          timeout: page === 1 ? FEED_FIRST_PAGE_TIMEOUT_MS : FEED_NEXT_PAGE_TIMEOUT_MS,
          headers: { 'X-No-Retry': 'true' },
        });
      } catch (requestError) {
        if (page !== 1) throw requestError;

        // Free-tier Cloud Run cold starts can be slow on the very first request.
        await delay(INITIAL_RETRY_BASE_DELAY_MS);
        response = await feedApi.get(endpoint, {
          params,
          timeout: FEED_RETRY_TIMEOUT_MS,
          headers: { 'X-No-Retry': 'true' },
        });
      }

      if (response.data.success) {
        let pagination = response.data.pagination;
        const rawFeedItems: any[] = response.data.data || response.data.posts || [];
        let transformedFeedItems: FeedItem[] = normalizeFeedItems(rawFeedItems);
        let postItemsCount = transformedFeedItems.filter((item) => item.type === 'POST').length;

        if (__DEV__) {
          console.log('📥 [FeedStore] Received', rawFeedItems.length, 'raw items');
        }

        // Safety fallback: if personalized endpoint returns empty on first page,
        // fall back to RECENT posts so users never land on a blank feed.
        if (page === 1 && postItemsCount === 0 && usePersonalizedFeed) {
          const fallbackParams: any = {
            page: 1,
            limit,
            fields: 'minimal',
          };

          if (subject && subject !== 'ALL') {
            fallbackParams.subject = subject;
          }

          if (__DEV__) {
            console.log('🛟 [FeedStore] Personalized feed empty, falling back to /posts');
          }

          const fallbackResponse = await feedApi.get('/posts', {
            params: fallbackParams,
            timeout: FEED_RETRY_TIMEOUT_MS,
            headers: { 'X-No-Retry': 'true' },
          });

          if (fallbackResponse.data?.success) {
            const fallbackRawItems: any[] = fallbackResponse.data.data || fallbackResponse.data.posts || [];
            const fallbackItems = normalizeFeedItems(fallbackRawItems);

            if (fallbackItems.length > 0) {
              transformedFeedItems = fallbackItems;
              postItemsCount = fallbackItems.filter((item) => item.type === 'POST').length;
              pagination = fallbackResponse.data.pagination || pagination;
            }
          }
        }

        const hasMore = pagination?.hasMore ?? postItemsCount >= limit;
        const newCursor = pagination?.nextCursor || null;

        const currentFeedItems = get().feedItems;
        const shouldPreserveFeedOnEmptyRefresh =
          refresh &&
          !subject &&
          transformedFeedItems.length === 0 &&
          currentFeedItems.length > 0;

        // Apply recommendations if in FOR_YOU mode (only for /posts fallback)
        let combinedFeedItems = shouldPreserveFeedOnEmptyRefresh
          ? currentFeedItems
          : refresh
            ? transformedFeedItems
            : [...currentFeedItems, ...transformedFeedItems];

        if (get().feedMode === 'FOR_YOU' && !usePersonalizedFeed) {
          // Fallback: client-side ranking only if server endpoint was not used
          // Recommendation engine requires Post[], so we temporarily extract, sort, and recombine
          const extractPosts = combinedFeedItems.filter(i => i.type === 'POST').map(i => i.data as Post);
          const sortedPosts = recommendationEngine.generateFeed(extractPosts);

          let sortedIdx = 0;
          combinedFeedItems = combinedFeedItems.map(item => {
            if (item.type === 'POST' && sortedIdx < sortedPosts.length) {
              return { type: 'POST', data: sortedPosts[sortedIdx++] };
            }
            return item;
          });
        }

        // Deduplicate posts by ID to prevent FlashList layout issues
        const seenIds = new Set<string>();
        let finalFeedItems = combinedFeedItems.filter(item => {
          if (item?.type === 'POST') {
            const postId = item.data?.id;
            if (!postId) return false; // Filter out corrupted POST items
            if (seenIds.has(postId)) return false;
            seenIds.add(postId);
          }
          return true;
        });

        // Keep a bounded rolling window instead of letting the RN heap grow forever.
        // On append, preserve the newest page at the tail; the old first-500 cap
        // could fetch more data forever while never exposing rows past the cap.
        const maxFeedItemsInMemory = 1500;
        const optimizedFeedItems = finalFeedItems.length > maxFeedItemsInMemory
          ? refresh
            ? finalFeedItems.slice(0, maxFeedItemsInMemory)
            : finalFeedItems.slice(finalFeedItems.length - maxFeedItemsInMemory)
          : finalFeedItems;

        // Track timestamp of newest post for real-time dedup. Use the full merged
        // set so trimming older/visible rows never moves the latest marker backward.
        const allMergedPostsOnly = finalFeedItems.filter(i => i.type === 'POST').map(i => i.data as Post);
        const optimizedPostsOnly = optimizedFeedItems.filter(i => i.type === 'POST').map(i => i.data as Post);
        const newestTimestamp = allMergedPostsOnly.length > 0
          ? allMergedPostsOnly.reduce((latest, p) =>
            new Date(p.createdAt) > new Date(latest) ? p.createdAt : latest,
            get().lastFeedTimestamp || allMergedPostsOnly[0].createdAt
          )
          : get().lastFeedTimestamp;

        set({
          feedItems: optimizedFeedItems,
          postsPage: page + 1,
          nextCursor: newCursor,
          hasMorePosts: hasMore,
          isLoadingPosts: false,
          lastFeedTimestamp: newestTimestamp,
          // Clear pending posts on refresh to avoid stale "New Posts" button
          ...(refresh ? { pendingPosts: [] } : {}),
        });

        // Write to offline cache on page 1 (most recent posts)
        if (page === 1 && optimizedPostsOnly.length > 0) {
          initialFeedRetryAttempts = 0;
          cacheFeedPosts(optimizedPostsOnly, authState.user.id).catch(() => { });
        }

        // ── Client-side suggestion carousel fallback ──────────────────────────
        // If the backend didn't inject SUGGESTED_USERS or SUGGESTED_COURSES rows
        // (e.g. seed data is sparse or user is new), fetch and inject them ourselves.
        // This runs in the background so it never blocks the feed render.
        if (page === 1) {
          const hasSuggestedUsers = optimizedFeedItems.some(i => i.type === 'SUGGESTED_USERS');
          const hasSuggestedCourses = optimizedFeedItems.some(i => i.type === 'SUGGESTED_COURSES');
          const hasSuggestedQuizzes = optimizedFeedItems.some(i => i.type === 'SUGGESTED_QUIZZES');

          if (!hasSuggestedUsers || !hasSuggestedCourses || !hasSuggestedQuizzes) {
            (async () => {
              try {
                const [usersResp, coursesResp, quizzesResp] = await Promise.allSettled([
                  !hasSuggestedUsers
                    ? feedApi.get('/users/suggested', { params: { limit: 10 }, timeout: 5000 })
                    : Promise.resolve(null),
                  // ✅ FIX: Courses moved to learn-service (port 3018) — use learnApi, not feedApi
                  !hasSuggestedCourses
                    ? learnApi.get('/courses', { params: { limit: 8, page: 1, isPublished: true }, timeout: 5000 })
                    : Promise.resolve(null),
                  !hasSuggestedQuizzes
                    ? quizApi.get('/quizzes/recommended', { params: { limit: 8 }, timeout: 5000 })
                    : Promise.resolve(null),
                ]);

                // /users/suggested returns { success: true, users: [...] }
                const users: any[] =
                  usersResp.status === 'fulfilled' && usersResp.value?.data?.users
                    ? usersResp.value.data.users
                    : [];

                // learn-service /courses returns { courses: [...], pagination: {...} }
                // Map thumbnail → thumbnailUrl to match SuggestedCoursesCarousel's Course type
                const courses: any[] = (
                  coursesResp.status === 'fulfilled' && coursesResp.value?.data?.courses
                    ? coursesResp.value.data.courses
                    : []
                ).map((c: any) => ({
                  ...c,
                  thumbnailUrl: c.thumbnailUrl || c.thumbnail,
                  enrollmentCount: c.enrollmentCount ?? c.enrolledCount ?? 0,
                  instructor: c.instructor ? {
                    id: c.instructor.id,
                    firstName: c.instructor.firstName || c.instructor.name?.split(' ')[0] || '',
                    lastName: c.instructor.lastName || c.instructor.name?.split(' ').slice(1).join(' ') || '',
                    profilePictureUrl: c.instructor.profilePictureUrl || c.instructor.avatar,
                    isEmailVerified: c.instructor.isEmailVerified ?? false,
                  } : undefined,
                }));

                const quizzes: any[] =
                  quizzesResp.status === 'fulfilled' && quizzesResp.value?.data?.data
                    ? quizzesResp.value.data.data
                    : [];

                if (users.length === 0 && courses.length === 0 && quizzes.length === 0) return;

                set(state => {
                  // Re-check after async gap in case another fetch already injected them
                  const alreadyHasUsers = state.feedItems.some(i => i.type === 'SUGGESTED_USERS');
                  const alreadyHasCourses = state.feedItems.some(i => i.type === 'SUGGESTED_COURSES');
                  const alreadyHasQuizzes = state.feedItems.some(i => i.type === 'SUGGESTED_QUIZZES');

                  const items = [...state.feedItems];

                  // Inject suggested users at position 6 (after first 6 posts)
                  if (!alreadyHasUsers && users.length > 0) {
                    const insertAt = Math.min(6, items.length);
                    items.splice(insertAt, 0, { type: 'SUGGESTED_USERS', data: users });
                  }

                  // Inject suggested courses at position 14 (after suggested users insert)
                  if (!alreadyHasCourses && courses.length > 0) {
                    const insertAt = Math.min(14, items.length);
                    items.splice(insertAt, 0, { type: 'SUGGESTED_COURSES', data: courses });
                  }

                  // Inject suggested quizzes at position 22 (after suggested courses insert)
                  if (!alreadyHasQuizzes && quizzes.length > 0) {
                    const insertAt = Math.min(22, items.length);
                    items.splice(insertAt, 0, { type: 'SUGGESTED_QUIZZES', data: quizzes });
                  }

                  return { feedItems: items };
                });

                if (__DEV__) {
                  console.log(`✅ [FeedStore] Client-side carousels injected: ${users.length} users, ${courses.length} courses, ${quizzes.length} quizzes`);
                }
              } catch (err) {
                // Silent — carousels are an enhancement, not critical
                if (__DEV__) console.log('⚠️ [FeedStore] Carousel fallback skipped:', err);
              }
            })();
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Background: prefetch a few first-page thumbnails after interactions settle.
        // Doing this immediately during append can compete with JS/UI work while the
        // user is starting to scroll.
        if (page === 1) {
          const urlsToPrefetch = optimizedPostsOnly
            .flatMap((p: Post) => p.mediaUrls?.slice(0, 1) || [])
            .filter(Boolean)
            .slice(0, 6);

          InteractionManager.runAfterInteractions(() => {
            urlsToPrefetch.forEach((url: string) => Image.prefetch(url).catch(() => { }));
          });
        }
      } else {
        set({ isLoadingPosts: false });
      }
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);

      // Use mock data if API fails in development
      if (__DEV__ && error.code === 'TIMEOUT_ERROR') {
        console.log('📦 Using mock data for offline development');
        set({
          feedItems: refresh ? mockPosts.map(p => ({ type: 'POST' as const, data: p })) : [...get().feedItems, ...mockPosts.map(p => ({ type: 'POST' as const, data: p }))],
          postsPage: page + 1,
          hasMorePosts: false,
          isLoadingPosts: false,
        });
      } else {
        set({ isLoadingPosts: false });
      }

      // Automatic bounded retry for first-load failures when feed is still empty.
      if (page === 1 && error?.code !== 'UNAUTHORIZED') {
        const state = get();
        const latestAuthState = useAuthStore.getState();
        if (
          state.feedItems.length === 0 &&
          initialFeedRetryAttempts < MAX_INITIAL_FEED_RETRIES &&
          latestAuthState.isAuthenticated &&
          !latestAuthState.isLoggingOut &&
          !!latestAuthState.user
        ) {
          initialFeedRetryAttempts += 1;
          const retryDelay = INITIAL_RETRY_BASE_DELAY_MS * initialFeedRetryAttempts;
          if (initialFeedRetryTimer) {
            clearTimeout(initialFeedRetryTimer);
          }
          initialFeedRetryTimer = setTimeout(() => {
            initialFeedRetryTimer = null;
            const latestState = get();
            const retryAuthState = useAuthStore.getState();
            if (
              !latestState.isLoadingPosts &&
              latestState.feedItems.length === 0 &&
              retryAuthState.isAuthenticated &&
              !retryAuthState.isLoggingOut &&
              !!retryAuthState.user
            ) {
              latestState.fetchPosts(true, subject).catch(() => { });
            }
          }, retryDelay);
        }
      }
    }
  },

  // Fetch stories
  fetchStories: async () => {
    set({ isLoadingStories: true });

    try {
      const response = await feedApi.get('/stories', {
        timeout: 15000, // Reduce timeout to 15s
      });

      // Backend returns { stories: [...] } or { success, storyGroups }
      const groups = response.data.stories || response.data.storyGroups || [];

      // Transform to mobile app format
      const storyGroups: StoryGroup[] = groups.map((group: any) => ({
        user: {
          id: group.user?.id,
          name: group.user?.name,
          firstName: group.user?.name?.split(' ')[0],
          lastName: group.user?.name?.split(' ').slice(1).join(' '),
          profilePictureUrl: group.user?.avatar || group.user?.profilePictureUrl,
        },
        stories: (group.stories || []).map((story: any) => ({
          id: story.id,
          type: story.type,
          mediaUrl: story.mediaUrl,
          thumbnailUrl: story.thumbnailUrl,
          text: story.text,
          backgroundColor: story.backgroundColor,
          textColor: story.textColor,
          duration: story.duration || 5,
          viewCount: story.viewCount || 0,
          isViewed: story.isViewed || false,
          createdAt: story.createdAt,
          expiresAt: story.expiresAt,
        })),
        hasUnviewed: group.hasUnviewed || false,
      }));

      set({
        storyGroups,
        isLoadingStories: false,
      });
    } catch (error: any) {
      console.error('Failed to fetch stories:', error);

      // Use mock data if API fails in development
      if (__DEV__ && error.code === 'TIMEOUT_ERROR') {
        console.log('📦 Using mock stories for offline development');
        set({
          storyGroups: mockStories,
          isLoadingStories: false
        });
      } else {
        set({ isLoadingStories: false, storyGroups: [] });
      }
    }
  },

  // Create a new post
  createPost: async (content, mediaUrls = [], postType = 'ARTICLE', pollOptions = [], quizData, title, visibility = 'PUBLIC', pollSettings, courseData, projectData, topicTags, deadline, questionBounty = 0, mediaMetadata = []) => {
    try {
      // Upload local images to R2 before creating post
      let uploadedMediaUrls = mediaUrls;
      let resolvedMediaMetadata = metadataForUris(mediaUrls, mediaMetadata);

      const isLocalUri = (uri: string) => uri && !uri.startsWith('http') && !uri.startsWith('https') && !uri.startsWith('data:');
      const hasLocalImages = mediaUrls.some(isLocalUri);

      if (mediaUrls.length > 0 && hasLocalImages) {
        console.log('📤 [FeedStore] Uploading images to R2...');

        try {
          // Upload to backend using expo-file-system to avoid RN fetch boundary issues on Android
          const { Config } = await import('@/config/env');
          const { tokenService } = await import('@/services/token');
          const FileSystem = await import('expo-file-system');
          const token = await tokenService.getAccessToken();

          const localFiles = mediaUrls.filter(isLocalUri);
          const mappedRequests = localFiles.map(uri => {
            const filename = uri.split('/').pop() || `file-${Date.now()}`;
            const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase() || 'jpg';
            let type = 'image/jpeg';
            if (['png', 'webp', 'gif'].includes(ext)) type = `image/${ext}`;
            else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) type = ext === 'mov' ? 'video/quicktime' : `video/${ext}`;
            return { originalName: filename, mimeType: type, uri };
          });

          // 1. Ask backend for direct R2 Presigned upload tickets
          console.log(`🎟️ [FeedStore] Requesting ${mappedRequests.length} Presigned URLs...`);
          const ticketRes = await fetch(`${Config.feedUrl}/presigned-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ requests: mappedRequests })
          });

          if (!ticketRes.ok) {
            throw new Error(`Failed to get presigned URLs: ${ticketRes.status}`);
          }
          const ticketData = await ticketRes.json();
          if (!ticketData.success || !ticketData.data) throw new Error('Invalid presigned ticket response');

          // 2. Upload directly to Cloudflare R2 bypassing Google Cloud Run limits
          const tickets = ticketData.data; // [{ presignedUrl, key, publicUrl }]
          uploadedMediaUrls = [];

          for (let i = 0; i < mediaUrls.length; i++) {
            const uri = mediaUrls[i];
            if (isLocalUri(uri)) {
              const reqMeta = mappedRequests.find(r => r.uri === uri);
              const ticket = tickets[mappedRequests.indexOf(reqMeta!)];

              console.log(`📤 [FeedStore] Direct PUT to Cloudflare R2: ${reqMeta?.originalName}`);

              try {
                const response = await FileSystem.uploadAsync(
                  ticket.presignedUrl,
                  uri,
                  {
                    httpMethod: 'PUT',
                    uploadType: 0, // FileSystemUploadType.BINARY_CONTENT (Raw direct upload)
                    headers: {
                      'Content-Type': reqMeta!.mimeType
                    }
                  }
                );

                if (response.status !== 200) {
                  throw new Error(`Direct R2 PUT failed (${response.status}): ${response.body}`);
                }

                // Push the final read-optimized URL to the array
                uploadedMediaUrls.push(ticket.publicUrl);
              } catch (err: any) {
                console.error('❌ [FeedStore] Direct R2 Upload failed:', err);
                // Alert user for debugging
                import('react-native').then(({ Alert }) => {
                  Alert.alert('R2 Direct Upload Error', `Error: ${err.message || String(err)}`);
                });
                throw new Error(`Direct upload failed: ${err.message}`);
              }
            } else {
              uploadedMediaUrls.push(uri);
            }
          }

          resolvedMediaMetadata = metadataForUris(uploadedMediaUrls, resolvedMediaMetadata);
          console.log('✅ [FeedStore] All images uploaded successfully:', uploadedMediaUrls);
        } catch (uploadError: any) {
          console.error('❌ [FeedStore] Upload error:', uploadError);
          throw uploadError;
        }
      }

      // Calculate poll deadline if duration provided
      let resolvedDeadline = deadline;
      if (postType === 'POLL' && pollSettings?.duration) {
        const now = new Date();
        now.setHours(now.getHours() + pollSettings.duration);
        resolvedDeadline = now.toISOString();
      }

      // Now create post with uploaded URLs
      const response = await feedApi.post('/posts', {
        content,
        title,
        mediaUrls: uploadedMediaUrls,
        postType,
        visibility,
        mediaDisplayMode: 'AUTO',
        mediaMetadata: resolvedMediaMetadata,
        mediaAspectRatio: primaryMediaAspectRatio(resolvedMediaMetadata),
        pollOptions: postType === 'POLL' ? pollOptions : undefined,
        pollSettings: postType === 'POLL' ? pollSettings : undefined, // Send full settings
        deadline: resolvedDeadline, // Send deadline for backend to handle
        quizData: postType === 'QUIZ' ? quizData : undefined,
        courseData: postType === 'COURSE' ? courseData : undefined,
        projectData: postType === 'PROJECT' ? projectData : undefined,
        topicTags: topicTags || [],
        questionBounty: postType === 'QUESTION' ? questionBounty : undefined,
      });

      if (response.data.success) {
        const newPostData = response.data.data || response.data.post;

        // Transform to match mobile app Post type
        const newPost: Post = {
          id: newPostData.id,
          author: {
            id: newPostData.author?.id,
            firstName: newPostData.author?.firstName,
            lastName: newPostData.author?.lastName,
            name: `${newPostData.author?.firstName || ''} ${newPostData.author?.lastName || ''}`.trim(),
            profilePictureUrl: newPostData.author?.profilePictureUrl,
            role: newPostData.author?.role,
            isVerified: newPostData.author?.isVerified || false,
            email: newPostData.author?.email || '',
            languages: newPostData.author?.languages || [],
            interests: newPostData.author?.interests || [],
            isOnline: newPostData.author?.isOnline || false,
            createdAt: newPostData.author?.createdAt || new Date().toISOString(),
            updatedAt: newPostData.author?.updatedAt || new Date().toISOString(),
          },
          content: newPostData.content,
          title: newPostData.title,
          postType: newPostData.postType || postType,
          mediaUrls: newPostData.mediaUrls || uploadedMediaUrls,
          mediaDisplayMode: newPostData.mediaDisplayMode || 'AUTO',
          mediaMetadata: newPostData.mediaMetadata || newPostData.media_metadata || resolvedMediaMetadata,
          mediaAspectRatio: newPostData.mediaAspectRatio ?? newPostData.media_aspect_ratio ?? primaryMediaAspectRatio(resolvedMediaMetadata),
          authorId: newPostData.author?.id,
          likes: newPostData.likesCount || 0,
          comments: newPostData.commentsCount || 0,
          shares: newPostData.sharesCount || 0,
          isLiked: false,
          isBookmarked: false,
          visibility: newPostData.visibility || 'PUBLIC',
          tags: newPostData.tags || [],
          createdAt: newPostData.createdAt || new Date().toISOString(),
          updatedAt: newPostData.updatedAt || new Date().toISOString(),
          topicTags: newPostData.topicTags || [],
          learningMeta: newPostData.learningMeta || {},
          // Add quiz data if it's a quiz post
          ...(postType === 'QUIZ' && newPostData.quiz && {
            quizData: {
              id: newPostData.quiz.id,
              questions: newPostData.quiz.questions || [],
              timeLimit: newPostData.quiz.timeLimit,
              passingScore: newPostData.quiz.passingScore,
              totalPoints: newPostData.quiz.totalPoints,
              resultsVisibility: newPostData.quiz.resultsVisibility,
              userAttempt: null, // No attempt yet since just created
            },
          }),
          // Add poll data if it's a poll post
          ...(postType === 'POLL' && newPostData.pollOptions && {
            pollOptions: newPostData.pollOptions.map((opt: any) => ({
              id: opt.id,
              text: opt.text,
              votes: opt.votes ?? opt.votesCount ?? opt._count?.votes ?? 0,
            })),
          }),
        };

        // Add to top of feed with optimistic update
        set((state) => ({
          feedItems: [{ type: 'POST', data: newPost }, ...state.feedItems],
        }));

        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Failed to create post:', error);
      console.error('Error details:', error.response?.data);
      return false;
    }
  },

  // Like a post
  likePost: async (postId) => {
    // Optimistic update
    set((state) => ({
      feedItems: state.feedItems.map((item) =>
        item.type === 'POST' && item.data.id === postId
          ? { ...item, data: { ...item.data, isLiked: true, likes: item.data.likes + 1 } }
          : item
      ),
    }));

    // Track for recommendation engine (local)
    const postItem = get().feedItems.find(i => i.type === 'POST' && i.data.id === postId) as { type: 'POST', data: Post } | undefined;
    if (postItem) {
      recommendationEngine.trackAction('LIKE', postItem.data);
      set({ userInterestProfile: recommendationEngine.getUserProfile() });
    }

    try {
      await feedApi.post(`/posts/${postId}/like`);
      // Track for server-side feed algorithm (fire-and-forget)
      feedApi.post('/feed/track-action', { action: 'LIKE', postId, source: 'feed' }).catch(() => { });
    } catch (error) {
      // Revert on error
      set((state) => ({
        feedItems: state.feedItems.map((item) =>
          item.type === 'POST' && item.data.id === postId
            ? { ...item, data: { ...item.data, isLiked: false, likes: item.data.likes - 1 } }
            : item
        ),
      }));
    }
  },

  // Unlike a post
  unlikePost: async (postId) => {
    // Optimistic update
    set((state) => ({
      feedItems: state.feedItems.map((item) =>
        item.type === 'POST' && item.data.id === postId
          ? { ...item, data: { ...item.data, isLiked: false, likes: item.data.likes - 1 } }
          : item
      ),
    }));

    try {
      // Backend uses POST for toggle (handles both like and unlike)
      await feedApi.post(`/posts/${postId}/like`);
    } catch (error) {
      // Revert on error
      set((state) => ({
        feedItems: state.feedItems.map((item) =>
          item.type === 'POST' && item.data.id === postId
            ? { ...item, data: { ...item.data, isLiked: true, likes: item.data.likes + 1 } }
            : item
        ),
      }));
    }
  },

  // Bookmark a post (toggle)
  bookmarkPost: async (postId) => {
    const postItem = get().feedItems.find(i => i.type === 'POST' && i.data.id === postId) as { type: 'POST', data: Post } | undefined;
    if (!postItem) return;

    const post = postItem.data;
    const wasBookmarked = post.isBookmarked;

    // Optimistic update
    set((state) => ({
      feedItems: state.feedItems.map((item) =>
        item.type === 'POST' && item.data.id === postId ? { ...item, data: { ...item.data, isBookmarked: !wasBookmarked } } : item
      ),
    }));

    // Track for recommendation engine (local)
    if (!wasBookmarked) {
      recommendationEngine.trackAction('BOOKMARK', post);
      set({ userInterestProfile: recommendationEngine.getUserProfile() });
    }

    try {
      // Backend uses POST for toggle (handles both bookmark and unbookmark)
      await feedApi.post(`/posts/${postId}/bookmark`);
      // Track for server-side feed algorithm (only on bookmark, not unbookmark)
      if (!wasBookmarked) {
        feedApi.post('/feed/track-action', { action: 'BOOKMARK', postId, source: 'feed' }).catch(() => { });
      }
    } catch (error) {
      // Revert on error
      set((state) => ({
        feedItems: state.feedItems.map((item) =>
          item.type === 'POST' && item.data.id === postId ? { ...item, data: { ...item.data, isBookmarked: wasBookmarked } } : item
        ),
      }));
    }
  },

  // Delete a post
  deletePost: async (postId) => {
    const postItem = get().feedItems.find((i) => i.type === 'POST' && i.data.id === postId) as { type: 'POST', data: Post };
    const post = postItem?.data;

    // Optimistic update
    set((state) => ({
      feedItems: state.feedItems.filter((i) => !(i.type === 'POST' && i.data.id === postId)),
    }));

    try {
      await feedApi.delete(`/posts/${postId}`);
    } catch (error) {
      // Revert on error
      if (post) {
        set((state) => ({
          feedItems: [
            { type: 'POST', data: post },
            ...state.feedItems
          ],
        }));
      }
    }
  },

  // View a story
  viewStory: async (storyId) => {
    try {
      await feedApi.post(`/stories/${storyId}/view`);

      // Update local state
      set((state) => ({
        storyGroups: state.storyGroups.map((group) => ({
          ...group,
          stories: group.stories.map((story) =>
            story.id === storyId
              ? { ...story, isViewed: true, viewCount: story.viewCount + 1 }
              : story
          ),
        })),
      }));
    } catch (error) {
      console.error('Failed to view story:', error);
    }
  },

  // Create a story
  createStory: async (data) => {
    try {
      const response = await feedApi.post('/stories', data);

      if (response.data.success) {
        // Refresh stories
        get().fetchStories();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to create story:', error);
      return false;
    }
  },

  // Set active story group for viewer
  setActiveStoryGroup: (index) => {
    set({ activeStoryGroupIndex: index, activeStoryIndex: 0 });
  },

  // Navigate to next story
  nextStory: () => {
    const { storyGroups, activeStoryGroupIndex, activeStoryIndex } = get();

    if (activeStoryGroupIndex === null) return;

    const currentGroup = storyGroups[activeStoryGroupIndex];

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      // Next story in same group
      set({ activeStoryIndex: activeStoryIndex + 1 });
    } else if (activeStoryGroupIndex < storyGroups.length - 1) {
      // First story in next group
      set({ activeStoryGroupIndex: activeStoryGroupIndex + 1, activeStoryIndex: 0 });
    } else {
      // End of all stories
      set({ activeStoryGroupIndex: null, activeStoryIndex: 0 });
    }
  },

  // Navigate to previous story
  previousStory: () => {
    const { storyGroups, activeStoryGroupIndex, activeStoryIndex } = get();

    if (activeStoryGroupIndex === null) return;

    if (activeStoryIndex > 0) {
      // Previous story in same group
      set({ activeStoryIndex: activeStoryIndex - 1 });
    } else if (activeStoryGroupIndex > 0) {
      // Last story in previous group
      const prevGroup = storyGroups[activeStoryGroupIndex - 1];
      set({
        activeStoryGroupIndex: activeStoryGroupIndex - 1,
        activeStoryIndex: prevGroup.stories.length - 1,
      });
    }
  },

  // Fetch comments for a post
  fetchComments: async (postId) => {
    set((state) => ({
      isLoadingComments: { ...state.isLoadingComments, [postId]: true },
    }));

    try {
      const response = await feedApi.get(`/posts/${postId}/comments`, {
        params: { includeTotal: false },
      });

      if (response.data.success) {
        const commentsData = response.data.data || [];

        // Transform comments to match mobile app Comment type
        const transformComment = (comment: any): Comment => ({
          id: comment.id,
          content: comment.content,
          author: {
            id: comment.author?.id,
            firstName: comment.author?.firstName,
            lastName: comment.author?.lastName,
            name: `${comment.author?.firstName || ''} ${comment.author?.lastName || ''}`.trim(),
            username: comment.author?.username || 'user',
            profilePictureUrl: comment.author?.profilePictureUrl,
            role: comment.author?.role,
            isVerified: comment.author?.isVerified || false,
            email: comment.author?.email || '',
            languages: comment.author?.languages || [],
            interests: comment.author?.interests || [],
            isOnline: comment.author?.isOnline || false,
            createdAt: comment.author?.createdAt || new Date().toISOString(),
            updatedAt: comment.author?.updatedAt || new Date().toISOString(),
          },
          postId,
          parentId: comment.parentId,
          likes: comment.likesCount || 0,
          isLiked: comment.isLiked || false,
          replies: (comment.replies || []).map(transformComment),
          createdAt: comment.createdAt,
        });
        const transformedComments: Comment[] = commentsData.map(transformComment);

        set((state) => ({
          comments: { ...state.comments, [postId]: transformedComments },
          isLoadingComments: { ...state.isLoadingComments, [postId]: false },
        }));
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      set((state) => ({
        isLoadingComments: { ...state.isLoadingComments, [postId]: false },
      }));
    }
  },

  // Add a comment to a post
  addComment: async (postId, content, parentId) => {
    set((state) => ({
      isSubmittingComment: { ...state.isSubmittingComment, [postId]: true },
    }));

    // Track for recommendation engine
    const postItem = get().feedItems.find((i) => i.type === 'POST' && i.data.id === postId) as { type: 'POST', data: Post } | undefined;
    if (postItem) {
      recommendationEngine.trackAction('COMMENT', postItem.data);
      set({ userInterestProfile: recommendationEngine.getUserProfile() });
    }

    try {
      const response = await feedApi.post(`/posts/${postId}/comments`, { content, parentId });

      if (response.data.success) {
        const newComment = response.data.data;

        // Transform comment
        const transformedComment: Comment = {
          id: newComment.id,
          content: newComment.content,
          author: {
            id: newComment.author?.id,
            firstName: newComment.author?.firstName,
            lastName: newComment.author?.lastName,
            name: `${newComment.author?.firstName || ''} ${newComment.author?.lastName || ''}`.trim(),
            username: newComment.author?.username || 'user',
            profilePictureUrl: newComment.author?.profilePictureUrl,
            role: newComment.author?.role,
            isVerified: newComment.author?.isVerified || false,
            email: newComment.author?.email || '',
            languages: newComment.author?.languages || [],
            interests: newComment.author?.interests || [],
            isOnline: newComment.author?.isOnline || false,
            createdAt: newComment.author?.createdAt || new Date().toISOString(),
            updatedAt: newComment.author?.updatedAt || new Date().toISOString(),
          },
          postId,
          parentId: newComment.parentId,
          likes: 0,
          isLiked: false,
          replies: [],
          createdAt: newComment.createdAt,
        };

        // Update comments list
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: parentId
              ? (state.comments[postId] || []).map((comment) =>
                comment.id === parentId
                  ? { ...comment, replies: [...(comment.replies || []), transformedComment] }
                  : comment
              )
              : [transformedComment, ...(state.comments[postId] || [])],
          },
          isSubmittingComment: { ...state.isSubmittingComment, [postId]: false },
          // Update post comment count
          feedItems: state.feedItems.map((item) =>
            item.type === 'POST' && item.data.id === postId ? { ...item, data: { ...item.data, comments: item.data.comments + 1 } } : item
          ),
        }));

        return true;
      }

      set((state) => ({
        isSubmittingComment: { ...state.isSubmittingComment, [postId]: false },
      }));
      return false;
    } catch (error) {
      console.error('Failed to add comment:', error);
      set((state) => ({
        isSubmittingComment: { ...state.isSubmittingComment, [postId]: false },
      }));
      return false;
    }
  },

  // Like/unlike a comment
  toggleCommentLike: async (postId, commentId) => {
    const updateComment = (comments: Comment[], apply: (comment: Comment) => Comment): Comment[] =>
      comments.map((comment) => {
        if (comment.id === commentId) return apply(comment);
        if (comment.replies?.length) {
          return { ...comment, replies: updateComment(comment.replies, apply) };
        }
        return comment;
      });

    try {
      const response = await feedApi.post(`/comments/${commentId}/like`);

      if (response.data.success) {
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: updateComment(state.comments[postId] || [], (comment) => ({
              ...comment,
              isLiked: response.data.isLiked,
              likes: response.data.likesCount,
            })),
          },
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to toggle comment like:', error);
      return false;
    }
  },

  // Delete a comment
  deleteComment: async (commentId, postId) => {
    try {
      await feedApi.delete(`/comments/${commentId}`);

      // Update comments list
      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: (state.comments[postId] || []).filter((c) => c.id !== commentId),
        },
        // Update post comment count
        feedItems: state.feedItems.map((item) =>
          item.type === 'POST' && item.data.id === postId ? { ...item, data: { ...item.data, comments: item.data.comments - 1 } } : item
        ),
      }));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  },

  // Verify an answer (Q&A Bounty)
  verifyAnswer: async (postId, commentId) => {
    try {
      const response = await feedApi.post(`/posts/${postId}/comments/${commentId}/verify`);
      if (response.data.success) {
        // Update the comment's verified status locally
        set((state) => {
          const postComments = state.comments[postId] || [];
          return {
            comments: {
              ...state.comments,
              [postId]: postComments.map((c) =>
                c.id === commentId ? { ...c, isVerifiedAnswer: true } : c
              ),
            },
            // Also update the post's learningMeta to show it's answered
            feedItems: state.feedItems.map((item) =>
              item.type === 'POST' && item.data.id === postId
                ? {
                  ...item,
                  data: {
                    ...item.data,
                    learningMeta: {
                      ...(item.data.learningMeta || {}),
                      isAnswered: true,
                      acceptedAnswerId: commentId,
                    }
                  }
                }
                : item
            ),
          };
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to verify answer:', error);
      return false;
    }
  },

  // Vote on a poll
  voteOnPoll: async (postId, optionId) => {
    const state = get();
    const postItem = state.feedItems.find(i => i.type === 'POST' && i.data.id === postId) as { type: 'POST', data: Post } | undefined;
    const post = postItem?.data;

    if (!post || !post.pollOptions) {
      console.error('❌ Cannot vote: Post or poll options not found');
      return;
    }

    // Debug logging
    if (__DEV__) {
      console.log('🗳️ Voting on poll:', {
        postId,
        optionId,
        currentVote: post.userVotedOptionId,
        optionsCount: post.pollOptions.length,
        allOptions: post.pollOptions.map(o => ({ id: o.id, text: o.text, votes: o.votes })),
        isChangingVote: !!post.userVotedOptionId,
      });

      // Check if user already voted
      if (post.userVotedOptionId) {
        console.log('⚠️ User already voted on this poll!', {
          previousVote: post.userVotedOptionId,
          newVote: optionId,
          isSameOption: post.userVotedOptionId === optionId,
        });
      }
    }

    // Store previous state for rollback
    const previousVote = post.userVotedOptionId;
    const previousOptions = post.pollOptions;

    // Optimistic update - calculate new vote counts
    const updatedOptions = post.pollOptions.map(opt => {
      let votes = opt.votes || 0;

      // Remove vote from previous option
      if (previousVote === opt.id) {
        votes = Math.max(0, votes - 1);
      }

      // Add vote to new option
      if (opt.id === optionId) {
        votes += 1;
      }

      return { ...opt, votes };
    });

    // Apply optimistic update immediately
    set((state) => ({
      feedItems: state.feedItems.map((item) =>
        item.type === 'POST' && item.data.id === postId
          ? {
            ...item,
            data: {
              ...item.data,
              pollOptions: updatedOptions,
              userVotedOptionId: optionId,
            }
          }
          : item
      ),
    }));

    try {
      if (__DEV__) {
        console.log('📤 Sending vote request:', { optionId });
      }

      const response = await feedApi.post(`/posts/${postId}/vote`, { optionId });

      if (__DEV__) {
        console.log('✅ Vote response:', response.data);
      }

      // Update with server response
      if (response.data.success) {
        const serverUserVotedOptionId = response.data.userVotedOptionId || response.data.data?.userVotedOptionId || optionId;

        set((state) => ({
          feedItems: state.feedItems.map((item) =>
            item.type === 'POST' && item.data.id === postId
              ? {
                ...item,
                data: {
                  ...item.data,
                  userVotedOptionId: serverUserVotedOptionId,
                }
              }
              : item
          ),
        }));

        if (__DEV__) {
          console.log('✅ Vote updated successfully, userVotedOptionId:', serverUserVotedOptionId);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to vote on poll:', error);

      if (__DEV__) {
        console.log('📋 Error details:', {
          message: error?.message,
          code: error?.code,
          response: error?.response?.data,
        });
      }

      // Rollback on error
      set((state) => ({
        feedItems: state.feedItems.map((item) =>
          item.type === 'POST' && item.data.id === postId
            ? {
              ...item,
              data: {
                ...item.data,
                pollOptions: previousOptions,
                userVotedOptionId: previousVote,
              }
            }
            : item
        ),
      }));

      if (__DEV__) {
        console.log('❌ Vote failed, rolled back to previous state');
      }
    }
  },

  // Share a post (track share)
  sharePost: async (postId) => {
    try {
      await feedApi.post(`/posts/${postId}/share`);

      // Update share count locally
      set((state) => ({
        feedItems: state.feedItems.map((item) =>
          item.type === 'POST' && item.data.id === postId ? { ...item, data: { ...item.data, shares: item.data.shares + 1 } } : item
        ),
      }));

      // Track for server-side feed algorithm (fire-and-forget)
      feedApi.post('/feed/track-action', { action: 'SHARE', postId, source: 'feed' }).catch(() => { });
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  },

  // Track View (Batched for performance)
  // Instead of firing 2 HTTP requests per post view, we buffer them
  // and flush to a single bulk endpoint every 60 seconds.
  // Probabilistic sampling: Only track 20% of views for 80% write reduction.
  trackPostView: async (postId) => {
    // Recommendation Engine tracking (local, synchronous - always track for personalization)
    const postItem = get().feedItems.find((i) => i.type === 'POST' && i.data.id === postId) as { type: 'POST', data: Post } | undefined;
    const post = postItem?.data;
    if (post) {
      recommendationEngine.trackAction('VIEW', post);
    }

    // Probabilistic sampling: Only send 20% of views to server (statistically significant)
    if (Math.random() > VIEW_SAMPLE_RATE) {
      return; // Skip this view (80% of the time)
    }

    // Add to view buffer for batched flush
    if (!viewBuffer.has(postId)) {
      viewBuffer.set(postId, { postId, duration: 3, source: 'feed', timestamp: Date.now() });

      // Start flush timer on first buffered view
      if (viewBuffer.size === 1) {
        viewFlushTimer = setTimeout(flushViewBuffer, VIEW_FLUSH_INTERVAL);
      }
    }
  },

  // Update/edit a post
  updatePost: async (postId, data) => {
    try {
      const response = await feedApi.put(`/posts/${postId}`, data);

      if (response.data.error) {
        console.error('❌ [feedStore] Failed to update post:', response.data.error);
        return false;
      }

      // Get updated post data from response
      const rawPost = response.data.data || response.data;
      const existingPost = get().feedItems.find((item) =>
        item.type === 'POST' && item.data.id === postId
      ) as { type: 'POST'; data: Post } | undefined;
      const fallbackAuthor = existingPost?.data.author;

      // Transform to match Post type (same as fetchPosts)
      const transformedPost: Post = {
        id: rawPost.id,
        author: {
          id: rawPost.author?.id || rawPost.authorId || fallbackAuthor?.id,
          firstName: rawPost.author?.firstName || fallbackAuthor?.firstName || '',
          lastName: rawPost.author?.lastName || fallbackAuthor?.lastName || '',
          name: `${rawPost.author?.firstName || fallbackAuthor?.firstName || ''} ${rawPost.author?.lastName || fallbackAuthor?.lastName || ''}`.trim(),
          username: rawPost.author?.username || fallbackAuthor?.username || 'user',
          email: rawPost.author?.email || fallbackAuthor?.email || '',
          profilePictureUrl: rawPost.author?.profilePictureUrl || fallbackAuthor?.profilePictureUrl,
          role: rawPost.author?.role || fallbackAuthor?.role || 'STUDENT',
          bio: rawPost.author?.bio || fallbackAuthor?.bio || '',
          isVerified: rawPost.author?.isVerified ?? fallbackAuthor?.isVerified ?? false,
          isOnline: fallbackAuthor?.isOnline || false,
          languages: rawPost.author?.languages || fallbackAuthor?.languages || [],
          interests: rawPost.author?.interests || fallbackAuthor?.interests || [],
          createdAt: rawPost.author?.createdAt || fallbackAuthor?.createdAt || new Date().toISOString(),
          updatedAt: rawPost.author?.updatedAt || fallbackAuthor?.updatedAt || new Date().toISOString(),
        },
        authorId: rawPost.authorId || rawPost.author?.id,
        content: rawPost.content,
        title: rawPost.title,
        postType: rawPost.postType || 'ARTICLE',
        visibility: rawPost.visibility || 'PUBLIC',
        mediaUrls: rawPost.mediaUrls || [],
        mediaDisplayMode: rawPost.mediaDisplayMode || 'AUTO',
        mediaMetadata: rawPost.mediaMetadata || rawPost.media_metadata || data.mediaMetadata || [],
        mediaAspectRatio: rawPost.mediaAspectRatio ?? rawPost.media_aspect_ratio ?? data.mediaAspectRatio,
        likes: rawPost.likesCount || rawPost._count?.likes || 0,
        comments: rawPost.commentsCount || rawPost._count?.comments || 0,
        shares: rawPost.sharesCount || 0,
        isLiked: rawPost.isLikedByMe || false,
        isBookmarked: rawPost.isBookmarked || false,
        createdAt: rawPost.createdAt,
        updatedAt: rawPost.updatedAt,
        topicTags: rawPost.topicTags || rawPost.tags || [],
        tags: rawPost.tags || rawPost.topicTags || [],
        pollOptions: rawPost.pollOptions?.map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          votes: opt.votes ?? opt.votesCount ?? opt._count?.votes ?? 0,
        })),
        userVotedOptionId: rawPost.userVotedOptionId,
        learningMeta: rawPost.learningMeta,
        // Quiz fields
        quizData: rawPost.postType === 'QUIZ' && rawPost.quiz ? {
          id: rawPost.quiz.id,
          questions: rawPost.quiz.questions || [],
          timeLimit: rawPost.quiz.timeLimit,
          passingScore: rawPost.quiz.passingScore,
          totalPoints: rawPost.quiz.totalPoints || rawPost.quiz.questions?.reduce((sum: number, q: any) => sum + (q.points || 0), 0) || 0,
          resultsVisibility: rawPost.quiz.resultsVisibility,
          shuffleQuestions: rawPost.quiz.shuffleQuestions,
          shuffleAnswers: rawPost.quiz.shuffleAnswers,
          maxAttempts: rawPost.quiz.maxAttempts,
          showReview: rawPost.quiz.showReview,
          showExplanations: rawPost.quiz.showExplanations,
          userAttempt: rawPost.quiz.userAttempt ? {
            id: rawPost.quiz.userAttempt.id,
            score: rawPost.quiz.userAttempt.score,
            passed: rawPost.quiz.userAttempt.passed,
            pointsEarned: rawPost.quiz.userAttempt.pointsEarned,
            submittedAt: rawPost.quiz.userAttempt.submittedAt,
          } : undefined,
        } : undefined,
      };

      // Update post in state
      set((state) => ({
        feedItems: state.feedItems.map((item) =>
          item.type === 'POST' && item.data.id === postId ? { ...item, data: transformedPost } : item
        ),
      }));

      return true;
    } catch (error) {
      console.error('❌ [feedStore] Failed to update post:', error);
      return false;
    }
  },

  // Fetch post analytics
  fetchPostAnalytics: async (postId) => {
    set((state) => ({
      isLoadingAnalytics: { ...state.isLoadingAnalytics, [postId]: true },
    }));

    try {
      console.log('📊 [ANALYTICS] Fetching analytics for post:', postId);
      const response = await feedApi.get(`/posts/${postId}/analytics`);

      console.log('📊 [ANALYTICS] Response received:', response.data);

      if (response.data.success && response.data.analytics) {
        const analytics = response.data.analytics as PostAnalytics;

        set((state) => ({
          postAnalytics: { ...state.postAnalytics, [postId]: analytics },
          isLoadingAnalytics: { ...state.isLoadingAnalytics, [postId]: false },
        }));

        return analytics;
      }

      set((state) => ({
        isLoadingAnalytics: { ...state.isLoadingAnalytics, [postId]: false },
      }));

      return null;
    } catch (error: any) {
      console.error('❌ [ANALYTICS] Failed to fetch analytics:', error);
      console.error('❌ [ANALYTICS] Error details:', error.response?.data);

      set((state) => ({
        isLoadingAnalytics: { ...state.isLoadingAnalytics, [postId]: false },
      }));

      return null;
    }
  },

  // Fetch user's own posts
  fetchMyPosts: async () => {
    set({ isLoadingMyPosts: true });

    try {
      const response = await feedApi.get('/my-posts', {
        params: { limit: 50 },
      });

      if (response.data.success && response.data.data) {
        const posts = response.data.data;

        // Transform posts using shared utility
        const transformedPosts = transformPosts(posts);

        set({ myPosts: transformedPosts, isLoadingMyPosts: false });
      } else {
        set({ isLoadingMyPosts: false });
      }
    } catch (error) {
      console.error('Failed to fetch my posts:', error);
      set({ isLoadingMyPosts: false });
    }
  },

  // Fetch bookmarked posts
  fetchBookmarks: async () => {
    set({ isLoadingBookmarks: true });

    try {
      const response = await feedApi.get('/bookmarks', {
        params: { limit: 50, includeTotal: false },
      });

      if (response.data.success && response.data.data) {
        const posts = response.data.data;

        // Transform posts using shared utility (mark all as bookmarked)
        const transformedPosts = transformPosts(posts).map(p => ({ ...p, isBookmarked: true }));

        set({ bookmarkedPosts: transformedPosts, isLoadingBookmarks: false });
      } else {
        set({ isLoadingBookmarks: false });
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      set({ isLoadingBookmarks: false });
    }
  },

  // Real-time subscription
  subscribeToFeed: () => {
    console.log('🔌 [FeedStore] Subscribing to realtime feed...');
    const { unsubscribeFromFeed } = get();
    const authState = useAuthStore.getState();

    if (!authState.isAuthenticated || authState.isLoggingOut || !authState.user) {
      unsubscribeFromFeed();
      return;
    }

    // Guard: if Supabase URL is missing or placeholder, skip realtime (safe degradation)
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl || supabaseUrl.includes('your-project')) {
      console.warn('⚠️ [FeedStore] Supabase URL not configured — realtime disabled. Set EXPO_PUBLIC_SUPABASE_URL.');
      return;
    }

    try {
      // Unsubscribe existing if any
      unsubscribeFromFeed();

      const stopRealtimeFallbackPolling = () => {
        if (realtimeFallbackPollTimer) {
          clearInterval(realtimeFallbackPollTimer);
          realtimeFallbackPollTimer = null;
          if (__DEV__) {
            console.log('✅ [FeedStore] Realtime recovered — stopped fallback polling');
          }
        }
      };

      const pollForMissedPosts = async () => {
        if (realtimeFallbackPollInFlight) return;
        realtimeFallbackPollInFlight = true;

        try {
          const { lastFeedTimestamp, feedItems, pendingPosts } = get();
          const firstPost = feedItems.find(i => i.type === 'POST');
          const latestCreatedAt = lastFeedTimestamp || (firstPost?.type === 'POST' ? firstPost.data.createdAt : undefined);
          if (!latestCreatedAt) return;

          const response = await feedApi.get('/posts/feed', {
            params: { mode: 'RECENT', limit: 8, page: 1, fields: 'minimal' },
            timeout: FEED_RETRY_TIMEOUT_MS,
            headers: { 'X-No-Retry': 'true' },
          });

          if (!response.data?.success) return;

          const existingIds = new Set([
            ...feedItems.filter(i => i.type === 'POST').map(i => i.data.id),
            ...pendingPosts.map(p => p.id),
          ]);

          const rawItems: any[] = response.data.data || response.data.posts || [];
          const normalized = normalizeFeedItems(rawItems);
          const candidatePosts = normalized
            .filter(item => item.type === 'POST')
            .map(item => item.data as Post);

          const dedupMap = new Map<string, Post>();
          candidatePosts.forEach((post) => {
            if (!post?.id || dedupMap.has(post.id)) return;
            if (new Date(post.createdAt) <= new Date(latestCreatedAt)) return;
            if (existingIds.has(post.id)) return;
            dedupMap.set(post.id, post);
          });

          const newPosts = Array.from(dedupMap.values());
          if (newPosts.length > 0) {
            set(state => ({
              pendingPosts: [...newPosts, ...state.pendingPosts],
            }));
            if (__DEV__) {
              console.log(`🛟 [FeedStore] Fallback polling found ${newPosts.length} new post(s)`);
            }
          }
        } catch (pollError) {
          if (__DEV__) {
            console.log('⚠️ [FeedStore] Realtime fallback poll failed:', pollError);
          }
        } finally {
          realtimeFallbackPollInFlight = false;
        }
      };

      const startRealtimeFallbackPolling = (reason: string) => {
        if (realtimeFallbackPollTimer) return;
        if (__DEV__) {
          console.warn(`🛟 [FeedStore] Starting fallback polling (${reason})`);
        }
        pollForMissedPosts().catch(() => { });
        realtimeFallbackPollTimer = setInterval(() => {
          pollForMissedPosts().catch(() => { });
        }, REALTIME_FALLBACK_POLL_INTERVAL_MS);
      };

      const isActuallyNewPost = (postCreatedAt: string): boolean => {
        const { lastFeedTimestamp, feedItems } = get();
        // Use lastFeedTimestamp if available, else fall back to most recent post
        const firstPost = feedItems.find(i => i.type === 'POST');
        const referenceTime = lastFeedTimestamp || (firstPost?.type === 'POST' ? firstPost.data.createdAt : undefined);
        if (!referenceTime) return true; // No reference = treat as new
        return new Date(postCreatedAt) > new Date(referenceTime);
      };

      // Helper: check if post ID is already known (dedup)
      const isKnownPostId = (postId: string): boolean => {
        const { feedItems, pendingPosts } = get();
        return feedItems.some(i => i.type === 'POST' && i.data.id === postId) || pendingPosts.some(p => p.id === postId);
      };

      // Helper: get current user ID (skip own posts — they're added optimistically)
      const getCurrentUserId = (): string | undefined => {
        try {
          return useAuthStore.getState().user?.id;
        } catch { return undefined; }
      };

      let _receivedAnyEvent = false;

      const channelName = `feed:realtime:${Date.now()}`; // Unique per subscription
      const channel = supabase
        .channel(channelName)
        // New posts
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts' },
          async (payload) => {
            _receivedAnyEvent = true; // Liveness: at least one event arrived
            stopRealtimeFallbackPolling();
            const newPostRaw = payload.new as any;
            const newPostId = newPostRaw?.id;
            if (!newPostId) return;

            // Skip if already known (dedup) — includes optimistic update on creating device
            // Note: Don't skip "own posts" here — same user on Device B needs to receive
            // posts created on Device A; isKnownPostId handles the creating device.
            if (isKnownPostId(newPostId)) {
              console.log('🔔 [FeedStore] Skipping duplicate INSERT:', newPostId);
              return;
            }

            console.log('🔔 [FeedStore] New post INSERT:', newPostId);

            try {
              // Fetch full post via API (preserves business logic, author data, etc.)
              const response = await feedApi.get(`/posts/${newPostId}`);
              if (response.data.success && (response.data.data || response.data.post)) {
                const transformed = transformPost(response.data.data || response.data.post);
                if (transformed) {
                  // Final dedup check (race condition guard)
                  if (!isKnownPostId(transformed.id)) {
                    set(state => ({
                      pendingPosts: [transformed, ...state.pendingPosts]
                    }));
                    console.log('✅ [FeedStore] Added to pendingPosts, count:', get().pendingPosts.length);
                  }
                }
              }
            } catch (e) {
              console.error('Error fetching realtime post:', e);
            }
          }
        )
        // Post updates (edits, like/comment count changes)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'posts' },
          async (payload) => {
            _receivedAnyEvent = true; // Liveness: at least one event arrived
            stopRealtimeFallbackPolling();
            const updated = payload.new as any;
            if (!updated?.id) return;

            // Check if we already have this post in our feed or pending
            const { feedItems, pendingPosts } = get();
            const isInFeed = feedItems.some(i => i.type === 'POST' && i.data.id === updated.id);
            const isInPending = pendingPosts.some(p => p.id === updated.id);

            if (isInFeed) {
              // Known post in feed → just update counts inline (NO "New Posts" button)
              console.log('🔔 [FeedStore] Post updated:', updated.id, 'likes:', updated.likesCount);
              set(state => ({
                feedItems: state.feedItems.map(item =>
                  item.type === 'POST' && item.data.id === updated.id
                    ? {
                      ...item,
                      data: {
                        ...item.data,
                        content: updated.content ?? item.data.content,
                        title: updated.title ?? item.data.title,
                        likes: updated.likesCount ?? item.data.likes,
                        comments: updated.commentsCount ?? item.data.comments,
                        shares: updated.sharesCount ?? item.data.shares,
                      }
                    }
                    : item
                ),
              }));
            } else if (isInPending) {
              // Already in pending → update it in place, don't add again
              console.log('🔔 [FeedStore] Updating pending post:', updated.id);
              set(state => ({
                pendingPosts: state.pendingPosts.map(p =>
                  p.id === updated.id
                    ? {
                      ...p,
                      likes: updated.likesCount ?? p.likes,
                      comments: updated.commentsCount ?? p.comments,
                    }
                    : p
                ),
              }));
            } else {
              // Unknown post — only treat as new if it was ACTUALLY created recently
              // This prevents old posts getting a like from triggering "New Posts"
              const postCreatedAt = updated.createdAt;
              if (postCreatedAt && isActuallyNewPost(postCreatedAt)) {
                // Skip own posts
                const currentUserId = getCurrentUserId();
                if (currentUserId && updated.authorId === currentUserId) return;

                console.log('🆕 [FeedStore] Genuinely new post via UPDATE:', updated.id);
                try {
                  const response = await feedApi.get(`/posts/${updated.id}`);
                  if (response.data.success && (response.data.data || response.data.post)) {
                    const transformed = transformPost(response.data.data || response.data.post);
                    if (transformed && !isKnownPostId(transformed.id)) {
                      set(state => ({
                        pendingPosts: [transformed, ...state.pendingPosts]
                      }));
                      console.log('✅ [FeedStore] Added genuinely new post to pendingPosts, count:', get().pendingPosts.length);
                    }
                  }
                } catch (e) {
                  console.error('Failed to fetch new post:', e);
                }
              } else {
                // Old post received an update (like, comment, etc.) — ignore silently
                if (__DEV__) {
                  console.log('🔕 [FeedStore] Ignoring UPDATE for old/unknown post:', updated.id);
                }
              }
            }
          }
        )
        // Post deletes
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'posts' },
          (payload) => {
            _receivedAnyEvent = true; // Liveness: at least one event arrived
            stopRealtimeFallbackPolling();
            const deletedId = (payload.old as any)?.id;
            if (!deletedId) return;

            set(state => ({
              feedItems: state.feedItems.filter(i => !(i.type === 'POST' && i.data.id === deletedId)),
              pendingPosts: state.pendingPosts.filter(p => p.id !== deletedId),
            }));
          }
        )
        .subscribe((status, err) => {
          if (err) console.error('❌ [FeedStore] Subscription error:', err);

          if (status === 'SUBSCRIBED') {
            console.log('✅ [FeedStore] Realtime ACTIVE — listening for post changes');
            // Reset retry counter
            set({ ...(get() as any), _realtimeRetries: 0 } as any);

            // Liveness check: if no event arrives within 30s of subscribing,
            // warn about possible RLS blocking (silent failure mode).
            // In production with active users this fires rarely — posts are created often.
            if (realtimeLivenessTimer) clearTimeout(realtimeLivenessTimer);
            realtimeLivenessTimer = setTimeout(() => {
              if (!_receivedAnyEvent && __DEV__) {
                console.warn(
                  '⚠️ [FeedStore] No real-time events received 30s after SUBSCRIBED.\n' +
                  '  → Check Supabase dashboard: is RLS enabled on the `posts` table?\n' +
                  '  → Run: ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;\n' +
                  '  → See implementation_plan.md for full details.'
                );
              }
              if (!_receivedAnyEvent) {
                startRealtimeFallbackPolling('no realtime events after subscribe');
              }
            }, 30_000);
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ [FeedStore] Realtime CHANNEL_ERROR — check Supabase RLS or network');
            if (realtimeLivenessTimer) { clearTimeout(realtimeLivenessTimer); realtimeLivenessTimer = null; }
            startRealtimeFallbackPolling('channel error');
          } else if (status === 'TIMED_OUT') {
            console.warn('⚠️ [FeedStore] Realtime TIMED_OUT — network issue or Supabase outage');
            if (realtimeLivenessTimer) { clearTimeout(realtimeLivenessTimer); realtimeLivenessTimer = null; }
            startRealtimeFallbackPolling('channel timeout');
          } else {
            console.log(`🔌 [FeedStore] Realtime status: ${status}`);
          }

          // Auto-reconnect on error with exponential backoff
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const currentRetries = (get() as any)._realtimeRetries || 0;
            if (currentRetries < 5) {
              const delay = Math.min(2000 * Math.pow(2, currentRetries), 32000);
              console.log(`🔄 [FeedStore] Reconnecting in ${delay / 1000}s (attempt ${currentRetries + 1}/5)...`);
              set({ ...(get() as any), _realtimeRetries: currentRetries + 1 } as any);
              setTimeout(() => {
                console.log('🔄 [FeedStore] Attempting reconnect...');
                const { unsubscribeFromFeed, subscribeToFeed } = get();
                unsubscribeFromFeed();
                subscribeToFeed();
              }, delay);
            } else {
              console.warn('🔌 [FeedStore] Max retries reached, giving up on realtime');
            }
          }
        });

      set({ realtimeSubscription: channel });
    } catch (realtimeError) {
      console.warn('⚠️ [FeedStore] Realtime subscription failed (non-fatal), app continues without realtime:', realtimeError);
      if (!realtimeFallbackPollTimer) {
        realtimeFallbackPollTimer = setInterval(() => {
          const { feedItems } = get();
          if (feedItems.length > 0) {
            get().fetchPosts(true).catch(() => { });
          }
        }, REALTIME_FALLBACK_POLL_INTERVAL_MS);
      }
    }
  },

  unsubscribeFromFeed: () => {
    if (realtimeLivenessTimer) {
      clearTimeout(realtimeLivenessTimer);
      realtimeLivenessTimer = null;
    }
    if (realtimeFallbackPollTimer) {
      clearInterval(realtimeFallbackPollTimer);
      realtimeFallbackPollTimer = null;
    }
    realtimeFallbackPollInFlight = false;

    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      console.log('🔌 [FeedStore] Unsubscribing...');
      supabase.removeChannel(realtimeSubscription);
      set({ realtimeSubscription: null });
    }
  },

  // Fetch trending posts
  fetchTrending: async (period: TrendingPeriod = '7d') => {
    set({ isLoadingTrending: true, trendingPeriod: period });

    try {
      const response = await feedApi.get('/analytics/trending', {
        params: { period, limit: 5 },
      });

      if (response.data.success && response.data.trending) {
        const trendingData = response.data.trending;

        // Transform trending posts using shared utility + trending-specific fields
        const transformedTrending: TrendingPost[] = transformPosts(trendingData).map((post, i) => ({
          ...post,
          trendScore: trendingData[i]?.trendScore || 0,
          growthRate: trendingData[i]?.growthRate || 0,
        }));

        set({ trendingPosts: transformedTrending, isLoadingTrending: false });
      } else {
        set({ isLoadingTrending: false });
      }
    } catch (error) {
      console.error('Failed to fetch trending posts:', error);
      set({ isLoadingTrending: false });
    }
  },

  // Add optimistic post
  addOptimisticPost: (post) => {
    set((state) => ({
      feedItems: [{ type: 'POST', data: post }, ...state.feedItems],
    }));
  },

  // Remove optimistic post
  removeOptimisticPost: (tempId) => {
    set((state) => ({
      feedItems: state.feedItems.filter((i) => !(i.type === 'POST' && i.data.id === tempId)),
    }));
  },

  toggleFeedMode: (mode) => {
    set({ feedMode: mode });
    get().fetchPosts(true);
  },

  initializeRecommendations: () => {
    const profile = recommendationEngine.getUserProfile();
    set({ userInterestProfile: profile });
  },

  applyPendingPosts: () => {
    const { pendingPosts, feedItems } = get();
    if (pendingPosts.length === 0) return 0;

    // Dedup: only add pending posts not already in the feed
    const existingIds = new Set(
      feedItems
        .filter(item => item.type === 'POST' && item.data)
        .map(item => (item.data as Post).id)
        .filter(Boolean)
    );
    const uniqueNewPosts = pendingPosts.filter(p => p.id && !existingIds.has(p.id));

    if (uniqueNewPosts.length === 0) {
      set({ pendingPosts: [] });
      return 0;
    }

    const mergedItems: FeedItem[] = [
      ...uniqueNewPosts.map(p => ({ type: 'POST' as const, data: p })),
      ...feedItems
    ];

    // Update lastFeedTimestamp with the newest timestamp
    const newestTimestamp = uniqueNewPosts.reduce((latest, p) =>
      new Date(p.createdAt) > new Date(latest) ? p.createdAt : latest,
      uniqueNewPosts[0].createdAt
    );

    set({
      feedItems: mergedItems,
      pendingPosts: [],
      lastFeedTimestamp: newestTimestamp,
    });

    // Persist to cache so reopening the app shows the latest posts
    const mergedPostsOnly = mergedItems.filter(i => i.type === 'POST').map(i => i.data as Post);
    const userId = useAuthStore.getState().user?.id;
    cacheFeedPosts(mergedPostsOnly.slice(0, 50), userId).catch(() => { });

    return uniqueNewPosts.length;
  },

  seedFeed: async () => {
    await seedDatabase();
    await get().fetchPosts(true);
  },

  // Reset store
  reset: () => {
    if (initialFeedRetryTimer) {
      clearTimeout(initialFeedRetryTimer);
      initialFeedRetryTimer = null;
    }
    initialFeedRetryAttempts = 0;
    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
    }
    if (realtimeLivenessTimer) {
      clearTimeout(realtimeLivenessTimer);
      realtimeLivenessTimer = null;
    }
    if (realtimeFallbackPollTimer) {
      clearInterval(realtimeFallbackPollTimer);
      realtimeFallbackPollTimer = null;
    }
    realtimeFallbackPollInFlight = false;
    set(initialState);
  },
}));

export default useFeedStore;
