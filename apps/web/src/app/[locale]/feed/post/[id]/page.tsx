'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import EducationalValueModal, { EducationalValue } from '@/components/feed/EducationalValueModal';
import ReactionButton from '@/components/feed/ReactionButton';
import ReactionSummary from '@/components/feed/ReactionSummary';
import ShareSheet from '@/components/feed/ShareSheet';
import RepostComposerModal from '@/components/feed/RepostComposerModal';
import { readPostDetailCache, writePostDetailCache } from '@/lib/post-detail-cache';
import {
  applyReactionOptimistic,
  type ReactionType,
} from '@/lib/feed-reactions';
import {
  ArrowLeft,
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
  CheckCircle,
  Calendar,
  Diamond,
  Repeat2,
  BadgeCheck,
} from 'lucide-react';

interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl: string | null;
  role: string;
  professionalTitle?: string;
}

interface Post {
  id: string;
  title?: string;
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
  sharesCount?: number;
  viewsCount?: number;
  isLikedByMe: boolean;
  myReaction?: string | null;
  reactionCounts?: Record<string, number>;
  isValuedByMe?: boolean;
  isBookmarkedByMe?: boolean;
  isBookmarked?: boolean;
  studyClubId?: string | null;
  resourceUrl?: string | null;
  resourceType?: string | null;
  questionBounty?: number;
  assignmentDueDate?: string | null;
  assignmentPoints?: number | null;
  courseCode?: string | null;
  courseLevel?: string | null;
  examDate?: string | null;
  examDuration?: number | null;
  examTotalPoints?: number | null;
  examPassingScore?: number | null;
  announcementUrgency?: string | null;
  tutorialDifficulty?: string | null;
  projectStatus?: string | null;
  projectDeadline?: string | null;
  researchField?: string | null;
  topicTags?: string[];
  repostOfId?: string | null;
  repostComment?: string | null;
  repostOf?: {
    id: string;
    title?: string;
    content: string;
    postType?: string;
    mediaUrls?: string[];
    createdAt?: string;
    author: PostAuthor;
  } | null;
  author: PostAuthor;
  pollOptions?: Array<{
    id: string;
    text: string;
    _count?: { votes: number };
    votes?: number;
  }>;
  userVotedOptionId?: string;
  quiz?: {
    id: string;
    questions?: unknown[];
    timeLimit?: number;
    passingScore?: number;
    userAttempt?: { score: number; passed: boolean } | null;
  };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  likesCount?: number;
  isLiked?: boolean;
  isVerifiedAnswer?: boolean;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };
  replies?: Comment[];
  _count?: { replies?: number };
}

function normalizeDetailPost(raw: any): Post {
  return {
    ...raw,
    isBookmarkedByMe: Boolean(raw.isBookmarkedByMe ?? raw.isBookmarked),
    myReaction: raw.myReaction ?? null,
    reactionCounts: raw.reactionCounts ?? {},
    isLikedByMe: Boolean(raw.isLikedByMe ?? raw.myReaction),
    pollOptions: Array.isArray(raw.pollOptions)
      ? raw.pollOptions.map((o: any) => ({
          ...o,
          _count: o._count || { votes: o.votes ?? 0 },
        }))
      : raw.pollOptions,
  };
}

function displayName(author?: { firstName?: string; lastName?: string } | null) {
  if (!author) return '';
  return (
    `${author.lastName || ''} ${author.firstName || ''}`.trim() ||
    `${author.firstName || ''} ${author.lastName || ''}`.trim()
  );
}

const FEED_API = FEED_SERVICE_URL;

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

const POST_TYPE_CONFIG: Record<string, { icon: any; color: string; labelKey: string; gradient: string }> = {
  ARTICLE: { icon: FileText, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', labelKey: 'postTypes.article', gradient: 'from-emerald-500 to-green-600' },
  POLL: { icon: BarChart3, color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', labelKey: 'postTypes.poll', gradient: 'from-violet-500 to-purple-600' },
  ANNOUNCEMENT: { icon: Megaphone, color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', labelKey: 'postTypes.announcement', gradient: 'from-rose-500 to-pink-600' },
  QUESTION: { icon: HelpCircle, color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', labelKey: 'postTypes.question', gradient: 'from-teal-500 to-cyan-600' },
  ACHIEVEMENT: { icon: Award, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', labelKey: 'postTypes.achievement', gradient: 'from-amber-500 to-yellow-500' },
  TUTORIAL: { icon: BookOpen, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', labelKey: 'postTypes.tutorial', gradient: 'from-blue-500 to-indigo-500' },
  RESOURCE: { icon: FolderOpen, color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', labelKey: 'postTypes.resource', gradient: 'from-indigo-500 to-violet-500' },
  PROJECT: { icon: Rocket, color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', labelKey: 'postTypes.project', gradient: 'from-orange-500 to-red-500' },
  RESEARCH: { icon: Microscope, color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', labelKey: 'postTypes.research', gradient: 'from-cyan-500 to-teal-500' },
  COLLABORATION: { icon: UsersRound, color: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300', labelKey: 'postTypes.collaboration', gradient: 'from-pink-500 to-rose-500' },
  QUIZ: { icon: HelpCircle, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', labelKey: 'postTypes.quiz', gradient: 'from-purple-500 to-fuchsia-600' },
  COURSE: { icon: BookOpen, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', labelKey: 'postTypes.course', gradient: 'from-emerald-500 to-green-500' },
  EXAM: { icon: FileText, color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300', labelKey: 'postTypes.exam', gradient: 'from-red-500 to-rose-600' },
  ASSIGNMENT: { icon: FileText, color: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', labelKey: 'postTypes.assignment', gradient: 'from-sky-500 to-blue-500' },
  REFLECTION: { icon: FileText, color: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300', labelKey: 'postTypes.reflection', gradient: 'from-slate-500 to-gray-600' },
  CLUB_CREATED: { icon: Users, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', labelKey: 'postTypes.studyClub', gradient: 'from-purple-500 to-violet-600' },
  EVENT_CREATED: { icon: Calendar, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', labelKey: 'postTypes.event', gradient: 'from-amber-500 to-orange-500' },
};

function Avatar({
  url,
  name,
  size = 48,
  gradient = 'from-amber-400 to-orange-500',
}: {
  url?: string | null;
  name: string;
  size?: number;
  gradient?: string;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} text-white font-semibold flex items-center justify-center shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials}
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const tFeed = useTranslations('feed');
  const postId = params?.id as string;
  const locale = (params?.locale as string) || 'en';

  const cachedSeed = useMemo(() => {
    const seed = postId ? readPostDetailCache<Post>(postId) : null;
    return seed ? normalizeDetailPost(seed) : null;
  }, [postId]);

  const [post, setPost] = useState<Post | null>(cachedSeed);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingPost, setLoadingPost] = useState(!cachedSeed);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostToast, setRepostToast] = useState(false);
  const [showValueModal, setShowValueModal] = useState(false);
  const [isValueSubmitting, setIsValueSubmitting] = useState(false);
  const [commentSort, setCommentSort] = useState<'newest' | 'top'>('newest');

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!showActions) return;
    const onDoc = (e: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowActions(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [showActions]);

  // Progressive load: paint cache → revalidate post → comments in parallel
  useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    const seed = readPostDetailCache<Post>(postId);
    if (seed) {
      setPost(normalizeDetailPost(seed));
      setLoadingPost(false);
    } else {
      setLoadingPost(true);
    }
    setLoadingComments(true);
    setCommentsPage(1);
    setCommentsHasMore(false);
    setError(null);

    const token = TokenManager.getAccessToken();

    const loadPost = async () => {
      try {
        const res = await fetch(`${FEED_API}/posts/${postId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Post not found');
        const data = await res.json();
        if (cancelled) return;
        if (data?.data) {
          const normalized = normalizeDetailPost(data.data);
          setPost(normalized);
          writePostDetailCache(postId, normalized);
        }
      } catch (err: any) {
        if (!cancelled && !seed) setError(err?.message || 'Failed to load post');
      } finally {
        if (!cancelled) setLoadingPost(false);
      }
    };

    const loadComments = async () => {
      try {
        const res = await fetch(`${FEED_API}/posts/${postId}/comments?page=1&limit=20`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!cancelled) {
          setComments(Array.isArray(data?.data) ? data.data : []);
          setCommentsHasMore(Boolean(data?.pagination?.hasMore));
          setCommentsPage(1);
        }
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    };

    void loadPost();
    void loadComments();

    if (token) {
      fetch(`${FEED_API}/posts/${postId}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleReact = async (type: ReactionType) => {
    if (!post) return;
    const snapshot = {
      myReaction: post.myReaction ?? null,
      isLikedByMe: post.isLikedByMe,
      likesCount: post.likesCount,
      reactionCounts: { ...(post.reactionCounts || {}) },
    };
    const next = applyReactionOptimistic({
      prevReaction: post.myReaction,
      nextType: type,
      likesCount: post.likesCount,
      reactionCounts: post.reactionCounts,
    });
    setPost((p) => (p ? { ...p, ...next } : null));

    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${post.id}/react`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error('react failed');
      const data = await res.json();
      setPost((p) =>
        p
          ? {
              ...p,
              myReaction: data.myReaction ?? null,
              isLikedByMe: Boolean(data.myReaction),
            }
          : null,
      );
    } catch {
      setPost((p) => (p ? { ...p, ...snapshot } : null));
    }
  };

  const handleSubmitValue = async (value: EducationalValue) => {
    if (!post) return;
    const token = TokenManager.getAccessToken();
    if (!token) return;
    setIsValueSubmitting(true);
    try {
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${post.id}/value`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accuracy: value.accuracy,
          helpfulness: value.helpfulness,
          clarity: value.clarity,
          depth: value.depth,
          difficulty: value.difficulty,
          wouldRecommend: value.recommend,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPost((p) =>
            p
              ? { ...p, isValuedByMe: true, valuesCount: (p.valuesCount || 0) + (p.isValuedByMe ? 0 : 1) }
              : null,
          );
          setShowValueModal(false);
        }
      }
    } finally {
      setIsValueSubmitting(false);
    }
  };

  const handleBookmark = async () => {
    if (!post) return;
    const prev = Boolean(post.isBookmarkedByMe);
    setPost((p) => (p ? { ...p, isBookmarkedByMe: !prev } : null));
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${post.id}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPost((p) => (p ? { ...p, isBookmarkedByMe: data.bookmarked } : null));
      }
    } catch {
      setPost((p) => (p ? { ...p, isBookmarkedByMe: prev } : null));
    }
  };

  const handleVote = async (optionId: string) => {
    if (!post || post.userVotedOptionId) return;
    const snapshot = {
      userVotedOptionId: post.userVotedOptionId,
      pollOptions: post.pollOptions?.map((o) => ({ ...o, _count: o._count ? { ...o._count } : o._count })),
    };
    setPost((p) => {
      if (!p) return null;
      return {
        ...p,
        userVotedOptionId: optionId,
        pollOptions: p.pollOptions?.map((opt) => {
          const prevVotes = opt._count?.votes ?? opt.votes ?? 0;
          const nextVotes = opt.id === optionId ? prevVotes + 1 : prevVotes;
          return {
            ...opt,
            votes: nextVotes,
            _count: { votes: nextVotes },
          };
        }),
      };
    });
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${post.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('vote failed');
    } catch {
      setPost((p) => (p ? { ...p, ...snapshot } : null));
    }
  };

  const shareUrl = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/${locale}/feed/post/${postId}` : `/${locale}/feed/post/${postId}`),
    [locale, postId],
  );

  const trackShare = useCallback(async () => {
    if (!post) return;
    try {
      const token = TokenManager.getAccessToken();
      await fetch(`${FEED_SERVICE_URL}/posts/${post.id}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setPost((p) => (p ? { ...p, sharesCount: (p.sharesCount || 0) + 1 } : null));
    } catch {
      // ignore analytics failures
    }
  }, [post]);

  const loadMoreComments = async () => {
    if (!post || loadingMoreComments || !commentsHasMore) return;
    setLoadingMoreComments(true);
    try {
      const token = TokenManager.getAccessToken();
      const nextPage = commentsPage + 1;
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${post.id}/comments?page=${nextPage}&limit=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const batch = Array.isArray(data?.data) ? data.data : [];
      setComments((prev) => [...prev, ...batch]);
      setCommentsPage(nextPage);
      setCommentsHasMore(Boolean(data?.pagination?.hasMore));
    } finally {
      setLoadingMoreComments(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;
    setSubmitting(true);
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
          parentId: replyTo?.id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const created = data.data as Comment;
        if (replyTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyTo.id
                ? { ...c, replies: [...(c.replies || []), { ...created, likesCount: 0, isLiked: false }] }
                : c,
            ),
          );
        } else {
          setComments((prev) => [{ ...created, likesCount: 0, isLiked: false, replies: [] }, ...prev]);
        }
        setPost((p) => (p ? { ...p, commentsCount: p.commentsCount + 1 } : null));
        setNewComment('');
        setReplyTo(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentLike = async (commentId: string, parentId?: string) => {
    const applyLocal = (list: Comment[]): Comment[] =>
      list.map((c) => {
        if (c.id === commentId) {
          const liked = !c.isLiked;
          return {
            ...c,
            isLiked: liked,
            likesCount: Math.max(0, (c.likesCount || 0) + (liked ? 1 : -1)),
          };
        }
        if (c.replies?.length) {
          return { ...c, replies: applyLocal(c.replies) };
        }
        return c;
      });

    setComments((prev) => applyLocal(prev));
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${FEED_SERVICE_URL}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) {
              return { ...c, isLiked: data.isLiked, likesCount: data.likesCount };
            }
            if (parentId && c.id === parentId && c.replies) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId ? { ...r, isLiked: data.isLiked, likesCount: data.likesCount } : r,
                ),
              };
            }
            return c;
          }),
        );
      }
    } catch {
      setComments((prev) => applyLocal(prev)); // revert toggle
    }
  };

  const handleVerifyAnswer = async (commentId: string) => {
    if (!post) return;
    setVerifyingId(commentId);
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${post.id}/comments/${commentId}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => ({
            ...c,
            isVerifiedAnswer: c.id === commentId ? true : c.isVerifiedAnswer,
          })),
        );
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm(tFeed('postCard.deleteDescription'))) return;
    const token = TokenManager.getAccessToken();
    const res = await fetch(`${FEED_SERVICE_URL}/posts/${post.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) router.push(`/${locale}/feed`);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return tFeed('postCard.time.justNow');
    if (mins < 60) return tFeed('postCard.time.minutesAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return tFeed('postCard.time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return tFeed('postCard.time.daysAgo', { count: days });
    return d.toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  const sortedComments = useMemo(() => {
    const list = [...comments];
    list.sort((a, b) => {
      if (post?.postType === 'QUESTION') {
        const verifiedDiff = Number(Boolean(b.isVerifiedAnswer)) - Number(Boolean(a.isVerifiedAnswer));
        if (verifiedDiff !== 0) return verifiedDiff;
      }
      if (commentSort === 'top') {
        const likeDiff = (b.likesCount || 0) - (a.likesCount || 0);
        if (likeDiff !== 0) return likeDiff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [comments, commentSort, post?.postType]);

  if (error && !post) {
    return (
      <div className="min-h-screen bg-[#F3F2EF] dark:bg-gray-950 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-500 font-medium text-center">{error}</p>
        <Link href={`/${locale}/feed`} className="text-[#0A66C2] hover:underline flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-4 h-4" /> {tFeed('postDetail.backToFeed')}
        </Link>
      </div>
    );
  }

  const typeConfig = post ? POST_TYPE_CONFIG[post.postType] || POST_TYPE_CONFIG.ARTICLE : null;
  const TypeIcon = typeConfig?.icon || FileText;
  const VisibilityIcon = post ? getVisibilityIcon(post.visibility) : Globe;
  const isAuthor = currentUserId === post?.author?.id;
  const totalVotes = post?.pollOptions?.reduce((sum, o) => sum + (o._count?.votes ?? o.votes ?? 0), 0) || 0;
  const authorName = post ? displayName(post.author) : '';
  const authorHeadline = post?.author.professionalTitle || post?.author.role?.replace(/_/g, ' ') || '';
  const canRepost = Boolean(post && currentUserId && currentUserId !== post.author.id);

  return (
    <div className="min-h-screen bg-[#F3F2EF] dark:bg-gray-950">
      {/* Sticky chrome */}
      <header className="sticky top-0 z-20 border-b border-black/[0.06] dark:border-white/10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
        <div className="max-w-[680px] mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-2.5 py-1.5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm hidden sm:inline">{t('back')}</span>
          </button>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {tFeed('detail.title')}
          </h1>
          {isAuthor && post ? (
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setShowActions((v) => !v)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              {showActions && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-black/5 dark:border-white/10 overflow-hidden z-30">
                  <Link
                    href={`/${locale}/feed/post/${post.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setShowActions(false)}
                  >
                    <Edit2 className="w-4 h-4" /> {tFeed('postCard.menu.editPost')}
                  </Link>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      setShowShareSheet(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Share2 className="w-4 h-4" /> {tFeed('postCard.shareLink')}
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      void handleBookmark();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Bookmark className="w-4 h-4" />{' '}
                    {post.isBookmarkedByMe ? tFeed('postCard.menu.unsave') : tFeed('postDetail.save')}
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      void handleDelete();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" /> {t('delete')}
                  </button>
                </div>
              )}
            </div>
          ) : post ? (
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setShowActions((v) => !v)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              {showActions && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-black/5 dark:border-white/10 overflow-hidden z-30">
                  <button
                    onClick={() => {
                      setShowActions(false);
                      setShowShareSheet(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Share2 className="w-4 h-4" /> {tFeed('postCard.shareLink')}
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      void handleBookmark();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Bookmark className="w-4 h-4" />{' '}
                    {post.isBookmarkedByMe ? tFeed('postCard.menu.unsave') : tFeed('postDetail.save')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-3 sm:px-4 py-4 space-y-3 pb-24">
        {loadingPost && !post ? (
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-black/5 dark:border-white/5 overflow-hidden animate-pulse">
            <div className="p-4 flex gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800/80" />
              </div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3.5 w-full rounded bg-gray-100 dark:bg-gray-800/80" />
            </div>
            <div className="h-48 bg-gray-100 dark:bg-gray-800/60" />
          </div>
        ) : null}

        {post && (
          <article className="rounded-xl bg-white dark:bg-gray-900 border border-black/[0.06] dark:border-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.02)] overflow-hidden">
            {/* Author */}
            <div className="p-4 pb-3 flex items-start gap-3">
              <Link href={`/${locale}/profile/${post.author.id}`} className="shrink-0">
                <Avatar
                  url={post.author.profilePictureUrl}
                  name={authorName}
                  size={48}
                  gradient={typeConfig?.gradient || 'from-amber-400 to-orange-500'}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/${locale}/profile/${post.author.id}`}
                    className="font-semibold text-[15px] text-gray-900 dark:text-white hover:text-[#0A66C2] hover:underline truncate"
                  >
                    {authorName}
                  </Link>
                  {post.postType !== 'ARTICLE' && typeConfig && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${typeConfig.color}`}>
                      <TypeIcon className="w-3 h-3" />
                      {tFeed(typeConfig.labelKey)}
                    </span>
                  )}
                </div>
                {authorHeadline ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{authorHeadline}</p>
                ) : null}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span>{formatDate(post.createdAt)}</span>
                  <span>·</span>
                  <VisibilityIcon className="w-3 h-3" />
                  {loadingPost ? (
                    <span className="inline-flex items-center gap-1 text-[#0A66C2]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 pb-3">
              {post.title ? (
                <h2 className="text-[20px] leading-snug font-semibold text-gray-900 dark:text-white mb-2">
                  {post.title}
                </h2>
              ) : null}
              {!!post.content?.trim() && !['EVENT_CREATED', 'CLUB_CREATED'].includes(post.postType) ? (
                <p className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                  {post.content}
                </p>
              ) : null}
              {['EVENT_CREATED', 'CLUB_CREATED'].includes(post.postType) && !!post.content?.trim() && !post.title ? (
                <p className="text-[15px] font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
                  {post.content.split('\n')[0]}
                </p>
              ) : null}

              {/* Type meta chips */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {post.postType === 'QUESTION' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    (post.commentsCount || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                  }`}>
                    {(post.commentsCount || 0) > 0 ? tFeed('answered') : tFeed('awaitingAnswer')}
                  </span>
                )}
                {!!post.questionBounty && post.questionBounty > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">
                    <Diamond className="w-3.5 h-3.5" />
                    {post.questionBounty} {tFeed('bounty')}
                  </span>
                )}
                {post.postType === 'QUIZ' && post.quiz && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                    {tFeed('postCard.quizQuestions', { count: Array.isArray(post.quiz.questions) ? post.quiz.questions.length : 0 })}
                    {post.quiz.timeLimit != null ? ` · ${post.quiz.timeLimit} min` : ''}
                  </span>
                )}
                {post.postType === 'ASSIGNMENT' && post.assignmentDueDate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(post.assignmentDueDate).toLocaleDateString()}
                  </span>
                )}
                {post.postType === 'CLUB_CREATED' && post.studyClubId && (
                  <Link
                    href={`/${locale}/clubs/${post.studyClubId}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[#0A66C2] text-white hover:bg-[#004182]"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {tFeed('actions.viewClub')}
                  </Link>
                )}
                {post.topicTags?.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-xs text-[#0A66C2] font-medium">#{tag}</span>
                ))}
              </div>

              {/* Nested original post (repost / quote) */}
              {post.repostOf && (
                <Link
                  href={`/${locale}/feed/post/${post.repostOf.id}`}
                  className="mt-3 block rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 p-3 hover:border-[#0A66C2]/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 min-w-0">
                    <Repeat2 className="w-3.5 h-3.5 shrink-0" />
                    <Avatar
                      url={post.repostOf.author?.profilePictureUrl}
                      name={displayName(post.repostOf.author)}
                      size={20}
                      gradient="from-sky-400 to-blue-600"
                    />
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {displayName(post.repostOf.author) || tFeed('postDetail.originalPost')}
                    </span>
                    {post.repostOf.createdAt ? (
                      <>
                        <span>·</span>
                        <span className="shrink-0">{formatDate(post.repostOf.createdAt)}</span>
                      </>
                    ) : null}
                  </div>
                  {post.repostOf.title ? (
                    <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {post.repostOf.title}
                    </p>
                  ) : null}
                  {!!post.repostOf.content?.trim() && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mt-0.5">
                      {post.repostOf.content}
                    </p>
                  )}
                  {post.repostOf.mediaUrls && post.repostOf.mediaUrls.length > 0 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(post.repostOf.mediaUrls[0])}
                      alt=""
                      className="mt-2 w-full h-36 object-cover rounded-lg"
                    />
                  )}
                  <div className="mt-2 text-[11px] font-semibold text-[#0A66C2]">
                    {tFeed('postDetail.originalPost')}
                  </div>
                </Link>
              )}
            </div>

            {/* Poll */}
            {post.postType === 'POLL' && post.pollOptions && (
              <div className="px-4 pb-4 space-y-2">
                {post.pollOptions.map((option) => {
                  const votes = option._count?.votes ?? option.votes ?? 0;
                  const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                  const isVoted = post.userVotedOptionId === option.id;
                  const hasVoted = Boolean(post.userVotedOptionId);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => void handleVote(option.id)}
                      disabled={hasVoted}
                      className={`relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        isVoted
                          ? 'border-[#0A66C2]/40 bg-[#0A66C2]/5'
                          : hasVoted
                            ? 'border-gray-200 dark:border-gray-700 cursor-default'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      {hasVoted && (
                        <div
                          className="absolute inset-y-0 left-0 bg-[#0A66C2]/10 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                      <div className="relative flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                          {isVoted && <CheckCircle className="w-4 h-4 text-[#0A66C2]" />}
                          {option.text}
                        </span>
                        {hasVoted && (
                          <span className="text-sm font-semibold text-gray-600">{percentage.toFixed(0)}%</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                <p className="text-xs text-gray-500">{tFeed('postCard.pollVotes', { count: totalVotes })}</p>
              </div>
            )}

            {/* Media */}
            {post.mediaUrls?.length > 0 && (
              <div className="relative bg-black/5 dark:bg-black/40">
                {isVideoUrl(post.mediaUrls[currentMediaIndex]) ? (
                  <video
                    src={resolveMediaUrl(post.mediaUrls[currentMediaIndex])}
                    controls
                    playsInline
                    className="w-full max-h-[560px] object-contain bg-black"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(post.mediaUrls[currentMediaIndex])}
                    alt=""
                    className="w-full max-h-[560px] object-contain cursor-zoom-in"
                    onClick={() => setShowMediaModal(true)}
                  />
                )}
                {post.mediaUrls.length > 1 && (
                  <>
                    {currentMediaIndex > 0 && (
                      <button
                        onClick={() => setCurrentMediaIndex((i) => i - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-900/90 p-2 rounded-full shadow"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    {currentMediaIndex < post.mediaUrls.length - 1 && (
                      <button
                        onClick={() => setCurrentMediaIndex((i) => i + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-900/90 p-2 rounded-full shadow"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {post.mediaUrls.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentMediaIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === currentMediaIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Engagement summary */}
            <div className="px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-black/[0.04] dark:border-white/5">
              <div className="flex items-center gap-3">
                <ReactionSummary
                  likesCount={post.likesCount}
                  reactionCounts={post.reactionCounts}
                />
                {(post.valuesCount || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {post.valuesCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span>{tFeed('postDetail.comments', { count: post.commentsCount })}</span>
                {(post.sharesCount || 0) > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Repeat2 className="w-3.5 h-3.5" />
                    {post.sharesCount}
                  </span>
                )}
                {(post.viewsCount || 0) > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {post.viewsCount}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-1 py-1 border-t border-black/[0.04] dark:border-white/5 grid grid-cols-3 sm:grid-cols-6 gap-0.5">
              <ReactionButton myReaction={post.myReaction} onReact={handleReact} variant="labeled" />
              <button
                type="button"
                onClick={() => setShowValueModal(true)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all hover:bg-black/[0.04] dark:hover:bg-white/5 ${
                  post.isValuedByMe ? 'text-amber-500' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Star className={`w-[18px] h-[18px] ${post.isValuedByMe ? 'fill-current scale-110' : ''} transition-transform`} />
                <span>{tFeed('postDetail.value')}</span>
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('detail-comment-input')?.focus()}
                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/5"
              >
                <MessageCircle className="w-[18px] h-[18px]" />
                <span>{tFeed('postDetail.comment')}</span>
              </button>
              {canRepost && (
                <button
                  type="button"
                  onClick={() => setShowRepostModal(true)}
                  className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/5"
                >
                  <Repeat2 className="w-[18px] h-[18px]" />
                  <span>{tFeed('postDetail.repost')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowShareSheet(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/5"
              >
                <Share2 className="w-[18px] h-[18px]" />
                <span>{tFeed('postDetail.share')}</span>
              </button>
              <button
                type="button"
                onClick={handleBookmark}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all hover:bg-black/[0.04] dark:hover:bg-white/5 ${
                  post.isBookmarkedByMe ? 'text-amber-600' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Bookmark className={`w-[18px] h-[18px] ${post.isBookmarkedByMe ? 'fill-current scale-110' : ''} transition-transform`} />
                <span>{post.isBookmarkedByMe ? tFeed('postCard.menu.unsave') : tFeed('postDetail.save')}</span>
              </button>
            </div>
            <p className="px-4 pb-2 text-[10px] text-gray-400">{tFeed('postDetail.holdToReact')}</p>
          </article>
        )}

        {/* Comments card */}
        <section className="rounded-xl bg-white dark:bg-gray-900 border border-black/[0.06] dark:border-white/10 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">
              {tFeed('postDetail.comments', { count: post?.commentsCount ?? comments.length })}
            </h2>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-0.5">
                {(['newest', 'top'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCommentSort(mode)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                      commentSort === mode
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tFeed(`commentSort.${mode}`)}
                  </button>
                ))}
              </div>
              {loadingComments && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </div>

          <form onSubmit={handleSubmitComment} className="px-4 pb-3">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 text-xs text-sky-700 dark:text-sky-300">
                <span>
                  {tFeed('sections.replyingTo')}{' '}
                  <strong>{displayName(replyTo.author)}</strong>
                </span>
                <button type="button" onClick={() => setReplyTo(null)} className="font-semibold hover:underline">
                  {t('cancel')}
                </button>
              </div>
            )}
            <div className="flex gap-2.5 items-start">
              <Avatar name="You" size={36} gradient="from-[#0A66C2] to-sky-500" />
              <div className="flex-1 flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950/50 px-3.5 py-2 focus-within:border-[#0A66C2] focus-within:ring-1 focus-within:ring-[#0A66C2]/30 transition-all">
                <input
                  id="detail-comment-input"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTo ? tFeed('sections.writeReply') : tFeed('postCard.addComment')}
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="text-[#0A66C2] disabled:text-gray-300 disabled:cursor-not-allowed p-1"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </form>

          <div className="px-4 pb-4 space-y-4">
            {loadingComments && comments.length === 0 ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="flex-1 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center">
                <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{tFeed('postCard.noComments')}</p>
              </div>
            ) : (
              <>
                {sortedComments.map((comment) => {
                  const cName = displayName(comment.author);
                  return (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex gap-2.5">
                        <Link href={`/${locale}/profile/${comment.author.id}`} className="shrink-0 mt-0.5">
                          <Avatar url={comment.author.profilePictureUrl} name={cName} size={36} gradient="from-sky-400 to-blue-600" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className={`rounded-2xl px-3.5 py-2.5 ${
                            comment.isVerifiedAnswer
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800'
                              : 'bg-[#F2F2F2] dark:bg-gray-800/80'
                          }`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={`/${locale}/profile/${comment.author.id}`}
                                className="text-[13px] font-bold text-gray-900 dark:text-white hover:underline"
                              >
                                {cName}
                              </Link>
                              {comment.isVerifiedAnswer && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                                  <BadgeCheck className="w-3.5 h-3.5" />
                                  {tFeed('sections.verifiedAnswer')}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-gray-800 dark:text-gray-100 mt-0.5 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 px-2 pt-1 text-[11px] text-gray-500 font-semibold">
                            <span>{formatDate(comment.createdAt)}</span>
                            <button
                              type="button"
                              onClick={() => handleCommentLike(comment.id)}
                              className={`hover:underline ${comment.isLiked ? 'text-rose-500' : ''}`}
                            >
                              {tFeed('likeComment')}
                              {(comment.likesCount || 0) > 0 ? ` · ${comment.likesCount}` : ''}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTo(comment);
                                document.getElementById('detail-comment-input')?.focus();
                              }}
                              className="hover:underline"
                            >
                              {tFeed('reply')}
                            </button>
                            {isAuthor && post?.postType === 'QUESTION' && !comment.isVerifiedAnswer && (
                              <button
                                type="button"
                                disabled={verifyingId === comment.id}
                                onClick={() => handleVerifyAnswer(comment.id)}
                                className="text-emerald-600 hover:underline disabled:opacity-50"
                              >
                                {verifyingId === comment.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin inline" />
                                ) : (
                                  tFeed('sections.verifyAnswer')
                                )}
                              </button>
                            )}
                          </div>

                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-2 ml-2 space-y-2 border-l-2 border-gray-100 dark:border-gray-800 pl-3">
                              {comment.replies.map((reply) => {
                                const rName = displayName(reply.author);
                                return (
                                  <div key={reply.id} className="flex gap-2">
                                    <Link href={`/${locale}/profile/${reply.author.id}`} className="shrink-0 mt-0.5">
                                      <Avatar url={reply.author.profilePictureUrl} name={rName} size={28} gradient="from-indigo-400 to-violet-500" />
                                    </Link>
                                    <div className="min-w-0 flex-1">
                                      <div className="rounded-2xl bg-[#F2F2F2] dark:bg-gray-800/80 px-3 py-2">
                                        <Link
                                          href={`/${locale}/profile/${reply.author.id}`}
                                          className="text-[12px] font-bold text-gray-900 dark:text-white hover:underline"
                                        >
                                          {rName}
                                        </Link>
                                        <p className="text-[12px] text-gray-800 dark:text-gray-100 mt-0.5 whitespace-pre-wrap">
                                          {reply.content}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3 px-2 pt-1 text-[10px] text-gray-500 font-semibold">
                                        <span>{formatDate(reply.createdAt)}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCommentLike(reply.id, comment.id)}
                                          className={`hover:underline ${reply.isLiked ? 'text-rose-500' : ''}`}
                                        >
                                          {tFeed('likeComment')}
                                          {(reply.likesCount || 0) > 0 ? ` · ${reply.likesCount}` : ''}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {commentsHasMore && (
                  <button
                    type="button"
                    onClick={loadMoreComments}
                    disabled={loadingMoreComments}
                    className="w-full py-2.5 text-sm font-semibold text-[#0A66C2] hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl disabled:opacity-50"
                  >
                    {loadingMoreComments ? (
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    ) : (
                      tFeed('loadMoreComments')
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {repostToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-lg">
            {tFeed('repostSuccess')}
          </div>
        )}
      </main>

      {showMediaModal && post?.mediaUrls?.length ? (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setShowMediaModal(false)}
        >
          <button className="absolute top-4 right-4 text-white/90 p-2" onClick={() => setShowMediaModal(false)}>
            <X className="w-7 h-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaUrl(post.mediaUrls[currentMediaIndex])}
            alt=""
            className="max-w-[92vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <EducationalValueModal
        isOpen={showValueModal}
        postType={post?.postType || 'ARTICLE'}
        onClose={() => setShowValueModal(false)}
        onSubmit={handleSubmitValue}
        isSubmitting={isValueSubmitting}
      />

      <ShareSheet
        open={showShareSheet}
        url={shareUrl}
        title={post?.title || authorName}
        onClose={() => setShowShareSheet(false)}
        onShared={() => {
          void trackShare();
        }}
      />

      {post && (
        <RepostComposerModal
          open={showRepostModal}
          postId={post.id}
          authorName={authorName}
          previewTitle={post.title}
          previewContent={post.content}
          onClose={() => setShowRepostModal(false)}
          onSuccess={() => {
            setPost((p) => (p ? { ...p, sharesCount: (p.sharesCount || 0) + 1 } : null));
            setRepostToast(true);
            window.setTimeout(() => setRepostToast(false), 2500);
          }}
        />
      )}
    </div>
  );
}
