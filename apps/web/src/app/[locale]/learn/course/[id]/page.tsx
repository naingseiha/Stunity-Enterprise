'use client';

import { useState, useEffect, useCallback } from 'react';
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
}

interface CachedCourseDetailPayload {
  course: Course;
  enrollment: Enrollment | null;
  isEnrolled: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const FEED_SERVICE = LEARN_SERVICE_URL;
const COURSE_DETAIL_CACHE_TTL_MS = 60 * 1000;

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

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);
  const getCurrentUserId = useCallback(() => {
    if (typeof window === 'undefined') return 'guest';
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return 'guest';
      const user = JSON.parse(rawUser);
      return user?.id || 'guest';
    } catch {
      return 'guest';
    }
  }, []);
  const courseCacheKey = buildRouteDataCacheKey('learn', 'course-detail', courseId, getCurrentUserId());

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

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}`, {
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

  // Get first incomplete lesson or first lesson
  const getNextLesson = () => {
    if (!course?.lessons?.length) return null;
    const incomplete = course.lessons.find(l => !l.isCompleted && !l.isLocked);
    return incomplete || course.lessons[0];
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
    if (!course?.lessons?.length) return course?.duration || 0;
    return course.lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0);
  };

  // Get completed lessons count
  const getCompletedCount = () => {
    if (!course?.lessons?.length) return 0;
    return course.lessons.filter(l => l.isCompleted).length;
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
  const curriculumSections = course.sections?.length
    ? course.sections
    : [{ id: 'flat-lessons', title: 'Course Lessons', lessons: course.lessons }];
  const completedLessons = getCompletedCount();
  const progressValue = clampProgress(enrollment?.progress);
  const learningOutcomes = [
    ...course.tags.slice(0, 4).map((tag) => `Build confidence with ${tag}.`),
    'Turn concepts into practical outcomes you can apply immediately.',
    'Complete the journey with portfolio-ready deliverables.',
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <UnifiedNavigation />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-400/20 dark:bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 top-44 h-64 w-64 rounded-full bg-cyan-400/20 dark:bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-64 h-64 w-64 rounded-full bg-violet-400/20 dark:bg-violet-500/20 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 pb-12 pt-8">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Link href={`/${locale}/learn`} className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 hover:border-amber-400/60 hover:text-amber-700 dark:border-slate-700/70 dark:hover:text-amber-300">
              <ArrowLeft className="h-4 w-4" />
              Learn Hub
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="text-slate-500 dark:text-slate-400">{course.category}</span>
            <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="text-slate-800 dark:text-slate-200">{course.title}</span>
          </div>

          <div className="grid grid-cols-1 gap-7 lg:grid-cols-12 lg:items-stretch">
            <section className="lg:col-span-8 lg:h-full">
              <div className="relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-2xl shadow-slate-300/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-black/40 md:p-8 transition-colors">
                <div className="pointer-events-none absolute -left-10 -top-14 h-44 w-44 rounded-full bg-amber-400/20 dark:bg-amber-400/15 blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-cyan-400/15 dark:bg-cyan-400/10 blur-2xl" />

                <div className="relative flex h-full flex-col gap-6">
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_COLORS[course.level] || 'bg-gray-100 text-gray-700'}`}>
                        {course.level.replace('_', ' ')}
                      </span>
                      {course.isFeatured && (
                        <span className="rounded-full border border-amber-300/50 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-200">
                          Featured
                        </span>
                      )}
                      {course.isFree && (
                        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                          Free Access
                        </span>
                      )}
                    </div>

                    <div>
                      <h1 className="text-3xl font-black leading-tight text-slate-900 dark:text-white md:text-4xl">{course.title}</h1>
                      <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300 md:text-lg">{course.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 transition-colors">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Rating</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-slate-900 dark:text-white">
                          <Star className="h-4 w-4 fill-current text-amber-500" />
                          {course.rating.toFixed(1)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 transition-colors">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Learners</p>
                        <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{course.enrolledCount.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 transition-colors">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Duration</p>
                        <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatDuration(getTotalDuration())}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 transition-colors">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Lessons</p>
                        <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{course.lessonsCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-5">
                    <div className="flex items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-5 transition-colors">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 font-bold text-amber-950">
                        {course.instructor?.avatar ? (
                          <img src={course.instructor.avatar} alt={course.instructor.name || 'Instructor'} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          (course.instructor?.name || 'I').charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{course.instructor?.name || 'Instructor'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{course.instructor?.title || 'Course Instructor'}</p>
                      </div>
                    </div>

                    {isEnrolled && enrollment && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/70 p-4 sm:p-5 transition-colors">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Progress</p>
                            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                              {completedLessons} of {course.lessonsCount} lessons completed
                            </p>
                          </div>
                          <div className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                            {formatProgressPercent(enrollment.progress)}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="relative h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/80">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                              style={{ width: `${progressValue}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-end text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {completedLessons}/{course.lessonsCount} lessons
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside className="lg:col-span-4 lg:h-full">
              <div className="sticky top-24 h-full overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-2xl shadow-slate-300/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/40 transition-colors flex flex-col">
                <div className="relative h-56 bg-slate-200 dark:bg-slate-800 transition-colors">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-300/30 via-slate-200 to-cyan-300/20 dark:from-amber-500/20 dark:via-slate-900 dark:to-cyan-500/20">
                      <CategoryIcon className="h-20 w-20 text-amber-200/70" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs text-slate-200">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      Learning Cockpit
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="space-y-4">
                    {isEnrolled ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Your Progress</p>
                        <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{formatProgressPercent(enrollment?.progress)}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{completedLessons} of {course.lessonsCount} lessons completed</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Enrollment</p>
                        <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{course.isFree ? 'Free' : `$${course.price}`}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Instant access after enrollment</p>
                      </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      {isEnrolled ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Next Up</p>
                            <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {formatProgressPercent(enrollment?.progress)}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                            {nextLesson ? nextLesson.title : 'You completed this journey. Certificate ready.'}
                          </p>
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>{completedLessons}/{course.lessonsCount} completed</span>
                            <span>{Math.max(course.lessonsCount - completedLessons, 0)} left</span>
                          </div>
                          <div className="relative h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/80">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                              style={{ width: `${progressValue}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">What You Get</p>
                          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <p className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                              Full course access after one click
                            </p>
                            <p className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                              Trackable progress across all lessons
                            </p>
                            <p className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                              Certificate when you finish
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {enrollment?.progress === 100 && enrollment.certificateUrl && (
                      <Link
                        href={enrollment.certificateUrl}
                        target="_blank"
                        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                      >
                        <Award className="h-4 w-4" />
                        Open Certificate
                      </Link>
                    )}
                  </div>

                  <div className="mt-auto space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                    {isEnrolled ? (
                      nextLesson ? (
                        <Link
                          href={`/${locale}/learn/course/${courseId}/lesson/${nextLesson.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:from-amber-400 hover:to-orange-400"
                        >
                          <Play className="h-4 w-4" />
                          {enrollment?.progress === 0 ? 'Start Journey' : 'Continue Journey'}
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-500"
                        >
                          Lessons coming soon
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {enrolling ? 'Enrolling...' : 'Join This Course'}
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/70 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-amber-400/40 hover:text-amber-700 dark:hover:text-amber-200">
                        <Share2 className="h-4 w-4" />
                        Share
                      </button>
                      <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/70 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-amber-400/40 hover:text-amber-700 dark:hover:text-amber-200">
                        <Bookmark className="h-4 w-4" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-7 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-8">
              <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1 dark:border-slate-800 dark:bg-slate-900/70 transition-colors">
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
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 transition-colors">
                    <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">What You’ll Build</h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {learningOutcomes.map((outcome, index) => (
                        <div key={`${outcome}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 transition-colors">
                          <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{outcome}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 transition-colors">
                    <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Course Story</h2>
                    <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">{course.description}</p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 transition-colors">
                    <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Meet Your Instructor</h2>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-2xl font-black text-amber-950">
                        {course.instructor?.avatar ? (
                          <img src={course.instructor.avatar} alt={course.instructor.name || 'Instructor'} className="h-full w-full rounded-2xl object-cover" />
                        ) : (
                          (course.instructor?.name || 'I').charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{course.instructor?.name || 'Instructor'}</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-200">{course.instructor?.title || 'Course Instructor'}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {course.instructor?.bio || 'An experienced mentor focused on helping learners turn knowledge into real-world confidence.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 transition-colors">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Learning Path</h2>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {curriculumSections.length} sections • {course.lessonsCount} lessons
                    </span>
                  </div>

                  <div className="relative space-y-5 pl-5">
                    <div className="pointer-events-none absolute bottom-2 left-[15px] top-6 w-px bg-slate-300 dark:bg-slate-800" />
                    {curriculumSections.map((section, sIndex) => (
                      <div key={section.id} className="relative">
                        <div className="absolute -left-5 top-6 h-3 w-3 rounded-full bg-amber-400 shadow-lg shadow-amber-500/40" />
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 transition-colors">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              Module {sIndex + 1}: {section.title}
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{section.lessons.length} lessons</span>
                          </div>

                          <div className="space-y-2">
                            {section.lessons.map((lesson, lIndex) => (
                              <button
                                key={lesson.id}
                                type="button"
                                onClick={() => {
                                  if (!lesson.isLocked) {
                                    router.push(`/${locale}/learn/course/${course.id}/lesson/${lesson.id}`);
                                  }
                                }}
                                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                  lesson.isLocked
                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-70 dark:border-slate-800 dark:bg-slate-900/60'
                                    : 'border-slate-200 bg-white hover:border-amber-400/40 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                                }`}
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
                                <div className="text-xs text-slate-500 dark:text-slate-400">{formatDuration(lesson.duration)}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 transition-colors">
                  <CourseReviews courseId={course.id} />
                </div>
              )}
            </div>

            <aside className="space-y-6 xl:col-span-4">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 transition-colors">
                <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Topics In This Course</h3>
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag, i) => (
                    <span key={i} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 transition-colors">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 transition-colors">
                <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Course Includes</h3>
                <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-3">
                    <Video className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <span>{course.lessonsCount} video lessons</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <span>{formatDuration(getTotalDuration())} total learning time</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Download className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <span>Downloadable references</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Award className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <span>Completion certificate</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <span>Lifetime access</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
