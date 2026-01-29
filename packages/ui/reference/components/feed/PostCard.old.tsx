"use client";

import { useState, memo, useCallback } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  FileText,
  GraduationCap,
  Brain,
  HelpCircle,
  ClipboardCheck,
  Megaphone,
  BookOpen,
  BarChart3,
  FolderOpen,
  Clock,
  Edit,
  Trash2,
  Flag,
  X,
  Star,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Post, PostType, toggleLike, deletePost, POST_TYPE_INFO } from "@/lib/api/feed";
import { formatDistanceToNow } from "date-fns";
import { km } from "date-fns/locale";

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onPostDeleted?: (postId: string) => void;
  onCommentClick?: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
}

const POST_TYPE_ICONS: Record<PostType, React.ElementType> = {
  ARTICLE: FileText,
  COURSE: GraduationCap,
  QUIZ: Brain,
  QUESTION: HelpCircle,
  EXAM: ClipboardCheck,
  ANNOUNCEMENT: Megaphone,
  ASSIGNMENT: BookOpen,
  POLL: BarChart3,
  RESOURCE: FolderOpen,
};

function PostCard({
  post,
  currentUserId,
  onPostDeleted,
  onCommentClick,
  onProfileClick,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isOwnPost = currentUserId === post.authorId;
  const PostTypeIcon = POST_TYPE_ICONS[post.postType];
  const postTypeInfo = POST_TYPE_INFO[post.postType];

  const getAuthorName = () => {
    if (post.author.student?.khmerName) return post.author.student.khmerName;
    if (post.author.teacher?.khmerName) return post.author.teacher.khmerName;
    if (post.author.parent?.khmerName) return post.author.parent.khmerName;
    return `${post.author.firstName} ${post.author.lastName}`;
  };

  const getTimeAgo = () => {
    const date = new Date(post.createdAt);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });
    }
    return formatDistanceToNow(date, { addSuffix: false, locale: km });
  };

  const handleLike = useCallback(async () => {
    if (isLiking) return;

    setIsLiking(true);
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      const result = await toggleLike(post.id);
      setIsLiked(result.isLiked);
      setLikesCount(result.likesCount);
    } catch (error) {
      // Revert on error
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, isLiked, likesCount, post.id]);
      setIsLiking(false);
    }
  }, [post.id, isLiked, likesCount, isLiking]);

  const handleDelete = useCallback(async () => {
    if (isDeleting || !confirm("តើអ្នកពិតជាចង់លុបការផ្សាយនេះមែនទេ?")) return;

    setIsDeleting(true);
    try {
      await deletePost(post.id);
      onPostDeleted?.(post.id);
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("មិនអាចលុបការផ្សាយបានទេ។");
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  }, [post.id, isDeleting, onPostDeleted]);

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: km,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <button
          onClick={() => onProfileClick?.(post.authorId)}
          className="flex-shrink-0"
        >
          {post.author.profilePictureUrl ? (
            <img
              src={post.author.profilePictureUrl}
              alt={getAuthorName()}
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onProfileClick?.(post.authorId)}
              className="font-bold text-gray-900 hover:underline"
            >
              {getAuthorName()}
            </button>

            {post.postType !== "STATUS" && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white bg-gradient-to-r ${postTypeInfo.color}`}
              >
                <PostTypeIcon className="w-3 h-3" />
                {postTypeInfo.labelKh}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span>{getAuthorSubtitle()}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(post.createdAt)}
            </span>
            {post.isEdited && <span className="text-gray-400">(edited)</span>}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                {isOwnPost ? (
                  <>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Edit className="w-4 h-4" />
                      កែប្រែ
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? "កំពុងលុប..." : "លុប"}
                    </button>
                  </>
                ) : (
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Flag className="w-4 h-4" />
                    រាយការណ៍
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Media */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div
          className={`grid gap-1 ${
            post.mediaUrls.length === 1
              ? "grid-cols-1"
              : post.mediaUrls.length === 2
                ? "grid-cols-2"
                : "grid-cols-2"
          }`}
        >
          {post.mediaUrls.slice(0, 4).map((url, index) => (
            <div
              key={index}
              className={`relative ${
                post.mediaUrls.length === 3 && index === 0 ? "col-span-2" : ""
              }`}
            >
              <img
                src={url}
                alt={`Media ${index + 1}`}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
              {index === 3 && post.mediaUrls.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    +{post.mediaUrls.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
        <div className="flex items-center gap-4">
          {likesCount > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              {likesCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {post.commentsCount > 0 && (
            <button
              onClick={() => onCommentClick?.(post.id)}
              className="hover:underline"
            >
              {post.commentsCount} មតិ
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-2 py-1 flex items-center border-t border-gray-100">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors ${
            isLiked
              ? "text-red-500 bg-red-50"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Heart
            className={`w-5 h-5 transition-transform ${
              isLiked ? "fill-red-500 scale-110" : ""
            }`}
          />
          <span className="font-medium text-sm">ចូលចិត្ត</span>
        </button>

        <button
          onClick={() => onCommentClick?.(post.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium text-sm">មតិ</span>
        </button>

        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <Share2 className="w-5 h-5" />
          <span className="font-medium text-sm">ចែករំលែក</span>
        </button>
      </div>
    </div>
  );
}

export default memo(PostCard);
