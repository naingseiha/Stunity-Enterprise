/**
 * Feed Store
 * 
 * State management for social feed, posts, and stories
 */

import { create } from 'zustand';
import { Post, Story, StoryGroup, PaginationParams, Comment } from '@/types';
import { feedApi } from '@/api/client';
import { mockPosts, mockStories } from '@/api/mockData';

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
  fetchPosts: (refresh?: boolean) => Promise<void>;
  fetchStories: () => Promise<void>;
  createPost: (content: string, mediaUrls?: string[], postType?: string, pollOptions?: string[]) => Promise<boolean>;
  updatePost: (postId: string, data: { content: string; visibility?: string; mediaUrls?: string[]; mediaDisplayMode?: string; pollOptions?: string[] }) => Promise<boolean>;
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
  reset: () => void;
}

const initialState = {
  posts: [],
  isLoadingPosts: false,
  hasMorePosts: true,
  postsPage: 1,
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
  comments: {},
  isLoadingComments: {},
  isSubmittingComment: {},
  postAnalytics: {},
  isLoadingAnalytics: {},
};

export const useFeedStore = create<FeedState>()((set, get) => ({
  ...initialState,

  // Fetch posts with pagination
  fetchPosts: async (refresh = false) => {
    const { isLoadingPosts, postsPage, posts, hasMorePosts } = get();
    
    if (isLoadingPosts || (!refresh && !hasMorePosts)) return;

    const page = refresh ? 1 : postsPage;
    
    set({ isLoadingPosts: true });

    try {
      const response = await feedApi.get('/posts', {
        params: { page, limit: 20 },
        timeout: 15000, // Reduce timeout to 15s for faster feedback
      });

      if (response.data.success) {
        // Backend returns { success, data: posts[], pagination }
        const newPosts = response.data.data || response.data.posts || [];
        const pagination = response.data.pagination;
        const hasMore = pagination?.hasMore ?? newPosts.length === 20;

        // Debug: Log mediaUrls from first post
        if (__DEV__ && newPosts.length > 0 && newPosts[0].mediaUrls) {
          console.log('📥 [FeedStore] Sample post mediaUrls:', newPosts[0].mediaUrls);
        }

        // Transform posts to match mobile app Post type
        const transformedPosts: Post[] = newPosts.map((post: any) => ({
          id: post.id,
          author: {
            id: post.author?.id,
            firstName: post.author?.firstName,
            lastName: post.author?.lastName,
            name: `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim(),
            profilePictureUrl: post.author?.profilePictureUrl,
            role: post.author?.role,
            isVerified: post.author?.isVerified,
          },
          content: post.content,
          postType: post.postType || 'ARTICLE',
          mediaUrls: post.mediaUrls || [],
          likes: post.likesCount || post._count?.likes || 0,
          comments: post.commentsCount || post._count?.comments || 0,
          shares: post.sharesCount || 0,
          isLiked: post.isLikedByMe || false,
          isBookmarked: post.isBookmarked || false,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          // E-Learning metadata
          topicTags: post.topicTags || post.tags || [],
          // Poll fields
          pollOptions: post.pollOptions?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.votes || opt._count?.votes || 0,
          })),
          userVotedOptionId: post.userVotedOptionId,
          
          // Debug poll data
          ...(post.postType === 'POLL' && __DEV__ && {
            _debug: {
              hasPollOptions: !!post.pollOptions,
              optionCount: post.pollOptions?.length || 0,
              userVotedOptionId: post.userVotedOptionId,
            }
          }),
          
          learningMeta: post.learningMeta || {
            progress: post.progress,
            totalSteps: post.totalSteps,
            completedSteps: post.completedSteps,
            difficulty: post.difficulty,
            isLive: post.isLive,
            liveViewers: post.liveViewers,
            deadline: post.deadline,
            isUrgent: post.isUrgent,
            answerCount: post.answerCount,
            isAnswered: post.isAnswered,
            studyGroupId: post.studyGroupId,
            studyGroupName: post.studyGroupName,
            xpReward: post.xpReward,
            estimatedMinutes: post.estimatedMinutes,
            participantCount: post.participantCount,
            hasCode: post.hasCode,
            hasPdf: post.hasPdf,
            hasFormula: post.hasFormula,
            // NEW: Enhanced learning features
            isPartOfPath: post.isPartOfPath,
            pathName: post.pathName,
            pathStep: post.pathStep,
            pathTotalSteps: post.pathTotalSteps,
            prerequisiteIds: post.prerequisiteIds,
            nextContentId: post.nextContentId,
            activeStudyingCount: post.activeStudyingCount,
            classmateEnrollments: post.classmateEnrollments,
            peerHelpRequests: post.peerHelpRequests,
            studySessionActive: post.studySessionActive,
            hasAiExplanation: post.hasAiExplanation,
            aiSuggested: post.aiSuggested,
            relatedTopics: post.relatedTopics,
            prerequisiteTopics: post.prerequisiteTopics,
            enrolledToday: post.enrolledToday,
            completionRate: post.completionRate,
          },
        }));

        set({
          posts: refresh ? transformedPosts : [...posts, ...transformedPosts],
          postsPage: page + 1,
          hasMorePosts: hasMore,
          isLoadingPosts: false,
        });
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
  createPost: async (content, mediaUrls = [], postType = 'ARTICLE', pollOptions = []) => {
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
              // Extract filename from URI
              const filename = uri.split('/').pop() || `image-${Date.now()}.jpg`;
              
              // Append file to form data
              formData.append('files', {
                uri,
                type: 'image/jpeg', // Could be detected from extension
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
      
      // Now create post with uploaded URLs
      const response = await feedApi.post('/posts', {
        content,
        mediaUrls: uploadedMediaUrls,
        postType,
        visibility: 'SCHOOL',
        mediaDisplayMode: 'AUTO',
        pollOptions: postType === 'POLL' ? pollOptions : undefined,
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

    try {
      await feedApi.post(`/posts/${postId}/like`);
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
      await feedApi.delete(`/posts/${postId}/like`);
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

  // Bookmark a post
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

    try {
      if (wasBookmarked) {
        await feedApi.delete(`/posts/${postId}/bookmark`);
      } else {
        await feedApi.post(`/posts/${postId}/bookmark`);
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
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  },

  // Track post view
  trackPostView: async (postId) => {
    try {
      await feedApi.post(`/posts/${postId}/view`, { source: 'feed' });
    } catch (error) {
      // Silent fail - view tracking shouldn't break UX
      if (__DEV__) {
        console.log('View tracking failed:', error);
      }
    }
  },

  // Update/edit a post
  updatePost: async (postId, data) => {
    try {
      const response = await feedApi.put(`/posts/${postId}`, data);
      
      if (response.data.error) {
        console.error('Failed to update post:', response.data.error);
        return false;
      }
      
      // Refetch the updated post to get full data
      const updatedPostResponse = await feedApi.get(`/posts/${postId}`);
      const updatedPost = updatedPostResponse.data;
      
      // Update post in state
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId ? { ...post, ...updatedPost } : post
        ),
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to update post:', error);
      return false;
    }
  },

  // Fetch post analytics
  fetchPostAnalytics: async (postId) => {
    set((state) => ({
      isLoadingAnalytics: { ...state.isLoadingAnalytics, [postId]: true },
    }));
    
    try {
      const response = await feedApi.get(`/posts/${postId}/analytics`);
      
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
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      
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
        
        // Transform posts
        const transformedPosts: Post[] = posts.map((post: any) => ({
          id: post.id,
          author: {
            id: post.author?.id,
            firstName: post.author?.firstName,
            lastName: post.author?.lastName,
            name: `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim(),
            profilePictureUrl: post.author?.profilePictureUrl,
            role: post.author?.role,
            isVerified: post.author?.isVerified,
          },
          content: post.content,
          postType: post.postType || 'ARTICLE',
          mediaUrls: post.mediaUrls || [],
          likes: post.likesCount || post._count?.likes || 0,
          comments: post.commentsCount || post._count?.comments || 0,
          shares: post.sharesCount || 0,
          isLiked: post.isLikedByMe || false,
          isBookmarked: post.isBookmarked || false,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          topicTags: post.topicTags || post.tags || [],
          pollOptions: post.pollOptions?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.votes || opt._count?.votes || 0,
          })),
          userVotedOptionId: post.userVotedOptionId,
          learningMeta: post.learningMeta,
        }));
        
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
        
        // Transform posts (same as myPosts)
        const transformedPosts: Post[] = posts.map((post: any) => ({
          id: post.id,
          author: {
            id: post.author?.id,
            firstName: post.author?.firstName,
            lastName: post.author?.lastName,
            name: `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim(),
            profilePictureUrl: post.author?.profilePictureUrl,
            role: post.author?.role,
            isVerified: post.author?.isVerified,
          },
          content: post.content,
          postType: post.postType || 'ARTICLE',
          mediaUrls: post.mediaUrls || [],
          likes: post.likesCount || post._count?.likes || 0,
          comments: post.commentsCount || post._count?.comments || 0,
          shares: post.sharesCount || 0,
          isLiked: post.isLikedByMe || false,
          isBookmarked: true, // Always true for bookmarked posts
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          topicTags: post.topicTags || post.tags || [],
          pollOptions: post.pollOptions?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.votes || opt._count?.votes || 0,
          })),
          userVotedOptionId: post.userVotedOptionId,
          learningMeta: post.learningMeta,
        }));
        
        set({ bookmarkedPosts: transformedPosts, isLoadingBookmarks: false });
      } else {
        set({ isLoadingBookmarks: false });
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      set({ isLoadingBookmarks: false });
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
        
        // Transform trending posts
        const transformedTrending: TrendingPost[] = trendingData.map((item: any) => ({
          id: item.id,
          author: {
            id: item.author?.id,
            firstName: item.author?.firstName,
            lastName: item.author?.lastName,
            name: `${item.author?.firstName || ''} ${item.author?.lastName || ''}`.trim(),
            profilePictureUrl: item.author?.profilePictureUrl,
            role: item.author?.role,
            isVerified: item.author?.isVerified,
          },
          content: item.content,
          postType: item.postType || 'ARTICLE',
          mediaUrls: item.mediaUrls || [],
          likes: item.likesCount || item._count?.likes || 0,
          comments: item.commentsCount || item._count?.comments || 0,
          shares: item.sharesCount || 0,
          isLiked: item.isLikedByMe || false,
          isBookmarked: item.isBookmarked || false,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          topicTags: item.topicTags || item.tags || [],
          pollOptions: item.pollOptions?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            votes: opt.votes || opt._count?.votes || 0,
          })),
          userVotedOptionId: item.userVotedOptionId,
          learningMeta: item.learningMeta,
          trendScore: item.trendScore || 0,
          growthRate: item.growthRate || 0,
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

  // Reset store
  reset: () => set(initialState),
}));

export default useFeedStore;
