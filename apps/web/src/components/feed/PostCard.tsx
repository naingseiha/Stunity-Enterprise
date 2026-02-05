'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Globe,
  School,
  Users,
  Lock,
  FileText,
  BarChart3,
  Megaphone,
  HelpCircle,
  Award,
  Clock,
  CheckCircle,
  Bookmark,
  Edit2,
  Trash2,
  Flag,
  Copy,
  ExternalLink,
  X,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Comment {
  id: string;
  content: string;
  author: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  role?: string;
}

export interface PostData {
  id: string;
  content: string;
  postType: string;
  visibility: string;
  author: Author;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  mediaUrls?: string[];
  pollOptions?: PollOption[];
  userVotedOptionId?: string;
  comments?: Comment[];
}

interface PostCardProps {
  post: PostData;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onVote?: (postId: string, optionId: string) => void;
  onBookmark?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onEdit?: (postId: string, content: string) => void;
  onDelete?: (postId: string) => void;
  currentUserId?: string;
}

export default function PostCard({ 
  post, 
  onLike, 
  onComment, 
  onVote, 
  onBookmark,
  onShare,
  onEdit,
  onDelete,
  currentUserId 
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localVoted, setLocalVoted] = useState(post.userVotedOptionId);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);
  const [localBookmarked, setLocalBookmarked] = useState(post.isBookmarked);
  const [localSharesCount, setLocalSharesCount] = useState(post.sharesCount);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor = currentUserId === post.author.id;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = now.getTime() - postDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return postDate.toLocaleDateString();
  };

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'PUBLIC': return Globe;
      case 'SCHOOL': return School;
      case 'CLASS': return Users;
      case 'PRIVATE': return Lock;
      default: return Globe;
    }
  };

  const getTypeConfig = () => {
    switch (post.postType) {
      case 'POLL':
        return { 
          icon: BarChart3, 
          color: 'purple', 
          label: 'Poll', 
          bgColor: 'bg-gradient-to-br from-purple-50/80 via-violet-50/60 to-indigo-50/80', 
          borderColor: 'border-purple-200/60', 
          textColor: 'text-purple-700',
          gradient: 'from-purple-500 via-violet-500 to-indigo-500',
          iconBg: 'from-purple-400 to-violet-500'
        };
      case 'ANNOUNCEMENT':
        return { 
          icon: Megaphone, 
          color: 'red', 
          label: 'Announcement', 
          bgColor: 'bg-gradient-to-br from-red-50/80 via-rose-50/60 to-pink-50/80', 
          borderColor: 'border-red-200/60', 
          textColor: 'text-red-700',
          gradient: 'from-red-500 via-rose-500 to-pink-500',
          iconBg: 'from-red-400 to-rose-500'
        };
      case 'QUESTION':
        return { 
          icon: HelpCircle, 
          color: 'green', 
          label: 'Question', 
          bgColor: 'bg-gradient-to-br from-emerald-50/80 via-green-50/60 to-teal-50/80', 
          borderColor: 'border-green-200/60', 
          textColor: 'text-emerald-700',
          gradient: 'from-emerald-500 via-green-500 to-teal-500',
          iconBg: 'from-emerald-400 to-green-500'
        };
      case 'ACHIEVEMENT':
        return { 
          icon: Award, 
          color: 'yellow', 
          label: 'Achievement', 
          bgColor: 'bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/80', 
          borderColor: 'border-amber-200/60', 
          textColor: 'text-amber-700',
          gradient: 'from-amber-500 via-yellow-500 to-orange-500',
          iconBg: 'from-amber-400 to-orange-500'
        };
      default:
        return { 
          icon: FileText, 
          color: 'blue', 
          label: 'Article', 
          bgColor: 'bg-white/80 backdrop-blur-sm', 
          borderColor: 'border-gray-200/60', 
          textColor: 'text-gray-700',
          gradient: 'from-indigo-500 via-purple-500 to-pink-500',
          iconBg: 'from-indigo-400 to-purple-500'
        };
    }
  };

  const getAvatarGradient = () => {
    switch (post.postType) {
      case 'POLL': return 'from-purple-500 via-violet-500 to-indigo-500';
      case 'ANNOUNCEMENT': return 'from-red-500 via-rose-500 to-pink-500';
      case 'QUESTION': return 'from-emerald-500 via-green-500 to-teal-500';
      case 'ACHIEVEMENT': return 'from-amber-500 via-yellow-500 to-orange-500';
      default: return 'from-indigo-500 via-purple-500 to-pink-500';
    }
  };

  const handleVote = (optionId: string) => {
    if (localVoted || !onVote) return;
    setLocalVoted(optionId);
    onVote(post.id, optionId);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
  };

  const handleBookmark = () => {
    setLocalBookmarked(!localBookmarked);
    onBookmark?.(post.id);
  };

  const handleShare = (type: 'copy' | 'native') => {
    if (type === 'copy') {
      navigator.clipboard.writeText(`${window.location.origin}/feed/post/${post.id}`);
      setLocalSharesCount(prev => prev + 1);
      onShare?.(post.id);
    } else if (navigator.share) {
      navigator.share({
        title: `Post by ${post.author.firstName} ${post.author.lastName}`,
        text: post.content.substring(0, 100),
        url: `${window.location.origin}/feed/post/${post.id}`,
      }).then(() => {
        setLocalSharesCount(prev => prev + 1);
        onShare?.(post.id);
      });
    }
    setShowShareModal(false);
  };

  const handleEdit = async () => {
    if (!editContent.trim() || isEditing) return;
    setIsEditing(true);
    try {
      await onEdit?.(post.id, editContent);
      setShowEditModal(false);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await onDelete?.(post.id);
    setShowDeleteConfirm(false);
  };

  const VisibilityIcon = getVisibilityIcon();
  const typeConfig = getTypeConfig();
  const TypeIcon = typeConfig.icon;

  const totalVotes = post.pollOptions?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0;

  return (
    <div className={`${typeConfig.bgColor} backdrop-blur-md border ${typeConfig.borderColor} rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group`}>
      {/* Type Badge for special posts */}
      {post.postType !== 'ARTICLE' && (
        <div className={`px-5 py-3 flex items-center gap-3 border-b ${typeConfig.borderColor} bg-white/40 backdrop-blur-sm`}>
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${typeConfig.iconBg} flex items-center justify-center shadow-sm`}>
            <TypeIcon className="w-4 h-4 text-white" />
          </div>
          <span className={`text-sm font-bold ${typeConfig.textColor}`}>{typeConfig.label}</span>
          {post.postType === 'ANNOUNCEMENT' && (
            <span className="ml-auto flex items-center gap-1 text-xs text-red-600 bg-red-100/70 px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>Important</span>
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Author Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {post.author.profileImage ? (
              <img
                src={post.author.profileImage}
                alt={`${post.author.firstName} ${post.author.lastName}`}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-md"
              />
            ) : (
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white/50`}>
                {getInitials(post.author.firstName, post.author.lastName)}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900 text-base">
                {post.author.firstName} {post.author.lastName}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDate(post.createdAt)}</span>
                <span className="w-1 h-1 rounded-full bg-gray-400" />
                <VisibilityIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          {/* More Menu */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-xl transition-all active:scale-95"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 py-2 z-20">
                {isAuthor && (
                  <>
                    <button
                      onClick={() => { setShowEditModal(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50/80 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="text-sm">Edit Post</span>
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Delete Post</span>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                  </>
                )}
                <button
                  onClick={() => { handleBookmark(); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Bookmark className={`w-4 h-4 ${localBookmarked ? 'fill-current text-yellow-500' : ''}`} />
                  <span className="text-sm">{localBookmarked ? 'Remove Bookmark' : 'Bookmark'}</span>
                </button>
                <button
                  onClick={() => { handleShare('copy'); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">Copy Link</span>
                </button>
                {!isAuthor && (
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    <span className="text-sm">Report</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-[15px]">{post.content}</p>
        </div>

        {/* Poll Options */}
        {post.postType === 'POLL' && post.pollOptions && (
          <div className="space-y-3 mb-4">
            {post.pollOptions.map((option) => {
              const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const isVoted = localVoted === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={!!localVoted}
                  className={`w-full relative overflow-hidden rounded-xl p-4 text-left transition-all active:scale-[0.98] ${
                    localVoted
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-purple-50/80 hover:shadow-md'
                  } ${isVoted ? 'ring-2 ring-purple-500 bg-purple-50/60' : 'border border-purple-200/60 bg-white/60 backdrop-blur-sm'}`}
                >
                  {/* Progress bar background */}
                  {localVoted && (
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-purple-100/80 to-violet-100/80 transition-all duration-700 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isVoted && <CheckCircle className="w-5 h-5 text-purple-600" />}
                      <span className="text-sm font-semibold text-gray-800">{option.text}</span>
                    </div>
                    {localVoted && (
                      <span className="text-sm font-bold text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-lg">{percentage}%</span>
                    )}
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-gray-500 flex items-center gap-2 mt-3 pl-1">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="font-medium">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            </p>
          </div>
        )}

        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden shadow-md">
            {post.mediaUrls.length === 1 ? (
              <img
                src={post.mediaUrls[0]}
                alt="Post media"
                className="w-full h-auto max-h-96 object-cover"
              />
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {post.mediaUrls.slice(0, 4).map((url, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`Post media ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 3 && post.mediaUrls!.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">+{post.mediaUrls!.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3 pb-3 border-b border-gray-200/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="font-medium">{post.likesCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-blue-400" />
              <span className="font-medium">{post.commentsCount}</span>
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-green-400" />
            <span className="font-medium">{localSharesCount}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLike(post.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all active:scale-95 ${
              post.isLiked
                ? 'text-red-500 bg-gradient-to-br from-red-50 to-rose-50 shadow-sm'
                : 'text-gray-600 hover:bg-white/60 hover:shadow-sm'
            }`}
          >
            <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-semibold">Like</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all active:scale-95 ${
              showComments ? 'text-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm' : 'text-gray-600 hover:bg-white/60 hover:shadow-sm'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Comment</span>
          </button>
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-gray-600 hover:bg-white/60 hover:shadow-sm rounded-xl transition-all active:scale-95"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm font-semibold">Share</span>
          </button>
          <button
            onClick={handleBookmark}
            className={`p-2.5 rounded-xl transition-all active:scale-95 ${
              localBookmarked ? 'text-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-sm' : 'text-gray-600 hover:bg-white/60 hover:shadow-sm'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${localBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-200/60">
            {/* Comment Input */}
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all placeholder:text-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-5 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:shadow-lg disabled:opacity-50 transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            {post.comments && post.comments.length > 0 && (
              <div className="space-y-3">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                      {getInitials(comment.author.firstName, comment.author.lastName)}
                    </div>
                    <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm">
                      <p className="text-sm font-bold text-gray-900">
                        {comment.author.firstName} {comment.author.lastName}
                      </p>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-sm shadow-2xl border border-white/40" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200/60">
              <h3 className="text-lg font-bold text-gray-900">Share Post</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100/60 rounded-xl transition-colors active:scale-95">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50/80 rounded-2xl transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Copy Link</p>
                  <p className="text-sm text-gray-500">Copy post link to clipboard</p>
                </div>
              </button>
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={() => handleShare('native')}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50/80 rounded-2xl transition-all active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Share via...</p>
                    <p className="text-sm text-gray-500">Share using system options</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl border border-white/40" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200/60">
              <h3 className="text-lg font-bold text-gray-900">Edit Post</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100/60 rounded-xl transition-colors active:scale-95">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                className="w-full p-4 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 text-gray-900 transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200/60">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100/60 rounded-xl font-semibold transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isEditing || !editContent.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
              >
                {isEditing && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-sm shadow-2xl border border-white/40" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center shadow-md">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Post?</h3>
              <p className="text-gray-600 mb-6">This action cannot be undone. This will permanently delete your post.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-3 text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 rounded-xl font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
