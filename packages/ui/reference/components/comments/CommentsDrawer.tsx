"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2, MessageCircle, TrendingUp, Clock, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getComments,
  addComment,
  Comment,
} from "@/lib/api/feed";
import CommentThread from "./CommentThread";
import { socketClient } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";

interface CommentsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  initialCommentsCount?: number;
}

export default function CommentsDrawer({
  postId,
  isOpen,
  onClose,
  initialCommentsCount = 0,
}: CommentsDrawerProps) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"new" | "old" | "top">("new");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchComments();
      // Lock body scroll when drawer opens
      document.body.style.overflow = 'hidden';
      // Focus textarea after drawer opens
      setTimeout(() => textareaRef.current?.focus(), 300);
    } else {
      // Unlock body scroll when drawer closes
      document.body.style.overflow = 'unset';
    }

    return () => {
      // Cleanup: restore scroll on unmount
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, sortBy]);

  // Real-time comment updates via Socket.IO
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const handleCommentAdded = (data: {
      postId: string;
      comment: Comment;
      userId: string;
    }) => {
      // Only update if this is the same post
      if (data.postId !== postId) return;

      console.log("📬 New comment received:", data);

      // Add comment with defaults
      const commentWithDefaults = {
        ...data.comment,
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

      // Don't add if it's from current user (optimistic update already added it)
      if (data.userId === currentUser.id) return;

      // Add to list based on sort order
      setComments((prevComments) => {
        if (sortBy === "new") {
          return [commentWithDefaults, ...prevComments];
        } else {
          return [...prevComments, commentWithDefaults];
        }
      });
    };

    socketClient.on("comment:added", handleCommentAdded);

    return () => {
      socketClient.off("comment:added", handleCommentAdded);
    };
  }, [isOpen, postId, currentUser, sortBy]);

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

      // Optimistic update - add to list immediately
      if (sortBy === "new") {
        setComments([commentWithDefaults, ...comments]);
      } else {
        setComments([...comments, commentWithDefaults]);
      }

      setNewComment("");
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    // Close if dragged down more than 100px
    if (info.offset.y > 100) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Check if we're in the browser before rendering portal
  if (typeof window === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

        {/* Drawer */}
        <motion.div
          ref={drawerRef}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
          className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col"
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2 sm:hidden">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Comments
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            <button
              onClick={() => setSortBy("new")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === "new"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Clock className="w-4 h-4" />
              Newest
            </button>
            <button
              onClick={() => setSortBy("top")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === "top"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Top
            </button>
            <button
              onClick={() => setSortBy("old")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === "old"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Flame className="w-4 h-4" />
              Oldest
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading && comments.length === 0 ? (
              <div className="space-y-4">
                {/* Loading Skeleton */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <CommentThread
                      comment={comment}
                      postId={postId}
                      currentUserId={currentUser?.id}
                      level={0}
                    />
                  </motion.div>
                ))}

                {/* Load More */}
                {hasMore && (
                  <button
                    onClick={() => fetchComments(true)}
                    disabled={isLoading}
                    className="w-full py-3 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Load more comments"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comment Input */}
          <form
            onSubmit={handleAddComment}
            className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-gray-50 dark:bg-gray-900"
          >
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={1}
                className="flex-1 resize-none px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );

  // Render modal content in a portal at document.body level
  return createPortal(modalContent, document.body);
}
