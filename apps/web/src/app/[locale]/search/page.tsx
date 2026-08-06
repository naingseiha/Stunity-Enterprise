'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  FileText,
  Filter,
  ImageIcon,
  Loader2,
  MessageCircle,
  Search,
  TrendingUp,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PostCard from '@/components/feed/PostCard';
import PostAnalyticsModal from '@/components/feed/PostAnalyticsModal';
import GlobalSearch from '@/components/search/GlobalSearch';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import {
  fetchUnifiedSearch,
  filterMediaPosts,
  formatRole,
  getInitials,
  sortPosts,
  type SearchClub,
  type SearchCourse,
  type SearchUser,
} from '@/lib/search/api';
import {
  POST_TYPE_FILTERS,
  TRENDING_TOPICS,
  type SearchTab,
  type SortMode,
} from '@/lib/search/constants';
import {
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
} from '@/lib/search/recentSearches';

export default function SearchPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  const t = useTranslations('common.search');
  const tSort = useTranslations('common.sort');

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [users, setUsers] = useState<SearchUser[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [clubs, setClubs] = useState<SearchClub[]>([]);
  const [courses, setCourses] = useState<SearchCourse[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [postTypeFilter, setPostTypeFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('top');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    setRecent(getRecentSearches());
    setLoading(false);
  }, [locale, router]);

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setUsers([]);
      setPosts([]);
      setClubs([]);
      setCourses([]);
      return;
    }

    const token = TokenManager.getAccessToken();
    if (!token) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);

    try {
      const result = await fetchUnifiedSearch({
        query,
        token,
        postType: postTypeFilter,
        userLimit: 24,
        postLimit: 24,
        clubLimit: 16,
        courseLimit: 16,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      setUsers(result.users.filter((u) => u.id !== user?.id));
      setPosts(result.posts);
      setClubs(result.clubs);
      setCourses(result.courses);
      setRecent(saveRecentSearch(query));
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, [postTypeFilter, query, user?.id]);

  useEffect(() => {
    if (user && query) {
      performSearch();
    }
    return () => abortRef.current?.abort();
  }, [user, query, performSearch]);

  useEffect(() => {
    setActiveTab('all');
  }, [query]);

  const sortedPosts = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);
  const mediaPosts = useMemo(() => filterMediaPosts(sortedPosts), [sortedPosts]);

  const tabs = useMemo(
    () =>
      [
        { key: 'all' as const, label: t('everything'), count: users.length + posts.length + clubs.length + courses.length },
        { key: 'people' as const, label: t('people'), count: users.length, icon: Users },
        { key: 'posts' as const, label: t('posts'), count: posts.length, icon: FileText },
        { key: 'clubs' as const, label: t('clubs'), count: clubs.length, icon: UsersRound },
        { key: 'courses' as const, label: t('courses'), count: courses.length, icon: BookOpen },
        { key: 'media' as const, label: t('media'), count: mediaPosts.length, icon: ImageIcon },
      ] as const,
    [clubs.length, courses.length, mediaPosts.length, posts.length, t, users.length],
  );

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${locale}/auth/login`);
  };

  const navigateSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecent(saveRecentSearch(trimmed));
    router.push(`/${locale}/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleReact = async (postId: string, type: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;
    const current = posts.find((p) => p.id === postId);
    const prevReaction = current?.myReaction ?? (current?.isLiked ? 'LIKE' : null);
    const prevCount = current?.likesCount ?? 0;

    let nextReaction: string | null = type;
    let nextCount = prevCount;
    if (prevReaction === type) {
      nextReaction = null;
      nextCount = Math.max(0, prevCount - 1);
    } else if (!prevReaction) {
      nextCount = prevCount + 1;
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, myReaction: nextReaction, isLiked: Boolean(nextReaction), likesCount: nextCount }
          : p,
      ),
    );

    try {
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('react failed');
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, myReaction: data.myReaction ?? null, isLiked: Boolean(data.myReaction) }
            : p,
        ),
      );
    } catch (err) {
      console.error('React error:', err);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, myReaction: prevReaction, isLiked: Boolean(prevReaction), likesCount: prevCount }
            : p,
        ),
      );
    }
  };

  const handleLike = async (postId: string) => handleReact(postId, 'LIKE');

  const handleComment = async (postId: string, content: string, parentId?: string) => {
    const token = TokenManager.getAccessToken();
    if (!token || !content?.trim()) return;
    try {
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: content.trim(), parentId: parentId || null }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)),
        );
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
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isBookmarked: data.bookmarked } : p)),
        );
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
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleRepost = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p)),
    );
  };

  const handleVote = async (postId: string, optionId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ optionId }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== postId) return post;
            return {
              ...post,
              userVotedOptionId: optionId,
              pollOptions: post.pollOptions?.map((opt: any) => ({
                ...opt,
                _count: {
                  votes:
                    opt.id === optionId
                      ? (opt._count?.votes || 0) + 1
                      : opt._count?.votes || 0,
                },
              })),
            };
          }),
        );
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  };

  const noop = () => {};

  const renderPeople = (list: SearchUser[], limit?: number) => {
    const items = typeof limit === 'number' ? list.slice(0, limit) : list;
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        {items.map((u, index) => (
          <div
            key={u.id}
            className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-900/60 ${
              index > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''
            }`}
          >
            <Link href={`/${locale}/profile/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              {u.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.profilePictureUrl}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-semibold text-white">
                  {getInitials(u.firstName, u.lastName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">
                  {u.firstName} {u.lastName}
                </p>
                <p className="truncate text-xs capitalize text-slate-500">
                  {u.headline || u.professionalTitle || formatRole(u.role)}
                </p>
              </div>
            </Link>
            <Link
              href={`/${locale}/messages?c=new&user=${u.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t('message')}
            </Link>
          </div>
        ))}
      </div>
    );
  };

  const renderClubs = (list: SearchClub[], limit?: number) => {
    const items = typeof limit === 'number' ? list.slice(0, limit) : list;
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((club) => (
          <Link
            key={club.id}
            href={`/${locale}/clubs/${club.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
          >
            <div className="flex items-start gap-3">
              {club.avatarUrl || club.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={club.avatarUrl || club.coverImageUrl || ''}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <UsersRound className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{club.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {club.category || t('clubs')} · {t('members', { count: club.memberCount || 0 })}
                </p>
                {club.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{club.description}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderCourses = (list: SearchCourse[], limit?: number) => {
    const items = typeof limit === 'number' ? list.slice(0, limit) : list;
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((course) => (
          <Link
            key={course.id}
            href={`/${locale}/learn/course/${course.id}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
          >
            <div className="flex gap-3 p-3">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.thumbnailUrl}
                  alt=""
                  className="h-16 w-20 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900">
                  <BookOpen className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 py-0.5">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {course.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {course.level || course.category || t('courses')}
                  {typeof course.enrollmentCount === 'number'
                    ? ` · ${t('enrolled', { count: course.enrollmentCount })}`
                    : ''}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderPosts = (list: any[]) => (
    <div className="space-y-4">
      {list.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={handleLike}
          onReact={handleReact}
          onComment={handleComment}
          onBookmark={handleBookmark}
          onShare={handleShare}
          onRepost={handleRepost}
          onDelete={noop}
          onEdit={noop}
          onVote={handleVote}
          onViewAnalytics={(postId) => {
            setSelectedPostForAnalytics(postId);
            setShowAnalyticsModal(true);
          }}
          currentUserId={user?.id}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700 dark:text-slate-200" />
      </div>
    );
  }

  const hasResults =
    users.length > 0 || posts.length > 0 || clubs.length > 0 || courses.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:pl-72 lg:pr-6">
        <div className="mb-6 flex flex-col gap-4">
          <Link
            href={`/${locale}/feed`}
            className="inline-flex w-fit items-center text-sm text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToFeed')}
          </Link>

          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">
                  {query ? (
                    <>
                      {t('resultsFor')} <span className="text-slate-500">“{query}”</span>
                    </>
                  ) : (
                    t('idleTitle')
                  )}
                </h1>
                <p className="text-xs text-slate-500 sm:text-sm">
                  {query
                    ? t('resultsSummaryFull', {
                        people: users.length,
                        posts: posts.length,
                        clubs: clubs.length,
                        courses: courses.length,
                      })
                    : t('idleSubtitle')}
                </p>
              </div>
            </div>
            <GlobalSearch />
          </div>
        </div>

        {!query ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {recent.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('recent')}</h2>
                    <button
                      type="button"
                      onClick={() => {
                        clearRecentSearches();
                        setRecent([]);
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {t('clearAll')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((term) => (
                      <div
                        key={term}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1.5 py-1.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <button type="button" onClick={() => navigateSearch(term)} className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                          {term}
                        </button>
                        <button
                          type="button"
                          aria-label={t('removeRecent')}
                          onClick={() => setRecent(removeRecentSearch(term))}
                          className="rounded-full p-1 hover:bg-slate-200/80 dark:hover:bg-slate-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('trending')}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => navigateSearch(topic)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {t('exploreByType')}
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {POST_TYPE_FILTERS.filter((item) => item.value).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => navigateSearch(item.value.toLowerCase())}
                      className="rounded-xl border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {t(item.labelKey)}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-4 lg:col-span-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {t('trySearching')}
                </h3>
                <div className="space-y-2">
                  <Link
                    href={`/${locale}/learn`}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <BookOpen className="h-4 w-4" />
                    {t('browseLearn')}
                  </Link>
                  <Link
                    href={`/${locale}/clubs`}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <UsersRound className="h-4 w-4" />
                    {t('browseClubs')}
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Filter className="h-4 w-4 shrink-0 text-slate-400" />
                <select
                  value={postTypeFilter}
                  onChange={(e) => setPostTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  {POST_TYPE_FILTERS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
                  {(['top', 'recent', 'popular'] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSortMode(mode)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        sortMode === mode
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tSort(mode)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
              {tabs.map((tab) => {
                const Icon = 'icon' in tab ? tab.icon : null;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      activeTab === tab.key
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        activeTab === tab.key
                          ? 'bg-white/20 dark:bg-slate-900/10'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-slate-700 dark:text-slate-200" />
                <p className="text-slate-500">{t('searching')}</p>
              </div>
            ) : !hasResults ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
                  <Search className="h-7 w-7 text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('noResults')}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{t('noResultsSub')}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Link
                    href={`/${locale}/learn`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                  >
                    {t('browseLearn')}
                  </Link>
                  <Link
                    href={`/${locale}/clubs`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                  >
                    {t('browseClubs')}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="space-y-8 lg:col-span-8">
                  {(activeTab === 'all' || activeTab === 'people') && users.length > 0 && (
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                          <Users className="h-4 w-4 text-slate-400" />
                          {t('people')}
                        </h2>
                        {activeTab === 'all' && users.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('people')}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            {t('seeAllPeople')}
                          </button>
                        )}
                      </div>
                      {renderPeople(users, activeTab === 'all' ? 4 : undefined)}
                    </section>
                  )}

                  {(activeTab === 'all' || activeTab === 'clubs') && clubs.length > 0 && (
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                          <UsersRound className="h-4 w-4 text-slate-400" />
                          {t('clubs')}
                        </h2>
                        {activeTab === 'all' && clubs.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('clubs')}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            {t('seeAllClubs')}
                          </button>
                        )}
                      </div>
                      {renderClubs(clubs, activeTab === 'all' ? 4 : undefined)}
                    </section>
                  )}

                  {(activeTab === 'all' || activeTab === 'courses') && courses.length > 0 && (
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          {t('courses')}
                        </h2>
                        {activeTab === 'all' && courses.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('courses')}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            {t('seeAllCourses')}
                          </button>
                        )}
                      </div>
                      {renderCourses(courses, activeTab === 'all' ? 4 : undefined)}
                    </section>
                  )}

                  {(activeTab === 'all' || activeTab === 'posts') && sortedPosts.length > 0 && (
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                          <FileText className="h-4 w-4 text-slate-400" />
                          {t('posts')}
                        </h2>
                        {activeTab === 'all' && sortedPosts.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('posts')}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            {t('seeAllPosts')}
                          </button>
                        )}
                      </div>
                      {renderPosts(activeTab === 'all' ? sortedPosts.slice(0, 3) : sortedPosts)}
                    </section>
                  )}

                  {activeTab === 'media' && (
                    <section>
                      {mediaPosts.length > 0 ? (
                        renderPosts(mediaPosts)
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800">
                          {t('noResults')}
                        </div>
                      )}
                    </section>
                  )}
                </div>

                <aside className="hidden lg:col-span-4 lg:block">
                  <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                    <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">{t('insights')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{t('totalMatches')}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {users.length + posts.length + clubs.length + courses.length}
                        </span>
                      </div>
                      {[
                        { label: t('people'), value: users.length },
                        { label: t('posts'), value: posts.length },
                        { label: t('clubs'), value: clubs.length },
                        { label: t('courses'), value: courses.length },
                        { label: t('media'), value: mediaPosts.length },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800"
                        >
                          <span className="text-sm text-slate-600 dark:text-slate-300">{row.label}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </main>

      {selectedPostForAnalytics && (
        <PostAnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedPostForAnalytics(null);
          }}
          postId={selectedPostForAnalytics}
          apiUrl={FEED_SERVICE_URL}
        />
      )}
    </div>
  );
}
