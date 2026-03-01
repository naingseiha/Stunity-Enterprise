'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import { 
  ArrowLeft, 
  Heart, 
  Star,
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  Send,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Globe,
  Building2,
  Users,
  Lock,
  FileText,
  BarChart3,
  Megaphone,
  HelpCircle,
  Award,
  BookOpen,
  FolderOpen,
  Rocket,
  Microscope,
  UsersRound,
  Clock,
  Eye,
  Copy,
  CheckCircle,
} from 'lucide-react';

interface Post {
  id: string;
  content: string;
  postType: string;
  visibility: string;
  mediaUrls: string[];
  mediaDisplayMode: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  valuesCount?: number;
  commentsCount: number;
  viewsCount?: number;
  isLikedByMe: boolean;
  isValuedByMe?: boolean;
  isBookmarkedByMe?: boolean;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
    role: string;
  };
  pollOptions?: Array<{
    id: string;
    text: string;
    _count: { votes: number };
  }>;
  userVotedOptionId?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };
  replies?: Comment[];
  _count?: { replies: number };
}

const FEED_API = process.env.NEXT_PUBLIC_FEED_API_URL || process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

function resolveMediaUrl(url: string): string {
  if (url.startsWith('/uploads/')) return `${FEED_API}${url}`;
  const lanMatch = url.match(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+(\/uploads\/.*)/);
  if (lanMatch) return `${FEED_API}${lanMatch[1]}`;
  return url;
}

function isVideoUrl(url: string): boolean {
  const u = url.toLowerCase().split('?')[0];
  return /\.(mp4|webm|mov|m4v)(\?|$)/.test(u) || u.includes('/uploads/videos/') || u.includes('/videos/');
}

const POST_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string; gradient: string }> = {
  ARTICLE: { icon: FileText, color: 'bg-emerald-100 text-emerald-700', label: 'Article', gradient: 'from-emerald-500 to-green-600' },
  POLL: { icon: BarChart3, color: 'bg-violet-100 text-violet-700', label: 'Poll', gradient: 'from-violet-500 to-purple-600' },
  ANNOUNCEMENT: { icon: Megaphone, color: 'bg-rose-100 text-rose-700', label: 'Announcement', gradient: 'from-rose-500 to-pink-600' },
  QUESTION: { icon: HelpCircle, color: 'bg-teal-100 text-teal-700', label: 'Question', gradient: 'from-teal-500 to-cyan-600' },
  ACHIEVEMENT: { icon: Award, color: 'bg-amber-100 text-amber-700', label: 'Achievement', gradient: 'from-amber-500 to-yellow-500' },
  TUTORIAL: { icon: BookOpen, color: 'bg-blue-100 text-blue-700', label: 'Tutorial', gradient: 'from-blue-500 to-indigo-500' },
  RESOURCE: { icon: FolderOpen, color: 'bg-indigo-100 text-indigo-700', label: 'Resource', gradient: 'from-indigo-500 to-violet-500' },
  PROJECT: { icon: Rocket, color: 'bg-orange-100 text-orange-700', label: 'Project', gradient: 'from-orange-500 to-red-500' },
  RESEARCH: { icon: Microscope, color: 'bg-cyan-100 text-cyan-700', label: 'Research', gradient: 'from-cyan-500 to-teal-500' },
  COLLABORATION: { icon: UsersRound, color: 'bg-pink-100 text-pink-700', label: 'Collaboration', gradient: 'from-pink-500 to-rose-500' },
};

// Skeleton component for loading state
function PostDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-64 bg-gray-200" />
        <div className="px-4 py-3 border-t flex gap-6">
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>
      </div>
      {/* Comments skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const locale = (params?.locale as string) || 'en';

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  // Fetch current user
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
      } catch (e) {
        console.error('Failed to decode token');
      }
    }
  }, []);

  // Fetch post and comments
  const fetchData = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      
      const [postRes, commentsRes] = await Promise.all([
        fetch(`${FEED_API}/posts/${postId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${FEED_API}/posts/${postId}/comments`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!postRes.ok) {
        throw new Error('Post not found');
      }

      const postData = await postRes.json();
      const commentsData = await commentsRes.json();

      setPost(postData.data);
      setComments(commentsData.data || []);
      
      // Track view
      fetch(`${FEED_API}/posts/${postId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
      
    } catch (err: any) {
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
      // Small delay for smooth animation
      setTimeout(() => setPageReady(true), 100);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle like
  const handleLike = async () => {
    if (!post) return;
    
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`http://localhost:3010/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPost(prev => prev ? {
          ...prev,
          isLikedByMe: data.liked,
          likesCount: prev.likesCount + (data.liked ? 1 : -1),
        } : null);
      }
    } catch (err) {
      console.error('Failed to like post');
    }
  };

  // Handle value (star)
  const handleValue = async () => {
    if (!post) return;
    
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`http://localhost:3010/posts/${post.id}/value`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPost(prev => prev ? {
          ...prev,
          isValuedByMe: data.valued,
          valuesCount: (prev.valuesCount || 0) + (data.valued ? 1 : -1),
        } : null);
      }
    } catch (err) {
      console.error('Failed to value post');
    }
  };

  // Handle bookmark
  const handleBookmark = async () => {
    if (!post) return;
    
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`http://localhost:3010/posts/${post.id}/bookmark`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPost(prev => prev ? {
          ...prev,
          isBookmarkedByMe: data.bookmarked,
        } : null);
      }
    } catch (err) {
      console.error('Failed to bookmark post');
    }
  };

  // Handle share
  const handleShare = () => {
    const url = `${window.location.origin}/${locale}/feed/post/${postId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle comment submit
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    try {
      setSubmitting(true);
      const token = TokenManager.getAccessToken();
      const res = await fetch(`http://localhost:3010/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.data, ...prev]);
        setPost(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete post
  const handleDelete = async () => {
    if (!post || !confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`http://localhost:3010/posts/${post.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        router.push(`/${locale}/feed`);
      }
    } catch (err) {
      console.error('Failed to delete post');
    }
  };

  // Format date
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return `${mins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    if (diffHours < 48) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTypeConfig = (type: string) => {
    return POST_TYPE_CONFIG[type] || POST_TYPE_CONFIG.ARTICLE;
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC': return Globe;
      case 'SCHOOL': return Building2;
      case 'CLASS': return Users;
      case 'PRIVATE': return Lock;
      default: return Globe;
    }
  };

  if (error && !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-500 font-medium">{error}</p>
        <Link 
          href={`/${locale}/feed`} 
          className="text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Feed
        </Link>
      </div>
    );
  }

  const typeConfig = post ? getTypeConfig(post.postType) : null;
  const TypeIcon = typeConfig?.icon || FileText;
  const VisibilityIcon = post ? getVisibilityIcon(post.visibility) : Globe;
  const isAuthor = currentUserId === post?.author?.id;
  const totalVotes = post?.pollOptions?.reduce((sum, o) => sum + o._count.votes, 0) || 0;

  return (
    <div className={`min-h-screen bg-gray-50 transition-opacity duration-500 ${pageReady ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          {typeConfig && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
              <TypeIcon className="w-3.5 h-3.5" />
              {typeConfig.label}
            </div>
          )}
          {isAuthor && post && (
            <div className="relative">
              <button 
                onClick={() => setShowActions(!showActions)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </button>
              {showActions && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border overflow-hidden z-20 animate-in slide-in-from-top-2 duration-200">
                  <Link
                    href={`/${locale}/feed/post/${post.id}/edit`}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 w-full transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Post
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
          {!isAuthor && <div className="w-10" />}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <BlurLoader 
          isLoading={loading} 
          skeleton={<PostDetailSkeleton />}
          blur={false}
        >
          {post && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <article className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                {/* Author Info */}
                <div className="p-4 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${typeConfig?.gradient || 'from-amber-400 to-orange-500'} flex items-center justify-center text-white font-semibold text-lg shadow-lg`}>
                    {post.author.profilePictureUrl ? (
                      <img 
                        src={post.author.profilePictureUrl} 
                        alt="" 
                        className="w-full h-full rounded-full object-cover" 
                      />
                    ) : (
                      `${post.author.firstName[0]}${post.author.lastName[0]}`
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {post.author.firstName} {post.author.lastName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="capitalize">{post.author.role?.toLowerCase()}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(post.createdAt)}
                      </span>
                      <VisibilityIcon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {post.viewsCount !== undefined && post.viewsCount > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Eye className="w-4 h-4" />
                      {post.viewsCount}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-4 pb-4">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">{post.content}</p>
                </div>

                {/* Poll Options */}
                {post.postType === 'POLL' && post.pollOptions && (
                  <div className="px-4 pb-4 space-y-2">
                    {post.pollOptions.map(option => {
                      const percentage = totalVotes > 0 ? (option._count.votes / totalVotes) * 100 : 0;
                      const isVoted = post.userVotedOptionId === option.id;
                      return (
                        <div key={option.id} className="relative">
                          <div className={`relative overflow-hidden rounded-xl p-3 border-2 transition-colors ${
                            isVoted ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div 
                              className="absolute inset-0 bg-violet-200/50 transition-all duration-500" 
                              style={{ width: `${percentage}%` }} 
                            />
                            <div className="relative flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {isVoted && <CheckCircle className="w-4 h-4 text-violet-600" />}
                                <span className="font-medium text-gray-800">{option.text}</span>
                              </div>
                              <span className="text-sm font-semibold text-violet-700">{percentage.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-gray-500 flex items-center gap-1 pt-1">
                      <BarChart3 className="w-3 h-3" />
                      {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {/* Media */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="relative">
                    {post.mediaUrls.length === 1 ? (
                      isVideoUrl(post.mediaUrls[0]) ? (
                        <video
                          src={resolveMediaUrl(post.mediaUrls[0])}
                          controls
                          playsInline
                          className="w-full max-h-[600px] object-contain bg-gray-100"
                        />
                      ) : (
                        <img
                          src={resolveMediaUrl(post.mediaUrls[0])}
                          alt=""
                          className="w-full max-h-[600px] object-contain bg-gray-100 cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setShowMediaModal(true)}
                        />
                      )
                    ) : (
                      <div className="relative">
                        {isVideoUrl(post.mediaUrls[currentMediaIndex]) ? (
                          <video
                            src={resolveMediaUrl(post.mediaUrls[currentMediaIndex])}
                            controls
                            playsInline
                            className="w-full max-h-[600px] object-contain bg-gray-100"
                          />
                        ) : (
                          <img
                            src={resolveMediaUrl(post.mediaUrls[currentMediaIndex])}
                            alt=""
                            className="w-full max-h-[600px] object-contain bg-gray-100 cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setShowMediaModal(true)}
                          />
                        )}
                        {currentMediaIndex > 0 && (
                          <button
                            onClick={() => setCurrentMediaIndex(i => i - 1)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                        )}
                        {currentMediaIndex < post.mediaUrls.length - 1 && (
                          <button
                            onClick={() => setCurrentMediaIndex(i => i + 1)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {post.mediaUrls.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentMediaIndex(i)}
                              className={`w-2.5 h-2.5 rounded-full transition-all ${
                                i === currentMediaIndex ? 'bg-white scale-110' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 py-3 border-t flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                      post.isLikedByMe 
                        ? 'text-rose-500 bg-rose-50' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${post.isLikedByMe ? 'fill-current' : ''}`} />
                    <span className="font-medium">{post.likesCount}</span>
                  </button>
                  <button
                    onClick={handleValue}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                      post.isValuedByMe 
                        ? 'text-amber-500 bg-amber-50' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Star className={`w-5 h-5 ${post.isValuedByMe ? 'fill-current' : ''}`} />
                    <span className="font-medium">{post.valuesCount || 0}</span>
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 text-gray-600">
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">{post.commentsCount}</span>
                  </div>
                  <button 
                    onClick={handleShare}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                      copied ? 'text-green-500 bg-green-50' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleBookmark}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                      post.isBookmarkedByMe 
                        ? 'text-amber-500 bg-amber-50' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 ${post.isBookmarkedByMe ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </article>

              {/* Comment Form */}
              <form onSubmit={handleSubmitComment} className="mt-6 bg-white rounded-2xl shadow-sm p-4 border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0 shadow">
                    You
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submitting}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 font-medium shadow-lg shadow-amber-200 transition-all"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </form>

              {/* Comments List */}
              <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-amber-500" />
                  Comments ({comments.length})
                </h3>
                {comments.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map((comment, index) => (
                    <div 
                      key={comment.id} 
                      className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0 shadow">
                          {comment.author.profilePictureUrl ? (
                            <img 
                              src={comment.author.profilePictureUrl} 
                              alt="" 
                              className="w-full h-full rounded-full object-cover" 
                            />
                          ) : (
                            `${comment.author.firstName[0]}${comment.author.lastName[0]}`
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {comment.author.firstName} {comment.author.lastName}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </BlurLoader>
      </main>

      {/* Media Modal */}
      {showMediaModal && post?.mediaUrls && post.mediaUrls.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setShowMediaModal(false)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            onClick={() => setShowMediaModal(false)}
          >
            <X className="w-8 h-8" />
          </button>
          {isVideoUrl(post.mediaUrls[currentMediaIndex]) ? (
            <video
              src={resolveMediaUrl(post.mediaUrls[currentMediaIndex])}
              controls
              autoPlay
              playsInline
              className="max-w-[90vw] max-h-[90vh] object-contain animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={resolveMediaUrl(post.mediaUrls[currentMediaIndex])}
              alt=""
              className="max-w-[90vw] max-h-[90vh] object-contain animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {post.mediaUrls.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(i => i - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {currentMediaIndex < post.mediaUrls.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(i => i + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
