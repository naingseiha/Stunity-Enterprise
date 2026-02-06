/**
 * Feed Store
 * 
 * State management for social feed, posts, and stories
 */

import { create } from 'zustand';
import { Post, Story, StoryGroup, PaginationParams } from '@/types';
import { feedApi } from '@/api/client';

interface FeedState {
  // Posts
  posts: Post[];
  isLoadingPosts: boolean;
  hasMorePosts: boolean;
  postsPage: number;
  
  // Stories
  storyGroups: StoryGroup[];
  isLoadingStories: boolean;
  activeStoryGroupIndex: number | null;
  activeStoryIndex: number;
  
  // Actions
  fetchPosts: (refresh?: boolean) => Promise<void>;
  fetchStories: () => Promise<void>;
  createPost: (content: string, mediaUrls?: string[]) => Promise<boolean>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  
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
  storyGroups: [],
  isLoadingStories: false,
  activeStoryGroupIndex: null,
  activeStoryIndex: 0,
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
        params: { page, pageSize: 20 },
      });

      if (response.data.success) {
        const newPosts = response.data.posts || [];
        const hasMore = response.data.pagination?.hasMore ?? newPosts.length === 20;

        set({
          posts: refresh ? newPosts : [...posts, ...newPosts],
          postsPage: page + 1,
          hasMorePosts: hasMore,
          isLoadingPosts: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      set({ isLoadingPosts: false });
    }
  },

  // Fetch stories
  fetchStories: async () => {
    set({ isLoadingStories: true });

    try {
      const response = await feedApi.get('/stories');

      if (response.data.success) {
        set({
          storyGroups: response.data.storyGroups || [],
          isLoadingStories: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
      set({ isLoadingStories: false });
    }
  },

  // Create a new post
  createPost: async (content, mediaUrls = []) => {
    try {
      const response = await feedApi.post('/posts', {
        content,
        mediaUrls,
      });

      if (response.data.success) {
        const newPost = response.data.post;
        set((state) => ({
          posts: [newPost, ...state.posts],
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to create post:', error);
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
