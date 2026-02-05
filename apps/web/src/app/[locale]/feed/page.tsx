'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Image as ImageIcon,
  CheckCircle2,
  Send,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const FEED_API = 'http://localhost:3010';

interface Post {
  id: string;
  content: string;
  visibility: string;
  type: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
    role: string;
  };
  isLiked?: boolean;
  likes?: { userId: string }[];
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
}

export default function FeedPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  
  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    const token = TokenManager.getAccessToken();
    if (!token) return;
    
    setLoadingPosts(true);
    try {
      const res = await fetch(`${FEED_API}/posts?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [locale, router]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, fetchPosts]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.replace(`/${locale}/auth/login`);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || creating) return;
    
    const token = TokenManager.getAccessToken();
    if (!token) return;

    setCreating(true);
    try {
      const res = await fetch(`${FEED_API}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newPostContent, visibility: 'PUBLIC' })
      });
      const data = await res.json();
      if (data.success) {
        setNewPostContent('');
        setShowCreateModal(false);
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleLike = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likesCount: data.liked ? post.likesCount + 1 : post.likesCount - 1,
              isLiked: data.liked
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      if (!comments[postId]) {
        await fetchComments(postId);
      }
    }
    setExpandedComments(newExpanded);
  };

  const fetchComments = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    setLoadingComments(prev => new Set(prev).add(postId));
    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => ({ ...prev, [postId]: data.data || [] }));
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = newComment[postId]?.trim();
    if (!content) return;

    const token = TokenManager.getAccessToken();
    if (!token) return;

    setSubmittingComment(prev => new Set(prev).add(postId));
    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.success) {
        setNewComment(prev => ({ ...prev, [postId]: '' }));
        setComments(prev => ({
          ...prev,
          [postId]: [data.data, ...(prev[postId] || [])]
        }));
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return { ...post, commentsCount: post.commentsCount + 1 };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmittingComment(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Check if current user liked a post
  const isPostLiked = (post: Post) => {
    if (post.isLiked !== undefined) return post.isLiked;
    return post.likes?.some(like => like.userId === user?.id) || false;
  };

  // Show zoom loader while loading, then fade in content
  if (loading || !user || !school || !showContent) {
    return (
      <>
        <FeedZoomLoader 
          isLoading={loading || !user || !school} 
          onAnimationComplete={() => setShowContent(true)}
          minimumDuration={600}
        />
        {!loading && user && school && (
          <div className="opacity-0 pointer-events-none absolute">
            <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
          </div>
        )}
      </>
    );
  }

  const tabs = [
    { id: 'feed', label: 'Feed', icon: TrendingUp },
    { id: 'posts', label: 'My Posts', icon: BookOpen },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'portfolio', label: 'Portfolio', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Create Post Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex-1 text-left px-4 py-3 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            >
              What&apos;s on your mind, {user.firstName}?
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-3 text-green-600 hover:bg-green-50 rounded-full transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feed Content */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {/* Refresh Button */}
            <div className="flex justify-end">
              <button
                onClick={fetchPosts}
                disabled={loadingPosts}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPosts ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Loading State */}
            {loadingPosts && posts.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto text-purple-500 animate-spin mb-3" />
                <p className="text-gray-600">Loading posts...</p>
              </div>
            )}

            {/* Empty State */}
            {!loadingPosts && posts.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600 mb-4">Be the first to share something!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
                >
                  <Send className="w-5 h-5" />
                  Create Post
                </button>
              </div>
            )}

            {/* Posts List */}
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Post Header */}
                <div className="p-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {getInitials(post.author.firstName, post.author.lastName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {post.author.firstName} {post.author.lastName}
                        </span>
                        {post.author.role === 'ADMIN' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{formatTime(post.createdAt)}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    {post.visibility}
                  </span>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Engagement Bar */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      isPostLiked(post) ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isPostLiked(post) ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">{post.likesCount}</span>
                  </button>
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      expandedComments.has(post.id) ? 'text-blue-500' : 'text-gray-600 hover:text-blue-500'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.commentsCount}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.sharesCount}</span>
                  </button>
                  <button className="ml-auto text-gray-600 hover:text-yellow-500 transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments.has(post.id) && (
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    {/* Add Comment */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <input
                        type="text"
                        value={newComment[post.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        placeholder="Write a comment..."
                        className="flex-1 px-4 py-2 bg-white rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={submittingComment.has(post.id) || !newComment[post.id]?.trim()}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingComment.has(post.id) ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* Comments List */}
                    {loadingComments.has(post.id) ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-5 h-5 mx-auto text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(comments[post.id] || []).map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {getInitials(comment.author.firstName, comment.author.lastName)}
                            </div>
                            <div className="flex-1 bg-white rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-900">
                                  {comment.author.firstName} {comment.author.lastName}
                                </span>
                                <span className="text-xs text-gray-500">{formatTime(comment.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-700">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                        {(comments[post.id] || []).length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-2">No comments yet. Be the first!</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Other Tabs */}
        {activeTab !== 'feed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {tabs.find(t => t.id === activeTab)?.label} - Coming Soon
            </h3>
            <p className="text-gray-600">This feature is currently under development.</p>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {getInitials(user.firstName, user.lastName)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-500">Public post</p>
                </div>
              </div>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={`What's on your mind, ${user.firstName}?`}
                rows={5}
                className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || creating}
                className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
