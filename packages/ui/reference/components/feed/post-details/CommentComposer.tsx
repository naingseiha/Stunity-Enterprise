"use client";

import { useState, useRef, useEffect } from "react";
import { Comment, createComment } from "@/lib/api/feed";
import { Send, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import GradientAvatar from "@/components/common/GradientAvatar";
import { useMentions } from "@/hooks/useMentions";
import { useTextFormatting } from "@/hooks/useTextFormatting";
import MentionSuggestions from "@/components/comments/MentionSuggestions";
import FormattingToolbar from "@/components/comments/FormattingToolbar";
import { AnimatePresence } from "framer-motion";

interface CommentComposerProps {
  postId: string;
  parentId?: string;
  onCommentAdded: (comment: Comment) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CommentComposer({
  postId,
  parentId,
  onCommentAdded,
  onCancel,
  placeholder = "Write a comment...",
  autoFocus = false,
}: CommentComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [showToolbar, setShowToolbar] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mention functionality
  const mentions = useMentions(textareaRef, {
    onMention: (userId, userName) => {
      setMentionedUsers((prev) => [...prev, { id: userId, name: userName }]);
    },
  });

  // Formatting functionality
  const formatting = useTextFormatting({
    textareaRef,
    value: content,
    onChange: setContent,
  });

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const newComment = await createComment(postId, {
        content: content.trim(),
        parentId: parentId || null,
      });

      onCommentAdded(newComment);
      setContent("");
      toast.success(parentId ? "Reply posted!" : "Comment posted!");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention navigation first
    const mentionHandled = mentions.handleKeyDown(e, content, setContent);
    if (mentionHandled) return;

    // Handle formatting shortcuts (Ctrl+B, Ctrl+I, etc.)
    const formattingHandled = formatting.handleKeyDown(e);
    if (formattingHandled) return;

    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContent(newValue);
    mentions.handleInput(newValue);
  };

  const getDisplayName = () => {
    if (!user) return "User";
    if (user.role === "STUDENT" && user.student?.khmerName) {
      return user.student.khmerName;
    }
    if (user.role === "TEACHER" && user.teacher?.khmerName) {
      return user.teacher.khmerName;
    }
    return `${user.firstName} ${user.lastName}`;
  };

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-gray-600 text-sm">
          Please log in to comment
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 md:border-0 md:bg-gray-50 md:rounded-xl p-4">
      <div className="flex gap-3">
        {/* Avatar (hidden on mobile when sticky) */}
        <div className="hidden md:block flex-shrink-0">
          <GradientAvatar
            name={getDisplayName()}
            imageUrl={user.profilePictureUrl}
            size="md"
          />
        </div>

        {/* Input Area */}
        <div className="flex-1 relative">
          <div className={`rounded-xl border ${showToolbar ? 'border-blue-500' : 'border-gray-200 md:border-0'} bg-white md:bg-gray-100 overflow-hidden transition-all`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowToolbar(true)}
              onBlur={() => {
                // Delay to allow clicking toolbar buttons
                setTimeout(() => setShowToolbar(false), 200);
              }}
              placeholder={placeholder}
              className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-sm"
              rows={1}
              maxLength={500}
              disabled={isSubmitting}
            />

            {/* Formatting Toolbar */}
            <FormattingToolbar
              onFormat={formatting.applyFormat}
              show={showToolbar}
            />
          </div>

          {/* Mention Suggestions */}
          <AnimatePresence>
            {mentions.showSuggestions && (
              <MentionSuggestions
                suggestions={mentions.suggestions}
                selectedIndex={mentions.selectedIndex}
                onSelect={(user) => mentions.insertMention(user, content, setContent)}
                position="top"
              />
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-2">
            {/* Character Count */}
            <span className="text-xs text-gray-500">
              {content.length}/500
            </span>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {/* Cancel Button (for replies) */}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Posting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Post</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hint */}
          <p className="text-xs text-gray-400 mt-1 hidden md:block">
            Press Cmd/Ctrl + Enter to submit
          </p>
        </div>
      </div>
    </form>
  );
}
