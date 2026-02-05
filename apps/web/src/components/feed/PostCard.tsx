'use client';

import { useState, useRef, useEffect } from 'react';
import MediaGallery, { MediaLightbox } from './MediaGallery';
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
  Eye,
  TrendingUp,
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
  viewsCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  mediaUrls?: string[];
  mediaDisplayMode?: 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT';
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
  onViewAnalytics?: (postId: string) => void;
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
  onViewAnalytics,
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor = currentUserId === post.author.id;

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

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
        return { icon: BarChart3, color: 'violet', label: 'Poll', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', textColor: 'text-violet-700' };
      case 'ANNOUNCEMENT':
        return { icon: Megaphone, color: 'rose', label: 'Announcement', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', textColor: 'text-rose-700' };
      case 'QUESTION':
        return { icon: HelpCircle, color: 'teal', label: 'Question', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', textColor: 'text-teal-700' };
      case 'ACHIEVEMENT':
        return { icon: Award, color: 'amber', label: 'Achievement', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700' };
      default:
        return { icon: FileText, color: 'emerald', label: 'Article', bgColor: 'bg-white', borderColor: 'border-gray-100', textColor: 'text-amber-700' };
    }
  };

  const getAvatarGradient = () => {
    switch (post.postType) {
      case 'POLL': return 'from-violet-500 to-purple-600';
      case 'ANNOUNCEMENT': return 'from-rose-500 to-pink-600';
      case 'QUESTION': return 'from-teal-500 to-cyan-600';
      case 'ACHIEVEMENT': return 'from-amber-500 to-yellow-500';
      default: return 'from-[#F9A825] to-[#FFB74D]';
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
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      {/* Type Badge for special posts */}
      {post.postType !== 'ARTICLE' && (
        <div className={`px-3 py-1.5 flex items-center gap-2 border-b border-gray-100 bg-gray-50`}>
          <TypeIcon className={`w-4 h-4 ${typeConfig.textColor}`} />
          <span className={`text-xs font-medium ${typeConfig.textColor}`}>{typeConfig.label}</span>
        </div>
      )}

      <div className="p-3">
        {/* Author Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
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
              <p className="font-semibold text-gray-900 text-sm hover:text-[#F9A825] hover:underline cursor-pointer">
                {post.author.firstName} {post.author.lastName}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="capitalize">{post.author.role?.toLowerCase()}</span>
                <span>•</span>
                <span>{formatDate(post.createdAt)}</span>
                <VisibilityIcon className="w-3 h-3 ml-0.5" />
              </div>
            </div>
          </div>
          {/* More Menu */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                {isAuthor && (
                  <>
                    <button
                      onClick={() => { setShowEditModal(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Post</span>
                    </button>
                    <button
                      onClick={() => { onViewAnalytics?.(post.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">View Analytics</span>
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                  </>
                )}
                <button
                  onClick={() => { handleBookmark(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Bookmark className={`w-4 h-4 ${localBookmarked ? 'fill-current text-[#F9A825]' : ''}`} />
                  <span>{localBookmarked ? 'Unsave' : 'Save'}</span>
                </button>
                <button
                  onClick={() => { handleShare('copy'); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy link</span>
                </button>
                {!isAuthor && (
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>

        {/* Poll Options */}
        {post.postType === 'POLL' && post.pollOptions && (
          <div className="space-y-2 mb-3">
            {post.pollOptions.map((option) => {
              const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const isVoted = localVoted === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={!!localVoted}
                  className={`w-full relative overflow-hidden rounded-md p-2.5 text-left transition-all text-sm ${
                    localVoted
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-gray-100'
                  } ${isVoted ? 'ring-1 ring-[#F9A825]' : 'border border-gray-200'}`}
                >
                  {/* Progress bar background */}
                  {localVoted && (
                    <div
                      className="absolute inset-0 bg-amber-50 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isVoted && <CheckCircle className="w-4 h-4 text-[#F9A825]" />}
                      <span className="text-sm font-medium text-gray-800">{option.text}</span>
                    </div>
                    {localVoted && (
                      <span className="text-sm font-medium text-violet-700">{percentage}%</span>
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

        {/* Media Gallery */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <MediaGallery
            mediaUrls={post.mediaUrls}
            displayMode={post.mediaDisplayMode || 'AUTO'}
            onImageClick={handleImageClick}
            className="mb-3 -mx-3"
          />
        )}

        {/* Actions - with counts integrated */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 -mx-1">
          <button
            onClick={() => onLike(post.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded transition-colors ${
              post.isLiked
                ? 'text-blue-600'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs font-medium">{post.likesCount > 0 ? `${post.likesCount} Likes` : 'Like'}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded transition-colors ${
              showComments ? 'text-[#F9A825]' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-medium">{post.commentsCount > 0 ? `${post.commentsCount} Comments` : 'Comment'}</span>
          </button>
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-gray-500 hover:bg-gray-100 rounded transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs font-medium">{localSharesCount > 0 ? `${localSharesCount} Shares` : 'Share'}</span>
          </button>
          <button
            onClick={handleBookmark}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded transition-colors ${
              localBookmarked ? 'text-[#F9A825]' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${localBookmarked ? 'fill-current' : ''}`} />
            <span className="text-xs font-medium">{localBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {/* Comment Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-[#F9A825] focus:border-[#F9A825] transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-[#F9A825] text-white rounded-full text-sm font-medium hover:bg-[#E89A1E] disabled:opacity-50 transition-colors"
              >
                Post
              </button>
            </div>

            {/* Comments List */}
            {post.comments && post.comments.length > 0 && (
              <div className="space-y-3">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2 animate-fadeIn">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 shadow-sm">
                      {getInitials(comment.author.firstName, comment.author.lastName)}
                    </div>
                    <div className="flex-1 bg-gradient-to-r from-gray-50 to-amber-50/30 rounded-2xl px-3 py-2 border border-gray-100">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl transform animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Share Post</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-amber-50 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-3 p-3 hover:bg-amber-50 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Copy className="w-5 h-5 text-[#F9A825]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Copy Link</p>
                  <p className="text-sm text-gray-500">Copy post link to clipboard</p>
                </div>
              </button>
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={() => handleShare('native')}
                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ExternalLink className="w-5 h-5 text-blue-600" />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl transform animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Edit Post</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-amber-50 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#F9A825] focus:border-[#F9A825] text-gray-900 transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isEditing || !editContent.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-[#F9A825] to-[#FFB74D] text-white rounded-full font-semibold hover:from-[#E89A1E] hover:to-[#FF9800] disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all transform active:scale-95"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl transform animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Post?</h3>
              <p className="text-gray-600 mb-6">This action cannot be undone. This will permanently delete your post.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-5 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all transform active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Lightbox */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <MediaLightbox
          mediaUrls={post.mediaUrls}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
