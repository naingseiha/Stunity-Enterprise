'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import { 
  ArrowLeft, 
  Heart, 
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
  Loader2
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
  commentsCount: number;
  isLikedByMe: boolean;
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

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;

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
        fetch(`http://localhost:3010/posts/${postId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`http://localhost:3010/posts/${postId}/comments`, {
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
    } catch (err: any) {
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
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
        router.push('/feed');
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

  // Get post type badge color
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ARTICLE: 'bg-blue-100 text-blue-700',
      COURSE: 'bg-purple-100 text-purple-700',
      QUIZ: 'bg-orange-100 text-orange-700',
      QUESTION: 'bg-emerald-100 text-emerald-700',
      EXAM: 'bg-red-100 text-red-700',
      ANNOUNCEMENT: 'bg-amber-100 text-amber-700',
      ASSIGNMENT: 'bg-indigo-100 text-indigo-700',
      POLL: 'bg-cyan-100 text-cyan-700',
      RESOURCE: 'bg-teal-100 text-teal-700',
      PROJECT: 'bg-rose-100 text-rose-700',
      TUTORIAL: 'bg-lime-100 text-lime-700',
      RESEARCH: 'bg-violet-100 text-violet-700',
      ACHIEVEMENT: 'bg-yellow-100 text-yellow-700',
      REFLECTION: 'bg-pink-100 text-pink-700',
      COLLABORATION: 'bg-sky-100 text-sky-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-gray-600">Loading post...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || 'Post not found'}</p>
        <Link href="/feed" className="text-amber-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Feed
        </Link>
      </div>
    );
  }

  const isAuthor = currentUserId === post.author.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(post.postType)}`}>
            {post.postType.replace('_', ' ')}
          </span>
          {isAuthor && (
            <div className="relative">
              <button 
                onClick={() => setShowActions(!showActions)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </button>
              {showActions && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border overflow-hidden z-20">
                  <Link
                    href={`/feed/post/${post.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Post
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <article className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Author Info */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-lg">
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
              <p className="text-sm text-gray-500">
                {post.author.role} • {formatDate(post.createdAt)}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
          </div>

          {/* Media */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="relative">
              {post.mediaUrls.length === 1 ? (
                <img
                  src={post.mediaUrls[0]}
                  alt=""
                  className="w-full max-h-[600px] object-contain bg-gray-100 cursor-pointer"
                  onClick={() => setShowMediaModal(true)}
                />
              ) : (
                <div className="relative">
                  <img
                    src={post.mediaUrls[currentMediaIndex]}
                    alt=""
                    className="w-full max-h-[600px] object-contain bg-gray-100 cursor-pointer"
                    onClick={() => setShowMediaModal(true)}
                  />
                  {/* Navigation arrows */}
                  {currentMediaIndex > 0 && (
                    <button
                      onClick={() => setCurrentMediaIndex(i => i - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {currentMediaIndex < post.mediaUrls.length - 1 && (
                    <button
                      onClick={() => setCurrentMediaIndex(i => i + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                  {/* Dots indicator */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {post.mediaUrls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentMediaIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentMediaIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Poll Options */}
          {post.postType === 'POLL' && post.pollOptions && (
            <div className="px-4 pb-4 space-y-2">
              {post.pollOptions.map(option => {
                const totalVotes = post.pollOptions!.reduce((sum, o) => sum + o._count.votes, 0);
                const percentage = totalVotes > 0 ? (option._count.votes / totalVotes) * 100 : 0;
                return (
                  <div key={option.id} className="relative">
                    <div className="bg-gray-100 rounded-lg p-3 relative overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-amber-100" 
                        style={{ width: `${percentage}%` }} 
                      />
                      <div className="relative flex justify-between">
                        <span className="font-medium">{option.text}</span>
                        <span className="text-gray-600">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-3 border-t flex items-center gap-6">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${
                post.isLikedByMe ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${post.isLikedByMe ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{post.likesCount}</span>
            </button>
            <div className="flex items-center gap-2 text-gray-600">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{post.commentsCount}</span>
            </div>
            <button className="text-gray-600 hover:text-blue-500">
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleBookmark}
              className={`ml-auto ${
                post.isBookmarkedByMe ? 'text-amber-500' : 'text-gray-600 hover:text-amber-500'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${post.isBookmarkedByMe ? 'fill-current' : ''}`} />
            </button>
          </div>
        </article>

        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="mt-6 bg-white rounded-xl shadow-sm p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
              You
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </form>

        {/* Comments List */}
        <div className="mt-6 space-y-4">
          <h3 className="font-semibold text-gray-900">
            Comments ({comments.length})
          </h3>
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {comment.author.firstName} {comment.author.lastName}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 mt-1">{comment.content}</p>
                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-3">
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                              {`${reply.author.firstName[0]}${reply.author.lastName[0]}`}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">
                                  {reply.author.firstName} {reply.author.lastName}
                                </span>
                                <span className="text-xs text-gray-500">{formatDate(reply.createdAt)}</span>
                              </div>
                              <p className="text-gray-700 text-sm">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Media Modal */}
      {showMediaModal && post.mediaUrls && post.mediaUrls.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setShowMediaModal(false)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setShowMediaModal(false)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={post.mediaUrls[currentMediaIndex]}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {post.mediaUrls.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(i => i - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {currentMediaIndex < post.mediaUrls.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(i => i + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"
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
