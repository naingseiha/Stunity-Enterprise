"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  FileText,
  GraduationCap,
  Brain,
  HelpCircle,
  ClipboardCheck,
  Megaphone,
  BookOpen,
  BarChart3,
  FolderOpen,
  Edit,
  Trash2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Book,
  Microscope,
  Trophy,
  Lightbulb,
  Users,
  Clock,
  Calendar,
  ExternalLink,
  Play,
  Send,
  AlertCircle,
  Star,
  TrendingUp,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Post,
  PostType,
  toggleLike,
  deletePost,
  POST_TYPE_INFO,
} from "@/lib/api/feed";
import { formatDistanceToNow } from "date-fns";
import EnhancedPollCard from "./EnhancedPollCard";
import CommentsDrawer from "@/components/comments/CommentsDrawer";
import GradientAvatar from "@/components/common/GradientAvatar";
import KnowledgePoints from "./KnowledgePoints";
import { socketClient } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { trackPostView } from "@/lib/api/analytics";
import AnalyticsModal from "@/components/analytics/AnalyticsModal";

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (postId: string, updatedData: Partial<Post>) => void;
  onCommentClick?: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
}

const POST_TYPE_ICONS: Record<PostType, React.ElementType> = {
  ARTICLE: FileText,
  COURSE: GraduationCap,
  QUIZ: Brain,
  QUESTION: HelpCircle,
  EXAM: ClipboardCheck,
  ANNOUNCEMENT: Megaphone,
  ASSIGNMENT: BookOpen,
  POLL: BarChart3,
  RESOURCE: FolderOpen,
  PROJECT: Briefcase,
  TUTORIAL: Book,
  RESEARCH: Microscope,
  ACHIEVEMENT: Trophy,
  REFLECTION: Lightbulb,
  COLLABORATION: Users,
};

export default function PostCard({
  post,
  currentUserId,
  onPostDeleted,
  onPostUpdated,
  onCommentClick,
  onProfileClick,
}: PostCardProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false); // ✅ NEW: Analytics modal state

  const isOwnPost = currentUserId === post.authorId;

  // ✅ VIEW TRACKING: Track meaningful views (3+ seconds)
  useEffect(() => {
    const startTime = Date.now();
    let viewTracked = false;

    // Track view after 3 seconds (meaningful view)
    const viewTimer = setTimeout(() => {
      if (!viewTracked) {
        trackPostView(post.id, { source: "feed" });
        viewTracked = true;
      }
    }, 3000);

    return () => {
      clearTimeout(viewTimer);
      
      // Track duration on unmount if view was meaningful
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (duration >= 3 && viewTracked) {
        trackPostView(post.id, { duration, source: "feed" });
      }
    };
  }, [post.id]);

  // Listen for real-time post updates
  useEffect(() => {
    const handlePostUpdate = (data: {
      postId: string;
      likesCount?: number;
      commentsCount?: number;
      type: "like" | "unlike" | "comment";
      userId: string;
    }) => {
      // Only update if this is the same post
      if (data.postId !== post.id) return;

      // Update like count
      if (data.likesCount !== undefined) {
        setLikesCount(data.likesCount);
      }

      // Update comment count
      if (data.commentsCount !== undefined) {
        setCommentsCount(data.commentsCount);
      }

      // Update isLiked status if this user performed the action
      if (currentUser && data.userId === currentUser.id) {
        if (data.type === "like") {
          setIsLiked(true);
        } else if (data.type === "unlike") {
          setIsLiked(false);
        }
      }
    };

    socketClient.on("post:updated", handlePostUpdate);

    return () => {
      socketClient.off("post:updated", handlePostUpdate);
    };
  }, [post.id, currentUser]);

  const handlePostClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea")
    ) {
      return;
    }
    // ✅ FIXED: Use smooth client-side navigation instead of router.push
    // The Link wrapper will handle navigation
  };
  const PostTypeIcon = POST_TYPE_ICONS[post.postType];
  const postTypeInfo = POST_TYPE_INFO[post.postType];

  const getAuthorName = () => {
    if (post.author.student?.khmerName) return post.author.student.khmerName;
    if (post.author.teacher?.khmerName) return post.author.teacher.khmerName;
    if (post.author.parent?.khmerName) return post.author.parent.khmerName;
    return `${post.author.firstName} ${post.author.lastName}`;
  };

  const getAuthorSubtitle = () => {
    if (post.author.teacher?.position) return post.author.teacher.position;
    if (post.author.student?.class) {
      return `${post.author.student.class.name}`;
    }
    return post.author.role;
  };

  const getTimeAgo = () => {
    return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  };

  const handleLike = async () => {
    if (isLiking) return;
    
    // Optimistic update - update UI immediately
    const wasLiked = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    setIsLiking(true);
    
    try {
      await toggleLike(post.id);
      // Success - optimistic update was correct
    } catch (error) {
      // Revert on error
      console.error("Toggle like error:", error);
      setIsLiked(wasLiked);
      setLikesCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setIsDeleting(true);
    try {
      await deletePost(post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === post.mediaUrls.length - 1 ? 0 : prev + 1,
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? post.mediaUrls.length - 1 : prev - 1,
    );
  };

  // Render type-specific features
  const renderTypeSpecificContent = () => {
    switch (post.postType) {
      case "POLL":
        if (post.pollOptions && post.pollOptions.length > 0) {
          const isPollExpired = post.pollExpiresAt && new Date() > new Date(post.pollExpiresAt);
          return (
            <EnhancedPollCard
              postId={post.id}
              pollOptions={post.pollOptions}
              userVotes={post.userVotes || []}
              totalVotes={post.totalVotes || 0}
              pollExpiresAt={post.pollExpiresAt}
              pollAllowMultiple={post.pollAllowMultiple}
              pollMaxChoices={post.pollMaxChoices}
              pollIsAnonymous={post.pollIsAnonymous}
              isPollExpired={isPollExpired}
              onVoteSuccess={(data) => {
                // Update post data after vote
                if (onPostUpdated) {
                  onPostUpdated(post.id, data);
                }
              }}
            />
          );
        }
        break;

      case "QUESTION":
        return (
          <div className="mt-4">
            <button className="w-full py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-300 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 group">
              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Answer This Question
            </button>
          </div>
        );

      case "COURSE":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                {post.courseDuration && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">{post.courseDuration}</span>
                    </span>
                  </>
                )}
                {post.courseCode && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                    <span className="font-medium">{post.courseCode}</span>
                  </>
                )}
              </div>
              {post.courseLevel && (
                <div className="px-2 py-1 bg-purple-100 rounded-full">
                  <span className="text-xs font-bold text-purple-700 capitalize">
                    {post.courseLevel}
                  </span>
                </div>
              )}
            </div>
            <button className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Enroll Now
            </button>
          </div>
        );

      case "QUIZ":
        const quizQuestionsCount = post.quizQuestions?.length || 0;
        const totalQuizPoints = post.quizQuestions?.reduce((sum, q) => sum + q.points, 0) || 0;
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {quizQuestionsCount > 0 ? `Quiz (${quizQuestionsCount} questions)` : "Quick Quiz"}
                  </p>
                  {totalQuizPoints > 0 && (
                    <p className="text-xs text-gray-600">{totalQuizPoints} total points</p>
                  )}
                </div>
              </div>
            </div>
            <button className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />
              Start Quiz
            </button>
          </div>
        );

      case "ASSIGNMENT":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Assignment{post.assignmentPoints ? ` (${post.assignmentPoints} pts)` : ""}
                  </p>
                  {post.assignmentDueDate && (
                    <div className="flex items-center gap-1.5 text-orange-600">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">
                        Due: {new Date(post.assignmentDueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {post.assignmentSubmissionType && (
                <div className="px-3 py-1 bg-orange-100 rounded-full">
                  <span className="text-xs font-bold text-orange-700 capitalize">
                    {post.assignmentSubmissionType}
                  </span>
                </div>
              )}
            </div>
            <button className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              <Send className="w-5 h-5" />
              Submit Assignment
            </button>
          </div>
        );

      case "ANNOUNCEMENT":
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-2 border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">
                  Important Announcement
                  {post.announcementUrgency && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 capitalize">
                      {post.announcementUrgency}
                    </span>
                  )}
                </p>
                {post.announcementExpiryDate && (
                  <p className="text-xs text-red-700">
                    Expires: {new Date(post.announcementExpiryDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case "PROJECT":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Project
                    {post.projectStatus && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-100 capitalize">
                        {post.projectStatus.replace('_', ' ')}
                      </span>
                    )}
                  </p>
                  {post.projectDeadline && (
                    <p className="text-xs text-gray-600">
                      Deadline: {new Date(post.projectDeadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
              {post.projectTeamSize && (
                <div className="flex items-center gap-1 text-cyan-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-bold">{post.projectTeamSize}</span>
                </div>
              )}
            </div>
            <button className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              <ExternalLink className="w-5 h-5" />
              View Project Details
            </button>
          </div>
        );

      case "ACHIEVEMENT":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-lg border-2 border-yellow-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-md">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-amber-900">
                  Achievement Unlocked!
                </h4>
                <p className="text-sm text-amber-700">
                  Celebrate this milestone 🎉
                </p>
              </div>
            </div>
          </div>
        );

      case "TUTORIAL":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-teal-50 to-green-50 rounded-lg border border-teal-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Book className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Tutorial</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    {post.tutorialDifficulty && (
                      <span className="px-2 py-0.5 bg-teal-100 rounded-full capitalize">
                        {post.tutorialDifficulty}
                      </span>
                    )}
                    {post.tutorialEstimatedTime && (
                      <span>{post.tutorialEstimatedTime}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {post.tutorialPrerequisites && (
              <div className="mb-3 p-2 bg-white rounded-lg">
                <p className="text-xs font-medium text-gray-500">Prerequisites:</p>
                <p className="text-xs text-gray-700">{post.tutorialPrerequisites}</p>
              </div>
            )}
            <button className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />
              Start Tutorial
            </button>
          </div>
        );

      case "EXAM":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Exam</p>
                  {post.examDate && (
                    <p className="text-xs text-gray-600">
                      {new Date(post.examDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {post.examTotalPoints && (
                  <>
                    <p className="text-xs text-gray-500">Total Points</p>
                    <p className="text-sm font-bold text-red-600">{post.examTotalPoints}</p>
                  </>
                )}
              </div>
            </div>
            {(post.examDuration || post.examPassingScore) && (
              <div className="flex gap-4 mb-3 text-xs text-gray-700">
                {post.examDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-red-600" />
                    {post.examDuration} min
                  </span>
                )}
                {post.examPassingScore && (
                  <span>Passing: {post.examPassingScore}%</span>
                )}
              </div>
            )}
            <button className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              View Exam Details
            </button>
          </div>
        );

      case "RESOURCE":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Resource
                  {post.resourceType && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-indigo-100 rounded-full capitalize">
                      {post.resourceType}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {post.resourceUrl && (
              <button 
                onClick={() => window.open(post.resourceUrl!, '_blank')}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Open Resource
              </button>
            )}
          </div>
        );

      case "RESEARCH":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Microscope className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Research</p>
                {post.researchField && (
                  <p className="text-xs text-gray-600">Field: {post.researchField}</p>
                )}
                {post.researchCollaborators && (
                  <p className="text-xs text-gray-600 mt-1">
                    Collaborators: {post.researchCollaborators}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case "REFLECTION":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Personal Reflection</p>
                <p className="text-xs text-gray-600">A moment of introspection</p>
              </div>
            </div>
          </div>
        );

      case "COLLABORATION":
        return (
          <div className="mt-4 p-4 bg-gradient-to-br from-cyan-50 to-sky-50 rounded-lg border border-cyan-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Team Collaboration</p>
                <p className="text-xs text-gray-600">Work together, achieve more</p>
              </div>
            </div>
          </div>
        );
    }
    return null;
  };

  const contentText = post.content;
  const isLongContent = contentText.length > 300;
  const displayContent =
    isLongContent && !showFullContent
      ? contentText.slice(0, 300) + "..."
      : contentText;

  // Generate random XP and streak for demo (you should get this from backend)
  const demoXP = Math.floor(Math.random() * 100) + 10;
  const demoStreak = Math.floor(Math.random() * 10) + 1;
  const isVerifiedUser =
    post.author.role === "TEACHER" || post.author.role === "ADMIN";
  const userLevel = Math.floor(Math.random() * 10) + 1;

  return (
    <article className="relative group mb-4">
      {/* Card with beautiful shadow */}
      <div className="relative bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
        {/* Header */}
        <div className="relative px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Author Info - Instagram style */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <GradientAvatar
                name={getAuthorName()}
                imageUrl={post.author.profilePictureUrl || null} // ✅ FIXED: Use actual profile picture
                size="md"
                isOnline={true}
                onClick={() => onProfileClick?.(post.authorId)}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onProfileClick?.(post.authorId)}
                    className="font-semibold text-gray-900 font-koulen hover:text-gray-600 transition-colors text-sm truncate"
                  >
                    {getAuthorName()}
                  </button>
                  {isVerifiedUser && (
                    <svg
                      className="w-3.5 h-3.5 text-blue-500 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>{getTimeAgo()}</span>
                </div>
              </div>
            </div>

            {/* Post Type Badge & Menu - Balanced padding */}
            <div className="flex items-center gap-2 -mr-1">
              {/* Minimal Type Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-full border border-gray-200">
                <PostTypeIcon
                  className="w-3.5 h-3.5"
                  style={{ color: postTypeInfo.color }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: postTypeInfo.color }}
                >
                  {postTypeInfo.label}
                </span>
              </div>

              {/* Menu - Cleaner */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-20 min-w-[200px]">
                    {isOwnPost ? (
                      <>
                        <button
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
                          onClick={() => {
                            setShowMenu(false);
                            router.push(`/feed/edit/${post.id}`);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <Flag className="w-4 h-4" />
                          Report
                        </button>
                        <button
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <Bookmark className="w-4 h-4" />
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Media Gallery - YouTube thumbnail style (16:9 landscape) */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="px-4">
            <div
              className="relative w-full bg-black rounded-2xl overflow-hidden"
              style={{ height: "220px" }}
            >
              <img
                src={post.mediaUrls[currentImageIndex]}
                alt="Post media"
                className="w-full h-full object-cover"
              />

              {post.mediaUrls.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>

                  {/* Minimal dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {post.mediaUrls.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? "bg-white w-6"
                            : "bg-white/60 w-1.5 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content Section - Cleaner - Clickable (except for polls) */}
        {post.postType !== "POLL" ? (
          <Link 
            href={`/feed/post/${post.id}`}
            prefetch={true}
            className="block relative px-4 py-3 transition-colors cursor-pointer hover:bg-gray-50/50"
          >
            {/* Title - Cleaner typography */}
            <h4 className="font-semibold text-gray-900 text-sm leading-snug mb-1">
              {post.content.split("\n")[0] || postTypeInfo.label}
            </h4>

            {/* Description */}
            {post.content.split("\n").slice(1).join("\n") && (
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {displayContent.split("\n").slice(1).join("\n")}
                </p>
                {isLongContent && (
                  <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="text-gray-500 hover:text-gray-700 font-medium text-sm mt-1"
                >
                  {showFullContent ? "less" : "more"}
                </button>
              )}
            </div>
          )}

          {/* Minimal Knowledge Points */}
          <KnowledgePoints
            xp={demoXP}
            streak={demoStreak}
            isVerified={isVerifiedUser}
            isTrending={likesCount > 20}
            className="mt-2"
          />

          {/* Type-Specific Content */}
          {renderTypeSpecificContent()}

          {/* Feature/Insights Buttons */}
          {(post.postType === "ARTICLE" || post.postType === "COURSE") && (
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2.5 px-3 bg-white/80 backdrop-blur-sm border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-amber-700 flex items-center justify-center gap-2 transition-all group hover:scale-105 hover:shadow-md">
                <Star className="w-4 h-4 group-hover:fill-amber-400 group-hover:text-amber-500 group-hover:rotate-12 transition-all" />
                Feature
              </button>
              <button className="flex-1 py-2.5 px-3 bg-white/80 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-700 flex items-center justify-center gap-2 transition-all group hover:scale-105 hover:shadow-md">
                <BarChart3 className="w-4 h-4 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
                Insights
              </button>
            </div>
          )}
          </Link>
        ) : (
          <div className="relative px-4 py-3">
            {/* Title - Cleaner typography */}
            <h4 className="font-semibold text-gray-900 text-sm leading-snug mb-1">
              {post.content.split("\n")[0] || postTypeInfo.label}
            </h4>

            {/* Description */}
            {post.content.split("\n").slice(1).join("\n") && (
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {displayContent.split("\n").slice(1).join("\n")}
                </p>
                {isLongContent && (
                  <button
                    onClick={() => setShowFullContent(!showFullContent)}
                    className="text-gray-500 hover:text-gray-700 font-medium text-sm mt-1"
                  >
                    {showFullContent ? "less" : "more"}
                  </button>
                )}
              </div>
            )}

            {/* Minimal Knowledge Points */}
            <KnowledgePoints
              xp={demoXP}
              streak={demoStreak}
              isVerified={isVerifiedUser}
              isTrending={likesCount > 20}
              className="mt-2"
            />

            {/* Type-Specific Content */}
            {renderTypeSpecificContent()}

            {/* Feature/Insights Buttons */}
            {(post.postType === "ARTICLE" || post.postType === "COURSE") && (
              <div className="flex gap-2 mt-4">
                <button className="flex-1 py-2.5 px-3 bg-white/80 backdrop-blur-sm border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-amber-700 flex items-center justify-center gap-2 transition-all group hover:scale-105 hover:shadow-md">
                  <Star className="w-4 h-4 group-hover:fill-amber-400 group-hover:text-amber-500 group-hover:rotate-12 transition-all" />
                  Feature
                </button>
                <button className="flex-1 py-2.5 px-3 bg-white/80 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-700 flex items-center justify-center gap-2 transition-all group hover:scale-105 hover:shadow-md">
                  <BarChart3 className="w-4 h-4 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
                  Insights
                </button>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Engagement Section - Beautiful with gradients */}
        <div className="relative px-4 pb-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            {/* Like Button - Gradient background */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm transition-all duration-300 ${
                isLiked
                  ? "bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100"
                  : "hover:bg-gray-50"
              }`}
            >
              <Heart
                className={`w-5 h-5 transition-all ${
                  isLiked
                    ? "fill-red-500 text-red-500 animate-heart-beat"
                    : "text-gray-700"
                }`}
              />
              <span
                className={`font-semibold ${isLiked ? "text-red-600" : "text-gray-900"}`}
              >
                {likesCount}
              </span>
            </button>

            {/* Comment Button - Gradient background */}
            <button
              onClick={() => setShowCommentsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50"
            >
              <MessageCircle className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-900">
                {commentsCount}
              </span>
            </button>

            {/* Analytics Button - Own Posts Only */}
            {isOwnPost && (
              <button
                onClick={() => setShowAnalyticsModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50"
                title="View Analytics"
              >
                <BarChart3 className="w-5 h-5 text-gray-700" />
                <span className="font-semibold text-gray-900 text-xs">Analytics</span>
              </button>
            )}

            {/* Share Button - Gradient background */}
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50">
              <Share2 className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-900">
                {post.sharesCount}
              </span>
            </button>

            {/* Bookmark Button - Right aligned with gradient */}
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`ml-auto p-2 rounded-xl transition-all duration-300 ${
                isBookmarked
                  ? "bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100"
                  : "hover:bg-gray-50"
              }`}
            >
              <Bookmark
                className={`w-5 h-5 ${
                  isBookmarked ? "fill-amber-500 text-amber-500" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsDrawer
        postId={post.id}
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        initialCommentsCount={commentsCount}
      />

      {/* Analytics Modal - Own Posts Only */}
      {isOwnPost && (
        <AnalyticsModal
          postId={post.id}
          isOpen={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </article>
  );
}
