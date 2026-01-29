"use client";

import { Comment, type ReactionType } from "@/lib/api/feed";
import CommentItem from "./CommentItem";

interface CommentThreadProps {
  comment: Comment;
  postId: string;
  currentUserId?: string;
  level?: number;
  onReplyAdded: (parentId: string, reply: Comment) => void;
  onCommentUpdated: (commentId: string, newContent: string) => void;
  onCommentDeleted: (commentId: string) => void;
  onReactionToggled: (commentId: string, type: ReactionType, action: "added" | "removed") => void;
}

export default function CommentThread({
  comment,
  postId,
  currentUserId,
  level = 0,
  onReplyAdded,
  onCommentUpdated,
  onCommentDeleted,
  onReactionToggled,
}: CommentThreadProps) {
  const maxNestingLevel = 3; // Limit nesting depth
  const canNest = level < maxNestingLevel;

  return (
    <div className={level > 0 ? "ml-8 mt-3" : ""}>
      {/* Comment Item */}
      <CommentItem
        comment={comment}
        postId={postId}
        currentUserId={currentUserId}
        canReply={canNest}
        onReplyAdded={onReplyAdded}
        onCommentUpdated={onCommentUpdated}
        onCommentDeleted={onCommentDeleted}
        onReactionToggled={onReactionToggled}
      />

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              level={level + 1}
              onReplyAdded={onReplyAdded}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              onReactionToggled={onReactionToggled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
