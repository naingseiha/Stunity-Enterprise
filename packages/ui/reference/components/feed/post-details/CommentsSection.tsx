"use client";

import { useState, useEffect } from "react";
import { Comment, getComments } from "@/lib/api/feed";
import { MessageCircle, TrendingUp, Clock, Loader2 } from "lucide-react";
import CommentItem from "./CommentItem";
import CommentComposer from "./CommentComposer";
import CommentsLoadingSkeleton from "./CommentsLoadingSkeleton";

interface CommentsSectionProps {
  postId: string;
  commentsCount: number;
  onCommentAdded: () => void;
}

type SortOption = "top" | "newest" | "oldest";

export default function CommentsSection({
  postId,
  commentsCount,
  onCommentAdded,
}: CommentsSectionProps) {
  // Load saved sort preference from localStorage
  const savedSort = typeof window !== 'undefined' 
    ? (localStorage.getItem('commentSortPreference') as SortOption) || 'top'
    : 'top';
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(savedSort);

  // Save sort preference to localStorage
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    if (typeof window !== 'undefined') {
      localStorage.setItem('commentSortPreference', newSort);
    }
  };

  useEffect(() => {
    loadComments(true);
  }, [postId, sortBy]);

  const loadComments = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const response = await getComments(postId, {
        page: reset ? 1 : page,
        limit: 10,
        sort: sortBy === "newest" ? "new" : sortBy === "oldest" ? "old" : "top",
      });

      if (reset) {
        setComments(response.data);
      } else {
        setComments((prev) => [...prev, ...response.data]);
      }

      setHasMore(response.pagination.hasMore);
      if (!reset) {
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCommentAdded = (newComment: Comment) => {
    setComments((prev) => [newComment, ...prev]);
    onCommentAdded();
  };

  const handleReplyAdded = (parentId: string, reply: Comment) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === parentId
          ? {
              ...comment,
              replies: [...comment.replies, reply],
              repliesCount: comment.repliesCount + 1,
            }
          : comment
      )
    );
    onCommentAdded();
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const sortOptions = [
    { value: "top", label: "Top", icon: TrendingUp },
    { value: "newest", label: "Newest", icon: Clock },
    { value: "oldest", label: "Oldest", icon: Clock },
  ];

  return (
    <div id="comments-section" className="bg-white rounded-2xl shadow-md p-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-blue-500" />
          <span>Comments</span>
          <span className="text-gray-500">({commentsCount})</span>
        </h2>

        {/* Sort Options */}
        <div className="flex gap-2">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value as SortOption)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  sortBy === option.value
                    ? "bg-blue-500 text-white shadow-md scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment Composer (Desktop) */}
      <div className="hidden md:block mb-6">
        <CommentComposer postId={postId} onCommentAdded={handleCommentAdded} />
      </div>

      {/* Comments List */}
      {loading ? (
        <CommentsLoadingSkeleton />
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">
            No comments yet
          </p>
          <p className="text-gray-400 text-sm">
            Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onReplyAdded={handleReplyAdded}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}

          {/* Load More Button */}
          {hasMore && (
            <button
              onClick={() => loadComments(false)}
              disabled={loadingMore}
              className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <span>Load More Comments</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
