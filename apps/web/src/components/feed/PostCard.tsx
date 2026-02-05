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
        return { icon: BarChart3, color: 'purple', label: 'Poll', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700' };
      case 'ANNOUNCEMENT':
        return { icon: Megaphone, color: 'red', label: 'Announcement', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700' };
      case 'QUESTION':
        return { icon: HelpCircle, color: 'green', label: 'Question', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700' };
      case 'ACHIEVEMENT':
        return { icon: Award, color: 'yellow', label: 'Achievement', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-700' };
      default:
        return { icon: FileText, color: 'blue', label: 'Article', bgColor: 'bg-white', borderColor: 'border-gray-200', textColor: 'text-gray-700' };
    }
  };

  const getAvatarGradient = () => {
    switch (post.postType) {
      case 'POLL': return 'from-purple-500 to-purple-600';
      case 'ANNOUNCEMENT': return 'from-red-500 to-red-600';
      case 'QUESTION': return 'from-green-500 to-green-600';
      case 'ACHIEVEMENT': return 'from-yellow-500 to-orange-500';
      default: return 'from-blue-500 to-blue-600';
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
    <div className={`${typeConfig.bgColor} border ${typeConfig.borderColor} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      {/* Type Badge for special posts */}
      {post.postType !== 'ARTICLE' && (
        <div className={`px-4 py-2 flex items-center gap-2 border-b ${typeConfig.borderColor}`}>
          <TypeIcon className={`w-4 h-4 ${typeConfig.textColor}`} />
          <span className={`text-sm font-medium ${typeConfig.textColor}`}>{typeConfig.label}</span>
        </div>
      )}

      <div className="p-4">
        {/* Author Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {post.author.profileImage ? (
              <img
                src={post.author.profileImage}
                alt={`${post.author.firstName} ${post.author.lastName}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-semibold text-sm`}>
                {getInitials(post.author.firstName, post.author.lastName)}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {post.author.firstName} {post.author.lastName}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatDate(post.createdAt)}</span>
                <span>•</span>
                <VisibilityIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          {/* More Menu */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                {isAuthor && (
                  <>
                    <button
                      onClick={() => { setShowEditModal(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
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
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Poll Options */}
        {post.postType === 'POLL' && post.pollOptions && (
          <div className="space-y-2 mb-4">
            {post.pollOptions.map((option) => {
              const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const isVoted = localVoted === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={!!localVoted}
                  className={`w-full relative overflow-hidden rounded-lg p-3 text-left transition-all ${
                    localVoted
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-purple-100'
                  } ${isVoted ? 'ring-2 ring-purple-500' : 'border border-purple-200'}`}
                >
                  {/* Progress bar background */}
                  {localVoted && (
                    <div
                      className="absolute inset-0 bg-purple-100 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isVoted && <CheckCircle className="w-4 h-4 text-purple-600" />}
                      <span className="text-sm font-medium text-gray-800">{option.text}</span>
                    </div>
                    {localVoted && (
                      <span className="text-sm font-medium text-purple-700">{percentage}%</span>
                    )}
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="mb-4 rounded-lg overflow-hidden">
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
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span>{post.likesCount} like{post.likesCount !== 1 ? 's' : ''}</span>
            <span>{post.commentsCount} comment{post.commentsCount !== 1 ? 's' : ''}</span>
          </div>
          <span>{localSharesCount} share{localSharesCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onLike(post.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
              post.isLiked
                ? 'text-red-500 bg-red-50 hover:bg-red-100'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">Like</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
              showComments ? 'text-blue-500 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Comment</span>
          </button>
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm font-medium">Share</span>
          </button>
          <button
            onClick={handleBookmark}
            className={`p-2 rounded-lg transition-colors ${
              localBookmarked ? 'text-yellow-500 bg-yellow-50' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${localBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                Post
              </button>
            </div>

            {/* Comments List */}
            {post.comments && post.comments.length > 0 && (
              <div className="space-y-3">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {getInitials(comment.author.firstName, comment.author.lastName)}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2">
                      <p className="text-sm font-semibold text-gray-900">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Share Post</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Copy className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Copy Link</p>
                  <p className="text-sm text-gray-500">Copy post link to clipboard</p>
                </div>
              </button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={() => handleShare('native')}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Share via...</p>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit Post</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isEditing || !editContent.trim()}
                className="px-5 py-2 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Post?</h3>
              <p className="text-gray-600 mb-6">This action cannot be undone. This will permanently delete your post.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-full font-medium hover:bg-red-700"
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
