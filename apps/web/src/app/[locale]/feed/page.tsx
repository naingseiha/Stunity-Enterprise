'use client';

import { useEffect, useState, useCallback, useRef, use, useMemo } from 'react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TokenManager } from '@/lib/api/auth';
import { 
  GRADE_SERVICE_URL, 
  SUBJECT_SERVICE_URL, 
  FEED_SERVICE_URL, 
  LEARN_SERVICE_URL 
} from '@/lib/api/config';
import { buildRouteDataCacheKey, writeRouteDataCache } from '@/lib/route-data-cache';
import UnifiedNavigation from '@/components/UnifiedNavigation';
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
import PerformanceCard from '@/components/feed/PerformanceCard';
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

const FEED_API = FEED_SERVICE_URL;
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
  studyClubId?: string;
  quizData?: {
    questions?: { id: string; text: string }[];
    timeLimit?: number;
    passingScore?: number;
  };
  userAttempt?: {
    score: number;
    passed: boolean;
  };
  quiz?: {
    id: string;
    questions?: { id: string; text: string }[];
    timeLimit?: number;
    passingScore?: number;
    userAttempt?: { score: number; passed: boolean } | null;
  };
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

const normalizeWarmClub = <T extends { clubType?: string; type?: string; privacy?: string; mode?: string }>(club: T) => ({
  ...club,
  clubType: club.clubType || club.type || 'CASUAL_STUDY_GROUP',
  privacy: club.privacy || club.mode || 'PUBLIC',
});

const POST_TYPE_FILTERS = [
  { id: 'all', labelKey: 'filters.allPosts', icon: TrendingUp },
  { id: 'ARTICLE', labelKey: 'filters.articles', icon: FileText },
  { id: 'POLL', labelKey: 'filters.polls', icon: BarChart3 },
  { id: 'ANNOUNCEMENT', labelKey: 'filters.announcements', icon: Megaphone },
  { id: 'QUESTION', labelKey: 'filters.questions', icon: HelpCircle },
  { id: 'ACHIEVEMENT', labelKey: 'filters.achievements', icon: Award },
  { id: 'TUTORIAL', labelKey: 'filters.tutorials', icon: BookOpen },
  { id: 'RESOURCE', labelKey: 'filters.resources', icon: FolderOpen },
  { id: 'QUIZ', labelKey: 'filters.quizzes', icon: Trophy },
  { id: 'PROJECT', labelKey: 'filters.projects', icon: Rocket },
  { id: 'RESEARCH', labelKey: 'filters.research', icon: Microscope },
  { id: 'COLLABORATION', labelKey: 'filters.collaboration', icon: UsersRound },
  { id: 'CLUB_CREATED', labelKey: 'filters.studyClubs', icon: Users },
  { id: 'EVENT_CREATED', labelKey: 'filters.events', icon: Calendar },
];

const VIRTUALIZATION_DEFAULT_ITEM_HEIGHT = 640;
const VIRTUALIZATION_ITEM_GAP = 12;
const VIRTUALIZATION_THRESHOLD = 30;

function useVirtualizedFeedList<T extends { id: string }>(items: T[], enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserversRef = useRef<Map<string, ResizeObserver>>(new Map());
  const itemHeightsRef = useRef<Record<string, number>>({});
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const measureItem = useCallback((id: string) => (node: HTMLDivElement | null) => {
    const existingObserver = resizeObserversRef.current.get(id);
    if (existingObserver) {
      existingObserver.disconnect();
      resizeObserversRef.current.delete(id);
    }

    if (!node || typeof window === 'undefined') {
      return;
    }

    const updateHeight = () => {
      const nextHeight = node.offsetHeight;
      if (!nextHeight || itemHeightsRef.current[id] === nextHeight) return;
      itemHeightsRef.current[id] = nextHeight;
      setLayoutVersion((value) => value + 1);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(node);
    resizeObserversRef.current.set(id, observer);
  }, []);

  useEffect(() => {
    const resizeObservers = resizeObserversRef.current;
    return () => {
      resizeObservers.forEach((observer) => observer.disconnect());
      resizeObservers.clear();
    };
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let rafId = 0;
    const updateWindowMetrics = () => {
      rafId = 0;
      setScrollY(window.scrollY);
      setViewportHeight(window.innerHeight);
    };

    const handleViewportChange = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateWindowMetrics);
    };

    updateWindowMetrics();

    window.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [enabled]);

  const virtualState = useMemo(() => {
    void layoutVersion;

    if (!enabled || items.length <= VIRTUALIZATION_THRESHOLD || typeof window === 'undefined') {
      return {
        visibleItems: items,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        isVirtualized: false,
      };
    }

    const containerTop = containerRef.current
      ? window.scrollY + containerRef.current.getBoundingClientRect().top
      : 0;
    const relativeScrollTop = Math.max(0, scrollY - containerTop);
    const overscanPx = Math.max(viewportHeight * 1.5, VIRTUALIZATION_DEFAULT_ITEM_HEIGHT * 4);
    const startThreshold = Math.max(0, relativeScrollTop - overscanPx);
    const endThreshold = relativeScrollTop + viewportHeight + overscanPx;

    const itemSizes = items.map((item) => (itemHeightsRef.current[item.id] ?? VIRTUALIZATION_DEFAULT_ITEM_HEIGHT) + VIRTUALIZATION_ITEM_GAP);
    const prefixOffsets = new Array<number>(itemSizes.length + 1);
    prefixOffsets[0] = 0;

    for (let index = 0; index < itemSizes.length; index += 1) {
      prefixOffsets[index + 1] = prefixOffsets[index] + itemSizes[index];
    }

    let startIndex = 0;
    while (startIndex < items.length && prefixOffsets[startIndex + 1] < startThreshold) {
      startIndex += 1;
    }

    let endIndex = startIndex;
    while (endIndex < items.length && prefixOffsets[endIndex] < endThreshold) {
      endIndex += 1;
    }

    startIndex = Math.max(0, startIndex - 2);
    endIndex = Math.min(items.length, endIndex + 2);

    return {
      visibleItems: items.slice(startIndex, endIndex),
      topSpacerHeight: prefixOffsets[startIndex],
      bottomSpacerHeight: prefixOffsets[items.length] - prefixOffsets[endIndex],
      isVirtualized: true,
    };
  }, [enabled, items, layoutVersion, scrollY, viewportHeight]);

  return {
    containerRef,
    measureItem,
    ...virtualState,
  };
}

export default function FeedPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);

  const {
    locale
  } = params;

  const router = useRouter();
  const tFeed = useTranslations('feed');
  const tCommon = useTranslations('common');
  const tProfile = useTranslations('profile');
  const tSettings = useTranslations('settings');
  const tAuth = useTranslations('auth');
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [postTypeFilter, setPostTypeFilter] = useState('all');

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
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
  const warmedRoutesRef = useRef<Set<string>>(new Set());

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
        // Update comment count and refresh comments if expanded
        if (event.data.postId) {
          setPosts(prev => prev.map(post => {
            if (post.id === event.data.postId) {
              return { ...post, commentsCount: post.commentsCount + 1 };
            }
            return post;
          }));
          // Refresh comments in real-time if this post's comments are expanded
          if (event.data.authorId !== user?.id) {
            fetchComments(event.data.postId);
          }
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

  // Batch track post views (1 request instead of N)
  const trackPostViewsBatch = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) return;
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;
      // Best-effort: fire and forget, don't block UI
      fetch(`${FEED_API}/posts/views/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ postIds, source: 'feed' }),
      }).catch(() => {});
    } catch {
      // Silent fail - view tracking shouldn't break UX
    }
  }, []);

  const POSTS_PER_PAGE = 15;

  const fetchPosts = useCallback(async () => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    setLoadingPosts(true);
    setCursor(null);
    try {
      const res = await fetch(`${FEED_API}/posts?limit=${POSTS_PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const newPosts: Post[] = data.data || [];
        setPosts(newPosts);
        // Pagination cursor — support both cursor and offset-style APIs
        const nextCursor = data.nextCursor ?? data.meta?.nextCursor ?? null;
        setCursor(nextCursor);
        setHasMore(!!nextCursor || (newPosts.length === POSTS_PER_PAGE && !nextCursor));
        // Batch view tracking — 1 request instead of 5
        trackPostViewsBatch(newPosts.slice(0, 5).map((p) => p.id));
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [trackPostViewsBatch]);

  const fetchMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const token = TokenManager.getAccessToken();
    if (!token) return;

    setLoadingMore(true);
    try {
      const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
      const res = await fetch(
        `${FEED_API}/posts?limit=${POSTS_PER_PAGE}${cursorParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        const newPosts: Post[] = data.data || [];
        setPosts(prev => [...prev, ...newPosts]);
        const nextCursor = data.nextCursor ?? data.meta?.nextCursor ?? null;
        setCursor(nextCursor);
        setHasMore(!!nextCursor || newPosts.length === POSTS_PER_PAGE);
        trackPostViewsBatch(newPosts.slice(0, 3).map((p) => p.id));
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, cursor, trackPostViewsBatch]);

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

  const prefetchFeedRoute = useCallback((href: string) => {
    if (!href || warmedRoutesRef.current.has(href)) return;
    warmedRoutesRef.current.add(href);
    router.prefetch(href);
  }, [router]);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);

    // Refresh user data from server (localStorage may have stale profile picture)
    const AUTH_API = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;
    
    // Fetch from Auth Service for basic verification and core data
    fetch(`${AUTH_API}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data?.user) {
          const freshUser = { ...userData.user, ...res.data.user };
          setUser(freshUser);
          TokenManager.setUserData(freshUser, res.data.school || userData.school);
        }
      })
      .catch(() => { });

    // Fetch from Feed Service for enriched profile data (like cover photo)
    fetch(`${FEED_API}/users/me/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.profile) {
          setUser((prev: any) => ({ ...prev, ...res.profile }));
        }
      })
      .catch(() => { });
  }, [locale, router]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, fetchPosts]);

  useEffect(() => {
    if (!user) return;

    const staticRoutes = [
      `/${locale}/profile/me`,
      `/${locale}/clubs`,
      `/${locale}/events`,
      `/${locale}/learn`,
      `/${locale}/leaderboard`,
      `/${locale}/live-quiz/join`,
    ];
    const authorRoutes = posts.slice(0, 6).map((post) => `/${locale}/profile/${post.author.id}`);
    const postRoutes = posts.slice(0, 6).map((post) => `/${locale}/feed/post/${post.id}`);
    const clubRoutes = posts
      .map((post) => post.studyClubId ? `/${locale}/clubs/${post.studyClubId}` : null)
      .filter((route): route is string => Boolean(route))
      .slice(0, 4);

    const routesToWarm = Array.from(new Set([
      ...staticRoutes,
      ...authorRoutes,
      ...postRoutes,
      ...clubRoutes,
    ]));

    const warmRoutes = () => {
      routesToWarm.forEach(prefetchFeedRoute);
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(warmRoutes, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmRoutes, 250);
    return () => window.clearTimeout(timeoutId);
  }, [locale, posts, prefetchFeedRoute, user]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;

    const sessionKey = `stunity:feed-destination-data-warmed:${user.id}`;
    if (sessionStorage.getItem(sessionKey) === 'true') return;

    const warmDestinationData = async () => {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      sessionStorage.setItem(sessionKey, 'true');

      const headers = { Authorization: `Bearer ${token}` };
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [
        myClubsRes,
        clubTypesRes,
        discoverClubsRes,
        eventsRes,
        upcomingEventsRes,
        coursesRes,
        enrolledCoursesRes,
        createdCoursesRes,
        learningPathsRes,
        learningStatsRes,
        subjectsRes,
        gradesRes,
      ] = await Promise.allSettled([
        fetch(`${FEED_API}/clubs?limit=20`, { headers }),
        fetch(`${FEED_API}/clubs/types`, { headers }),
        fetch(`${FEED_API}/clubs/discover?limit=20`, { headers }),
        fetch(`${FEED_API}/calendar?limit=20&startAfter=${encodeURIComponent(startOfToday.toISOString())}`, { headers }),
        fetch(`${FEED_API}/calendar/upcoming?limit=5`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/courses`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/courses/my-courses`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/courses/my-created`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/learning-paths/paths`, { headers }),
        fetch(`${LEARN_SERVICE_URL}/courses/stats/my-learning`, { headers }),
        fetch(`${SUBJECT_SERVICE_URL}/subjects?isActive=true`, { headers }),
        user.role === 'STUDENT'
          ? fetch(`${GRADE_SERVICE_URL}/grades/student/${user.id}`, { headers })
          : Promise.resolve(null),
      ]);

      const parseJson = async (result: PromiseSettledResult<Response | null>) => {
        if (result.status !== 'fulfilled' || !result.value || !result.value.ok) return null;
        try {
          return await result.value.json();
        } catch {
          return null;
        }
      };

      const [
        myClubsData,
        clubTypesData,
        discoverClubsData,
        eventsData,
        upcomingEventsData,
        coursesData,
        enrolledCoursesData,
        createdCoursesData,
        learningPathsData,
        learningStatsData,
        subjectsData,
        gradesData,
      ] = await Promise.all([
        parseJson(myClubsRes),
        parseJson(clubTypesRes),
        parseJson(discoverClubsRes),
        parseJson(eventsRes),
        parseJson(upcomingEventsRes),
        parseJson(coursesRes),
        parseJson(enrolledCoursesRes),
        parseJson(createdCoursesRes),
        parseJson(learningPathsRes),
        parseJson(learningStatsRes),
        parseJson(subjectsRes),
        parseJson(gradesRes),
      ]);

      if (myClubsData?.clubs) {
        writeRouteDataCache(
          buildRouteDataCacheKey('clubs', 'my'),
          myClubsData.clubs.map(normalizeWarmClub)
        );
      }
      if (clubTypesData) {
        writeRouteDataCache(buildRouteDataCacheKey('clubs', 'types'), clubTypesData);
      }
      if (discoverClubsData?.clubs) {
        writeRouteDataCache(
          buildRouteDataCacheKey('clubs', 'discover', 'all', 'all'),
          discoverClubsData.clubs.map(normalizeWarmClub)
        );
      }
      if (eventsData?.events) {
        writeRouteDataCache(
          buildRouteDataCacheKey('events', 'list', 'upcoming', 'all', 'all'),
          eventsData.events
        );
      }
      if (upcomingEventsData) {
        writeRouteDataCache(buildRouteDataCacheKey('events', 'upcoming'), upcomingEventsData);
      }

      writeRouteDataCache(buildRouteDataCacheKey('learn', 'hub', user.id), {
        courses: coursesData?.courses || [],
        enrolledCourses: enrolledCoursesData?.courses || [],
        createdCourses: createdCoursesData?.courses || [],
        learningPaths: learningPathsData?.paths || [],
        subjects: Array.isArray(subjectsData) ? subjectsData : [],
        myGrades: gradesData?.grades || gradesData || [],
        stats: {
          enrolledCourses: Number(learningStatsData?.enrolledCourses ?? enrolledCoursesData?.courses?.length ?? 0),
          completedCourses: Number(learningStatsData?.completedCourses ?? enrolledCoursesData?.courses?.filter((course: any) => course.progress === 100).length ?? 0),
          hoursLearned: Number(learningStatsData?.hoursLearned ?? 28),
          currentStreak: Number(learningStatsData?.currentStreak ?? 7),
          certificates: 1,
        },
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        warmDestinationData().catch(() => {
          sessionStorage.removeItem(sessionKey);
        });
      }, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => {
      warmDestinationData().catch(() => {
        sessionStorage.removeItem(sessionKey);
      });
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [user]);

  // Infinite scroll: trigger fetchMorePosts when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingPosts) {
          fetchMorePosts();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingPosts, fetchMorePosts]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'posts') {
      fetchMyPosts();
    } else if (activeTab === 'bookmarks') {
      fetchBookmarks();
    }
  }, [activeTab, user, fetchMyPosts, fetchBookmarks]);

  const handleLogout = async () => {
    await TokenManager.logout();
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
        quizData: data.quizData,
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

  const handleRepost = async (postId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/posts/${postId}/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'REPOST' })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p
        ));
        fetchPosts();
      }
    } catch (error) {
      console.error('Repost error:', error);
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Check if current user liked a post
  const isPostLiked = (post: Post) => {
    if (post.isLikedByMe !== undefined) return post.isLikedByMe;
    if (post.isLiked !== undefined) return post.isLiked;
    return post.likes?.some(like => like.userId === user?.id) || false;
  };

  const selectedFilter = POST_TYPE_FILTERS.find((f) => f.id === postTypeFilter) || POST_TYPE_FILTERS[0];
  const selectedFilterLabel = tFeed(selectedFilter.labelKey);
  const filteredFeedPosts = useMemo(
    () => posts.filter((post) => postTypeFilter === 'all' || post.postType === postTypeFilter),
    [postTypeFilter, posts]
  );
  const feedVirtualizer = useVirtualizedFeedList(
    filteredFeedPosts,
    activeTab === 'feed'
  );

  // Show skeleton layout immediately for perceived performance
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 scrollbar-hide">
        <UnifiedNavigation />
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Sidebar Skeleton */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-20 space-y-3">
                <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-[28rem] animate-pulse" />
                <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-48 animate-pulse" />
              </div>
            </aside>

            {/* Center Main Feed Skeleton */}
            <main className="lg:col-span-6 space-y-3">
              <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-24 animate-pulse" />
              <div className="bg-white dark:bg-gray-900/80 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 h-16 animate-pulse" />
              <FeedSkeletonList count={3} />
            </main>

            {/* Right Sidebar Skeleton */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-20 space-y-4">
                <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-64 animate-pulse" />
                <div className="bg-white dark:bg-gray-900/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-64 animate-pulse" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const handleViewAnalytics = (postId: string) => {
    setSelectedPostForAnalytics(postId);
    setShowAnalyticsModal(true);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return tProfile('roles.admin');
      case 'SUPER_ADMIN':
        return tProfile('roles.superAdmin');
      case 'TEACHER':
        return tProfile('roles.teacher');
      case 'STUDENT':
        return tProfile('roles.student');
      case 'STAFF':
        return tProfile('roles.staff');
      default:
        return role?.toLowerCase().replace('_', ' ') || tCommon('unknown');
    }
  };
  const viewProfileLabel = (() => {
    const translated = tProfile('viewProfile');
    return translated === 'profile.viewProfile'
      ? `${tCommon('view')} ${tCommon('profile')}`
      : translated;
  })();
  const tabs = [
    { id: 'feed', label: tFeed('tabs.feed'), icon: TrendingUp },
    { id: 'posts', label: tFeed('tabs.myPosts'), icon: BookOpen },
    { id: 'insights', label: tFeed('tabs.insights'), icon: BarChart3 },
    { id: 'activity', label: tFeed('tabs.activity'), icon: Activity },
    { id: 'bookmarks', label: tFeed('tabs.saved'), icon: Bookmark },
  ];

  const sidebarTabs = [
    { id: 'feed', label: tFeed('tabs.feed'), icon: TrendingUp },
    { id: 'bookmarks', label: tFeed('tabs.saved'), icon: Bookmark },
    { id: 'posts', label: tFeed('tabs.myPosts'), icon: BookOpen },
    { id: 'insights', label: tFeed('tabs.analytics'), icon: BarChart3 },
    { id: 'activity', label: tFeed('tabs.activity'), icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-none dark:bg-gray-950 scrollbar-hide text-gray-900 dark:text-gray-100">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      {/* LinkedIn-style 3-column layout - cleaner proportions */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left Sidebar - Compact Profile & Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-3">
              {/* Profile Card - Education-Focused Design */}
              <div className="bg-white dark:bg-none dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-hidden hover:shadow-lg dark:hover:shadow-black/20">
                {/* Cover - Gradient with role-based accent */}
                <div className="h-32 relative overflow-hidden">
                  {user.coverPhotoUrl ? (
                    <NextImage
                      src={user.coverPhotoUrl}
                      alt=""
                      fill
                      sizes="(max-width:1024px) 0px, 25vw"
                      className="object-cover"
                      priority={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#F9A825] via-[#FFB74D] to-[#F9A825]">
                      {/* Decorative education icons - only show on gradient fallback */}
                      <div className="absolute inset-0 opacity-15">
                        <GraduationCap className="absolute top-2 left-3 w-6 h-6 text-white" />
                        <BookOpen className="absolute top-3 right-4 w-5 h-5 text-white" />
                        <Award className="absolute bottom-2 left-1/3 w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar - Centered, overlapping cover */}
                <div className="flex justify-center -mt-8 relative z-10">
                  {user.profilePictureUrl ? (
                    <NextImage
                      src={user.profilePictureUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover border-3 border-white dark:border-gray-900 shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white text-xl font-bold border-3 border-white dark:border-gray-900 shadow-lg">
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                  )}
                </div>

                {/* User Info - Centered */}
                <div className="text-center px-4 pt-2 pb-3">
                  <Link href={`/${locale}/profile/me`} className="hover:underline">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{user.firstName} {user.lastName}</h3>
                  </Link>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && <Settings className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'TEACHER' && <GraduationCap className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'STUDENT' && <BookOpen className="w-3 h-3 text-[#F9A825]" />}
                    {user.role === 'STAFF' && <Users className="w-3 h-3 text-[#F9A825]" />}
                    <span className="text-xs text-[#F9A825] font-medium">
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  <Link
                    href={`/${locale}/profile/me`}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <User className="w-3 h-3" />
                    {viewProfileLabel}
                  </Link>
                </div>

                {/* Education Metrics - 2x2 Grid */}
                <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Engagement Score */}
                    <button
                      onClick={() => setActiveTab('insights')}
                      className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-lg p-2.5 text-center group hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{posts.reduce((sum, p) => sum + (p.likesCount || 0), 0)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{tFeed('profileMetrics.engagement')}</p>
                    </button>

                    {/* Impact Score - Role-based */}
                    <button
                      onClick={() => setActiveTab('activity')}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg p-2.5 text-center group hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Target className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {user.role === 'TEACHER' ? Math.floor(posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) * 1.5) :
                            (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? Math.floor((myPosts.length || 0) * 2.5) :
                              posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.role === 'TEACHER'
                          ? tFeed('profileMetrics.impact')
                          : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
                            ? tFeed('profileMetrics.reach')
                            : tFeed('profileMetrics.learning')}
                      </p>
                    </button>

                    {/* Contributions */}
                    <button
                      onClick={() => setActiveTab('posts')}
                      className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-lg p-2.5 text-center group hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{myPosts.length || 0}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.role === 'TEACHER'
                          ? tFeed('profileMetrics.lessons')
                          : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
                            ? tFeed('profileMetrics.updates')
                            : tFeed('profileMetrics.shares')}
                      </p>
                    </button>

                    {/* Achievement/Level */}
                    <button
                      onClick={() => setActiveTab('insights')}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg p-2.5 text-center group hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {user.role === 'TEACHER'
                            ? tFeed('profileMetrics.expert')
                            : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
                              ? tFeed('profileMetrics.leader')
                              : user.role === 'STUDENT'
                                ? tFeed('profileMetrics.rising')
                                : tFeed('profileMetrics.active')}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.role === 'TEACHER'
                          ? tFeed('profileMetrics.educator')
                          : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
                            ? tFeed('profileMetrics.role')
                            : user.role === 'STUDENT'
                              ? tFeed('profileMetrics.star')
                              : tFeed('profileMetrics.status')}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex items-center justify-between text-[10px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>
                      {tFeed('profileMetrics.viewsThisWeek', { count: posts.length * 12 + myPosts.length * 5 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">+{Math.min(15, Math.max(5, (myPosts.length || 1) + (posts.length % 10)))}%</span>
                  </div>
                </div>
              </div>

              {/* Quick Links - Minimal */}
              <div className="bg-white dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-hidden">
                <nav className="py-1">
                  {sidebarTabs.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${activeTab === item.id
                          ? 'bg-amber-50 dark:bg-amber-900/30 text-[#F9A825] font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800'
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium text-xs transition-all whitespace-nowrap ${activeTab === tab.id
                      ? 'bg-[#F9A825] text-white'
                      : 'bg-white dark:bg-none dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Performance Card - XP, Level, Streak */}
            <div className="mb-3 transform hover:scale-[1.01] transition-transform duration-300">
              <PerformanceCard user={user} locale={locale} />
            </div>

            {/* Create Post Box - LinkedIn Style */}
            <div className="bg-white dark:bg-none dark:bg-gray-900/80 backdrop-blur-xl rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-3 mb-3 transition-all duration-300 hover:border-[#F9A825]/30">
              <div className="flex items-center gap-3">
                {user.profilePictureUrl ? (
                  <NextImage
                    src={user.profilePictureUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                )}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 text-left px-4 py-2.5 bg-gray-50 dark:bg-none dark:bg-gray-800/50 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-none dark:bg-gray-800 dark:hover:bg-gray-700/80 transition-all duration-300 text-sm border border-gray-200 dark:border-gray-700/50"
                >
                  {tFeed('createPost.askMind')}
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-medium hidden sm:inline">{tFeed('createPost.photo')}</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-medium hidden sm:inline">{tFeed('poll')}</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <Megaphone className="w-5 h-5 text-rose-500" />
                  <span className="text-xs font-medium hidden sm:inline">{tFeed('createPost.announce')}</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <HelpCircle className="w-5 h-5 text-teal-500" />
                  <span className="text-xs font-medium hidden sm:inline">{tFeed('ask')}</span>
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${postTypeFilter !== 'all'
                        ? 'bg-amber-50 dark:bg-amber-900/30 border-[#F9A825] text-[#F9A825]'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {selectedFilterLabel}
                      </span>
                    </button>

                    {showFilters && (
                      <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        {POST_TYPE_FILTERS.map((filter) => {
                          const Icon = filter.icon;
                          return (
                            <button
                              key={filter.id}
                              onClick={() => {
                                setPostTypeFilter(filter.id);
                                setShowFilters(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors ${postTypeFilter === filter.id ? 'bg-gradient-to-r from-amber-50 to-[#F9A825]/10 dark:from-amber-900/20 dark:to-[#F9A825]/20 border-l-2 border-[#F9A825]' : ''
                                }`}
                            >
                              <Icon className={`w-4 h-4 ${postTypeFilter === filter.id ? 'text-[#F9A825]' : 'text-gray-500 dark:text-gray-400'}`} />
                              <span className={`text-sm ${postTypeFilter === filter.id ? 'text-[#F9A825] font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                {tFeed(filter.labelKey)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={fetchPosts}
                    disabled={loadingPosts}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#F9A825] hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-all duration-200"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingPosts ? 'animate-spin' : ''}`} />
                    {tFeed('actions.refresh')}
                  </button>

                  {/* Real-time connection indicator */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${isConnected
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                    {isConnected ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        <span className="hidden sm:inline">{tFeed('connection.live')}</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        <span className="hidden sm:inline">{tFeed('connection.offline')}</span>
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
                      {newPostsAvailable === 1
                        ? tFeed('connection.oneNewPost')
                        : tFeed('connection.manyNewPosts', { count: newPostsAvailable })}
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
                  <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-10 h-10 text-[#F9A825]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{tFeed('empty.welcomeTitle')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">{tFeed('empty.welcomeMessage')}</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#F9A825] to-[#FFB74D] text-white rounded-full font-semibold hover:from-[#E89A1E] hover:to-[#FF9800] transition-all shadow-lg shadow-emerald-200 transform hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                      {tFeed('empty.createFirstPost')}
                    </button>
                  </div>
                )}

                {/* Posts List with virtualization for large scroll sessions */}
                <div ref={feedVirtualizer.containerRef}>
                  {feedVirtualizer.isVirtualized && feedVirtualizer.topSpacerHeight > 0 && (
                    <div style={{ height: `${feedVirtualizer.topSpacerHeight}px` }} aria-hidden="true" />
                  )}

                  <div className="space-y-3">
                    {feedVirtualizer.visibleItems.map((post, index) => (
                      <div
                        key={post.id}
                        ref={feedVirtualizer.measureItem(post.id)}
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
                            quizData: post.quizData || (post.quiz ? {
                              questions: post.quiz.questions,
                              timeLimit: post.quiz.timeLimit,
                              passingScore: post.quiz.passingScore,
                            } : undefined),
                            userAttempt: post.userAttempt || post.quiz?.userAttempt || undefined,
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
                          onRepost={handleRepost}
                          onEdit={handleEditPost}
                          onDelete={handleDeletePost}
                          onViewAnalytics={handleViewAnalytics}
                          currentUserId={user?.id}
                        />
                      </div>
                    ))}
                  </div>

                  {feedVirtualizer.isVirtualized && feedVirtualizer.bottomSpacerHeight > 0 && (
                    <div style={{ height: `${feedVirtualizer.bottomSpacerHeight}px` }} aria-hidden="true" />
                  )}
                </div>

                {/* Infinite scroll sentinel + load-more indicator */}
                {activeTab === 'feed' && (
                  <>
                    <div ref={sentinelRef} className="h-1" aria-hidden="true" />
                    {loadingMore && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-[#F9A825]" />
                      </div>
                    )}
                  </>
                )}

                {/* Empty Filter State */}
                {!loadingPosts && posts.length > 0 && filteredFeedPosts.length === 0 && (
                  <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center">
                      <Filter className="w-8 h-8 text-[#F9A825]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {tFeed('empty.noPostsForFilter', { filter: selectedFilterLabel })}
                    </h3>
                    <p className="text-gray-600 mb-4">{tFeed('empty.tryDifferentFilter')}</p>
                    <button
                      onClick={() => setPostTypeFilter('all')}
                      className="text-[#F9A825] hover:text-[#E89A1E] font-medium"
                    >
                      {tFeed('empty.showAllPosts')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* My Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {myPosts.length === 0 ? (
                  <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[#F9A825]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{tFeed('empty.noMyPosts')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{tFeed('empty.shareFirstPost')}</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#F9A825] to-[#FFB74D] text-white rounded-full font-semibold hover:from-[#E89A1E] hover:to-[#FF9800] transition-all shadow-lg shadow-emerald-200 transform hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                      {tFeed('createPost.title')}
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
                          quizData: post.quizData || (post.quiz ? {
                            questions: post.quiz.questions,
                            timeLimit: post.quiz.timeLimit,
                            passingScore: post.quiz.passingScore,
                          } : undefined),
                          userAttempt: post.userAttempt || post.quiz?.userAttempt || undefined,
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
                        onRepost={handleRepost}
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
                  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-10 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 dark:from-amber-900/40 to-yellow-100 dark:to-yellow-900/40 flex items-center justify-center">
                      <Bookmark className="w-10 h-10 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{tFeed('empty.noSavedPosts')}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{tFeed('empty.savedPostsHint')}</p>
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
                          quizData: post.quizData || (post.quiz ? {
                            questions: post.quiz.questions,
                            timeLimit: post.quiz.timeLimit,
                            passingScore: post.quiz.passingScore,
                          } : undefined),
                          userAttempt: post.userAttempt || post.quiz?.userAttempt || undefined,
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
                        onRepost={handleRepost}
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
              <div className="text-xs text-gray-400 dark:text-gray-500 px-2 pt-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <a href="#" className="hover:text-[#F9A825] transition-colors">{tSettings('about')}</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">{tSettings('helpCenter')}</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">{tAuth('privacyPolicy')}</a>
                  <a href="#" className="hover:text-[#F9A825] transition-colors">{tAuth('termsOfService')}</a>
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
