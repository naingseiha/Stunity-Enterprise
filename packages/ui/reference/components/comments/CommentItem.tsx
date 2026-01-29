"use client";

import { useState } from "react";
import {
  User,
  MoreVertical,
  Edit,
  Trash2,
  Reply as ReplyIcon,
  Heart,
  Smile,
  Lightbulb,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Comment,
  addComment,
  editComment,
  deleteComment,
  toggleCommentReaction,
  type ReactionType,
} from "@/lib/api/feed";
import CommentReactions from "./CommentReactions";
import RichText from "./RichText";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  currentUserId?: string;
  canReply: boolean;
  onReplyAdded: (parentId: string, reply: Comment) => void;
  onCommentUpdated: (commentId: string, newContent: string) => void;
  onCommentDeleted: (commentId: string) => void;
  onReactionToggled: (commentId: string, type: ReactionType, action: "added" | "removed") => void;
}

export default function CommentItem({
  comment,
  postId,
  currentUserId,
  canReply,
  onReplyAdded,
  onCommentUpdated,
  onCommentDeleted,
  onReactionToggled,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const isOwnComment = currentUserId === comment.authorId;

  const getAuthorName = () => {
    if (comment.author.student?.khmerName) return comment.author.student.khmerName;
    if (comment.author.teacher?.khmerName) return comment.author.teacher.khmerName;
    if (comment.author.parent?.khmerName) return comment.author.parent.khmerName;
    return `${comment.author.firstName} ${comment.author.lastName}`;
  };

  const handleEdit = async () => {
    if (!editContent.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await editComment(comment.id, editContent.trim());
      onCommentUpdated(comment.id, editContent.trim());
      setIsEditing(false);
      setShowMenu(false);
    } catch (error) {
      console.error("Failed to edit comment:", error);
      alert("Failed to edit comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await deleteComment(comment.id);
      onCommentDeleted(comment.id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Failed to delete comment");
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || isReplying) return;

    try {
      setIsReplying(true);
      const reply = await addComment(postId, replyContent.trim(), comment.id);
      onReplyAdded(comment.id, reply);
      setReplyContent("");
      setShowReplyBox(false);
    } catch (error) {
      console.error("Failed to add reply:", error);
      alert("Failed to add reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleReaction = async (type: ReactionType) => {
    try {
      const response = await toggleCommentReaction(comment.id, type);
      onReactionToggled(comment.id, type, response.action);
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.author.profilePictureUrl ? (
            <img
              src={comment.author.profilePictureUrl}
              alt={getAuthorName()}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 text-sm">
              {getAuthorName()}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-gray-400 italic">(edited)</span>
            )}
          </div>

          {/* Content or Edit Form */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  disabled={!editContent.trim() || isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words">
              <RichText text={comment.content} />
            </p>
          )}

          {/* Reactions */}
          {!isEditing && (
            <CommentReactions
              reactionCounts={comment.reactionCounts}
              userReaction={comment.userReaction}
              onReact={handleReaction}
            />
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-4 mt-2">
              {canReply && (
                <button
                  onClick={() => setShowReplyBox(!showReplyBox)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <ReplyIcon className="w-3.5 h-3.5" />
                  Reply
                </button>
              )}

              {isOwnComment && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>

                  {showMenu && (
                    <div className="absolute left-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reply Box */}
          {showReplyBox && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${getAuthorName()}...`}
                maxLength={500}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim() || isReplying}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReplying ? "Replying..." : "Reply"}
                </button>
                <button
                  onClick={() => {
                    setShowReplyBox(false);
                    setReplyContent("");
                  }}
                  className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
