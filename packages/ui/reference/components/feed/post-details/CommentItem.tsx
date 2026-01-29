"use client";

import { useState } from "react";
import { Comment, ReactionType, toggleCommentReaction } from "@/lib/api/feed";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import GradientAvatar from "@/components/common/GradientAvatar";
import CommentComposer from "./CommentComposer";
import RichText from "@/components/comments/RichText";
import CommentReactions from "@/components/comments/CommentReactions";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  level?: number;
  onReplyAdded?: (parentId: string, reply: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export default function CommentItem({
  comment,
  postId,
  level = 0,
  onReplyAdded,
  onCommentDeleted,
}: CommentItemProps) {
  const { user } = useAuth();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  
  // Reaction state
  const [reactionCounts, setReactionCounts] = useState(
    comment.reactionCounts || { LIKE: 0, LOVE: 0, HELPFUL: 0, INSIGHTFUL: 0 }
  );
  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    comment.userReaction
  );

  const isOwnComment = user?.id === comment.authorId;
  const maxLevel = 3; // Maximum nesting level
  const canReply = level < maxLevel;

  const getDisplayName = () => {
    const author = comment.author;
    if (author.role === "STUDENT" && author.student?.khmerName) {
      return author.student.khmerName;
    }
    if (author.role === "TEACHER" && author.teacher?.khmerName) {
      return author.teacher.khmerName;
    }
    return `${author.firstName} ${author.lastName}`;
  };

  const getRoleText = () => {
    const author = comment.author;
    if (author.role === "STUDENT" && author.student?.class) {
      return author.student.class.name;
    }
    if (author.role === "TEACHER" && author.teacher?.position) {
      return author.teacher.position;
    }
    return author.role.charAt(0) + author.role.slice(1).toLowerCase();
  };

  const handleReact = async (type: ReactionType) => {
    if (!user) {
      toast.error("Please login to react");
      return;
    }

    try {
      const result = await toggleCommentReaction(comment.id, type);
      
      // Update local state optimistically
      if (result.action === "removed") {
        setUserReaction(null);
        setReactionCounts((prev) => ({
          ...prev,
          [type]: Math.max(0, prev[type] - 1),
        }));
      } else {
        // Remove old reaction count if switching reactions
        if (userReaction && userReaction !== type) {
          setReactionCounts((prev) => ({
            ...prev,
            [userReaction]: Math.max(0, prev[userReaction] - 1),
          }));
        }
        setUserReaction(type);
        setReactionCounts((prev) => ({
          ...prev,
          [type]: prev[type] + 1,
        }));
      }
    } catch (error) {
      console.error("Failed to react:", error);
      toast.error("Failed to react. Please try again.");
    }
  };

  const handleReply = () => {
    setShowReplyBox(true);
  };

  const handleReplySubmit = (reply: Comment) => {
    onReplyAdded?.(comment.id, reply);
    setShowReplyBox(false);
    setShowReplies(true);
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    toast("Edit functionality coming soon!");
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      // TODO: Implement delete API
      toast.success("Comment deleted");
      onCommentDeleted?.(comment.id);
    } catch (error) {
      toast.error("Failed to delete comment");
    }
    setShowMenu(false);
  };

  const handleReport = () => {
    // TODO: Implement report functionality
    toast("Report functionality coming soon!");
    setShowMenu(false);
  };

  return (
    <div className={`${level > 0 ? "ml-8 md:ml-12" : ""} animate-slide-up`} style={{ animationDelay: `${level * 0.05}s` }}>
      {/* Threading Line for nested replies */}
      {level > 0 && (
        <div className="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-transparent" />
      )}
      
      <div className={`bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors relative ${
        level > 0 ? "border-l-2 border-blue-200" : ""
      }`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <GradientAvatar
            name={getDisplayName()}
            imageUrl={comment.author.profilePictureUrl}
            size="md"
            className="flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author Info */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">
                  {getDisplayName()}
                </h4>
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span>{getRoleText()}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {comment.isEdited && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 font-medium">Edited</span>
                    </>
                  )}
                </p>
              </div>

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                      {isOwnComment ? (
                        <>
                          <button
                            onClick={handleEdit}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left text-sm"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-700">Edit</span>
                          </button>
                          <button
                            onClick={handleDelete}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-50 transition-colors text-left text-sm"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span className="text-red-600">Delete</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleReport}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-50 transition-colors text-left text-sm"
                        >
                          <Flag className="w-4 h-4 text-red-600" />
                          <span className="text-red-600">Report</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Comment Text */}
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">
              <RichText text={comment.content} />
            </p>

            {/* Reaction Buttons */}
            <CommentReactions
              reactionCounts={reactionCounts}
              userReaction={userReaction}
              onReact={handleReact}
            />

            {/* Reply Button */}
            {canReply && (
              <button
                onClick={handleReply}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Reply</span>
              </button>
            )}
          </div>
        </div>

        {/* Reply Composer */}
        {showReplyBox && (
          <div className="mt-3 ml-11">
            <CommentComposer
              postId={postId}
              parentId={comment.id}
              onCommentAdded={handleReplySubmit}
              onCancel={() => setShowReplyBox(false)}
              placeholder={`Reply to ${getDisplayName()}...`}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 relative">
          {/* Toggle Replies Button with count badge */}
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="ml-11 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-all hover:gap-3 group"
          >
            {showReplies ? (
              <>
                <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                <span>Hide replies</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                <span>Show replies</span>
              </>
            )}
            {/* Reply count badge */}
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              {comment.repliesCount || comment.replies.length}
            </span>
          </button>

          {/* Replies List with animation */}
          {showReplies && (
            <div className="space-y-2 mt-2 animate-slide-down">
              {comment.replies.map((reply, index) => (
                <div
                  key={reply.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CommentItem
                    comment={reply}
                    postId={postId}
                    level={level + 1}
                    onReplyAdded={onReplyAdded}
                    onCommentDeleted={onCommentDeleted}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
