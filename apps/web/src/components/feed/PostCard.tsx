'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import MediaGallery, { MediaLightbox } from './MediaGallery';
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
  Flag,
  Copy,
  ExternalLink,
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
    firstName: string;
    lastName: string;
  };
  createdAt: string;
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
  isValued?: boolean;
  isBookmarked?: boolean;
  mediaUrls?: string[];
  mediaDisplayMode?: 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT';
  pollOptions?: PollOption[];
  userVotedOptionId?: string;
  comments?: Comment[];
  studyClubId?: string; // For CLUB_CREATED posts - link to club
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
}

interface PostCardProps {
  post: PostData;
  onLike: (postId: string) => void;
  onValue?: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onToggleComments?: (postId: string) => void;
  onVote?: (postId: string, optionId: string) => void;
  onBookmark?: (postId: string) => void;
  onShare?: (postId: string) => void;
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
  COMMON: { bg: 'bg-gray-200', icon: 'text-gray-600', border: 'ring-gray-300' },
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

export default function PostCard({ 
  post, 
  onLike,
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
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localVoted, setLocalVoted] = useState(post.userVotedOptionId);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localBookmarked, setLocalBookmarked] = useState(post.isBookmarked);
  const [localSharesCount, setLocalSharesCount] = useState(post.sharesCount);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Optimistic UI for like button - instant feedback
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount);
  const [isLiking, setIsLiking] = useState(false);
  
  // Optimistic UI for value button
  const [localIsValued, setLocalIsValued] = useState(post.isValued);
  const [localValuesCount, setLocalValuesCount] = useState(post.valuesCount || 0);
  const [isValuing, setIsValuing] = useState(false);
  
  // Collapsible comments - show only first 3 by default
  const [showAllComments, setShowAllComments] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const INITIAL_COMMENTS_SHOWN = 3;
  
  // Sync local state with props when post updates from server
  useEffect(() => {
    setLocalIsLiked(post.isLiked);
    setLocalLikesCount(post.likesCount);
    setLocalIsValued(post.isValued);
    setLocalValuesCount(post.valuesCount || 0);
    setLocalBookmarked(post.isBookmarked);
  }, [post.isLiked, post.likesCount, post.isValued, post.valuesCount, post.isBookmarked]);

  const isAuthor = currentUserId === post.author.id;

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = now.getTime() - postDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return postDate.toLocaleDateString();
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
        return { icon: BarChart3, color: 'violet', label: 'Poll', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', textColor: 'text-violet-700' };
      case 'ANNOUNCEMENT':
        return { icon: Megaphone, color: 'rose', label: 'Announcement', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', textColor: 'text-rose-700' };
      case 'QUESTION':
        return { icon: HelpCircle, color: 'teal', label: 'Question', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', textColor: 'text-teal-700' };
      case 'ACHIEVEMENT':
        return { icon: Award, color: 'amber', label: 'Achievement', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700' };
      case 'TUTORIAL':
        return { icon: BookOpen, color: 'blue', label: 'Tutorial', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700' };
      case 'RESOURCE':
        return { icon: FolderOpen, color: 'indigo', label: 'Resource', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-700' };
      case 'PROJECT':
        return { icon: Rocket, color: 'orange', label: 'Project', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700' };
      case 'RESEARCH':
        return { icon: Microscope, color: 'cyan', label: 'Research', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', textColor: 'text-cyan-700' };
      case 'COLLABORATION':
        return { icon: UsersRound, color: 'pink', label: 'Collaboration', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', textColor: 'text-pink-700' };
      case 'COURSE':
        return { icon: BookOpen, color: 'emerald', label: 'Course', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700' };
      case 'QUIZ':
        return { icon: HelpCircle, color: 'purple', label: 'Quiz', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700' };
      case 'EXAM':
        return { icon: FileText, color: 'red', label: 'Exam', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700' };
      case 'ASSIGNMENT':
        return { icon: FileText, color: 'sky', label: 'Assignment', bgColor: 'bg-sky-50', borderColor: 'border-sky-200', textColor: 'text-sky-700' };
      case 'REFLECTION':
        return { icon: FileText, color: 'slate', label: 'Reflection', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', textColor: 'text-slate-700' };
      case 'CLUB_CREATED':
        return { icon: Users, color: 'purple', label: 'New Study Club', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700' };
      case 'EVENT_CREATED':
        return { icon: Calendar, color: 'amber', label: 'New Event', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700' };
      default:
        return { icon: FileText, color: 'emerald', label: 'Article', bgColor: 'bg-white', borderColor: 'border-gray-100', textColor: 'text-amber-700' };
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
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
  };

  const handleBookmark = () => {
    setLocalBookmarked(!localBookmarked);
    onBookmark?.(post.id);
  };

  // Optimistic like - instant UI feedback
  const handleLike = async () => {
    if (isLiking) return;
    
    // Optimistic update
    const wasLiked = localIsLiked;
    setLocalIsLiked(!wasLiked);
    setLocalLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    setIsLiking(true);
    
    try {
      await onLike(post.id);
    } catch {
      // Revert on error
      setLocalIsLiked(wasLiked);
      setLocalLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
    } finally {
      setIsLiking(false);
    }
  };

  // Optimistic value - instant UI feedback
  const handleValue = async () => {
    if (isValuing || !onValue) return;
    
    // Optimistic update
    const wasValued = localIsValued;
    setLocalIsValued(!wasValued);
    setLocalValuesCount(prev => wasValued ? prev - 1 : prev + 1);
    setIsValuing(true);
    
    try {
      await onValue(post.id);
    } catch {
      // Revert on error
      setLocalIsValued(wasValued);
      setLocalValuesCount(prev => wasValued ? prev + 1 : prev - 1);
    } finally {
      setIsValuing(false);
    }
  };

  const handleShare = (type: 'copy' | 'native') => {
    if (type === 'copy') {
      navigator.clipboard.writeText(`${window.location.origin}/${locale}/feed/post/${post.id}`);
      setLocalSharesCount(prev => prev + 1);
      onShare?.(post.id);
    } else if (navigator.share) {
      navigator.share({
        title: `Post by ${post.author.firstName} ${post.author.lastName}`,
        text: post.content.substring(0, 100),
        url: `${window.location.origin}/${locale}/feed/post/${post.id}`,
      }).then(() => {
        setLocalSharesCount(prev => prev + 1);
        onShare?.(post.id);
      });
    }
    setShowShareModal(false);
  };

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

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      {/* Type Badge for special posts */}
      {post.postType !== 'ARTICLE' && (
        <div className={`px-3 py-1.5 flex items-center gap-2 border-b border-gray-100 bg-gray-50`}>
          <TypeIcon className={`w-4 h-4 ${typeConfig.textColor}`} />
          <span className={`text-xs font-medium ${typeConfig.textColor}`}>{typeConfig.label}</span>
        </div>
      )}

      <div className="p-3">
        {/* Author Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <Link href={`/${locale}/profile/${post.author.id}`} className="flex-shrink-0">
              {post.author.profileImage ? (
                <img
                  src={post.author.profileImage}
                  alt={`${post.author.firstName} ${post.author.lastName}`}
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
                <Link href={`/${locale}/profile/${post.author.id}`} className="font-semibold text-gray-900 text-sm hover:text-[#F9A825] hover:underline">
                  {post.author.firstName} {post.author.lastName}
                </Link>
                {/* Verified Badge */}
                {post.author.isVerified && (
                  <span className="inline-flex items-center justify-center w-4 h-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" title="Verified">
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
                    title={`Level ${post.author.level}`}
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
                <span className="capitalize">{post.author.professionalTitle || post.author.role?.toLowerCase()}</span>
                <span>•</span>
                <span>{formatDate(post.createdAt)}</span>
                <VisibilityIcon className="w-3 h-3 ml-0.5" />
              </div>
            </div>
          </div>
          {/* More Menu */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                {isAuthor && (
                  <>
                    <button
                      onClick={handleEditClick}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Post</span>
                    </button>
                    <button
                      onClick={() => { onViewAnalytics?.(post.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">View Analytics</span>
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                  </>
                )}
                <button
                  onClick={() => { handleBookmark(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Bookmark className={`w-4 h-4 ${localBookmarked ? 'fill-current text-[#F9A825]' : ''}`} />
                  <span>{localBookmarked ? 'Unsave' : 'Save'}</span>
                </button>
                <button
                  onClick={() => { handleShare('copy'); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy link</span>
                </button>
                {!isAuthor && (
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <Link href={`/${locale}/feed/post/${post.id}`} className="block mb-3 group">
          <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed group-hover:text-gray-900">{post.content}</p>
        </Link>

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
                      : 'cursor-pointer hover:bg-gray-100'
                  } ${isVoted ? 'ring-1 ring-[#F9A825]' : 'border border-gray-200'}`}
                >
                  {/* Progress bar background */}
                  {localVoted && (
                    <div
                      className="absolute inset-0 bg-amber-50 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isVoted && <CheckCircle className="w-4 h-4 text-[#F9A825]" />}
                      <span className="text-sm font-medium text-gray-800">{option.text}</span>
                    </div>
                    {localVoted && (
                      <span className="text-sm font-medium text-violet-700">{percentage}%</span>
                    )}
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Club Created - Action Button */}
        {post.postType === 'CLUB_CREATED' && post.studyClubId && (
          <div className="mb-3">
            <Link
              href={`/${locale}/clubs/${post.studyClubId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-medium text-sm hover:from-purple-600 hover:to-violet-700 transition-all shadow-sm"
            >
              <Users className="w-4 h-4" />
              View & Join Club
            </Link>
          </div>
        )}

        {/* Event Created - Action Button */}
        {post.postType === 'EVENT_CREATED' && (
          <div className="mb-3">
            <Link
              href={`/${locale}/events`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              View Event & RSVP
            </Link>
          </div>
        )}

        {/* Quiz Card */}
        {post.postType === 'QUIZ' && post.quizData && (
          <div className="mb-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex flex-wrap gap-4 text-sm text-purple-700 mb-3">
              <span className="flex items-center gap-1">📝 {post.quizData.questions?.length ?? 0} questions</span>
              <span className="flex items-center gap-1">⏱ {post.quizData.timeLimit ?? 0} min</span>
              <span className="flex items-center gap-1">🎯 Pass: {post.quizData.passingScore ?? 0}%</span>
            </div>
            {post.userAttempt && (
              <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${post.userAttempt.passed ? 'text-green-700' : 'text-red-600'}`}>
                {post.userAttempt.passed ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                <span>Previous: {post.userAttempt.score}% — {post.userAttempt.passed ? 'Passed ✅' : 'Failed'}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Link
                href={`/${locale}/feed/post/${post.id}`}
                className="flex-1 text-center bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                {post.userAttempt ? '🔄 Retake Quiz' : '🚀 Take Quiz'}
              </Link>
              {(post.quiz?.id || post.quizData?.questions?.length) && (
                <Link
                  href={`/${locale}/live-quiz/host?quizId=${post.quiz?.id || post.id}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  title="Start live quiz session"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Live
                </Link>
              )}
            </div>
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

        {/* Actions - with Like, Value, Comment, Share */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 -mx-1">
          {/* Like - General appreciation */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded transition-all duration-200 ${
              localIsLiked
                ? 'text-rose-500 scale-105'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Heart className={`w-4 h-4 transition-transform duration-200 ${localIsLiked ? 'fill-current animate-pulse' : ''} ${isLiking ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">{localLikesCount > 0 ? localLikesCount : ''} Like{localLikesCount !== 1 ? 's' : ''}</span>
          </button>
          
          {/* Value - Educational value (star) */}
          <button
            onClick={handleValue}
            disabled={isValuing}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded transition-all duration-200 ${
              localIsValued
                ? 'text-amber-500 scale-105'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Star className={`w-4 h-4 transition-transform duration-200 ${localIsValued ? 'fill-current animate-pulse' : ''} ${isValuing ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">{localValuesCount > 0 ? localValuesCount : ''} Value{localValuesCount !== 1 ? 's' : ''}</span>
          </button>
          
          {/* Comment */}
          <button
            onClick={() => {
              const newState = !showComments;
              setShowComments(newState);
              if (newState && onToggleComments) {
                onToggleComments(post.id);
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded transition-colors ${
              showComments ? 'text-[#F9A825]' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-medium">{post.commentsCount > 0 ? post.commentsCount : ''}</span>
          </button>
          
          {/* Repost / Share */}
          <div className="flex-1 relative">
            <button 
              onClick={() => setShowRepostMenu(!showRepostMenu)}
              className={`w-full flex items-center justify-center gap-1 py-2 rounded transition-colors ${
                showRepostMenu ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Repeat2 className="w-4 h-4" />
              <span className="text-xs font-medium">{localSharesCount > 0 ? localSharesCount : ''}</span>
            </button>
            {showRepostMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={() => {
                    onRepost?.(post.id);
                    setLocalSharesCount(prev => prev + 1);
                    setShowRepostMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Repeat2 className="w-4 h-4" />
                  <span>Repost</span>
                </button>
                <button
                  onClick={() => {
                    setShowRepostMenu(false);
                    setShowShareModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share link</span>
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

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-gray-100 animate-fadeIn">
            {/* Comment Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-[#F9A825] focus:border-[#F9A825] transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-[#F9A825] text-white rounded-full text-sm font-medium hover:bg-[#E89A1E] disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Post
              </button>
            </div>

            {/* Loading State - Smooth blur skeleton */}
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

            {/* Comments List with collapsible feature */}
            {!loadingComments && post.comments && post.comments.length > 0 && (
              <div className="space-y-3">
                {/* Show limited comments or all */}
                {(showAllComments ? post.comments : post.comments.slice(0, INITIAL_COMMENTS_SHOWN)).map((comment, index) => (
                  <div 
                    key={comment.id} 
                    className="flex gap-2 animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F9A825] to-[#FFB74D] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 shadow-sm">
                      {getInitials(comment.author.firstName, comment.author.lastName)}
                    </div>
                    <div className="flex-1 bg-gradient-to-r from-gray-50 to-amber-50/30 rounded-2xl px-3 py-2 border border-gray-100 transition-all duration-200 hover:shadow-sm">
                      <p className="text-sm font-semibold text-gray-900">
                        {comment.author.firstName} {comment.author.lastName}
                      </p>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(comment.createdAt)}</p>
                    </div>
                  </div>
                ))}
                
                {/* View more / View less button */}
                {post.comments.length > INITIAL_COMMENTS_SHOWN && (
                  <button
                    onClick={() => setShowAllComments(!showAllComments)}
                    className="flex items-center gap-1 text-sm text-[#F9A825] hover:text-[#E89A1E] font-medium transition-colors ml-10"
                  >
                    {showAllComments ? (
                      <>
                        <span>View less</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>View {post.comments.length - INITIAL_COMMENTS_SHOWN} more comment{post.comments.length - INITIAL_COMMENTS_SHOWN !== 1 ? 's' : ''}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* No Comments */}
            {!loadingComments && (!post.comments || post.comments.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-2 animate-fadeIn">No comments yet. Be the first to comment!</p>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl transform animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Share Post</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-amber-50 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-3 p-3 hover:bg-amber-50 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Copy className="w-5 h-5 text-[#F9A825]" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Copy Link</p>
                  <p className="text-sm text-gray-500">Copy post link to clipboard</p>
                </div>
              </button>
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={() => handleShare('native')}
                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ExternalLink className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Share via...</p>
                    <p className="text-sm text-gray-500">Share using system options</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl transform animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Post?</h3>
              <p className="text-gray-600 mb-6">This action cannot be undone. This will permanently delete your post.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-5 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all transform active:scale-95"
                >
                  Delete
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
