'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';
import CreatePostModal, { CreatePostData } from '@/components/feed/CreatePostModal';
import PostCard from '@/components/feed/PostCard';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Image as ImageIcon,
  Send,
  Loader2,
  RefreshCw,
  FileText,
  BarChart3,
  Megaphone,
  HelpCircle,
  Filter,
  Bookmark,
} from 'lucide-react';

const FEED_API = 'http://localhost:3010';

interface Post {
  id: string;
  content: string;
  visibility: string;
  postType: string;
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
  isLikedByMe?: boolean;
  isBookmarked?: boolean;
  likes?: { userId: string }[];
  pollOptions?: { id: string; text: string; _count?: { votes: number } }[];
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
}

const POST_TYPE_FILTERS = [
  { id: 'all', label: 'All Posts', icon: TrendingUp },
  { id: 'ARTICLE', label: 'Articles', icon: FileText },
  { id: 'POLL', label: 'Polls', icon: BarChart3 },
  { id: 'ANNOUNCEMENT', label: 'Announcements', icon: Megaphone },
  { id: 'QUESTION', label: 'Questions', icon: HelpCircle },
  { id: 'ACHIEVEMENT', label: 'Achievements', icon: Award },
];

export default function FeedPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [postTypeFilter, setPostTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  
  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
      const res = await fetch(`${FEED_API}/posts?limit=50`, {
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

  const fetchMyPosts = useCallback(async () => {
    const token = TokenManager.getAccessToken();
    if (!token) return;
    
    try {
      const res = await fetch(`${FEED_API}/my-posts?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyPosts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch my posts:', error);
    }
  }, []);

  const fetchBookmarks = useCallback(async () => {
    const token = TokenManager.getAccessToken();
    if (!token) return;
    
    try {
      const res = await fetch(`${FEED_API}/bookmarks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBookmarkedPosts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
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

  // Fetch data when tab changes
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'posts') {
      fetchMyPosts();
    } else if (activeTab === 'bookmarks') {
      fetchBookmarks();
    }
  }, [activeTab, user, fetchMyPosts, fetchBookmarks]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.replace(`/${locale}/auth/login`);
  };

  const handleCreatePost = async (data: CreatePostData) => {
    const token = TokenManager.getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${FEED_API}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        content: data.content,
        visibility: data.visibility,
        postType: data.postType,
        pollOptions: data.pollOptions,
      })
    });
    const result = await res.json();
    if (result.success) {
      setShowCreateModal(false);
      fetchPosts();
      if (activeTab === 'posts') fetchMyPosts();
    } else {
      throw new Error(result.error || 'Failed to create post');
    }
  };

  const handleBookmark = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, isBookmarked: data.bookmarked } : p
        ));
        if (data.bookmarked) {
          fetchBookmarks();
        } else {
          setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
        }
      }
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const handleShare = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      await fetch(`${FEED_API}/posts/${postId}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleEditPost = async (postId: string, content: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, content } : p
        ));
        setMyPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, content } : p
        ));
      }
    } catch (error) {
      console.error('Edit error:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Remove from local state
        setPosts(prev => prev.filter(p => p.id !== postId));
        setMyPosts(prev => prev.filter(p => p.id !== postId));
        setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleVote = async (postId: string, optionId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ optionId })
      });
      const data = await res.json();
      if (data.success) {
        // Update the post with new vote counts
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              userVotedOptionId: optionId,
              pollOptions: post.pollOptions?.map(opt => ({
                ...opt,
                _count: { votes: opt.id === optionId ? ((opt._count?.votes || 0) + 1) : (opt._count?.votes || 0) }
              }))
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Failed to vote:', error);
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
    if (post.isLikedByMe !== undefined) return post.isLikedByMe;
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
    { id: 'bookmarks', label: 'Saved', icon: Bookmark },
    { id: 'groups', label: 'Groups', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 animate-fade-in">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-indigo-300/20 to-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-300/20 to-orange-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-purple-300/10 to-indigo-300/10 rounded-full blur-2xl"></div>
      </div>
      
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative max-w-2xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md border border-white/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Create Post Box */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 p-5 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white/50 flex-shrink-0">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex-1 text-left px-5 py-3.5 bg-white/70 backdrop-blur-sm rounded-xl text-gray-500 hover:bg-white/90 hover:shadow-md transition-all border border-gray-200/60"
            >
              What&apos;s on your mind, {user.firstName}?
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feed Content */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {/* Post Type Filters & Refresh */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all active:scale-95 ${
                    postTypeFilter !== 'all' 
                      ? 'bg-purple-50/80 backdrop-blur-sm border-purple-200/60 text-purple-700 shadow-sm' 
                      : 'bg-white/80 backdrop-blur-sm border-white/40 text-gray-700 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    {POST_TYPE_FILTERS.find(f => f.id === postTypeFilter)?.label}
                  </span>
                </button>
                
                {showFilters && (
                  <div className="absolute left-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 py-3 z-10">
                    {POST_TYPE_FILTERS.map((filter) => {
                      const Icon = filter.icon;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => {
                            setPostTypeFilter(filter.id);
                            setShowFilters(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/80 transition-all ${
                            postTypeFilter === filter.id ? 'bg-purple-50/80' : ''
                          }`}
                        >
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-bold text-gray-900">{filter.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <button
                onClick={fetchPosts}
                disabled={loadingPosts}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 hover:text-purple-600 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 hover:shadow-sm transition-all active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPosts ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Loading State */}
            {loadingPosts && posts.length === 0 && (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100/80 to-pink-100/80 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
                <p className="text-gray-600 font-semibold">Loading posts...</p>
              </div>
            )}

            {/* Empty State */}
            {!loadingPosts && posts.length === 0 && (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100/80 to-pink-100/80 flex items-center justify-center shadow-md">
                  <BookOpen className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600 mb-4">Be the first to share something!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
                >
                  <Send className="w-5 h-5" />
                  Create Post
                </button>
              </div>
            )}

            {/* Posts List - Using PostCard component */}
            {posts
              .filter(post => postTypeFilter === 'all' || post.postType === postTypeFilter)
              .map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    id: post.id,
                    content: post.content,
                    postType: post.postType || 'ARTICLE',
                    visibility: post.visibility,
                    author: {
                      id: post.author.id,
                      firstName: post.author.firstName,
                      lastName: post.author.lastName,
                      profileImage: post.author.profilePictureUrl,
                      role: post.author.role,
                    },
                    createdAt: post.createdAt,
                    likesCount: post.likesCount,
                    commentsCount: post.commentsCount,
                    sharesCount: post.sharesCount,
                    isLiked: isPostLiked(post),
                    isBookmarked: post.isBookmarked,
                    pollOptions: post.pollOptions?.map(opt => ({
                      id: opt.id,
                      text: opt.text,
                      votes: opt._count?.votes || 0,
                    })),
                    userVotedOptionId: post.userVotedOptionId,
                    comments: comments[post.id]?.map(c => ({
                      id: c.id,
                      content: c.content,
                      author: {
                        firstName: c.author.firstName,
                        lastName: c.author.lastName,
                      },
                      createdAt: c.createdAt,
                    })),
                  }}
                  onLike={handleLike}
                  onComment={(postId, content) => {
                    setNewComment(prev => ({ ...prev, [postId]: content }));
                    handleAddComment(postId);
                  }}
                  onVote={handleVote}
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                  currentUserId={user?.id}
                />
              ))}
              
            {/* Empty Filter State */}
            {!loadingPosts && posts.length > 0 && posts.filter(post => postTypeFilter === 'all' || post.postType === postTypeFilter).length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Filter className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No {POST_TYPE_FILTERS.find(f => f.id === postTypeFilter)?.label.toLowerCase()}</h3>
                <p className="text-gray-600 mb-4">Try selecting a different filter or create a new post!</p>
                <button
                  onClick={() => setPostTypeFilter('all')}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Show all posts
                </button>
              </div>
            )}
          </div>
        )}

        {/* My Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {myPosts.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100/80 to-pink-100/80 flex items-center justify-center shadow-md">
                  <BookOpen className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600 mb-4">Share your first post!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
                >
                  <Send className="w-5 h-5" />
                  Create Post
                </button>
              </div>
            ) : (
              myPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    id: post.id,
                    content: post.content,
                    postType: post.postType || 'ARTICLE',
                    visibility: post.visibility,
                    author: {
                      id: post.author.id,
                      firstName: post.author.firstName,
                      lastName: post.author.lastName,
                      profileImage: post.author.profilePictureUrl,
                      role: post.author.role,
                    },
                    createdAt: post.createdAt,
                    likesCount: post.likesCount,
                    commentsCount: post.commentsCount,
                    sharesCount: post.sharesCount,
                    isLiked: isPostLiked(post),
                    isBookmarked: post.isBookmarked,
                    pollOptions: post.pollOptions?.map(opt => ({
                      id: opt.id,
                      text: opt.text,
                      votes: opt._count?.votes || 0,
                    })),
                    userVotedOptionId: post.userVotedOptionId,
                  }}
                  onLike={handleLike}
                  onComment={(postId, content) => {
                    setNewComment(prev => ({ ...prev, [postId]: content }));
                    handleAddComment(postId);
                  }}
                  onVote={handleVote}
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>
        )}

        {/* Bookmarks Tab */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-4">
            {bookmarkedPosts.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100/80 to-orange-100/80 flex items-center justify-center shadow-md">
                  <Bookmark className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No saved posts</h3>
                <p className="text-gray-600">Posts you bookmark will appear here.</p>
              </div>
            ) : (
              bookmarkedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    id: post.id,
                    content: post.content,
                    postType: post.postType || 'ARTICLE',
                    visibility: post.visibility,
                    author: {
                      id: post.author.id,
                      firstName: post.author.firstName,
                      lastName: post.author.lastName,
                      profileImage: post.author.profilePictureUrl,
                      role: post.author.role,
                    },
                    createdAt: post.createdAt,
                    likesCount: post.likesCount,
                    commentsCount: post.commentsCount,
                    sharesCount: post.sharesCount,
                    isLiked: isPostLiked(post),
                    isBookmarked: true,
                    pollOptions: post.pollOptions?.map(opt => ({
                      id: opt.id,
                      text: opt.text,
                      votes: opt._count?.votes || 0,
                    })),
                    userVotedOptionId: post.userVotedOptionId,
                  }}
                  onLike={handleLike}
                  onComment={(postId, content) => {
                    setNewComment(prev => ({ ...prev, [postId]: content }));
                    handleAddComment(postId);
                  }}
                  onVote={handleVote}
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>
        )}

        {/* Groups Tab - Coming Soon */}
        {activeTab === 'groups' && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100/80 to-gray-200/80 flex items-center justify-center shadow-md">
              <Users className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Groups - Coming Soon</h3>
            <p className="text-gray-600">This feature is currently under development.</p>
          </div>
        )}
      </div>

      {/* Create Post Modal - Using new component */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        user={user}
      />
    </div>
  );
}
