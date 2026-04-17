'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Star,
  ChevronRight,
  Play,
  CheckCircle,
  Lock,
  Award,
  BarChart3,
  FileText,
  Video,
  Download,
  Share2,
  Bookmark,
  Search,
  ArrowLeft,
  Target,
  Zap,
  Code,
  Calculator,
  HelpCircle,
  PenTool,
  Briefcase,
  Mic,
  Beaker,
  Languages,
  Brain,
  Globe,
  Music,
  Palette,
  Sparkles,
} from 'lucide-react';
import { CourseReviews } from '@/components/learn/CourseReviews';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { buildRouteDataCacheKey, readRouteDataCache, writeRouteDataCache } from '@/lib/route-data-cache';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

// ============================================
// INTERFACES
// ============================================

interface Instructor {
  id: string;
  name: string;
  avatar: string | null;
  title: string | null;
  bio: string | null;
}

interface Lesson {
  id: string;
  title: string;
  type?: string;
  description: string | null;
  duration: number;
  order: number;
  isFree: boolean;
  isCompleted: boolean;
  isLocked: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  category: string;
  level: string;
  duration: number;
  lessonsCount: number;
  enrolledCount: number;
  rating: number;
  reviewsCount: number;
  price: number;
  isFree: boolean;
  isFeatured: boolean;
  tags: string[];
  instructor: Instructor;
  sections: {
    id: string;
    title: string;
    lessons: Lesson[];
  }[];
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}

interface Enrollment {
  progress: number;
  enrolledAt: string;
  lastAccessedAt: string;
  certificateUrl?: string;
  resumeLessonId?: string | null;
  resumeLessonTitle?: string | null;
  resumeUpdatedAt?: string | null;
}

interface CachedCourseDetailPayload {
  course: Course;
  enrollment: Enrollment | null;
  isEnrolled: boolean;
}

interface RecentLessonSession {
  lessonId: string;
  title: string;
  updatedAt: string;
}

// ============================================
// CONSTANTS
// ============================================

const FEED_SERVICE = LEARN_SERVICE_URL;
const COURSE_DETAIL_CACHE_TTL_MS = 60 * 1000;
const RECENT_LESSON_STORAGE_PREFIX = 'stunity-recent-lesson';
const SAVED_COURSES_STORAGE_PREFIX = 'stunity-saved-courses';
const LESSON_BOOKMARKS_STORAGE_PREFIX = 'stunity-lesson-bookmarks';

const LEVEL_COLORS: Record<string, string> = {
  'BEGINNER': 'bg-green-100 text-green-700',
  'INTERMEDIATE': 'bg-blue-100 text-blue-700',
  'ADVANCED': 'bg-purple-100 text-purple-700',
  'ALL_LEVELS': 'bg-gray-100 text-gray-700',
};

const CATEGORY_ICONS: Record<string, any> = {
  'Programming': Code,
  'Data Science': BarChart3,
  'Machine Learning': Brain,
  'Mobile Development': Zap,
  'Mathematics': Calculator,
  'Science': Beaker,
  'Languages': Languages,
  'Business': Briefcase,
  'Design': PenTool,
  'Database': BookOpen,
  'Cloud Computing': Globe,
  'Music': Music,
  'Art': Palette,
  'Technology': Zap,
  'Personal Development': Brain,
};

const clampProgress = (value: number | null | undefined) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(100, Math.max(0, numericValue));
};

const formatProgressPercent = (value: number | null | undefined) => `${Math.round(clampProgress(value))}%`;

const getCourseLessonCollection = (course: Course | null) => {
  if (!course) return [];

  const sectionLessons = (course.sections || []).flatMap((section) => section.lessons || []);
  const looseLessons = course.lessons || [];
  const orderedLessons = [...sectionLessons, ...looseLessons];
  const seen = new Set<string>();

  return orderedLessons.filter((lesson) => {
    if (!lesson?.id || seen.has(lesson.id)) return false;
    seen.add(lesson.id);
    return true;
  });
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const courseId = params?.id as string;

  // State
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews'>('overview');
  const [enrolling, setEnrolling] = useState(false);
  const [isSavedCourse, setIsSavedCourse] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [recentLessonSession, setRecentLessonSession] = useState<RecentLessonSession | null>(null);
  const [bookmarkedLessonIds, setBookmarkedLessonIds] = useState<string[]>([]);
  const [curriculumQuery, setCurriculumQuery] = useState('');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);
  const getCurrentUserId = useCallback(() => {
    if (typeof window === 'undefined') return 'guest';
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return 'guest';
      const parsedUser = JSON.parse(rawUser);
      const user = typeof parsedUser === 'string' ? JSON.parse(parsedUser) : parsedUser;
      return user?.id || 'guest';
    } catch {
      return 'guest';
    }
  }, []);
  const courseCacheKey = buildRouteDataCacheKey('learn', 'course-detail', locale, courseId, getCurrentUserId());
  const recentLessonStorageKey = `${RECENT_LESSON_STORAGE_PREFIX}:${getCurrentUserId()}:${courseId}`;
  const savedCoursesStorageKey = `${SAVED_COURSES_STORAGE_PREFIX}:${getCurrentUserId()}`;
  const lessonBookmarksStorageKey = `${LESSON_BOOKMARKS_STORAGE_PREFIX}:${getCurrentUserId()}:${courseId}`;
  const persistLocalLessonBookmarks = useCallback((lessonIds: string[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(lessonBookmarksStorageKey, JSON.stringify(lessonIds));
    setBookmarkedLessonIds(lessonIds);
  }, [lessonBookmarksStorageKey]);

  // Fetch course details
  const fetchCourse = useCallback(async () => {
    try {
      const cachedPayload = readRouteDataCache<CachedCourseDetailPayload>(courseCacheKey, COURSE_DETAIL_CACHE_TTL_MS);
      if (cachedPayload?.course) {
        setCourse(cachedPayload.course);
        setIsEnrolled(Boolean(cachedPayload.isEnrolled));
        setEnrollment(cachedPayload.enrollment || null);
        setLoading(false);
      }

      const token = getAuthToken();
      if (!token) {
        router.push(`/${locale}/login`);
        return;
      }

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}?locale=${locale}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        setIsEnrolled(data.isEnrolled);
        setEnrollment(data.enrollment);
        writeRouteDataCache<CachedCourseDetailPayload>(courseCacheKey, {
          course: data.course,
          enrollment: data.enrollment ?? null,
          isEnrolled: Boolean(data.isEnrolled),
        });
      } else {
        console.error('Course not found');
        router.push(`/${locale}/learn`);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  }, [courseCacheKey, courseId, getAuthToken, locale, router]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, fetchCourse]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawRecentLesson = window.localStorage.getItem(recentLessonStorageKey);
      if (rawRecentLesson) {
        const parsed = JSON.parse(rawRecentLesson) as RecentLessonSession;
        if (parsed?.lessonId) {
          setRecentLessonSession(parsed);
        }
      }

      const rawSavedCourses = window.localStorage.getItem(savedCoursesStorageKey);
      if (rawSavedCourses) {
        const parsed = JSON.parse(rawSavedCourses) as string[];
        setIsSavedCourse(Array.isArray(parsed) && parsed.includes(courseId));
      } else {
        setIsSavedCourse(false);
      }

      const rawBookmarkedLessons = window.localStorage.getItem(lessonBookmarksStorageKey);
      if (rawBookmarkedLessons) {
        const parsed = JSON.parse(rawBookmarkedLessons) as string[];
        setBookmarkedLessonIds(Array.isArray(parsed) ? parsed : []);
      } else {
        setBookmarkedLessonIds([]);
      }
    } catch {
      setRecentLessonSession(null);
      setIsSavedCourse(false);
      setBookmarkedLessonIds([]);
    }
  }, [courseId, lessonBookmarksStorageKey, recentLessonStorageKey, savedCoursesStorageKey]);

  useEffect(() => {
    if (!shareFeedback) return;
    const timeout = window.setTimeout(() => setShareFeedback(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [shareFeedback]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isCancelled = false;

    const syncLessonBookmarks = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/bookmarks`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch bookmarks: ${response.status}`);
        }

        const data = await response.json();
        const remoteLessonIds = Array.isArray(data?.lessonIds) ? data.lessonIds : [];
        const rawLocalBookmarks = window.localStorage.getItem(lessonBookmarksStorageKey);
        const localLessonIds = rawLocalBookmarks ? (JSON.parse(rawLocalBookmarks) as string[]) : [];
        const mergedLessonIds = Array.from(new Set([...(Array.isArray(localLessonIds) ? localLessonIds : []), ...remoteLessonIds]));

        if (!isCancelled) {
          persistLocalLessonBookmarks(mergedLessonIds);
        }

        const missingRemoteLessonIds = mergedLessonIds.filter((lessonId) => !remoteLessonIds.includes(lessonId));
        if (missingRemoteLessonIds.length > 0) {
          await Promise.all(
            missingRemoteLessonIds.map((lessonId) =>
              fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}/bookmark`, {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bookmarked: true }),
              })
            )
          );
        }
      } catch (error) {
        console.error('Error syncing lesson bookmarks:', error);
      }
    };

    void syncLessonBookmarks();

    return () => {
      isCancelled = true;
    };
  }, [courseId, getAuthToken, lessonBookmarksStorageKey, persistLocalLessonBookmarks]);

  // Enroll in course
  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setIsEnrolled(true);
        fetchCourse(); // Refresh course data
      }
    } catch (err) {
      console.error('Error enrolling:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleToggleSavedCourse = () => {
    if (typeof window === 'undefined') return;

    try {
      const rawSavedCourses = window.localStorage.getItem(savedCoursesStorageKey);
      const savedCourseIds = rawSavedCourses ? (JSON.parse(rawSavedCourses) as string[]) : [];
      const nextSavedCourses = isSavedCourse
        ? savedCourseIds.filter((savedCourseId) => savedCourseId !== courseId)
        : Array.from(new Set([...savedCourseIds, courseId]));

      window.localStorage.setItem(savedCoursesStorageKey, JSON.stringify(nextSavedCourses));
      setIsSavedCourse(!isSavedCourse);
      setShareFeedback(isSavedCourse ? 'Removed from saved courses' : 'Saved to your learning list');
    } catch (error) {
      console.error('Error saving course:', error);
      setShareFeedback('Could not update saved courses');
    }
  };

  const handleShareCourse = async () => {
    if (typeof window === 'undefined') return;

    const shareUrl = `${window.location.origin}/${locale}/learn/course/${courseId}`;
    const shareData = {
      title: course?.title || 'Course',
      text: course?.description || 'Explore this course on Stunity.',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback('Course link shared');
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback('Course link copied');
    } catch (error) {
      console.error('Error sharing course:', error);
      setShareFeedback('Unable to share course');
    }
  };

  const handleToggleLessonBookmark = async (lessonId: string) => {
    if (typeof window === 'undefined') return;

    const willBookmark = !bookmarkedLessonIds.includes(lessonId);
    const nextBookmarkedLessonIds = willBookmark
      ? [...bookmarkedLessonIds, lessonId]
      : bookmarkedLessonIds.filter((id) => id !== lessonId);

    try {
      persistLocalLessonBookmarks(nextBookmarkedLessonIds);

      const token = getAuthToken();
      if (!token) {
        setShareFeedback(willBookmark ? 'Lesson saved on this device' : 'Lesson removed on this device');
        return;
      }

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}/bookmark`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookmarked: willBookmark }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update bookmark: ${response.status}`);
      }

      setShareFeedback(willBookmark ? 'Lesson saved to your account' : 'Lesson removed from saved lessons');
    } catch (error) {
      console.error('Error updating lesson bookmarks:', error);
      setShareFeedback(willBookmark ? 'Saved locally. Account sync will retry later.' : 'Removed locally. Account sync will retry later.');
    }
  };

  // Get first incomplete lesson or first lesson
  const getNextLesson = () => {
    const lessons = getCourseLessonCollection(course);
    if (!lessons.length) return null;
    const incomplete = lessons.find((lesson) => !lesson.isCompleted && !lesson.isLocked);
    return incomplete || lessons.find((lesson) => !lesson.isLocked) || lessons[0];
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate total duration from lessons
  const getTotalDuration = () => {
    const lessons = getCourseLessonCollection(course);
    if (!lessons.length) return course?.duration || 0;
    return lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0);
  };

  // Get completed lessons count
  const getCompletedCount = () => {
    const lessons = getCourseLessonCollection(course);
    if (!lessons.length) return 0;
    return lessons.filter((lesson) => lesson.isCompleted).length;
  };

  const CategoryIcon = course ? (CATEGORY_ICONS[course.category] || BookOpen) : BookOpen;

  const getLessonIcon = (type: string, isCompleted: boolean, isLocked: boolean) => {
    if (isCompleted) return <CheckCircle className="w-5 h-5" />;
    if (isLocked) return <Lock className="w-5 h-5" />;
    
    switch (type) {
      case 'ARTICLE': return <FileText className="w-5 h-5" />;
      case 'QUIZ': return <HelpCircle className="w-5 h-5" />;
      case 'ASSIGNMENT': return <PenTool className="w-5 h-5" />;
      case 'EXERCISE': return <Code className="w-5 h-5" />;
      case 'CASE_STUDY': return <Briefcase className="w-5 h-5" />;
      case 'AUDIO': return <Mic className="w-5 h-5" />;
      case 'VIDEO':
      default: return <Play className="w-5 h-5" />;
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <UnifiedNavigation />
        <div className="flex items-center justify-center px-4 py-24">
          <FeedInlineLoader size="lg" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Course not found</h2>
          <Link href={`/${locale}/learn`} className="text-amber-600 dark:text-amber-300 hover:underline mt-2 inline-block">
            Back to Learn Hub
          </Link>
        </div>
      </div>
    );
  }

  const nextLesson = getNextLesson();
  const allLessons = getCourseLessonCollection(course);
  const enrollmentResumeLesson =
    enrollment?.resumeLessonId
      ? allLessons.find((lesson) => lesson.id === enrollment.resumeLessonId && !lesson.isLocked)
      : null;
  const localRecentResumeLesson =
    recentLessonSession?.lessonId
      ? allLessons.find((lesson) => lesson.id === recentLessonSession.lessonId && !lesson.isLocked)
      : null;
  const resumeLesson = enrollmentResumeLesson || localRecentResumeLesson || nextLesson;
  const resumeTimestamp = enrollment?.resumeUpdatedAt || recentLessonSession?.updatedAt || null;
  const hasResumeContext = Boolean(enrollmentResumeLesson || localRecentResumeLesson);
  const curriculumSections = course.sections?.length
    ? course.sections
    : [{ id: 'flat-lessons', title: 'Course Lessons', lessons: course.lessons }];
  const completedLessons = getCompletedCount();
  const progressValue = clampProgress(enrollment?.progress);
  const learningOutcomes = [
    `Build a confident foundation in ${course.title}.`,
    `Move through ${curriculumSections.length} structured sections with a clear sense of progression.`,
    `Connect ${course.tags.slice(0, 2).join(' and ') || course.category.toLowerCase()} to practical decisions and execution.`,
    'Learn through a blend of lessons, checkpoints, and applied work instead of passive scrolling.',
    'Keep momentum with saved state, bookmarks, and progress-aware resume flow.',
    'Finish with a completion signal you can carry into your next project or role.',
  ];
  const lessonTypeCounts = allLessons.reduce<Record<string, number>>((acc, lesson) => {
    const typeKey = String(lesson.type || 'VIDEO').toUpperCase();
    acc[typeKey] = (acc[typeKey] || 0) + 1;
    return acc;
  }, {});
  const freePreviewCount = allLessons.filter((lesson) => lesson.isFree).length;
  const totalFormats = Object.keys(lessonTypeCounts).length;
  const updatedLabel = new Date(course.updatedAt).toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const isBilingualCourse = course.description.toLowerCase().includes('bilingual');
  const lessonMix = [
    lessonTypeCounts.VIDEO ? { label: `${lessonTypeCounts.VIDEO} video lesson${lessonTypeCounts.VIDEO === 1 ? '' : 's'}`, icon: Video } : null,
    lessonTypeCounts.ARTICLE ? { label: `${lessonTypeCounts.ARTICLE} guided reading${lessonTypeCounts.ARTICLE === 1 ? '' : 's'}`, icon: FileText } : null,
    lessonTypeCounts.QUIZ ? { label: `${lessonTypeCounts.QUIZ} checkpoint${lessonTypeCounts.QUIZ === 1 ? '' : 's'}`, icon: HelpCircle } : null,
    lessonTypeCounts.ASSIGNMENT ? { label: `${lessonTypeCounts.ASSIGNMENT} assignment${lessonTypeCounts.ASSIGNMENT === 1 ? '' : 's'}`, icon: PenTool } : null,
    lessonTypeCounts.EXERCISE ? { label: `${lessonTypeCounts.EXERCISE} interactive exercise${lessonTypeCounts.EXERCISE === 1 ? '' : 's'}`, icon: Code } : null,
    lessonTypeCounts.AUDIO ? { label: `${lessonTypeCounts.AUDIO} audio session${lessonTypeCounts.AUDIO === 1 ? '' : 's'}`, icon: Mic } : null,
  ].filter((item): item is { label: string; icon: any } => Boolean(item));
  const spotlightLesson = resumeLesson || allLessons.find((lesson) => lesson.isFree) || allLessons[0] || null;
  const experiencePillars = [
    {
      title: 'Structured journey',
      description: `${curriculumSections.length} curated section${curriculumSections.length === 1 ? '' : 's'} move from foundation to application instead of dumping everything at once.`,
      icon: Target,
    },
    {
      title: 'Mixed learning modes',
      description: lessonMix.length > 0
        ? `The experience blends ${lessonMix.slice(0, 2).map((item) => item.label.toLowerCase()).join(' plus ')} to keep pacing varied.`
        : 'The experience mixes explanation, practice, and proof points to keep momentum high.',
      icon: Sparkles,
    },
    {
      title: 'Momentum built in',
      description: 'Progress tracking, lesson bookmarks, and certificate-ready completion make the course feel accountable and premium.',
      icon: Award,
    },
  ];
  const heroHighlights = [
    { label: 'Updated', value: updatedLabel },
    { label: 'Formats', value: `${totalFormats} mode${totalFormats === 1 ? '' : 's'}` },
    { label: 'Preview', value: `${freePreviewCount} open` },
  ];
  const statTiles = [
    {
      label: 'Rating',
      value: course.rating.toFixed(1),
      detail: 'Learner score',
      icon: Star,
    },
    {
      label: 'Learners',
      value: course.enrolledCount.toLocaleString(),
      detail: 'Active enrollments',
      icon: BarChart3,
    },
    {
      label: 'Runtime',
      value: formatDuration(getTotalDuration()),
      detail: 'Guided pacing',
      icon: Clock,
    },
    {
      label: 'Lessons',
      value: course.lessonsCount.toString(),
      detail: 'Structured steps',
      icon: BookOpen,
    },
  ];
  const premiumTheme = {
    '--course-bg': '#f4efe6',
    '--course-panel': '#fffdf8',
    '--course-accent': '#f97316',
    '--course-accent-soft': '#fef0d8',
    '--course-ink': '#162033',
  } as CSSProperties;
  const trustSignals = [
    `${course.reviewsCount.toLocaleString()} learner review${course.reviewsCount === 1 ? '' : 's'}`,
    `${course.enrolledCount.toLocaleString()} active learner${course.enrolledCount === 1 ? '' : 's'}`,
    `${formatDuration(getTotalDuration())} guided runtime`,
  ];
  const heroSupportBadges = [
    course.isFree ? 'Free access' : null,
    isBilingualCourse ? 'Bilingual flow' : null,
    `${curriculumSections.length} curated section${curriculumSections.length === 1 ? '' : 's'}`,
  ].filter((item): item is string => Boolean(item));
  const normalizedCurriculumQuery = curriculumQuery.trim().toLowerCase();
  const filteredCurriculumSections = curriculumSections
    .map((section) => ({
      ...section,
      lessons: section.lessons.filter((lesson) => {
        const matchesQuery =
          !normalizedCurriculumQuery ||
          lesson.title.toLowerCase().includes(normalizedCurriculumQuery) ||
          (lesson.description || '').toLowerCase().includes(normalizedCurriculumQuery) ||
          (lesson.type || '').toLowerCase().includes(normalizedCurriculumQuery);
        const matchesBookmark = !showBookmarkedOnly || bookmarkedLessonIds.includes(lesson.id);
        return matchesQuery && matchesBookmark;
      }),
    }))
    .filter((section) => section.lessons.length > 0);

  return (
    <div style={premiumTheme} className="course-stage min-h-screen bg-[var(--course-bg)] text-[var(--course-ink)] dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <UnifiedNavigation />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.35),transparent_40%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_30%),linear-gradient(180deg,rgba(255,251,235,0.95),rgba(244,239,230,0))] dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_35%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0))]" />
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/10" />
        <div className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-500/10" />
        <div className="pointer-events-none absolute inset-x-0 top-28 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent dark:via-amber-500/20" />

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="reveal-item reveal-1 mb-6 flex flex-wrap items-center gap-2 rounded-full border border-amber-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <Link href={`/${locale}/learn`} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-slate-700 transition hover:text-orange-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-orange-200">
              <ArrowLeft className="h-3.5 w-3.5" />
              Learn Hub
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span>{course.category}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="max-w-[220px] truncate font-semibold text-slate-800 dark:text-slate-200 sm:max-w-none">{course.title}</span>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-6">
              <div className="premium-panel reveal-item reveal-2 relative overflow-hidden rounded-[2.25rem] border border-amber-100/80 bg-[var(--course-panel)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] transition-colors dark:border-slate-800 dark:bg-slate-900/90 sm:p-8">
                <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full bg-orange-300/25 blur-2xl dark:bg-orange-500/20" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-cyan-200/35 blur-2xl dark:bg-cyan-500/10" />
                <div
                  className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-35"
                  style={{
                    backgroundImage:
                      'linear-gradient(115deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.05) 34%), repeating-linear-gradient(-35deg, rgba(249,115,22,0.08) 0 1px, transparent 1px 18px)',
                  }}
                />

                <div className="relative grid gap-6 2xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                        <CategoryIcon className="h-3.5 w-3.5 text-orange-600 dark:text-orange-300" />
                        {course.category}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${LEVEL_COLORS[course.level] || 'bg-gray-100 text-gray-700'}`}>
                        {course.level.replace('_', ' ')}
                      </span>
                      {course.isFeatured && (
                        <span className="rounded-full border border-orange-300/50 bg-orange-100/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                          Featured Masterclass
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-700/90 dark:text-orange-300">Signature Learning Path</p>
                      <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.04em] text-slate-950 dark:text-white md:text-5xl 2xl:text-6xl">
                        {course.title}
                      </h1>
                      <p className="max-w-3xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                        {course.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {heroSupportBadges.map((badge) => (
                          <span key={badge} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {statTiles.map((tile) => {
                        return (
                          <div key={tile.label} className="stat-tile rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{tile.label}</p>
                            <p className="mt-2 text-3xl font-black leading-none text-slate-900 dark:text-white">{tile.value}</p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tile.detail}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {trustSignals.map((signal) => (
                        <p key={signal} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400/90 dark:bg-orange-300" />
                          <span>{signal}</span>
                        </p>
                      ))}
                    </div>

                    <div className="insight-band grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white/80 px-5 py-4 text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-white md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-300">Course snapshot</p>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                          Structured path, mixed formats, and clear progress cues so learners can commit with confidence.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {heroHighlights.map((item) => (
                          <div key={item.label} className="hero-highlight rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                            <span className="text-slate-500 dark:text-slate-400">{item.label}:</span> {item.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/95 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">Inside this experience</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">A sharper, more guided course journey.</h2>
                      <div className="mt-4 space-y-3">
                        {experiencePillars.map((pillar) => {
                          const PillarIcon = pillar.icon;
                          return (
                            <div key={pillar.title} className="insight-card flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 text-orange-200">
                                <PillarIcon className="h-[18px] w-[18px]" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white">{pillar.title}</p>
                                <p className="mt-1 text-xs leading-6 text-slate-300">{pillar.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {course.tags.slice(0, 5).map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200/90 bg-white/85 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/75">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-300 to-amber-400 text-lg font-black text-amber-950">
                          {course.instructor?.avatar ? (
                            <img src={course.instructor.avatar} alt={course.instructor.name || 'Instructor'} className="h-full w-full rounded-2xl object-cover" />
                          ) : (
                            (course.instructor?.name || 'I').charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Lead Instructor</p>
                          <p className="truncate text-xl font-bold text-slate-900 dark:text-white">{course.instructor?.name || 'Instructor'}</p>
                          <p className="text-sm text-orange-700 dark:text-orange-200">{course.instructor?.title || 'Course Instructor'}</p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Updated {updatedLabel}</p>
                        </div>
                      </div>

                      {spotlightLesson && (
                        <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50/85 p-4 dark:border-slate-700 dark:bg-slate-950/70">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                              {isEnrolled ? (hasResumeContext ? 'Resume from here' : 'Start with this lesson') : spotlightLesson.isFree ? 'Preview lesson' : 'Featured lesson'}
                            </p>
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {formatDuration(spotlightLesson.duration)}
                            </span>
                          </div>
                          <div className="mt-3 flex items-start gap-3">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-200">
                              {getLessonIcon(spotlightLesson.type || 'VIDEO', !!spotlightLesson.isCompleted, !!spotlightLesson.isLocked)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{spotlightLesson.title}</p>
                              {spotlightLesson.description && (
                                <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{spotlightLesson.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="reveal-item reveal-3 grid gap-4 md:grid-cols-3">
                {experiencePillars.map((pillar) => {
                  const PillarIcon = pillar.icon;
                  return (
                    <div key={pillar.title} className="premium-surface rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-200">
                        <PillarIcon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{pillar.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{pillar.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="xl:sticky xl:top-24">
              <div className="premium-sidebar reveal-item reveal-3 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900">
                <div className="relative h-64 overflow-hidden bg-slate-200 dark:bg-slate-800">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-200/60 via-slate-100 to-cyan-200/50 dark:from-amber-500/25 dark:via-slate-900 dark:to-cyan-500/20">
                      <CategoryIcon className="h-20 w-20 text-amber-100 dark:text-amber-200/70" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 78% 10%, rgba(255,255,255,0.45), transparent 42%), linear-gradient(180deg, transparent 28%, rgba(15,23,42,0.74) 100%)' }} />
                  <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/40 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                    {formatDuration(getTotalDuration())}
                  </div>
                  <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-white/40 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                    {course.lessonsCount} lessons
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="play-orb relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-orange-600 shadow-xl shadow-slate-900/30">
                      <Play className="ml-0.5 h-6 w-6" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-8">
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                      <Sparkles className="h-3.5 w-3.5 text-orange-300" />
                      Studio Preview
                    </p>
                    <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-white 2xl:text-2xl">Course access with marketplace-grade clarity.</h2>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-5 p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {isEnrolled ? 'Your progress' : 'Enrollment'}
                    </p>
                    <p className="mt-1 text-4xl font-black text-slate-900 dark:text-white">
                      {isEnrolled ? formatProgressPercent(enrollment?.progress) : (course.isFree ? 'Free' : `$${course.price}`)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {isEnrolled
                        ? `${completedLessons} of ${course.lessonsCount} lessons completed`
                        : 'Instant access with structured pacing and saved progress'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Preview</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{freePreviewCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Formats</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{totalFormats}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sections</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{curriculumSections.length}</p>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/70">
                    {isEnrolled ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            {hasResumeContext ? 'Resume lesson' : 'Next lesson'}
                          </p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                            {Math.max(course.lessonsCount - completedLessons, 0)} left
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {resumeLesson ? resumeLesson.title : 'You completed the journey. Certificate ready.'}
                        </p>
                        {resumeTimestamp && resumeLesson && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Last opened {new Date(resumeTimestamp).toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                        <div className="relative h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/80">
                          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--course-accent)] to-orange-500" style={{ width: `${progressValue}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                        <p className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          Full course access in one click
                        </p>
                        <p className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          Saved progress, bookmarks, and clear lesson pacing
                        </p>
                        <p className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          Completion signal ready when the course is finished
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.5rem] border border-orange-100 bg-[var(--course-accent-soft)] p-4 text-sm dark:border-orange-500/20 dark:bg-orange-500/10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">What you unlock</p>
                    <div className="mt-3 space-y-2 text-slate-700 dark:text-slate-200">
                      {lessonMix.slice(0, 4).map((item) => {
                        const MixIcon = item.icon;
                        return (
                          <p key={item.label} className="flex items-center gap-2">
                            <MixIcon className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                            {item.label}
                          </p>
                        );
                      })}
                      <p className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                        Completion certificate and lifetime access
                      </p>
                    </div>
                  </div>

                  {enrollment?.progress === 100 && enrollment.certificateUrl && (
                    <Link
                      href={enrollment.certificateUrl}
                      target="_blank"
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                    >
                      <Award className="h-4 w-4" />
                      Open Certificate
                    </Link>
                  )}

                  <div className="mt-auto space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                    {isEnrolled ? (
                      resumeLesson ? (
                        <Link
                          href={`/${locale}/learn/course/${courseId}/lesson/${resumeLesson.id}`}
                          className="premium-cta flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--course-accent)] to-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:brightness-105"
                        >
                          <Play className="h-4 w-4" />
                          {hasResumeContext ? 'Resume Lesson' : enrollment?.progress === 0 ? 'Start Journey' : 'Continue Journey'}
                        </Link>
                      ) : (
                        <button disabled className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-slate-700">
                          Lessons coming soon
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="premium-cta flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--course-accent)] to-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {enrolling ? 'Enrolling...' : 'Join This Course'}
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleShareCourse}
                        className="premium-chip-btn flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-orange-200"
                      >
                        <Share2 className="h-4 w-4" />
                        {shareFeedback === 'Course link copied' || shareFeedback === 'Course link shared' ? 'Copied' : 'Share'}
                      </button>
                      <button
                        onClick={handleToggleSavedCourse}
                        className={`premium-chip-btn flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          isSavedCourse
                            ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200'
                            : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-orange-200'
                        }`}
                      >
                        <Bookmark className="h-4 w-4" />
                        {isSavedCourse ? 'Saved' : 'Save'}
                      </button>
                    </div>

                    {shareFeedback && (
                      <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">{shareFeedback}</p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="reveal-item reveal-4 inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'curriculum', label: 'Curriculum' },
                  { key: 'reviews', label: 'Reviews' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      activeTab === tab.key
                        ? 'bg-gradient-to-r from-[var(--course-accent)] to-orange-500 text-white shadow-lg shadow-amber-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="premium-surface reveal-item reveal-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Transformation map</p>
                        <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">What learners should leave with.</h2>
                      </div>
                      <p className="max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
                        The page now tells a clearer before-and-after story instead of only listing course facts.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {learningOutcomes.map((outcome, index) => (
                        <div key={`${outcome}-${index}`} className="premium-lift rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition duration-300 dark:border-slate-800 dark:bg-slate-950/70">
                          <div className="mb-3 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-emerald-500/15 px-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{outcome}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="premium-surface reveal-item reveal-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Course story</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">A more persuasive narrative than a typical catalog card.</h2>
                      <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-300">{course.description}</p>
                      <div className="mt-6 rounded-[1.5rem] bg-slate-950 p-5 text-white">
                        <p className="text-sm leading-7 text-slate-300">
                          Learners should immediately understand the promise: what this course helps them become, how the path is paced, and why the experience is worth starting now.
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {trustSignals.map((signal) => (
                            <div key={signal} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
                              {signal}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="premium-surface reveal-item reveal-7 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Why this course lands</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">Built for clarity, progress, and commitment.</h2>
                      <div className="mt-5 space-y-3">
                        {experiencePillars.map((pillar) => {
                          const PillarIcon = pillar.icon;
                          return (
                            <div key={pillar.title} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-200">
                                  <PillarIcon className="h-[18px] w-[18px]" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{pillar.title}</p>
                                  <p className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{pillar.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="premium-surface reveal-item reveal-7 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Meet your instructor</p>
                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-300 to-amber-400 text-2xl font-black text-amber-950">
                            {course.instructor?.avatar ? (
                              <img src={course.instructor.avatar} alt={course.instructor.name || 'Instructor'} className="h-full w-full rounded-2xl object-cover" />
                            ) : (
                              (course.instructor?.name || 'I').charAt(0)
                            )}
                          </div>
                          <div>
                            <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">{course.instructor?.name || 'Instructor'}</h2>
                            <p className="text-sm text-orange-700 dark:text-orange-200">{course.instructor?.title || 'Course Instructor'}</p>
                            <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-600 dark:text-slate-300">
                              {course.instructor?.bio || 'An experienced mentor focused on helping learners turn knowledge into real-world confidence through guided pacing and practical application.'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Instructor signals</p>
                        <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                          <p className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                            {course.lessonsCount} structured lessons
                          </p>
                          <p className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-current text-orange-500 dark:text-orange-300" />
                            {course.rating.toFixed(1)} learner rating
                          </p>
                          <p className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                            Updated {updatedLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="premium-surface reveal-item reveal-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Curriculum architecture</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">A clearer lesson path with stronger pacing signals.</h2>
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {curriculumSections.length} sections • {course.lessonsCount} lessons
                    </span>
                  </div>

                  <div className="mb-6 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sections</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{curriculumSections.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Runtime</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{formatDuration(getTotalDuration())}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Previews</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{freePreviewCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bookmarked</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{bookmarkedLessonIds.length}</p>
                    </div>
                  </div>

                  <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <label className="relative block flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        value={curriculumQuery}
                        onChange={(event) => setCurriculumQuery(event.target.value)}
                        placeholder="Search lessons, topics, or formats..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </label>
                    <button
                      onClick={() => setShowBookmarkedOnly((current) => !current)}
                      className={`premium-chip-btn inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        showBookmarkedOnly
                          ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300'
                      }`}
                    >
                      <Bookmark className="h-4 w-4" />
                      Bookmarked only
                    </button>
                  </div>

                  <div className="relative space-y-5 pl-5">
                    <div className="pointer-events-none absolute bottom-2 left-[15px] top-6 w-px bg-slate-300 dark:bg-slate-700" />
                    {filteredCurriculumSections.map((section, sIndex) => (
                      <div key={section.id} className="relative">
                        <div className="absolute -left-5 top-6 h-3 w-3 rounded-full bg-amber-400 shadow-lg shadow-amber-500/40" />
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/70">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              Module {sIndex + 1}: {section.title}
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{section.lessons.length} lessons</span>
                          </div>

                          <div className="space-y-2">
                            {section.lessons.map((lesson, lIndex) => (
                              <div
                                key={lesson.id}
                                className={`premium-lesson-row flex w-full items-center gap-3 rounded-xl border px-3 py-3 transition ${
                                  lesson.isLocked
                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-70 dark:border-slate-800 dark:bg-slate-900/60'
                                    : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!lesson.isLocked) {
                                      router.push(`/${locale}/learn/course/${course.id}/lesson/${lesson.id}`);
                                    }
                                  }}
                                  disabled={lesson.isLocked}
                                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >
                                  <div
                                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                                      lesson.isCompleted
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : lesson.isLocked
                                          ? 'bg-slate-200 text-slate-500 dark:bg-slate-800'
                                          : 'bg-amber-500/20 text-amber-300'
                                    }`}
                                  >
                                    {getLessonIcon(lesson.type || 'VIDEO', !!lesson.isCompleted, !!lesson.isLocked)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-slate-500">{lIndex + 1}.</span>
                                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{lesson.title}</p>
                                      {lesson.isFree && !isEnrolled && (
                                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                          Preview
                                        </span>
                                      )}
                                    </div>
                                    {lesson.description && (
                                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{lesson.description}</p>
                                    )}
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleToggleLessonBookmark(lesson.id);
                                  }}
                                  className={`rounded-full p-2 transition ${
                                    bookmarkedLessonIds.includes(lesson.id)
                                      ? 'text-amber-500'
                                      : 'text-slate-400 hover:text-amber-500 dark:text-slate-500'
                                  }`}
                                  aria-label={bookmarkedLessonIds.includes(lesson.id) ? 'Remove lesson bookmark' : 'Bookmark lesson'}
                                >
                                  <Bookmark className={`h-4 w-4 ${bookmarkedLessonIds.includes(lesson.id) ? 'fill-current' : ''}`} />
                                </button>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{formatDuration(lesson.duration)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredCurriculumSections.length === 0 && (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
                      No lessons match this filter yet.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="premium-surface reveal-item reveal-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                  <CourseReviews courseId={course.id} />
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="premium-surface reveal-item reveal-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Best for</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">Who this course is built for.</h3>
                <div className="mt-4 space-y-3">
                  {[
                    `${course.level.replace('_', ' ')} learners who want structure instead of scattered tutorials.`,
                    `Students or professionals building confidence in ${course.category.toLowerCase()} with guided pacing.`,
                    'People who learn best through a blend of explanation, checkpoints, and applied practice.',
                  ].map((item) => (
                    <div key={item} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="premium-surface reveal-item reveal-7 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Course format</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">What the learning mix actually includes.</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  {lessonMix.map((item) => {
                    const MixIcon = item.icon;
                    return (
                      <li key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                        <MixIcon className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                        <span>{item.label}</span>
                      </li>
                    );
                  })}
                  <li className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                    <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                    <span>{formatDuration(getTotalDuration())} total learning time</span>
                  </li>
                  <li className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                    <Download className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                    <span>Downloadable references</span>
                  </li>
                  <li className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                    <Award className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                    <span>Completion certificate and lifetime access</span>
                  </li>
                </ul>
              </div>

              <div className="premium-surface reveal-item reveal-7 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/85">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Topics</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">Topics in this course.</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.tags.map((tag, i) => (
                    <span key={i} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .course-stage .reveal-item {
          animation: courseReveal 680ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .course-stage .reveal-1 { animation-delay: 60ms; }
        .course-stage .reveal-2 { animation-delay: 100ms; }
        .course-stage .reveal-3 { animation-delay: 140ms; }
        .course-stage .reveal-4 { animation-delay: 180ms; }
        .course-stage .reveal-5 { animation-delay: 220ms; }
        .course-stage .reveal-6 { animation-delay: 260ms; }
        .course-stage .reveal-7 { animation-delay: 300ms; }

        .course-stage .premium-panel:hover {
          box-shadow: 0 35px 95px rgba(15, 23, 42, 0.16);
          transform: translateY(-2px);
        }

        .course-stage .premium-sidebar:hover {
          box-shadow: 0 28px 78px rgba(15, 23, 42, 0.2);
          transform: translateY(-2px);
        }

        .course-stage .premium-surface {
          transition: box-shadow 280ms ease, transform 280ms ease, border-color 280ms ease;
        }

        .course-stage .premium-surface:hover {
          border-color: rgba(245, 158, 11, 0.35);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
          transform: translateY(-2px);
        }

        .course-stage .insight-card,
        .course-stage .hero-highlight {
          transition: transform 220ms ease, border-color 220ms ease, background-color 220ms ease;
        }

        .course-stage .insight-card:hover,
        .course-stage .hero-highlight:hover {
          border-color: rgba(249, 115, 22, 0.35);
          transform: translateY(-2px);
        }

        .course-stage .premium-lift:hover {
          border-color: rgba(245, 158, 11, 0.35);
          transform: translateY(-2px);
        }

        .course-stage .premium-lesson-row:not([disabled]):hover {
          transform: translateX(2px);
        }

        .course-stage .stat-tile {
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
        }

        .course-stage .stat-tile:hover {
          border-color: rgba(245, 158, 11, 0.35);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
          transform: translateY(-2px);
        }

        .course-stage .trust-chip {
          animation: chipFloatIn 520ms ease-out both;
          transition: transform 220ms ease, border-color 220ms ease;
        }

        .course-stage .trust-chip:hover {
          border-color: rgba(245, 158, 11, 0.35);
          transform: translateY(-2px);
        }

        .course-stage .premium-cta {
          box-shadow: 0 10px 24px rgba(245, 158, 11, 0.28);
        }

        .course-stage .premium-cta:hover {
          box-shadow: 0 14px 34px rgba(245, 158, 11, 0.35);
        }

        .course-stage .premium-chip-btn {
          transition: transform 180ms ease, border-color 180ms ease;
        }

        .course-stage .premium-chip-btn:hover {
          transform: translateY(-1px);
        }

        .course-stage .play-orb::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.75);
          animation: pulseRing 1.8s ease-out infinite;
        }

        @keyframes courseReveal {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes chipFloatIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulseRing {
          0% {
            opacity: 0.9;
            transform: scale(0.92);
          }
          100% {
            opacity: 0;
            transform: scale(1.2);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .course-stage .reveal-item,
          .course-stage .trust-chip {
            animation: none !important;
          }

          .course-stage .play-orb::before {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
