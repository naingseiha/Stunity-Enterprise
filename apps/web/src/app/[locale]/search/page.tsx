'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PostCard from '@/components/feed/PostCard';
import PostAnalyticsModal from '@/components/feed/PostAnalyticsModal';
import {
    Search,
    Users,
    FileText,
    Loader2,
    ArrowLeft,
    MessageCircle,
    Filter
} from 'lucide-react';
import { FEED_SERVICE_URL } from '@/lib/api/config';

const POST_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All types' },
    { value: 'ARTICLE', label: 'Article' },
    { value: 'QUESTION', label: 'Question' },
    { value: 'QUIZ', label: 'Quiz' },
    { value: 'POLL', label: 'Poll' },
    { value: 'ANNOUNCEMENT', label: 'Announcement' },
    { value: 'EVENT', label: 'Event' },
    { value: 'COURSE', label: 'Course' },
    { value: 'TUTORIAL', label: 'Tutorial' },
];

export default function SearchPage({ params: { locale } }: { params: { locale: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams?.get('q') || '';

    const [user, setUser] = useState<any>(null);
    const [school, setSchool] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [users, setUsers] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Tab state: 'all', 'users', 'posts'
    const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts'>('all');
    const [postTypeFilter, setPostTypeFilter] = useState<string>('');
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState<string | null>(null);

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

    const performSearch = useCallback(async () => {
        if (!query.trim()) {
            setUsers([]);
            setPosts([]);
            return;
        }

        const token = TokenManager.getAccessToken();
        if (!token) return;

        setIsSearching(true);
        try {
            // Fetch matching users
            const usersRes = fetch(`${FEED_SERVICE_URL}/users/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Fetch matching posts (optionally filter by post type)
            const postsParams = new URLSearchParams({ search: query, limit: '20' });
            if (postTypeFilter) postsParams.set('type', postTypeFilter);
            const postsRes = fetch(`${FEED_SERVICE_URL}/posts?${postsParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const [uRes, pRes] = await Promise.all([usersRes, postsRes]);

            if (uRes.ok) {
                const uData = await uRes.json();
                if (uData.success) {
                    // Filter out the current user from results if they appear
                    setUsers((uData.users || uData.data || []).filter((u: any) => u.id !== user?.id));
                }
            }

            if (pRes.ok) {
                const pData = await pRes.json();
                if (pData.success) setPosts(pData.data || []);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    }, [query, postTypeFilter, user?.id]);

    useEffect(() => {
        if (user && query) {
            performSearch();
        }
    }, [user, query, performSearch]);

    const handleLogout = async () => {
        await TokenManager.logout();
        router.replace(`/${locale}/auth/login`);
    };

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    const handleLike = async (postId: string) => {
        const token = TokenManager.getAccessToken();
        if (!token) return;
        try {
            const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/like`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, likesCount: data.liked ? p.likesCount + 1 : p.likesCount - 1, isLiked: data.liked }
                        : p
                ));
            }
        } catch (err) {
            console.error('Like error:', err);
        }
    };

    const handleComment = async (postId: string, content: string) => {
        const token = TokenManager.getAccessToken();
        if (!token || !content?.trim()) return;
        try {
            const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ content: content.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setPosts(prev => prev.map(p =>
                    p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
                ));
            }
        } catch (err) {
            console.error('Comment error:', err);
        }
    };

    const handleBookmark = async (postId: string) => {
        const token = TokenManager.getAccessToken();
        if (!token) return;
        try {
            const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/bookmark`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPosts(prev => prev.map(p =>
                    p.id === postId ? { ...p, isBookmarked: data.bookmarked } : p
                ));
            }
        } catch (err) {
            console.error('Bookmark error:', err);
        }
    };

    const handleShare = async (postId: string) => {
        const token = TokenManager.getAccessToken();
        if (!token) return;
        try {
            await fetch(`${FEED_SERVICE_URL}/posts/${postId}/share`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    const handleRepost = async (postId: string) => {
        const token = TokenManager.getAccessToken();
        if (!token) return;
        try {
            const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/repost`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ type: 'REPOST' })
            });
            const data = await res.json();
            if (data.success) {
                setPosts(prev => prev.map(p =>
                    p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p
                ));
            }
        } catch (err) {
            console.error('Repost error:', err);
        }
    };

    const handleVote = async (postId: string, optionId: string) => {
        const token = TokenManager.getAccessToken();
        if (!token) return;
        try {
            const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ optionId })
            });
            const data = await res.json();
            if (data.success) {
                setPosts(prev => prev.map(post => {
                    if (post.id !== postId) return post;
                    return {
                        ...post,
                        userVotedOptionId: optionId,
                        pollOptions: post.pollOptions?.map((opt: any) => ({
                            ...opt,
                            _count: { votes: opt.id === optionId ? ((opt._count?.votes || 0) + 1) : (opt._count?.votes || 0) }
                        }))
                    };
                }));
            }
        } catch (err) {
            console.error('Vote error:', err);
        }
    };

    const handleViewAnalytics = (postId: string) => {
        setSelectedPostForAnalytics(postId);
        setShowAnalyticsModal(true);
    };

    const noop = () => { };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Search Header explicitly uses UnifiedNavigation so it connects to standard platform headers */}
            <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
                <div className="mb-8 pl-64">
                    <Link href={`/${locale}/feed`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Feed
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Search className="w-8 h-8 text-blue-600" />
                        Search Results for "{query}"
                    </h1>
                </div>

                <div className="pl-64">
                    {/* Post type filter (when searching posts) */}
                    {query && (
                        <div className="flex items-center gap-3 mb-4">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <select
                                value={postTypeFilter}
                                onChange={(e) => setPostTypeFilter(e.target.value)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                {POST_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200 mb-6 max-w-md">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'all'
                                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            All Results
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'users'
                                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            People ({users.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'posts'
                                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Posts ({posts.length})
                        </button>
                    </div>

                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                            <p className="text-gray-500">Searching across Stunity...</p>
                        </div>
                    ) : (!users.length && !posts.length) ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-10 h-10 text-gray-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No results found</h2>
                            <p className="text-gray-500 max-w-md mx-auto">
                                We couldn't find anything matching "{query}". Try adjusting your search terms or checking for typos.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Main Content Area */}
                            <div className="lg:col-span-8 space-y-8">

                                {/* Users Section */}
                                {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
                                    <section>
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-gray-400" />
                                            People
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {users.map(u => (
                                                <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
                                                    <Link href={`/${locale}/profile/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                                        {u.profilePictureUrl ? (
                                                            <img src={u.profilePictureUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                                                {getInitials(u.firstName, u.lastName)}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900 truncate">
                                                                {u.firstName} {u.lastName}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate capitalize">
                                                                {u.role?.toLowerCase().replace('_', ' ')}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                    <Link href={`/${locale}/messages?c=new&user=${u.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors ml-2">
                                                        <MessageCircle className="w-5 h-5" />
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Posts Section */}
                                {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
                                    <section>
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            Posts
                                        </h2>
                                        <div className="space-y-4">
                                            {posts.map(post => (
                                                <PostCard
                                                    key={post.id}
                                                    post={post}
                                                    onLike={handleLike}
                                                    onComment={handleComment}
                                                    onBookmark={handleBookmark}
                                                    onShare={handleShare}
                                                    onRepost={handleRepost}
                                                    onDelete={noop}
                                                    onEdit={noop}
                                                    onVote={handleVote}
                                                    onViewAnalytics={handleViewAnalytics}
                                                    currentUserId={user?.id}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* Sidebar Insights */}
                            <div className="hidden lg:block lg:col-span-4">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sticky top-24">
                                    <h3 className="font-semibold text-gray-900 mb-4">Search Insights</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm text-gray-600">Total Matches</span>
                                            <span className="font-semibold text-gray-900">{users.length + posts.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                            <div className="flex items-center gap-2 text-blue-700">
                                                <Users className="w-4 h-4" />
                                                <span className="text-sm font-medium">People Found</span>
                                            </div>
                                            <span className="font-semibold text-blue-700">{users.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <FileText className="w-4 h-4" />
                                                <span className="text-sm font-medium">Posts Found</span>
                                            </div>
                                            <span className="font-semibold text-amber-700">{posts.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </main>

            {selectedPostForAnalytics && (
                <PostAnalyticsModal
                    isOpen={showAnalyticsModal}
                    onClose={() => { setShowAnalyticsModal(false); setSelectedPostForAnalytics(null); }}
                    postId={selectedPostForAnalytics}
                    apiUrl={FEED_SERVICE_URL}
                />
            )}
        </div>
    );
}
