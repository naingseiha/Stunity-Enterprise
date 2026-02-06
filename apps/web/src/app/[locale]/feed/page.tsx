'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';
import CreatePostModal, { CreatePostData } from '@/components/feed/CreatePostModal';
import PostCard from '@/components/feed/PostCard';
import PostAnalyticsModal from '@/components/feed/PostAnalyticsModal';
import InsightsDashboard from '@/components/feed/InsightsDashboard';
import TrendingSection from '@/components/feed/TrendingSection';
import ActivityDashboard from '@/components/feed/ActivityDashboard';
import { FeedSkeletonList } from '@/components/feed/FeedPostSkeleton';
import LearningSpotlight from '@/components/feed/LearningSpotlight';
import StudyGroupsWidget from '@/components/feed/StudyGroupsWidget';
import UpcomingEventsWidget from '@/components/feed/UpcomingEventsWidget';
import TopContributorsWidget from '@/components/feed/TopContributorsWidget';
import LearningStreakWidget from '@/components/feed/LearningStreakWidget';
import QuickResourcesWidget from '@/components/feed/QuickResourcesWidget';
import { useEventStream, SSEEvent } from '@/hooks/useEventStream';
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
  Activity,
  Flame,
  Eye,
  Settings,
  Calendar,
  Bell,
  MessageCircle,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Zap,
  Trophy,
  Target,
  FolderOpen,
  Rocket,
  Microscope,
  UsersRound,
  User,
  Wifi,
  WifiOff,
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
  mediaUrls?: string[];
  mediaDisplayMode?: 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT';
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
    role: string;
    isVerified?: boolean;
    professionalTitle?: string;
    level?: number;
    achievements?: Array<{
      id: string;
      type: string;
      title: string;
      rarity: string;
      badgeUrl?: string;
    }>;
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
  { id: 'TUTORIAL', label: 'Tutorials', icon: BookOpen },
  { id: 'RESOURCE', label: 'Resources', icon: FolderOpen },
  { id: 'PROJECT', label: 'Projects', icon: Rocket },
  { id: 'RESEARCH', label: 'Research', icon: Microscope },
  { id: 'COLLABORATION', label: 'Collaboration', icon: UsersRound },
  { id: 'CLUB_CREATED', label: 'Study Clubs', icon: Users },
  { id: 'EVENT_CREATED', label: 'Events', icon: Calendar },
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
  
  // Analytics state
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState<string | null>(null);
  
  // Real-time state
  const [newPostsAvailable, setNewPostsAvailable] = useState(0);
  const pendingPostsRef = useRef<Post[]>([]);

  // SSE Real-time event handler
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    console.log('📡 SSE Event:', event.type, event.data);
    
    switch (event.type) {
      case 'NEW_POST':
        // Fetch the new post and add to pending
        if (event.data.postId && event.data.authorId !== user?.id) {
          setNewPostsAvailable(prev => prev + 1);
        }
        break;
        
      case 'NEW_LIKE':
        // Update like count for the post
        if (event.data.postId) {
          setPosts(prev => prev.map(post => {
            if (post.id === event.data.postId) {
              return { ...post, likesCount: post.likesCount + 1 };
            }
            return post;
          }));
        }
        break;
        
      case 'NEW_COMMENT':
        // Update comment count for the post
        if (event.data.postId) {
          setPosts(prev => prev.map(post => {
            if (post.id === event.data.postId) {
              return { ...post, commentsCount: post.commentsCount + 1 };
            }
            return post;
          }));
        }
        break;
        
      case 'POST_UPDATED':
        // Refresh the updated post
        if (event.data.postId) {
          fetchSinglePost(event.data.postId);
        }
        break;
        
      case 'POST_DELETED':
        // Remove the deleted post
        if (event.data.postId) {
          setPosts(prev => prev.filter(post => post.id !== event.data.postId));
          setMyPosts(prev => prev.filter(post => post.id !== event.data.postId));
        }
        break;
    }
  }, [user?.id]);

  // Connect to SSE for real-time updates
  const { isConnected, unreadCounts } = useEventStream(user?.id, {
    onEvent: handleSSEEvent,
    enabled: !!user?.id,
  });

  // Fetch a single post by ID
  const fetchSinglePost = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return null;
    
    try {
      const res = await fetch(`${FEED_API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPosts(prev => prev.map(post => 
          post.id === postId ? data.data : post
        ));
        return data.data;
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
    }
    return null;
  };

  // Load new posts when user clicks the "new posts" banner
  const loadNewPosts = async () => {
    await fetchPosts();
    setNewPostsAvailable(0);
    pendingPostsRef.current = [];
  };

  // Track post view
  const trackPostView = useCallback(async (postId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;
      await fetch(`${FEED_API}/posts/${postId}/view`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ source: 'feed' }),
      });
    } catch (error) {
      // Silent fail - view tracking shouldn't break UX
    }
  }, []);

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
        // Track views for visible posts
        (data.data || []).slice(0, 5).forEach((post: Post) => {
          trackPostView(post.id);
        });
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
        mediaUrls: data.mediaUrls,
        mediaDisplayMode: data.mediaDisplayMode,
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

  const handleViewAnalytics = (postId: string) => {
    setSelectedPostForAnalytics(postId);
    setShowAnalyticsModal(true);
  };

  const tabs = [
    { id: 'feed', label: 'Feed', icon: TrendingUp },
    { id: 'posts', label: 'My Posts', icon: BookOpen },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'bookmarks', label: 'Saved', icon: Bookmark },
  ];

  return (
    <div className="min-h-screen bg-gray-50 scrollbar-hide">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      {/* LinkedIn-style 3-column layout - cleaner proportions */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Sidebar - Compact Profile & Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-3">
              {/* Profile Card - Education-Focused Design */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Cover - Gradient with role-based accent */}
                <div className="h-24 bg-gradient-to-br from-[#F9A825] via-[#FFB74D] to-[#F9A825] relative">
                  {/* Decorative education icons */}
                  <div className="absolute inset-0 opacity-15">
                    <GraduationCap className="absolute top-2 left-3 w-6 h-6 text-white" />
                    <BookOpen className="absolute top-3 right-4 w-5 h-5 text-white" />
                    <Award className="absolute bottom-2 left-1/3 w-4 h-4 text-white" />
                  </div>
                </div>
                
                {/* Avatar - Centered, overlapping cover */}
                <div className="flex justify-center -mt-8 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white text-xl font-bold border-3 border-white shadow-lg">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                </div>
                
                {/* User Info - Centered */}
                <div className="text-center px-4 pt-2 pb-3">
                  <Link href={`/${locale}/profile/me`} className="hover:underline">
                    <h3 className="font-bold text-gray-900 text-sm">{user.firstName} {user.lastName}</h3>
                  </Link>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    {user.role === 'ADMIN' && <Settings className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'TEACHER' && <GraduationCap className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'STUDENT' && <BookOpen className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'STAFF' && <Users className="w-3 h-3 text-[#F9A825]" />}
                    <span className="text-xs text-[#F9A825] font-medium">
                      {user.role === 'ADMIN' ? 'Administrator' : 
                       user.role === 'TEACHER' ? 'Educator' : 
                       user.role === 'STUDENT' ? 'Learner' : 
                       user.role === 'STAFF' ? 'Staff Member' : 
                       user.role?.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                  <Link 
                    href={`/${locale}/profile/me`}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <User className="w-3 h-3" />
                    View Profile
                  </Link>
                </div>

                {/* Education Metrics - 2x2 Grid */}
                <div className="border-t border-gray-100 px-3 py-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Engagement Score */}
                    <button 
                      onClick={() => setActiveTab('insights')}
                      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-2.5 text-center group hover:from-amber-100 hover:to-orange-100 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-bold text-gray-900">{posts.reduce((sum, p) => sum + (p.likesCount || 0), 0)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">Engagement</p>
                    </button>
                    
                    {/* Impact Score - Role-based */}
                    <button 
                      onClick={() => setActiveTab('activity')}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 text-center group hover:from-blue-100 hover:to-indigo-100 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Target className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-bold text-gray-900">
                          {user.role === 'TEACHER' ? Math.floor(posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) * 1.5) :
                           user.role === 'ADMIN' ? Math.floor((myPosts.length || 0) * 2.5) :
                           posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {user.role === 'TEACHER' ? 'Impact' : user.role === 'ADMIN' ? 'Reach' : 'Learning'}
                      </p>
                    </button>
                    
                    {/* Contributions */}
                    <button 
                      onClick={() => setActiveTab('posts')}
                      className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-2.5 text-center group hover:from-emerald-100 hover:to-teal-100 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm font-bold text-gray-900">{myPosts.length || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {user.role === 'TEACHER' ? 'Lessons' : user.role === 'ADMIN' ? 'Updates' : 'Shares'}
                      </p>
                    </button>
                    
                    {/* Achievement/Level */}
                    <button 
                      onClick={() => setActiveTab('insights')}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2.5 text-center group hover:from-purple-100 hover:to-pink-100 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-sm font-bold text-gray-900">
                          {user.role === 'TEACHER' ? 'Expert' : 
                           user.role === 'ADMIN' ? 'Leader' : 
                           user.role === 'STUDENT' ? 'Rising' : 'Active'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {user.role === 'TEACHER' ? 'Educator' : 
                         user.role === 'ADMIN' ? 'Role' : 
                         user.role === 'STUDENT' ? 'Star' : 'Status'}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between text-[10px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{posts.length * 12 + myPosts.length * 5} views this week</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">+{Math.min(15, Math.max(5, (myPosts.length || 1) + (posts.length % 10)))}%</span>
                  </div>
                </div>
              </div>

              {/* Quick Links - Minimal */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <nav className="py-1">
                  {[
                    { id: 'bookmarks', label: 'Saved', icon: Bookmark },
                    { id: 'posts', label: 'My Posts', icon: BookOpen },
                    { id: 'insights', label: 'Analytics', icon: BarChart3 },
                    { id: 'activity', label: 'Activity', icon: Activity },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          activeTab === item.id
                            ? 'bg-amber-50 text-[#F9A825] font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Center - Main Feed */}
          <main className="lg:col-span-6">
            {/* Tab Navigation - Mobile only */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 lg:hidden scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium text-xs transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-[#F9A825] text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Create Post Box - LinkedIn Style */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {getInitials(user.firstName, user.lastName)}
                </div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 text-left px-4 py-2.5 bg-white rounded-full text-gray-500 hover:bg-gray-100 transition-colors text-sm border border-gray-300"
                >
                  What's on your mind?
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-medium hidden sm:inline">Photo</span>
                </button>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-medium hidden sm:inline">Poll</span>
                </button>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                >
                  <Megaphone className="w-5 h-5 text-rose-500" />
                  <span className="text-xs font-medium hidden sm:inline">Announce</span>
                </button>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                >
                  <HelpCircle className="w-5 h-5 text-teal-500" />
                  <span className="text-xs font-medium hidden sm:inline">Ask</span>
                </button>
              </div>
            </div>

            {/* Feed Content */}
            {activeTab === 'feed' && (
              <div className="space-y-3">
                {/* Post Type Filters & Refresh - Minimal */}
                <div className="flex items-center justify-between gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${
                        postTypeFilter !== 'all' 
                          ? 'bg-amber-50 border-[#F9A825] text-[#F9A825]' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {POST_TYPE_FILTERS.find(f => f.id === postTypeFilter)?.label}
                      </span>
                    </button>
                    
                    {showFilters && (
                      <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        {POST_TYPE_FILTERS.map((filter) => {
                          const Icon = filter.icon;
                          return (
                            <button
                              key={filter.id}
                              onClick={() => {
                                setPostTypeFilter(filter.id);
                                setShowFilters(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors ${
                                postTypeFilter === filter.id ? 'bg-gradient-to-r from-amber-50 to-[#F9A825]/10 border-l-2 border-[#F9A825]' : ''
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${postTypeFilter === filter.id ? 'text-[#F9A825]' : 'text-gray-500'}`} />
                              <span className={`text-sm ${postTypeFilter === filter.id ? 'text-[#F9A825] font-medium' : 'text-gray-700'}`}>{filter.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={fetchPosts}
                    disabled={loadingPosts}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-[#F9A825] hover:bg-amber-50 rounded-full transition-all duration-200"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingPosts ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  
                  {/* Real-time connection indicator */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                    isConnected 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isConnected ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        <span className="hidden sm:inline">Live</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        <span className="hidden sm:inline">Offline</span>
                      </>
                    )}
                  </div>
                </div>

                {/* New Posts Available Banner */}
                {newPostsAvailable > 0 && (
                  <button
                    onClick={loadNewPosts}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-md hover:from-amber-600 hover:to-orange-600 transition-all animate-pulse"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">
                      {newPostsAvailable} new {newPostsAvailable === 1 ? 'post' : 'posts'} available
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* Loading State - Use Skeleton */}
                {loadingPosts && posts.length === 0 && (
                  <FeedSkeletonList count={3} />
                )}

                {/* Empty State - Stunity Design */}
                {!loadingPosts && posts.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-10 h-10 text-[#F9A825]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Stunity!</h3>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">Be the first to share knowledge, ask questions, or celebrate achievements with your school community.</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#F9A825] to-[#FFB74D] text-white rounded-full font-semibold hover:from-[#E89A1E] hover:to-[#FF9800] transition-all shadow-lg shadow-emerald-200 transform hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                      Create Your First Post
                    </button>
                  </div>
                )}

                {/* Posts List with stagger animation */}
                {posts
                  .filter(post => postTypeFilter === 'all' || post.postType === postTypeFilter)
                  .map((post, index) => (
                    <div 
                      key={post.id}
                      className="animate-fadeInUp"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <PostCard
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
                            isVerified: post.author.isVerified,
                            professionalTitle: post.author.professionalTitle,
                            level: post.author.level,
                            achievements: post.author.achievements,
                          },
                          createdAt: post.createdAt,
                          likesCount: post.likesCount,
                          commentsCount: post.commentsCount,
                          sharesCount: post.sharesCount,
                          isLiked: isPostLiked(post),
                          isBookmarked: post.isBookmarked,
                          mediaUrls: post.mediaUrls,
                          mediaDisplayMode: post.mediaDisplayMode,
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
                        onComment={async (postId, content) => {
                          // Directly submit the comment with the content passed from PostCard
                          const token = TokenManager.getAccessToken();
                          if (!token || !content.trim()) return;
                          
                          try {
                            const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ content: content.trim() })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setComments(prev => ({
                                ...prev,
                                [postId]: [data.data, ...(prev[postId] || [])]
                              }));
                              setPosts(prev => prev.map(p => 
                                p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
                              ));
                            }
                          } catch (error) {
                            console.error('Failed to add comment:', error);
                          }
                        }}
                        onToggleComments={(postId) => {
                          if (!comments[postId]) {
                            fetchComments(postId);
                          }
                        }}
                        loadingComments={loadingComments.has(post.id)}
                        onVote={handleVote}
                        onBookmark={handleBookmark}
                        onShare={handleShare}
                        onEdit={handleEditPost}
                        onDelete={handleDeletePost}
                        onViewAnalytics={handleViewAnalytics}
                        currentUserId={user?.id}
                      />
                    </div>
                  ))}
                  
                {/* Empty Filter State */}
                {!loadingPosts && posts.length > 0 && posts.filter(post => postTypeFilter === 'all' || post.postType === postTypeFilter).length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center">
                      <Filter className="w-8 h-8 text-[#F9A825]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No {POST_TYPE_FILTERS.find(f => f.id === postTypeFilter)?.label.toLowerCase()}</h3>
                    <p className="text-gray-600 mb-4">Try selecting a different filter or create a new post!</p>
                    <button
                      onClick={() => setPostTypeFilter('all')}
                      className="text-[#F9A825] hover:text-[#E89A1E] font-medium"
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
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[#F9A825]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No posts yet</h3>
                    <p className="text-gray-600 mb-6">Share your first post with your school community!</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#F9A825] to-[#FFB74D] text-white rounded-full font-semibold hover:from-[#E89A1E] hover:to-[#FF9800] transition-all shadow-lg shadow-emerald-200 transform hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                      Create Post
                    </button>
                  </div>
                ) : (
                  myPosts.map((post, index) => (
                    <div 
                      key={post.id}
                      className="animate-fadeInUp"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <PostCard
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
                            isVerified: post.author.isVerified,
                            professionalTitle: post.author.professionalTitle,
                            level: post.author.level,
                            achievements: post.author.achievements,
                          },
                          createdAt: post.createdAt,
                          likesCount: post.likesCount,
                          commentsCount: post.commentsCount,
                          sharesCount: post.sharesCount,
                          isLiked: isPostLiked(post),
                          isBookmarked: post.isBookmarked,
                          mediaUrls: post.mediaUrls,
                          mediaDisplayMode: post.mediaDisplayMode,
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
                        onComment={async (postId, content) => {
                          const token = TokenManager.getAccessToken();
                          if (!token || !content.trim()) return;
                          try {
                            const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ content: content.trim() })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setComments(prev => ({
                                ...prev,
                                [postId]: [data.data, ...(prev[postId] || [])]
                              }));
                              setMyPosts(prev => prev.map(p => 
                                p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
                              ));
                            }
                          } catch (error) {
                            console.error('Failed to add comment:', error);
                          }
                        }}
                        onToggleComments={(postId) => {
                          if (!comments[postId]) {
                            fetchComments(postId);
                          }
                        }}
                        loadingComments={loadingComments.has(post.id)}
                        onVote={handleVote}
                        onBookmark={handleBookmark}
                        onShare={handleShare}
                        onEdit={handleEditPost}
                        onDelete={handleDeletePost}
                        onViewAnalytics={handleViewAnalytics}
                        currentUserId={user?.id}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <InsightsDashboard apiUrl={FEED_API} />
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <ActivityDashboard apiUrl={FEED_API} />
            )}

            {/* Bookmarks Tab */}
            {activeTab === 'bookmarks' && (
              <div className="space-y-4">
                {bookmarkedPosts.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
                      <Bookmark className="w-10 h-10 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No saved posts</h3>
                    <p className="text-gray-600">Posts you bookmark will appear here for easy access.</p>
                  </div>
                ) : (
                  bookmarkedPosts.map((post, index) => (
                    <div 
                      key={post.id}
                      className="animate-fadeInUp"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <PostCard
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
                            isVerified: post.author.isVerified,
                            professionalTitle: post.author.professionalTitle,
                            level: post.author.level,
                            achievements: post.author.achievements,
                          },
                          createdAt: post.createdAt,
                          likesCount: post.likesCount,
                          commentsCount: post.commentsCount,
                          sharesCount: post.sharesCount,
                          isLiked: isPostLiked(post),
                          isBookmarked: true,
                          mediaUrls: post.mediaUrls,
                          mediaDisplayMode: post.mediaDisplayMode,
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
                        onComment={async (postId, content) => {
                          const token = TokenManager.getAccessToken();
                          if (!token || !content.trim()) return;
                          try {
                            const res = await fetch(`${FEED_API}/posts/${postId}/comments`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ content: content.trim() })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setComments(prev => ({
                                ...prev,
                                [postId]: [data.data, ...(prev[postId] || [])]
                              }));
                              setBookmarkedPosts(prev => prev.map(p => 
                                p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
                              ));
                            }
                          } catch (error) {
                            console.error('Failed to add comment:', error);
                          }
                        }}
                        onToggleComments={(postId) => {
                          if (!comments[postId]) {
                            fetchComments(postId);
                          }
                        }}
                        loadingComments={loadingComments.has(post.id)}
                        onVote={handleVote}
                        onBookmark={handleBookmark}
                        onShare={handleShare}
                        onEdit={handleEditPost}
                        onDelete={handleDeletePost}
                        onViewAnalytics={handleViewAnalytics}
                        currentUserId={user?.id}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar - Compact Widgets */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Learning Spotlight */}
              <LearningSpotlight />

              {/* Study Groups */}
              <StudyGroupsWidget />

              {/* Upcoming Events */}
              <UpcomingEventsWidget />

              {/* Top Contributors */}
              <TopContributorsWidget />

              {/* Quick Resources */}
              <QuickResourcesWidget />

              {/* Footer Links */}
              <div className="text-xs text-gray-400 px-2 pt-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <a href="#" className="hover:text-[#F9A825] transition-colors">About</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">Help</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">Privacy</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">Terms</a>
                </div>
                <p className="mt-3 flex items-center gap-1">
                  <span className="font-semibold text-[#F9A825]">Stunity</span> © 2026
                </p>
              </div>
            </div>
          </aside>

        </div>
      </div>



      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        user={user}
      />

      {/* Post Analytics Modal */}
      {selectedPostForAnalytics && (
        <PostAnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => { setShowAnalyticsModal(false); setSelectedPostForAnalytics(null); }}
          postId={selectedPostForAnalytics}
          apiUrl={FEED_API}
        />
      )}
    </div>
  );
}
