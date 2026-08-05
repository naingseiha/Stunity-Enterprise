'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import MediaGallery, { MediaLightbox } from './MediaGallery';
import ReactionButton from './ReactionButton';
import ReactionSummary from './ReactionSummary';
import ShareSheet from './ShareSheet';
import RepostComposerModal from './RepostComposerModal';
import { seedPostDetailFromFeedCard, writePostDetailCache } from '@/lib/post-detail-cache';
import { patchProfileCache, prefetchProfile, readProfileCache } from '@/lib/profile-cache';
import type { ReactionType } from '@/lib/feed-reactions';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import {
  Heart,
  Star,
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
  X,
  Loader2,
  Send,
  Eye,
  TrendingUp,
  BookOpen,
  FolderOpen,
  Rocket,
  Microscope,
  UsersRound,
  Calendar,
  Sparkles,
  Trophy,
  Medal,
  Crown,
  Zap,
  GraduationCap,
  BadgeCheck,
  ShieldCheck,
  Repeat2,
  Gamepad2,
  ArrowRight,
  Download,
  Diamond,
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
    id?: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string | null;
  };
  createdAt: string;
  likesCount?: number;
  isLiked?: boolean;
  replies?: Comment[];
}

interface AuthorBadge {
  id: string;
  type: string;
  title: string;
  rarity: string;
  badgeUrl?: string;
}

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  role?: string;
  isVerified?: boolean;
  professionalTitle?: string;
  level?: number;
  achievements?: AuthorBadge[];
}

export interface PostData {
  id: string;
  title?: string;
  content: string;
  postType: string;
  visibility: string;
  author: Author;
  createdAt: string;
  likesCount: number;
  valuesCount?: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  isLiked?: boolean;
  myReaction?: string | null;
  reactionCounts?: Record<string, number>;
  isValued?: boolean;
  isBookmarked?: boolean;
  mediaUrls?: string[];
  resourceUrl?: string;
  resourceType?: string;
  mediaDisplayMode?: 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT';
  pollOptions?: PollOption[];
  userVotedOptionId?: string;
  comments?: Comment[];
  studyClubId?: string;
  questionBounty?: number;
  difficultyLevel?: number;
  topicTags?: string[];
  assignmentDueDate?: string;
  assignmentPoints?: number;
  assignmentSubmissionType?: string;
  courseCode?: string;
  courseLevel?: string;
  courseDuration?: string;
  examDate?: string;
  examDuration?: number;
  examTotalPoints?: number;
  examPassingScore?: number;
  announcementUrgency?: string;
  announcementExpiryDate?: string;
  tutorialDifficulty?: string;
  tutorialEstimatedTime?: string;
  projectStatus?: string;
  projectDeadline?: string;
  projectTeamSize?: number;
  researchField?: string;
  researchCollaborators?: string;
  quizData?: {
    questions?: { id: string; text: string }[];
    timeLimit?: number;
    passingScore?: number;
  };
  quiz?: { id: string };
  userAttempt?: {
    score: number;
    passed: boolean;
  };
  repostOfId?: string | null;
  repostComment?: string | null;
  repostOf?: {
    id: string;
    title?: string;
    content?: string;
    postType?: string;
    mediaUrls?: string[];
    createdAt?: string;
    author?: {
      id: string;
      firstName: string;
      lastName: string;
      profileImage?: string | null;
    };
  } | null;
}

interface PostCardProps {
  post: PostData;
  onLike: (postId: string) => void;
  onReact?: (postId: string, type: ReactionType) => void;
  onValue?: (postId: string) => void;
  onComment: (postId: string, content: string, parentId?: string) => void;
  onToggleComments?: (postId: string) => void;
  onVote?: (postId: string, optionId: string) => void;
  onBookmark?: (postId: string) => void;
  onShare?: (postId: string) => void;
  /** Called after a successful quote/repost (modal handles the API). */
  onRepost?: (postId: string) => void;
  onEdit?: (postId: string, content: string) => void;
  onDelete?: (postId: string) => void;
  onViewAnalytics?: (postId: string) => void;
  currentUserId?: string;
  loadingComments?: boolean;
}

// Badge configurations for different achievement rarities
const RARITY_STYLES: Record<string, { bg: string; icon: string; border: string }> = {
  LEGENDARY: { bg: 'bg-gradient-to-r from-amber-400 to-orange-500', icon: 'text-white', border: 'ring-amber-400' },
  EPIC: { bg: 'bg-gradient-to-r from-purple-500 to-violet-600', icon: 'text-white', border: 'ring-purple-400' },
  RARE: { bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', icon: 'text-white', border: 'ring-blue-400' },
  UNCOMMON: { bg: 'bg-gradient-to-r from-green-500 to-emerald-500', icon: 'text-white', border: 'ring-green-400' },
  COMMON: { bg: 'bg-gray-200 dark:bg-gray-700', icon: 'text-gray-600 dark:text-gray-400', border: 'ring-gray-300 dark:ring-gray-600' },
};

// Achievement type icons
const ACHIEVEMENT_ICONS: Record<string, any> = {
  TOP_PERFORMER: Trophy,
  COMPETITION_WIN: Medal,
  TEACHING_EXCELLENCE: GraduationCap,
  LEADERSHIP: Crown,
  SKILL_MASTERY: Zap,
  COURSE_COMPLETION: BookOpen,
  CERTIFICATION: ShieldCheck,
  INNOVATION: Rocket,
  COLLABORATION: Users,
  COMMUNITY_CONTRIBUTION: Heart,
  CONSISTENCY_STREAK: TrendingUp,
  MILESTONE: Star,
  PUBLICATION: FileText,
};

function shouldSkipImageOptimization(src?: string | null) {
  if (!src) return false;

  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return true;
  }

  try {
    const url = new URL(src);
    return url.hostname === 'api.dicebear.com' && url.pathname.includes('/svg');
  } catch {
    return src.endsWith('.svg');
  }
}

export default function PostCard({ 
  post, 
  onLike,
  onReact,
  onValue,
  onComment,
  onToggleComments,
  onVote,
  onBookmark,
  onShare,
  onRepost,
  onEdit,
  onDelete,
  onViewAnalytics,
  currentUserId,
  loadingComments = false,
}: PostCardProps) {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const tFeed = useTranslations('feed');
  const tCommon = useTranslations('common');
  const tProfile = useTranslations('profile');
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localVoted, setLocalVoted] = useState(post.userVotedOptionId);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRepostComposer, setShowRepostComposer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localBookmarked, setLocalBookmarked] = useState(post.isBookmarked);
  const [localSharesCount, setLocalSharesCount] = useState(post.sharesCount);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const repostMenuRef = useRef<HTMLDivElement>(null);
  
  // Optimistic UI for like / reaction button - instant feedback
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localMyReaction, setLocalMyReaction] = useState<string | null>(post.myReaction ?? (post.isLiked ? 'LIKE' : null));
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount);
  const [isLiking, setIsLiking] = useState(false);
  
  // Optimistic UI for value button
  const [localIsValued, setLocalIsValued] = useState(post.isValued);
  const [localValuesCount, setLocalValuesCount] = useState(post.valuesCount || 0);
  const [isValuing, setIsValuing] = useState(false);
  
  // Collapsible comments - show only first 3 by default
  const [showAllComments, setShowAllComments] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments || []);
  const INITIAL_COMMENTS_SHOWN = 3;

  useEffect(() => {
    setLocalComments(post.comments || []);
  }, [post.comments]);
  
  // Sync local state with props when post updates from server
  // Sync local state with props when post updates from server
  useEffect(() => {
    setLocalIsLiked(post.isLiked);
    setLocalMyReaction(post.myReaction ?? (post.isLiked ? 'LIKE' : null));
    setLocalLikesCount(post.likesCount);
    setLocalIsValued(post.isValued);
    setLocalValuesCount(post.valuesCount || 0);
    setLocalBookmarked(post.isBookmarked);
    setLocalSharesCount(post.sharesCount);
  }, [post.isLiked, post.myReaction, post.likesCount, post.isValued, post.valuesCount, post.isBookmarked, post.sharesCount]);

  const isAuthor = currentUserId === post.author.id;

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Close overflow menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false);
      }
      if (repostMenuRef.current && !repostMenuRef.current.contains(target)) {
        setShowRepostMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeActionMenus = useCallback(() => {
    setShowRepostMenu(false);
    setShowMenu(false);
  }, []);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getDisplayName = (firstName?: string, lastName?: string) =>
    [lastName, firstName].filter(Boolean).join(' ');
  const authorProfilePath = `/${locale}/profile/${post.author.id}`;
  const postPath = `/${locale}/feed/post/${post.id}`;
  const clubPath = post.studyClubId ? `/${locale}/clubs/${post.studyClubId}` : null;
  const eventPath = `/${locale}/events`;
  const liveQuizPath = `/${locale}/live-quiz/host?quizId=${post.quiz?.id || post.id}`;
  const quizAnalyticsPath = post.quiz?.id
    ? `/${locale}/teacher/quizzes/analytics?quizId=${encodeURIComponent(post.quiz.id)}`
    : `/${locale}/teacher/quizzes/analytics`;

  const prefetchPath = useCallback((path: string | null) => {
    if (!path) return;
    router.prefetch(path);
  }, [router]);

  const prefetchAuthorProfile = useCallback(() => {
    prefetchPath(authorProfilePath);
    const authorId = post.author.id;
    if (!authorId) return;
    // Seed a minimal hero so profile loading paints instantly
    if (!readProfileCache(authorId)?.profile) {
      patchProfileCache(authorId, {
        profile: {
          id: authorId,
          firstName: post.author.firstName,
          lastName: post.author.lastName,
          role: post.author.role || 'STUDENT',
          profilePictureUrl: post.author.profileImage || null,
          headline: (post.author as any).headline || (post.author as any).professionalTitle,
          languages: [],
          interests: [],
          skills: [],
          profileCompleteness: 0,
          profileVisibility: 'PUBLIC',
          isVerified: Boolean(post.author.isVerified),
          totalLearningHours: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          level: post.author.level || 1,
          isOpenToOpportunities: false,
          createdAt: new Date().toISOString(),
          isOwnProfile: false,
          isFollowing: false,
          stats: {
            posts: 0,
            followers: 0,
            following: 0,
            skills: 0,
            experiences: 0,
            certifications: 0,
            projects: 0,
            achievements: 0,
            recommendations: 0,
            postsThisMonth: 0,
            totalLikes: 0,
            totalViews: 0,
          },
          socialLinks: {},
        },
      });
    }
    void prefetchProfile(authorId, {
      token: TokenManager.getAccessToken(),
      feedBaseUrl: FEED_SERVICE_URL,
    });
  }, [authorProfilePath, post.author, prefetchPath]);

  const prefetchPostDetail = useCallback(() => {
    prefetchPath(postPath);
    try {
      writePostDetailCache(post.id, seedPostDetailFromFeedCard(post));
    } catch {
      // ignore cache write failures
    }
  }, [post, postPath, prefetchPath]);

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = now.getTime() - postDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return tFeed('postCard.time.justNow');
    if (minutes < 60) return tFeed('postCard.time.minutesAgo', { count: minutes });
    if (hours < 24) return tFeed('postCard.time.hoursAgo', { count: hours });
    if (days < 7) return tFeed('postCard.time.daysAgo', { count: days });
    return postDate.toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US');
  };

  const getAuthorRoleLabel = () => {
    if (post.author.professionalTitle) return post.author.professionalTitle;
    switch (post.author.role) {
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
        return post.author.role?.toLowerCase() || tCommon('unknown');
    }
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
        return { icon: BarChart3, color: 'violet', label: tFeed('postTypes.poll'), bgColor: 'bg-violet-50 dark:bg-violet-900/20', borderColor: 'border-violet-200 dark:border-violet-800', textColor: 'text-violet-700 dark:text-violet-400' };
      case 'ANNOUNCEMENT':
        return { icon: Megaphone, color: 'rose', label: tFeed('postTypes.announcement'), bgColor: 'bg-rose-50 dark:bg-rose-900/20', borderColor: 'border-rose-200 dark:border-rose-800', textColor: 'text-rose-700 dark:text-rose-400' };
      case 'QUESTION':
        return { icon: HelpCircle, color: 'teal', label: tFeed('postTypes.question'), bgColor: 'bg-teal-50 dark:bg-teal-900/20', borderColor: 'border-teal-200 dark:border-teal-800', textColor: 'text-teal-700 dark:text-teal-400' };
      case 'ACHIEVEMENT':
        return { icon: Award, color: 'amber', label: tFeed('postTypes.achievement'), bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800', textColor: 'text-amber-700 dark:text-amber-400' };
      case 'TUTORIAL':
        return { icon: BookOpen, color: 'blue', label: tFeed('postTypes.tutorial'), bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800', textColor: 'text-blue-700 dark:text-blue-400' };
      case 'RESOURCE':
        return { icon: FolderOpen, color: 'indigo', label: tFeed('postTypes.resource'), bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', borderColor: 'border-indigo-200 dark:border-indigo-800', textColor: 'text-indigo-700 dark:text-indigo-400' };
      case 'PROJECT':
        return { icon: Rocket, color: 'orange', label: tFeed('postTypes.project'), bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-200 dark:border-orange-800', textColor: 'text-orange-700 dark:text-orange-400' };
      case 'RESEARCH':
        return { icon: Microscope, color: 'cyan', label: tFeed('postTypes.research'), bgColor: 'bg-cyan-50 dark:bg-cyan-900/20', borderColor: 'border-cyan-200 dark:border-cyan-800', textColor: 'text-cyan-700 dark:text-cyan-400' };
      case 'COLLABORATION':
        return { icon: UsersRound, color: 'pink', label: tFeed('postTypes.collaboration'), bgColor: 'bg-pink-50 dark:bg-pink-900/20', borderColor: 'border-pink-200 dark:border-pink-800', textColor: 'text-pink-700 dark:text-pink-400' };
      case 'COURSE':
        return { icon: BookOpen, color: 'emerald', label: tFeed('postTypes.course'), bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-800', textColor: 'text-emerald-700 dark:text-emerald-400' };
      case 'QUIZ':
        return { icon: HelpCircle, color: 'purple', label: tFeed('postTypes.quiz'), bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800', textColor: 'text-purple-700 dark:text-purple-400' };
      case 'EXAM':
        return { icon: FileText, color: 'red', label: tFeed('postTypes.exam'), bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800', textColor: 'text-red-700 dark:text-red-400' };
      case 'ASSIGNMENT':
        return { icon: FileText, color: 'sky', label: tFeed('postTypes.assignment'), bgColor: 'bg-sky-50 dark:bg-sky-900/20', borderColor: 'border-sky-200 dark:border-sky-800', textColor: 'text-sky-700 dark:text-sky-400' };
      case 'REFLECTION':
        return { icon: FileText, color: 'slate', label: tFeed('postTypes.reflection'), bgColor: 'bg-slate-50 dark:bg-slate-900/20', borderColor: 'border-slate-200 dark:border-slate-800', textColor: 'text-slate-700 dark:text-slate-400' };
      case 'CLUB_CREATED':
        return { icon: Users, color: 'purple', label: tFeed('postTypes.studyClub'), bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800', textColor: 'text-purple-700 dark:text-purple-400' };
      case 'EVENT_CREATED':
        return { icon: Calendar, color: 'amber', label: tFeed('postTypes.event'), bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800', textColor: 'text-amber-700 dark:text-amber-400' };
      default:
        return { icon: FileText, color: 'emerald', label: tFeed('postTypes.article'), bgColor: 'bg-white dark:bg-gray-800', borderColor: 'border-gray-100 dark:border-gray-700', textColor: 'text-amber-700 dark:text-amber-500' };
    }
  };

  const getAvatarGradient = () => {
    switch (post.postType) {
      case 'POLL': return 'from-violet-500 to-purple-600';
      case 'ANNOUNCEMENT': return 'from-rose-500 to-pink-600';
      case 'QUESTION': return 'from-teal-500 to-cyan-600';
      case 'ACHIEVEMENT': return 'from-amber-500 to-yellow-500';
      case 'TUTORIAL': return 'from-blue-500 to-indigo-500';
      case 'RESOURCE': return 'from-indigo-500 to-violet-500';
      case 'PROJECT': return 'from-orange-500 to-red-500';
      case 'RESEARCH': return 'from-cyan-500 to-teal-500';
      case 'COLLABORATION': return 'from-pink-500 to-rose-500';
      case 'COURSE': return 'from-emerald-500 to-green-500';
      case 'QUIZ': return 'from-purple-500 to-fuchsia-500';
      case 'EXAM': return 'from-red-500 to-rose-500';
      case 'ASSIGNMENT': return 'from-sky-500 to-blue-500';
      case 'REFLECTION': return 'from-slate-500 to-gray-500';
      case 'CLUB_CREATED': return 'from-purple-500 to-violet-600';
      case 'EVENT_CREATED': return 'from-amber-500 to-orange-500';
      default: return 'from-[#F9A825] to-[#FFB74D]';
    }
  };

  const handleVote = (optionId: string) => {
    if (localVoted || !onVote) return;
    setLocalVoted(optionId);
    onVote(post.id, optionId);
  };

  const handleSubmitComment = () => {
    closeActionMenus();
    if (!commentText.trim()) return;
    onComment(post.id, commentText, replyToComment?.id);
    setCommentText('');
    setReplyToComment(null);
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
        if (c.replies?.length) return { ...c, replies: applyLocal(c.replies) };
        return c;
      });

    setLocalComments((prev) => applyLocal(prev));
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${FEED_SERVICE_URL}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLocalComments((prev) =>
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
      setLocalComments((prev) => applyLocal(prev));
    }
  };

  const handleReactPick = async (type: ReactionType) => {
    closeActionMenus();
    if (isLiking) return;
    const prev = localMyReaction;
    const prevCount = localLikesCount;
    let next: string | null = type;
    let nextCount = prevCount;
    if (prev === type) {
      next = null;
      nextCount = Math.max(0, prevCount - 1);
    } else if (!prev) {
      nextCount = prevCount + 1;
    }
    setLocalMyReaction(next);
    setLocalIsLiked(Boolean(next));
    setLocalLikesCount(nextCount);
    setIsLiking(true);
    try {
      if (onReact) await onReact(post.id, type);
      else await onLike(post.id);
    } catch {
      setLocalMyReaction(prev);
      setLocalIsLiked(Boolean(prev));
      setLocalLikesCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  // Optimistic like - instant UI feedback (fallback when no reaction handler)
  const handleLike = async () => {
    closeActionMenus();
    if (onReact) {
      await handleReactPick('LIKE');
      return;
    }
    if (isLiking) return;
    
    // Optimistic update
    const wasLiked = localIsLiked;
    setLocalIsLiked(!wasLiked);
    setLocalMyReaction(wasLiked ? null : 'LIKE');
    setLocalLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    setIsLiking(true);
    
    try {
      await onLike(post.id);
    } catch {
      // Revert on error
      setLocalIsLiked(wasLiked);
      setLocalMyReaction(wasLiked ? 'LIKE' : null);
      setLocalLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
    } finally {
      setIsLiking(false);
    }
  };

  // Trigger educational value evaluation modal
  const handleValue = () => {
    closeActionMenus();
    if (onValue) {
      onValue(post.id);
    }
  };

  const handleBookmark = () => {
    closeActionMenus();
    setLocalBookmarked(!localBookmarked);
    onBookmark?.(post.id);
  };

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/feed/post/${post.id}`;
  const canRepost = Boolean(currentUserId && currentUserId !== post.author.id);
  const isRepost = Boolean(post.repostOfId && post.repostOf);

  const handleEditClick = () => {
    setShowMenu(false);
    router.push(`/${locale}/feed/post/${post.id}/edit`);
  };

  const handleDelete = async () => {
    await onDelete?.(post.id);
    setShowDeleteConfirm(false);
  };

  const VisibilityIcon = getVisibilityIcon();
  const typeConfig = getTypeConfig();
  const TypeIcon = typeConfig.icon;

  const totalVotes = post.pollOptions?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0;

  const isAutomated = post.postType === 'EVENT_CREATED' || post.postType === 'CLUB_CREATED';
  const hasDedicatedBody =
    post.postType === 'POLL' ||
    post.postType === 'QUIZ' ||
    post.postType === 'QUESTION' ||
    post.postType === 'CLUB_CREATED' ||
    post.postType === 'EVENT_CREATED' ||
    (post.postType === 'ACHIEVEMENT' && !!post.resourceUrl?.includes('/verify/'));

  const formatShortDate = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCtaLabel = (): string | null => {
    switch (post.postType) {
      case 'ARTICLE': return tFeed('actions.readArticle');
      case 'ANNOUNCEMENT': return tFeed('actions.viewDetails');
      case 'ACHIEVEMENT': return post.resourceUrl?.includes('/verify/') ? null : tFeed('actions.celebrate');
      case 'PROJECT': return tFeed('actions.viewProject');
      case 'COURSE': return tFeed('actions.enrollNow');
      case 'EXAM': return tFeed('actions.viewExamDetails');
      case 'ASSIGNMENT': return tFeed('actions.startAssignment');
      case 'RESOURCE': return tFeed('actions.download');
      case 'TUTORIAL': return tFeed('actions.watchTutorial');
      case 'RESEARCH': return tFeed('actions.viewResearch');
      case 'REFLECTION': return tFeed('actions.readMore');
      case 'COLLABORATION': return tFeed('actions.joinTeam');
      default: return null;
    }
  };

  const typeMetaChips: string[] = [];
  if (post.postType === 'ASSIGNMENT') {
    const due = formatShortDate(post.assignmentDueDate);
    if (due) typeMetaChips.push(due);
    if (post.assignmentPoints != null) typeMetaChips.push(`${post.assignmentPoints} pts`);
    if (post.assignmentSubmissionType) typeMetaChips.push(post.assignmentSubmissionType);
  } else if (post.postType === 'COURSE') {
    if (post.courseCode) typeMetaChips.push(post.courseCode);
    if (post.courseLevel) typeMetaChips.push(post.courseLevel);
    if (post.courseDuration) typeMetaChips.push(post.courseDuration);
  } else if (post.postType === 'EXAM') {
    const examDate = formatShortDate(post.examDate);
    if (examDate) typeMetaChips.push(examDate);
    if (post.examDuration != null) typeMetaChips.push(`${post.examDuration} min`);
    if (post.examTotalPoints != null) typeMetaChips.push(`${post.examTotalPoints} pts`);
    if (post.examPassingScore != null) typeMetaChips.push(`Pass ${post.examPassingScore}%`);
  } else if (post.postType === 'ANNOUNCEMENT') {
    if (post.announcementUrgency) typeMetaChips.push(post.announcementUrgency);
    const expiry = formatShortDate(post.announcementExpiryDate);
    if (expiry) typeMetaChips.push(expiry);
  } else if (post.postType === 'TUTORIAL') {
    if (post.tutorialDifficulty) typeMetaChips.push(post.tutorialDifficulty);
    if (post.tutorialEstimatedTime) typeMetaChips.push(post.tutorialEstimatedTime);
  } else if (post.postType === 'PROJECT') {
    if (post.projectStatus) typeMetaChips.push(post.projectStatus);
    const deadline = formatShortDate(post.projectDeadline);
    if (deadline) typeMetaChips.push(deadline);
    if (post.projectTeamSize != null) typeMetaChips.push(String(post.projectTeamSize));
  } else if (post.postType === 'RESEARCH') {
    if (post.researchField) typeMetaChips.push(post.researchField);
    if (post.researchCollaborators) typeMetaChips.push(post.researchCollaborators);
  } else if (post.postType === 'RESOURCE' && post.resourceType) {
    typeMetaChips.push(post.resourceType);
  }

  const ctaLabel = getCtaLabel();
  const ctaHref = post.postType === 'RESOURCE' && post.resourceUrl ? post.resourceUrl : postPath;
  const ctaIsExternal = post.postType === 'RESOURCE' && !!post.resourceUrl;
  const clubDisplayName = (post.title || post.content.split('\n')[0] || '').trim();
  const eventDisplayName = (post.title || post.content.split('\n')[0] || '').trim();
  const isAnswered = (post.commentsCount || 0) > 0;

  return (
    <div className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-300`}>
      {/* Type Badge for special posts */}
      {post.postType !== 'ARTICLE' && (
        <div className={`px-4 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 backdrop-blur-sm`}>
          <TypeIcon className={`w-3.5 h-3.5 ${typeConfig.textColor}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${typeConfig.textColor}`}>{typeConfig.label}</span>
        </div>
      )}

      <div className="p-3">
        {/* Author Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <Link
              href={authorProfilePath}
              prefetch={true}
              onMouseEnter={prefetchAuthorProfile}
              onFocus={prefetchAuthorProfile}
              className="flex-shrink-0"
            >
              {post.author.profileImage ? (
                <Image
                  src={post.author.profileImage}
                  alt={getDisplayName(post.author.firstName, post.author.lastName)}
                  width={40}
                  height={40}
                  unoptimized={shouldSkipImageOptimization(post.author.profileImage)}
                  className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-[#F9A825] transition-all"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-[#F9A825] transition-all`}>
                  {getInitials(post.author.firstName, post.author.lastName)}
                </div>
              )}
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={authorProfilePath}
                  prefetch={true}
                  onMouseEnter={prefetchAuthorProfile}
                  onFocus={prefetchAuthorProfile}
                  className="font-semibold text-gray-900 dark:text-gray-100 text-sm hover:text-[#F9A825] hover:underline"
                >
                  {getDisplayName(post.author.firstName, post.author.lastName)}
                </Link>
                {/* Verified Badge */}
                {post.author.isVerified && (
                  <span className="inline-flex items-center justify-center w-4 h-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" title={tProfile('about.verified')}>
                    <BadgeCheck className="w-3 h-3 text-white" />
                  </span>
                )}
                {/* Level Badge */}
                {post.author.level && post.author.level >= 5 && (
                  <span 
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      post.author.level >= 20 ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white' :
                      post.author.level >= 10 ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                      'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    }`}
                    title={tFeed('postCard.level', { level: post.author.level })}
                  >
                    <Zap className="w-2.5 h-2.5" />
                    {post.author.level}
                  </span>
                )}
                {/* Top Achievement Badges */}
                {post.author.achievements && post.author.achievements.slice(0, 2).map((achievement) => {
                  const IconComponent = ACHIEVEMENT_ICONS[achievement.type] || Award;
                  const styles = RARITY_STYLES[achievement.rarity] || RARITY_STYLES.COMMON;
                  return (
                    <span 
                      key={achievement.id}
                      className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${styles.bg}`}
                      title={achievement.title}
                    >
                      <IconComponent className={`w-2.5 h-2.5 ${styles.icon}`} />
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                {isRepost && (
                  <>
                    <Repeat2 className="w-3 h-3" />
                    <span>{tCommon('reposted')}</span>
                    <span>•</span>
                  </>
                )}
                <span className="capitalize">{getAuthorRoleLabel()}</span>
                <span>•</span>
                <span suppressHydrationWarning>{formatDate(post.createdAt)}</span>
                <VisibilityIcon className="w-3 h-3 ml-0.5" />
              </div>
            </div>
          </div>
          {/* More Menu */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => {
                setShowRepostMenu(false);
                setShowMenu(!showMenu);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                {isAuthor && (
                  <>
                    <button
                      onClick={handleEditClick}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>{tFeed('postCard.menu.editPost')}</span>
                    </button>
                    <button
                      onClick={() => { onViewAnalytics?.(post.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">{tFeed('postCard.menu.viewAnalytics')}</span>
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{tCommon('delete')}</span>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                  </>
                )}
                <button
                  onClick={() => { handleBookmark(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Bookmark className={`w-4 h-4 ${localBookmarked ? 'fill-current text-[#F9A825]' : ''}`} />
                  <span>{localBookmarked ? tFeed('postCard.menu.unsave') : tCommon('save')}</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowShareModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{tFeed('postCard.shareLink')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {!isAutomated && (
          <Link
            href={postPath}
            prefetch={true}
            onMouseEnter={prefetchPostDetail}
            onFocus={prefetchPostDetail}
            className="block mb-3 group"
          >
            {post.title && !isRepost && (
              <h3 className="text-gray-900 dark:text-gray-100 text-[15px] font-semibold mb-1.5 group-hover:text-gray-950 dark:group-hover:text-white transition-colors">
                {post.title}
              </h3>
            )}
            {!!post.content?.trim() && (
              <p className="text-gray-800 dark:text-gray-200 text-[15px] whitespace-pre-wrap leading-relaxed group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {post.content}
              </p>
            )}
          </Link>
        )}

        {/* Nested original post (quote / repost) */}
        {isRepost && post.repostOf && (
          <Link
            href={`/${locale}/feed/post/${post.repostOf.id}`}
            prefetch={true}
            onMouseEnter={() => prefetchPath(`/${locale}/feed/post/${post.repostOf!.id}`)}
            className="mb-3 block rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-3 hover:border-[#0A66C2]/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5 min-w-0">
              <Repeat2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {post.repostOf.author?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.repostOf.author.profileImage}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  {getInitials(post.repostOf.author?.firstName || '', post.repostOf.author?.lastName || '')}
                </div>
              )}
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                {getDisplayName(post.repostOf.author?.firstName, post.repostOf.author?.lastName) || tFeed('postDetail.originalPost')}
              </span>
              {post.repostOf.createdAt ? (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{formatDate(post.repostOf.createdAt)}</span>
                </>
              ) : null}
            </div>
            {post.repostOf.title ? (
              <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-0.5">
                {post.repostOf.title}
              </p>
            ) : null}
            {!!post.repostOf.content?.trim() && (
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                {post.repostOf.content}
              </p>
            )}
            {post.repostOf.mediaUrls && post.repostOf.mediaUrls.length > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.repostOf.mediaUrls[0]}
                alt=""
                className="mt-2 w-full h-28 object-cover rounded-lg"
              />
            )}
            <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#0A66C2]">
              <span>{tFeed('postDetail.originalPost')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        )}

        {/* Type meta chips */}
        {typeMetaChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {typeMetaChips.map((chip) => (
              <span
                key={chip}
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${typeConfig.borderColor} ${typeConfig.bgColor} ${typeConfig.textColor}`}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Question Q&A strip */}
        {post.postType === 'QUESTION' && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isAnswered
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
              }`}
            >
              {isAnswered ? <CheckCircle className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
              {isAnswered ? tFeed('answered') : tFeed('awaitingAnswer')}
            </span>
            {!!post.questionBounty && post.questionBounty > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                <Diamond className="w-3.5 h-3.5" />
                {post.questionBounty} {tFeed('bounty')}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MessageCircle className="w-3.5 h-3.5" />
              {tFeed('answerCount', { count: post.commentsCount || 0 })}
            </span>
          </div>
        )}

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
                      : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${isVoted ? 'ring-1 ring-[#F9A825]' : 'border border-gray-200 dark:border-gray-700'}`}
                >
                  {/* Progress bar background */}
                  {localVoted && (
                    <div
                      className="absolute inset-0 bg-amber-50 dark:bg-amber-900/30 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isVoted && <CheckCircle className="w-4 h-4 text-[#F9A825]" />}
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{option.text}</span>
                    </div>
                    {localVoted && (
                      <span className="text-sm font-medium text-violet-700 dark:text-violet-400">{percentage}%</span>
                    )}
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tFeed('postCard.pollVotes', { count: totalVotes })}
            </p>
          </div>
        )}

        {/* Club Created */}
        {post.postType === 'CLUB_CREATED' && (
          <div className={`mb-3 rounded-xl border ${typeConfig.borderColor} ${typeConfig.bgColor} p-4`}>
            {!!clubDisplayName && (
              <h4 className={`font-semibold text-sm mb-1 ${typeConfig.textColor}`}>{clubDisplayName}</h4>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{tFeed('postTypes.studyClub')}</p>
            {clubPath ? (
              <Link
                href={clubPath}
                prefetch={true}
                onMouseEnter={() => prefetchPath(clubPath)}
                onFocus={() => prefetchPath(clubPath)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-medium text-sm hover:from-purple-600 hover:to-violet-700 transition-all shadow-sm"
              >
                <Users className="w-4 h-4" />
                {tFeed('postCard.viewJoinClub')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={postPath}
                prefetch={true}
                onMouseEnter={prefetchPostDetail}
                onFocus={prefetchPostDetail}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-medium text-sm hover:from-purple-600 hover:to-violet-700 transition-all shadow-sm"
              >
                <Users className="w-4 h-4" />
                {tFeed('actions.viewClub')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        {/* Event Created */}
        {post.postType === 'EVENT_CREATED' && (
          <div className={`mb-3 rounded-xl border ${typeConfig.borderColor} ${typeConfig.bgColor} p-4`}>
            {!!eventDisplayName && (
              <h4 className={`font-semibold text-sm mb-2 ${typeConfig.textColor}`}>{eventDisplayName}</h4>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {tFeed('postTypes.event')}
              </span>
            </div>
            <Link
              href={eventPath}
              prefetch={true}
              onMouseEnter={() => prefetchPath(eventPath)}
              onFocus={() => prefetchPath(eventPath)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              {tFeed('postCard.viewEventRsvp')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Quiz Card — always shown for QUIZ posts (mobile parity) */}
        {post.postType === 'QUIZ' && (
          <div className="mb-3 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500/15 to-pink-500/15 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5 text-fuchsia-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {tFeed('sections.testKnowledge')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tFeed('sections.completeQuiz')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-fuchsia-500/[0.06] dark:bg-fuchsia-500/10 px-2 py-3 text-center">
                <div className="mx-auto mb-1.5 w-8 h-8 rounded-full bg-fuchsia-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-fuchsia-500" />
                </div>
                <p className="text-base font-extrabold text-fuchsia-600 dark:text-fuchsia-400">
                  {post.quizData?.questions?.length ?? '—'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{tFeed('sections.questions')}</p>
              </div>
              <div className="rounded-xl bg-sky-500/[0.06] dark:bg-sky-500/10 px-2 py-3 text-center">
                <div className="mx-auto mb-1.5 w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-sky-500" />
                </div>
                <p className="text-base font-extrabold text-sky-600 dark:text-sky-400">
                  {post.quizData?.timeLimit
                    ? tFeed('sections.minutesShort', { count: post.quizData.timeLimit })
                    : '∞'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{tFeed('sections.time')}</p>
              </div>
              <div className="rounded-xl bg-amber-500/[0.06] dark:bg-amber-500/10 px-2 py-3 text-center">
                <div className="mx-auto mb-1.5 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                  {Math.max((post.quizData?.questions?.length ?? 0) * 10, post.quizData?.passingScore ?? 10)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{tFeed('sections.points')}</p>
              </div>
            </div>

            {post.userAttempt && (
              <div className={`flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-semibold ${
                post.userAttempt.passed
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {post.userAttempt.passed ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                <span className="flex-1">
                  {tFeed('sections.scorePercent', { score: post.userAttempt.score })}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  post.userAttempt.passed
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                    : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'
                }`}>
                  {post.userAttempt.passed ? tFeed('sections.passed') : tFeed('sections.notPassed')}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Link
                href={postPath}
                prefetch={true}
                onMouseEnter={prefetchPostDetail}
                onFocus={prefetchPostDetail}
                className="flex-1 inline-flex items-center justify-center gap-2 text-center bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white text-sm font-bold py-3.5 rounded-full transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                {post.userAttempt ? tFeed('postCard.retakeQuiz') : tFeed('sections.takeQuizNow')}
                <ArrowRight className="w-4 h-4 opacity-80" />
              </Link>
              {(post.quiz?.id || (post.quizData?.questions?.length ?? 0) > 0) && (
                <Link
                  href={liveQuizPath}
                  prefetch={true}
                  onMouseEnter={() => prefetchPath(liveQuizPath)}
                  onFocus={() => prefetchPath(liveQuizPath)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full transition-colors"
                  title={tFeed('postCard.startLiveQuiz')}
                >
                  <Gamepad2 className="w-4 h-4" />
                </Link>
              )}
            </div>
            {isAuthor && post.quiz?.id ? (
              <Link
                href={quizAnalyticsPath}
                prefetch={true}
                onMouseEnter={() => prefetchPath(quizAnalyticsPath)}
                onFocus={() => prefetchPath(quizAnalyticsPath)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/50"
              >
                <BarChart3 className="h-4 w-4" />
                {tFeed('postCard.viewQuizAnalytics')}
              </Link>
            ) : null}
          </div>
        )}

        {/* Certificate Card */}
        {post.postType === 'ACHIEVEMENT' && post.resourceUrl?.includes('/verify/') && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <Award className="w-8 h-8 text-amber-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-amber-900 dark:text-amber-200 text-lg mb-1">{tFeed('postCard.certificateEarned')}</h4>
                <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
                  {post.title || 'Has successfully completed a professional course.'}
                </p>
                <Link
                  href={post.resourceUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {tFeed('postCard.viewCertificate')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Generic CTA for types without dedicated interactive body */}
        {!hasDedicatedBody && ctaLabel && (
          <div className="mb-3">
            {ctaIsExternal ? (
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border ${typeConfig.borderColor} ${typeConfig.bgColor} ${typeConfig.textColor} hover:opacity-90 transition-opacity`}
              >
                {post.postType === 'RESOURCE' ? <Download className="w-4 h-4" /> : <TypeIcon className="w-4 h-4" />}
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <Link
                href={ctaHref}
                prefetch={true}
                onMouseEnter={() => {
                  if (ctaHref === postPath) prefetchPostDetail();
                  else prefetchPath(ctaHref);
                }}
                onFocus={() => {
                  if (ctaHref === postPath) prefetchPostDetail();
                  else prefetchPath(ctaHref);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border ${typeConfig.borderColor} ${typeConfig.bgColor} ${typeConfig.textColor} hover:opacity-90 transition-opacity`}
              >
                <TypeIcon className="w-4 h-4" />
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        {/* Topic tags */}
        {post.topicTags && post.topicTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.topicTags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs text-gray-500 dark:text-gray-400">
                #{tag}
              </span>
            ))}
            {post.topicTags.length > 4 && (
              <span className="text-xs text-gray-400">+{post.topicTags.length - 4}</span>
            )}
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

        {/* Actions - with Reaction, Value, Comment, Share */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <ReactionSummary
            likesCount={localLikesCount}
            reactionCounts={post.reactionCounts}
            className="px-1 pb-1.5"
          />
          <div className="flex items-center justify-between -mx-1">
          <ReactionButton
            myReaction={localMyReaction}
            count={localLikesCount}
            onReact={handleReactPick}
            variant="compact"
            disabled={isLiking}
            className="flex-1"
          />
          
          {/* Value - Educational value (star) */}
          <button
            onClick={handleValue}
            disabled={isValuing}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded transition-all duration-200 ${
              localIsValued
                ? 'text-amber-500 scale-105'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Star className={`w-4 h-4 transition-transform duration-200 ${localIsValued ? 'fill-current animate-pulse' : ''} ${isValuing ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">
              {tFeed('postCard.valuesLabel', { count: localValuesCount })}
            </span>
          </button>
          
          {/* Comment */}
          <button
            onClick={() => {
              closeActionMenus();
              const newState = !showComments;
              setShowComments(newState);
              if (newState && onToggleComments) {
                onToggleComments(post.id);
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded transition-colors ${
              showComments ? 'text-[#F9A825]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-medium">{post.commentsCount > 0 ? post.commentsCount : ''}</span>
          </button>
          
          {/* Repost / Share */}
          <div className="flex-1 relative" ref={repostMenuRef}>
            <button 
              onClick={() => {
                setShowMenu(false);
                setShowRepostMenu(!showRepostMenu);
              }}
              className={`w-full flex items-center justify-center gap-1 py-2 rounded transition-colors ${
                showRepostMenu ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Repeat2 className="w-4 h-4" />
              <span className="text-xs font-medium">{localSharesCount > 0 ? localSharesCount : ''}</span>
            </button>
            {showRepostMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                {canRepost && (
                  <button
                    onClick={() => {
                      setShowRepostMenu(false);
                      setShowRepostComposer(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Repeat2 className="w-4 h-4" />
                    <span>{tFeed('postCard.repost')}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowRepostMenu(false);
                    setShowShareModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{tFeed('postCard.shareLink')}</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Save */}
          <button
            onClick={handleBookmark}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded transition-colors ${
              localBookmarked ? 'text-[#F9A825]' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${localBookmarked ? 'fill-current' : ''}`} />
          </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-gray-100 animate-fadeIn">
            {replyToComment && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                <span>
                  {tFeed('sections.replyingTo')}{' '}
                  <strong>
                    {getDisplayName(replyToComment.author.firstName, replyToComment.author.lastName)}
                  </strong>
                </span>
                <button type="button" onClick={() => setReplyToComment(null)} className="font-semibold hover:underline">
                  {tCommon('cancel')}
                </button>
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyToComment ? tFeed('sections.writeReply') : tFeed('postCard.addComment')}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-[#F9A825] focus:border-[#F9A825] transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-[#F9A825] text-white rounded-full text-sm font-medium hover:bg-[#E89A1E] disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                {tFeed('createPost.post')}
              </button>
            </div>

            {loadingComments && (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex-shrink-0" />
                    <div className="flex-1 bg-gradient-to-r from-gray-50 to-amber-50/30 rounded-2xl px-3 py-2 border border-gray-100">
                      <div className="h-3 w-24 bg-amber-100/60 rounded mb-2" />
                      <div className="h-3 w-full bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingComments && localComments.length > 0 && (
              <div className="space-y-3">
                {(showAllComments ? localComments : localComments.slice(0, INITIAL_COMMENTS_SHOWN)).map((comment, index) => (
                  <div
                    key={comment.id}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 shadow-sm">
                        {getInitials(comment.author.firstName, comment.author.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="bg-gradient-to-r from-gray-50 to-amber-50/30 rounded-2xl px-3 py-2 border border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {getDisplayName(comment.author.firstName, comment.author.lastName)}
                          </p>
                          <p className="text-sm text-gray-700">{comment.content}</p>
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
                            onClick={() => setReplyToComment(comment)}
                            className="hover:underline"
                          >
                            {tFeed('reply')}
                          </button>
                        </div>

                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2 ml-2 space-y-2 border-l-2 border-gray-100 pl-3">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
                                  {getInitials(reply.author.firstName, reply.author.lastName)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="rounded-2xl bg-gray-50 px-3 py-2 border border-gray-100">
                                    <p className="text-xs font-semibold text-gray-900">
                                      {getDisplayName(reply.author.firstName, reply.author.lastName)}
                                    </p>
                                    <p className="text-xs text-gray-700">{reply.content}</p>
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
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {localComments.length > INITIAL_COMMENTS_SHOWN && (
                  <button
                    onClick={() => setShowAllComments(!showAllComments)}
                    className="flex items-center gap-1 text-sm text-[#F9A825] hover:text-[#E89A1E] font-medium transition-colors ml-10"
                  >
                    {showAllComments ? (
                      <span>{tFeed('postCard.viewLess')}</span>
                    ) : (
                      <span>{tFeed('postCard.viewMoreComments', { count: localComments.length - INITIAL_COMMENTS_SHOWN })}</span>
                    )}
                  </button>
                )}
              </div>
            )}

            {!loadingComments && localComments.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2 animate-fadeIn">{tFeed('postCard.noComments')}</p>
            )}
          </div>
        )}
      </div>

      <ShareSheet
        open={showShareModal}
        url={shareUrl}
        title={tFeed('postCard.share.postBy', { name: getDisplayName(post.author.firstName, post.author.lastName) })}
        onClose={() => setShowShareModal(false)}
        onShared={() => {
          setLocalSharesCount((prev) => prev + 1);
          onShare?.(post.id);
        }}
      />

      <RepostComposerModal
        open={showRepostComposer}
        postId={post.id}
        authorName={getDisplayName(post.author.firstName, post.author.lastName)}
        previewTitle={post.title}
        previewContent={post.content}
        onClose={() => setShowRepostComposer(false)}
        onSuccess={() => {
          setLocalSharesCount((prev) => prev + 1);
          onRepost?.(post.id);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl transform animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{tFeed('postCard.deleteTitle')}</h3>
              <p className="text-gray-600 mb-6">{tFeed('postCard.deleteDescription')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full font-medium transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-5 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all transform active:scale-95"
                >
                  {tCommon('delete')}
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
