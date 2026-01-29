"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import {
  getComments,
  addComment,
  Comment,
  type ReactionType,
} from "@/lib/api/feed";
import CommentThread from "./CommentThread";

interface CommentsModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export default function CommentsModal({
  postId,
  isOpen,
  onClose,
  currentUserId,
}: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"new" | "old" | "top">("new");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch comments when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchComments();
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Unlock body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      // Cleanup: restore scroll
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, sortBy]);

  const fetchComments = async (loadMore = false) => {
    try {
      setIsLoading(true);
      const currentPage = loadMore ? page + 1 : 1;
      
      const response = await getComments(postId, {
        page: currentPage,
        limit: 20,
        sort: sortBy,
      });

      if (loadMore) {
        setComments((prev) => [...prev, ...response.data]);
        setPage(currentPage);
      } else {
        setComments(response.data);
        setPage(1);
      }

      setHasMore(response.pagination.hasMore);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const comment = await addComment(postId, newComment.trim());
      
      // Ensure comment has default reactionCounts
      const commentWithDefaults = {
        ...comment,
        replies: [],
        repliesCount: 0,
        reactionCounts: {
          LIKE: 0,
          LOVE: 0,
          HELPFUL: 0,
          INSIGHTFUL: 0,
        },
        userReaction: null,
        isEdited: false,
      };
      
      // Add new comment to the list based on sort order
      if (sortBy === "new") {
        setComments([commentWithDefaults, ...comments]);
      } else {
        setComments([...comments, commentWithDefaults]);
      }
      
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Failed to add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyAdded = (parentId: string, reply: Comment) => {
    // Ensure reply has default reactionCounts
    const replyWithDefaults = {
      ...reply,
      replies: [],
      repliesCount: 0,
      reactionCounts: {
        LIKE: 0,
        LOVE: 0,
        HELPFUL: 0,
        INSIGHTFUL: 0,
      },
      userReaction: null,
      isEdited: false,
    };
    
    // Add reply to parent comment's replies array
    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...comment.replies, replyWithDefaults],
            repliesCount: comment.repliesCount + 1,
          };
        }
        return comment;
      })
    );
  };

  const handleCommentUpdated = (commentId: string, newContent: string) => {
    const updateComment = (comments: Comment[]): Comment[] => {
      return comments.map((comment) => {
        if (comment.id === commentId) {
          return { ...comment, content: newContent, isEdited: true };
        }
        if (comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateComment(comment.replies),
          };
        }
        return comment;
      });
    };

    setComments(updateComment(comments));
  };

  const handleCommentDeleted = (commentId: string) => {
    const deleteComment = (comments: Comment[]): Comment[] => {
      return comments
        .filter((comment) => comment.id !== commentId)
        .map((comment) => ({
          ...comment,
          replies: deleteComment(comment.replies),
        }));
    };

    setComments(deleteComment(comments));
  };

  const handleReactionToggled = (commentId: string, type: ReactionType, action: "added" | "removed") => {
    const updateReaction = (comments: Comment[]): Comment[] => {
      return comments.map((comment) => {
        if (comment.id === commentId) {
          const newCounts = { ...comment.reactionCounts };
          newCounts[type] += action === "added" ? 1 : -1;

          return {
            ...comment,
            reactionCounts: newCounts,
            userReaction: action === "added" ? type : null,
          };
        }
        if (comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateReaction(comment.replies),
          };
        }
        return comment;
      });
    };

    setComments(updateReaction(comments));
  };

  if (!isOpen) return null;

  // Check if we're in the browser before rendering portal
  if (typeof window === 'undefined') return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Comments</h2>
              <p className="text-sm text-gray-500">{comments.length} comments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-100">
          {[
            { value: "new" as const, label: "Newest" },
            { value: "top" as const, label: "Top" },
            { value: "old" as const, label: "Oldest" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSortBy(tab.value)}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                sortBy === tab.value
                  ? "text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add Comment Form */}
        <div className="p-6 border-b border-gray-200">
          <form onSubmit={handleAddComment} className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              maxLength={500}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading && comments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  postId={postId}
                  currentUserId={currentUserId}
                  onReplyAdded={handleReplyAdded}
                  onCommentUpdated={handleCommentUpdated}
                  onCommentDeleted={handleCommentDeleted}
                  onReactionToggled={handleReactionToggled}
                />
              ))}
              
              {hasMore && (
                <button
                  onClick={() => fetchComments(true)}
                  disabled={isLoading}
                  className="w-full py-3 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Loading..." : "Load more comments"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Render modal content in a portal at document.body level
  return createPortal(modalContent, document.body);
}
