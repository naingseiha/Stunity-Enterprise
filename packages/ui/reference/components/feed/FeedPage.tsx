"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  Loader2,
  Rss,
  X,
} from "lucide-react";
import {
  getFeedPosts,
  Post,
  PostType,
  POST_TYPE_INFO,
} from "@/lib/api/feed";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import PostCardSkeleton from "./PostCardSkeleton";
import { useAuth } from "@/context/AuthContext";
import StunityLoader from "@/components/common/StunityLoader";
import { socketClient } from "@/lib/socket";

interface FeedPageProps {
  showCreatePost?: boolean;
  onProfileClick?: (userId: string) => void;
  selectedFilter?: PostType | "ALL";
}

function FeedPage({ showCreatePost = true, onProfileClick, selectedFilter: externalFilter }: FeedPageProps) {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const selectedFilter = externalFilter || "ALL";

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch posts
  const fetchPosts = useCallback(
    async (page: number, refresh: boolean = false) => {
      try {
        if (refresh) {
          setIsRefreshing(true);
        } else if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        setError(null);

        const response = await getFeedPosts({
          page,
          limit: 10,
          postType: selectedFilter === "ALL" ? undefined : selectedFilter,
        });

        if (refresh || page === 1) {
          setPosts(response.data);
        } else {
          setPosts((prev) => [...prev, ...response.data]);
        }

        setHasMore(response.pagination.hasMore);
        setCurrentPage(page);
      } catch (err: any) {
        console.error("Failed to fetch posts:", err);
        setError(err.message || "មិនអាចទាញយកការផ្សាយបានទេ");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [selectedFilter]
  );

  // Initial load
  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  // Handle post created
  const handlePostCreated = useCallback(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  // Handle post deleted
  const handlePostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  // Handle post updated (for poll votes, etc.)
  const handlePostUpdated = useCallback((postId: string, updatedData: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, ...updatedData } : post
      )
    );
  }, []);

  // Real-time post updates via Socket.IO
  useEffect(() => {
    if (!currentUser) return;

    const handlePostUpdate = (data: {
      postId: string;
      likesCount?: number;
      commentsCount?: number;
      type: "like" | "unlike" | "comment";
      userId: string;
    }) => {
      console.log("📬 Post update received:", data);

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === data.postId) {
            const updates: Partial<Post> = {};

            // Update like count
            if (data.likesCount !== undefined) {
              updates.likesCount = data.likesCount;
            }

            // Update comment count
            if (data.commentsCount !== undefined) {
              updates.commentsCount = data.commentsCount;
            }

            // Update isLiked status if this user performed the action
            if (data.userId === currentUser.id) {
              if (data.type === "like") {
                updates.isLiked = true;
              } else if (data.type === "unlike") {
                updates.isLiked = false;
              }
            }

            return { ...post, ...updates };
          }
          return post;
        })
      );
    };

    // Listen for post updates
    socketClient.on("post:updated", handlePostUpdate);

    // Cleanup
    return () => {
      socketClient.off("post:updated", handlePostUpdate);
    };
  }, [currentUser]);

  // Prefetch next page (80% scroll threshold)
  const prefetchNextPage = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading) {
      // Clear existing timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
      // Prefetch with small delay to batch multiple scroll events
      prefetchTimeoutRef.current = setTimeout(() => {
        fetchPosts(currentPage + 1);
      }, 100);
    }
  }, [hasMore, isLoadingMore, isLoading, currentPage, fetchPosts]);

  // Infinite scroll observer with prefetching
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Observer for load more trigger at bottom
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchPosts(currentPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    // Prefetch observer (triggers earlier)
    const prefetchObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          prefetchNextPage();
        }
      },
      { rootMargin: '400px' } // Prefetch when 400px away
    );

    if (loadMoreRef.current) {
      prefetchObserver.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      prefetchObserver.disconnect();
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, currentPage, fetchPosts, prefetchNextPage]);

  // Get user info for create post
  const getUserName = () => {
    if (currentUser?.student?.khmerName) return currentUser.student.khmerName;
    if (currentUser?.teacher?.khmerName) return currentUser.teacher.khmerName;
    if (currentUser) return `${currentUser.firstName} ${currentUser.lastName}`;
    return "អ្នកប្រើប្រាស់";
  };

  return (
    <div className="w-full pt-2">
      {/* Create Post */}
        {showCreatePost && (
          <div className="mb-4">
            <CreatePost
              userProfilePicture={currentUser?.profilePictureUrl || null}
              userName={getUserName()}
              onPostCreated={handlePostCreated}
              onError={(error) => setError(error)}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-slide-down">
            <X className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium text-sm">{error}</p>
              <button
                onClick={handleRefresh}
                className="text-red-600 text-sm font-medium underline mt-0.5"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading State with Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="animate-fade-in" 
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <PostCardSkeleton />
              </div>
            ))}
          </div>
        )}

        {/* Posts List with staggered animation */}
        <div className="space-y-4">
          {!isLoading &&
            posts.map((post, index) => (
              <div
                key={post.id}
                className="animate-slide-up"
                style={{ 
                  animationDelay: isRefreshing ? '0s' : `${Math.min(index * 0.05, 0.3)}s`,
                  animationDuration: '0.4s',
                  animationFillMode: 'both'
                }}
              >
                <PostCard
                  post={post}
                  currentUserId={currentUser?.id}
                  onPostDeleted={handlePostDeleted}
                  onPostUpdated={handlePostUpdated}
                  onProfileClick={onProfileClick}
                />
              </div>
          ))}
        </div>

        {/* No posts yet */}
        {!isLoading && posts.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 animate-fade-in">
            <Rss className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              No posts yet
            </h3>
            <p className="text-sm text-gray-500">
              Be the first to share something!
            </p>
          </div>
        )}

        {/* Load More Trigger */}
        {hasMore && !isLoading && (
          <div ref={loadMoreRef} className="py-4">
            {isLoadingMore && (
              <div className="flex items-center justify-center">
                <StunityLoader size="sm" />
              </div>
            )}
          </div>
        )}

        {/* No More Posts */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-6">
            <p className="text-gray-400 text-xs">
              You've seen all posts
            </p>
          </div>
        )}
    </div>
  );
}

export default memo(FeedPage);
