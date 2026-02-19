/**
 * Feed Store
 * 
 * State management for social feed, posts, and stories
 */

import { create } from 'zustand';
import { Post, Story, StoryGroup, PaginationParams, Comment } from '@/types';
import { transformPost, transformPosts } from '@/utils/transformPost';
import { feedApi } from '@/api/client';
import { Image } from 'react-native';
import { mockPosts, mockStories } from '@/api/mockData';
import { recommendationEngine, UserInterestProfile } from '@/services/recommendation';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { seedDatabase } from '@/lib/seed';
import { cacheFeedPosts, loadCachedFeed, isCacheStale } from '@/services/feedCache';
import { useAuthStore } from './authStore';

// ── Batched view tracking ──
// Buffer post views and flush in one HTTP request every 10 seconds.
// At 10K users × 20 posts = 400K individual requests → ~40K batched requests.
const VIEW_FLUSH_INTERVAL = 10_000; // 10 seconds
let viewFlushTimer: ReturnType<typeof setTimeout> | null = null;
const viewBuffer = new Map<string, { postId: string; duration: number; source: string; timestamp: number }>();

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

  posts: Post[];
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
  createPost: (content: string, mediaUrls?: string[], postType?: string, pollOptions?: string[], quizData?: any, title?: string, visibility?: string, pollSettings?: any, courseData?: any, projectData?: any, topicTags?: string[], deadline?: string) => Promise<boolean>;
  updatePost: (postId: string, data: { content: string; visibility?: string; mediaUrls?: string[]; mediaDisplayMode?: string; pollOptions?: string[]; quizData?: any; pollSettings?: any; deadline?: string }) => Promise<boolean>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;

  // Comments actions
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;

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
  posts: [],
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
        const { posts } = get();
        const idx = posts.findIndex(p => p.id === postId);
        if (idx >= 0) {
          const updated = [...posts];
          updated[idx] = transformed;
          set({ posts: updated });
        } else {
          set({ posts: [transformed, ...posts] });
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

    const { isLoadingPosts, postsPage, posts, hasMorePosts } = get();

    if (isLoadingPosts || (!refresh && !hasMorePosts)) return;

    const page = refresh ? 1 : postsPage;

    set({ isLoadingPosts: true });

    // Stale-while-revalidate: show cached feed instantly on cold-start
    if (page === 1 && posts.length === 0) {
      const cached = await loadCachedFeed();
      if (cached && cached.length > 0) {
        set({ posts: cached });
      }
    }

    try {
      // Performance optimization: Use smaller page size for initial load (faster perceived speed)
      const limit = page === 1 ? 10 : 20;

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

      // Use personalized feed endpoint for FOR_YOU and FOLLOWING modes
      const feedMode = get().feedMode;
      const usePersonalizedFeed = feedMode === 'FOR_YOU' || feedMode === 'FOLLOWING';
      const endpoint = usePersonalizedFeed ? '/posts/feed' : '/posts';

      if (usePersonalizedFeed) {
        params.mode = feedMode;
      }

      const response = await feedApi.get(endpoint, {
        params,
        timeout: 10000, // Reduced timeout for faster feedback
      });

      if (response.data.success) {
        // Backend returns { success, data: posts[], pagination }
        const newPosts = response.data.data || response.data.posts || [];
        const pagination = response.data.pagination;
        const hasMore = pagination?.hasMore ?? newPosts.length === 20;
        const newCursor = pagination?.nextCursor || null;

        if (__DEV__) {
          console.log('📥 [FeedStore] Received', newPosts.length, 'posts');
        }

        // Transform posts using shared utility
        const transformedPosts = transformPosts(newPosts);

        // Apply recommendations if in FOR_YOU mode (only for /posts fallback)
        let finalPosts = refresh ? transformedPosts : [...posts, ...transformedPosts];

        if (get().feedMode === 'FOR_YOU' && !usePersonalizedFeed) {
          // Fallback: client-side ranking only if server endpoint was not used
          finalPosts = recommendationEngine.generateFeed(finalPosts);
        }

        // Performance optimization: Limit total posts in memory (50 for mobile)
        const maxPostsInMemory = 50;
        const optimizedPosts = finalPosts.slice(0, maxPostsInMemory);

        // Track timestamp of newest post for real-time dedup
        const newestTimestamp = optimizedPosts.length > 0
          ? optimizedPosts.reduce((latest, p) =>
            new Date(p.createdAt) > new Date(latest) ? p.createdAt : latest,
            optimizedPosts[0].createdAt
          )
          : get().lastFeedTimestamp;

        set({
          posts: optimizedPosts,
          postsPage: page + 1,
          nextCursor: newCursor,
          hasMorePosts: hasMore,
          isLoadingPosts: false,
          lastFeedTimestamp: newestTimestamp,
          // Clear pending posts on refresh to avoid stale "New Posts" button
          ...(refresh ? { pendingPosts: [] } : {}),
        });

        // Write to offline cache on page 1 (most recent posts)
        if (page === 1) {
          cacheFeedPosts(optimizedPosts).catch(() => { });
        }

        // Background: Prefetch first media URL for smooth scrolling
        const urlsToPrefetch = transformedPosts
          .flatMap(p => p.mediaUrls?.slice(0, 1) || [])
          .filter(Boolean)
          .slice(0, 10); // Max 10 images to avoid flooding
        urlsToPrefetch.forEach(url => Image.prefetch(url).catch(() => { }));
      } else {
        set({ isLoadingPosts: false });
      }
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);

      // Use mock data if API fails in development
      if (__DEV__ && error.code === 'TIMEOUT_ERROR') {
        console.log('📦 Using mock data for offline development');
        set({
          posts: refresh ? mockPosts : [...posts, ...mockPosts],
          postsPage: page + 1,
          hasMorePosts: false,
          isLoadingPosts: false,
        });
      } else {
        set({ isLoadingPosts: false });
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
  createPost: async (content, mediaUrls = [], postType = 'ARTICLE', pollOptions = [], quizData, title, visibility = 'PUBLIC', pollSettings, courseData, projectData, topicTags, deadline) => {
    try {
      // Upload local images to R2 before creating post
      let uploadedMediaUrls = mediaUrls;

      if (mediaUrls.length > 0 && mediaUrls.some(url => url.startsWith('file://'))) {
        console.log('📤 [FeedStore] Uploading images to R2...');

        try {
          // Create FormData with images
          const formData = new FormData();

          for (const uri of mediaUrls) {
            if (uri.startsWith('file://')) {
              // Extract file extension and determine mime type
              const filename = uri.split('/').pop() || `file-${Date.now()}`;
              const match = /\.(\w+)$/.exec(filename);
              const ext = match ? match[1].toLowerCase() : 'jpg';

              let type = 'image/jpeg';
              if (ext === 'png') type = 'image/png';
              else if (ext === 'gif') type = 'image/gif';
              else if (ext === 'mp4') type = 'video/mp4';
              else if (ext === 'mov') type = 'video/quicktime';
              else if (ext === 'avi') type = 'video/x-msvideo';

              // Append file to form data
              formData.append('files', {
                uri,
                type,
                name: filename,
              } as any);
            }
          }

          // Upload to backend
          const uploadResponse = await feedApi.post('/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000, // 60s for file uploads
          });

          if (uploadResponse.data.success && uploadResponse.data.data) {
            uploadedMediaUrls = uploadResponse.data.data.map((file: any) => file.url);
            console.log('✅ [FeedStore] Images uploaded successfully:', uploadedMediaUrls);
          } else {
            console.error('❌ [FeedStore] Upload failed:', uploadResponse.data);
            throw new Error('Failed to upload images');
          }
        } catch (uploadError: any) {
          console.error('❌ [FeedStore] Upload error:', uploadError);
          throw new Error('Failed to upload images. Please check your connection.');
        }
      }

      // Calculate poll deadline if duration provided
      let deadline = undefined;
      if (postType === 'POLL' && pollSettings?.duration) {
        const now = new Date();
        now.setHours(now.getHours() + pollSettings.duration);
        deadline = now.toISOString();
      }

      // Now create post with uploaded URLs
      const response = await feedApi.post('/posts', {
        content,
        title,
        mediaUrls: uploadedMediaUrls,
        postType,
        visibility,
        mediaDisplayMode: 'AUTO',
        pollOptions: postType === 'POLL' ? pollOptions : undefined,
        pollSettings: postType === 'POLL' ? pollSettings : undefined, // Send full settings
        deadline, // Send deadline for backend to handle
        quizData: postType === 'QUIZ' ? quizData : undefined,
        courseData: postType === 'COURSE' ? courseData : undefined,
        projectData: postType === 'PROJECT' ? projectData : undefined,
        topicTags: topicTags || [],
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
              votes: opt._count?.votes || 0,
            })),
          }),
        };

        // Add to top of feed with optimistic update
        set((state) => ({
          posts: [newPost, ...state.posts],
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
      posts: state.posts.map((post) =>
        post.id === postId
          ? { ...post, isLiked: true, likes: post.likes + 1 }
          : post
      ),
    }));

    // Track for recommendation engine (local)
    const post = get().posts.find(p => p.id === postId);
    if (post) {
      recommendationEngine.trackAction('LIKE', post);
      set({ userInterestProfile: recommendationEngine.getUserProfile() });
    }

    try {
      await feedApi.post(`/posts/${postId}/like`);
      // Track for server-side feed algorithm (fire-and-forget)
      feedApi.post('/feed/track-action', { action: 'LIKE', postId, source: 'feed' }).catch(() => { });
    } catch (error) {
      // Revert on error
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId
            ? { ...post, isLiked: false, likes: post.likes - 1 }
            : post
        ),
      }));
    }
  },

  // Unlike a post
  unlikePost: async (postId) => {
    // Optimistic update
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? { ...post, isLiked: false, likes: post.likes - 1 }
          : post
      ),
    }));

    try {
      // Backend uses POST for toggle (handles both like and unlike)
      await feedApi.post(`/posts/${postId}/like`);
    } catch (error) {
      // Revert on error
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId
            ? { ...post, isLiked: true, likes: post.likes + 1 }
            : post
        ),
      }));
    }
  },

  // Bookmark a post (toggle)
  bookmarkPost: async (postId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    const wasBookmarked = post.isBookmarked;

    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, isBookmarked: !wasBookmarked } : p
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
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, isBookmarked: wasBookmarked } : p
        ),
      }));
    }
  },

  // Delete a post
  deletePost: async (postId) => {
    const post = get().posts.find((p) => p.id === postId);

    // Optimistic update
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    }));

    try {
      await feedApi.delete(`/posts/${postId}`);
    } catch (error) {
      // Revert on error
      if (post) {
        set((state) => ({
          posts: [post, ...state.posts],
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
      const response = await feedApi.get(`/posts/${postId}/comments`);

      if (response.data.success) {
        const commentsData = response.data.data || [];

        // Transform comments to match mobile app Comment type
        const transformedComments: Comment[] = commentsData.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          author: {
            id: comment.author?.id,
            firstName: comment.author?.firstName,
            lastName: comment.author?.lastName,
            name: `${comment.author?.firstName || ''} ${comment.author?.lastName || ''}`.trim(),
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
          replies: comment.replies || [],
          createdAt: comment.createdAt,
        }));

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
  addComment: async (postId, content) => {
    set((state) => ({
      isSubmittingComment: { ...state.isSubmittingComment, [postId]: true },
    }));

    // Track for recommendation engine
    const post = get().posts.find(p => p.id === postId);
    if (post) {
      recommendationEngine.trackAction('COMMENT', post);
      set({ userInterestProfile: recommendationEngine.getUserProfile() });
    }

    try {
      const response = await feedApi.post(`/posts/${postId}/comments`, { content });

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
          likes: 0,
          isLiked: false,
          replies: [],
          createdAt: newComment.createdAt,
        };

        // Update comments list
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: [transformedComment, ...(state.comments[postId] || [])],
          },
          isSubmittingComment: { ...state.isSubmittingComment, [postId]: false },
          // Update post comment count
          posts: state.posts.map((post) =>
            post.id === postId ? { ...post, comments: post.comments + 1 } : post
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
        posts: state.posts.map((post) =>
          post.id === postId ? { ...post, comments: Math.max(0, post.comments - 1) } : post
        ),
      }));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  },

  // Vote on a poll
  voteOnPoll: async (postId, optionId) => {
    const state = get();
    const post = state.posts.find(p => p.id === postId);

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
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
            ...p,
            pollOptions: updatedOptions,
            userVotedOptionId: optionId,
          }
          : p
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
          posts: state.posts.map((p) =>
            p.id === postId
              ? {
                ...p,
                userVotedOptionId: serverUserVotedOptionId,
              }
              : p
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
        posts: state.posts.map((p) =>
          p.id === postId
            ? {
              ...p,
              pollOptions: previousOptions,
              userVotedOptionId: previousVote,
            }
            : p
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
        posts: state.posts.map((post) =>
          post.id === postId ? { ...post, shares: post.shares + 1 } : post
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
  // and flush to a single bulk endpoint every 10 seconds.
  trackPostView: async (postId) => {
    // Recommendation Engine tracking (local, synchronous)
    const post = get().posts.find(p => p.id === postId);
    if (post) {
      recommendationEngine.trackAction('VIEW', post);
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
      console.log('📤 [feedStore] Sending PUT request to /posts/' + postId);
      console.log('📤 [feedStore] Request data:', JSON.stringify(data, null, 2));

      const response = await feedApi.put(`/posts/${postId}`, data);

      console.log('📥 [feedStore] Response status:', response.status);
      console.log('📥 [feedStore] Response data:', JSON.stringify(response.data, null, 2));

      if (response.data.error) {
        console.error('❌ [feedStore] Failed to update post:', response.data.error);
        return false;
      }

      // Get updated post data from response
      const rawPost = response.data.data || response.data;

      console.log('🔄 [feedStore] Transforming updated post data...');

      // Transform to match Post type (same as fetchPosts)
      const transformedPost: Post = {
        id: rawPost.id,
        author: {
          id: rawPost.author?.id,
          firstName: rawPost.author?.firstName,
          lastName: rawPost.author?.lastName,
          name: `${rawPost.author?.firstName || ''} ${rawPost.author?.lastName || ''}`.trim(),
          username: rawPost.author?.username || 'user',
          email: rawPost.author?.email || '',
          profilePictureUrl: rawPost.author?.profilePictureUrl,
          role: rawPost.author?.role,
          bio: rawPost.author?.bio || '',
          isVerified: rawPost.author?.isVerified,
          isOnline: false,
          languages: rawPost.author?.languages || [],
          interests: rawPost.author?.interests || [],
          createdAt: rawPost.author?.createdAt || new Date().toISOString(),
          updatedAt: rawPost.author?.updatedAt || new Date().toISOString(),
        },
        authorId: rawPost.authorId || rawPost.author?.id,
        content: rawPost.content,
        postType: rawPost.postType || 'ARTICLE',
        visibility: rawPost.visibility || 'PUBLIC',
        mediaUrls: rawPost.mediaUrls || [],
        mediaDisplayMode: rawPost.mediaDisplayMode || 'AUTO',
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
          votes: opt.votes || opt._count?.votes || 0,
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

      console.log('📥 [feedStore] Transformed post:', JSON.stringify(transformedPost, null, 2));
      console.log('📥 [feedStore] Media URLs after transform:', transformedPost.mediaUrls);

      // Update post in state
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId ? transformedPost : post
        ),
      }));

      console.log('✅ [feedStore] Post updated successfully in store');
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
        params: { limit: 50 },
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

    // Unsubscribe existing if any
    unsubscribeFromFeed();

    // Helper: check if a post is truly new (not an old post receiving updates)
    const isActuallyNewPost = (postCreatedAt: string): boolean => {
      const { lastFeedTimestamp, posts } = get();
      // Use lastFeedTimestamp if available, else fall back to most recent post
      const referenceTime = lastFeedTimestamp || posts[0]?.createdAt;
      if (!referenceTime) return true; // No reference = treat as new
      return new Date(postCreatedAt) > new Date(referenceTime);
    };

    // Helper: check if post ID is already known (dedup)
    const isKnownPostId = (postId: string): boolean => {
      const { posts, pendingPosts } = get();
      return posts.some(p => p.id === postId) || pendingPosts.some(p => p.id === postId);
    };

    // Helper: get current user ID (skip own posts — they're added optimistically)
    const getCurrentUserId = (): string | undefined => {
      try {
        return useAuthStore.getState().user?.id;
      } catch { return undefined; }
    };

    const channelName = `feed:realtime:${Date.now()}`; // Unique per subscription
    const channel = supabase
      .channel(channelName)
      // New posts
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const newPostRaw = payload.new as any;
          const newPostId = newPostRaw?.id;
          if (!newPostId) return;

          // Skip own posts (already added via optimistic update in createPost)
          const currentUserId = getCurrentUserId();
          if (currentUserId && newPostRaw.authorId === currentUserId) {
            console.log('🔔 [FeedStore] Skipping own post INSERT:', newPostId);
            return;
          }

          // Skip if already known (dedup)
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
          const updated = payload.new as any;
          if (!updated?.id) return;

          // Check if we already have this post in our feed or pending
          const { posts, pendingPosts } = get();
          const isInFeed = posts.some(p => p.id === updated.id);
          const isInPending = pendingPosts.some(p => p.id === updated.id);

          if (isInFeed) {
            // Known post in feed → just update counts inline (NO "New Posts" button)
            console.log('🔔 [FeedStore] Post updated:', updated.id, 'likes:', updated.likesCount);
            set(state => ({
              posts: state.posts.map(p =>
                p.id === updated.id
                  ? {
                    ...p,
                    content: updated.content ?? p.content,
                    title: updated.title ?? p.title,
                    likes: updated.likesCount ?? p.likes,
                    comments: updated.commentsCount ?? p.comments,
                    shares: updated.sharesCount ?? p.shares,
                  }
                  : p
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
          const deletedId = (payload.old as any)?.id;
          if (!deletedId) return;

          set(state => ({
            posts: state.posts.filter(p => p.id !== deletedId),
            pendingPosts: state.pendingPosts.filter(p => p.id !== deletedId),
          }));
        }
      )
      .subscribe((status, err) => {
        console.log('🔌 [FeedStore] Subscription status:', status);
        if (err) console.error('🔌 [FeedStore] Subscription error:', err);

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
        } else if (status === 'SUBSCRIBED') {
          // Reset retry counter on successful connection
          set({ ...(get() as any), _realtimeRetries: 0 } as any);
        }
      });

    set({ realtimeSubscription: channel });
  },

  unsubscribeFromFeed: () => {
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
      posts: [post, ...state.posts],
    }));
  },

  // Remove optimistic post
  removeOptimisticPost: (tempId) => {
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== tempId),
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
    const { pendingPosts, posts } = get();
    if (pendingPosts.length === 0) return 0;

    // Dedup: only add pending posts not already in the feed
    const existingIds = new Set(posts.map(p => p.id));
    const uniqueNewPosts = pendingPosts.filter(p => !existingIds.has(p.id));

    if (uniqueNewPosts.length === 0) {
      set({ pendingPosts: [] });
      return 0;
    }

    const mergedPosts = [...uniqueNewPosts, ...posts];

    // Update lastFeedTimestamp with the newest timestamp
    const newestTimestamp = uniqueNewPosts.reduce((latest, p) =>
      new Date(p.createdAt) > new Date(latest) ? p.createdAt : latest,
      uniqueNewPosts[0].createdAt
    );

    set({
      posts: mergedPosts,
      pendingPosts: [],
      lastFeedTimestamp: newestTimestamp,
    });

    // Persist to cache so reopening the app shows the latest posts
    cacheFeedPosts(mergedPosts.slice(0, 50)).catch(() => { });

    return uniqueNewPosts.length;
  },

  seedFeed: async () => {
    await seedDatabase();
    await get().fetchPosts(true);
  },

  // Reset store
  reset: () => set(initialState),
}));

export default useFeedStore;
