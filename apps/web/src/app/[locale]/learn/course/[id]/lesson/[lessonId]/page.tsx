'use client';

import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  File,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  List,
  Lock,
  Moon,
  PenTool,
  Sun,
  Video,
} from 'lucide-react';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';
import { TokenManager } from '@/lib/api/auth';
import { VideoPlayer } from '@/components/learn/VideoPlayer';
import { QAThreadList } from '@/components/learn/QAThread';
import CodePlayground from '@/components/learn/CodePlayground';
import QuizRunner from '@/components/learn/QuizRunner';
import { useTheme } from '@/contexts/ThemeContext';

interface LessonResource {
  id: string;
  title: string;
  type: string;
  url: string;
  size: number | null;
}

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  explanation: string | null;
  order: number;
  options: QuizOption[];
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  duration: number;
  order: number;
  isFree: boolean;
  type: string;
  resources: LessonResource[];
  isCompleted: boolean;
  watchTime: number;
  quiz?: { passingScore: number; questions: QuizQuestion[] };
  assignment?: { id: string; maxScore: number; passingScore: number; instructions: string };
  exercise?: { language: string; initialCode: string; solutionCode: string };
  assignmentSubmission?: {
    id: string;
    submissionText: string | null;
    submissionUrl: string | null;
    fileUrl: string | null;
    status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RESUBMISSION_REQUIRED';
    score: number | null;
  };
}

interface CourseLesson {
  id: string;
  title: string;
  duration: number;
  order: number;
  isCompleted: boolean;
  isLocked: boolean;
  isFree: boolean;
}

interface CourseSection {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

interface Course {
  id: string;
  title: string;
  lessonsCount: number;
  sections: CourseSection[];
  lessons: CourseLesson[];
}

const FEED_SERVICE = LEARN_SERVICE_URL;

const RICH_TEXT_CLASSNAME =
  '[&_a]:font-semibold [&_a]:text-sky-600 dark:[&_a]:text-sky-300 [&_blockquote]:border-l-2 [&_blockquote]:border-sky-200 [&_blockquote]:pl-4 [&_blockquote]:italic dark:[&_blockquote]:border-sky-900 [&_code]:rounded-md [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] dark:[&_code]:bg-white/10 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:leading-7 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:mb-4 [&_p]:leading-8 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5';

const getLessonTypeLabel = (type: string) => {
  switch (type) {
    case 'VIDEO':
      return 'Video lesson';
    case 'AUDIO':
      return 'Audio session';
    case 'QUIZ':
      return 'Knowledge check';
    case 'ASSIGNMENT':
      return 'Assignment';
    case 'EXERCISE':
      return 'Hands-on lab';
    case 'IMAGE':
      return 'Visual reference';
    case 'FILE':
      return 'Downloadable asset';
    case 'CASE_STUDY':
      return 'Case study';
    case 'ARTICLE':
    default:
      return 'Reading lesson';
  }
};

const getLessonTypeSummary = (type: string) => {
  switch (type) {
    case 'VIDEO':
      return 'Focused instruction with room for note-taking and review.';
    case 'AUDIO':
      return 'Listen through the material and keep the summary panel nearby.';
    case 'QUIZ':
      return 'Validate understanding before moving deeper into the course.';
    case 'ASSIGNMENT':
      return 'Deliver practical work and track review status in one place.';
    case 'EXERCISE':
      return 'Practice directly in the workspace and test ideas quickly.';
    case 'IMAGE':
      return 'Zoom into the visual reference and download it when needed.';
    case 'FILE':
      return 'Access supporting documents, slides, or learning resources.';
    case 'CASE_STUDY':
      return 'Study the scenario carefully and connect it to the course context.';
    case 'ARTICLE':
    default:
      return 'Read through the material with a calmer, editorial-style layout.';
  }
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatResourceSize = (size: number | null) => {
  if (!size) return null;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(size / 1024)} KB`;
};

const getCompletionRatio = (course: Course | null) => {
  if (!course?.lessonsCount) return 0;
  return Math.round((getStructuredSections(course).flatMap((section) => section.lessons).filter((item) => item.isCompleted).length / course.lessonsCount) * 100);
};

const getStructuredSections = (course: Course | null) => {
  if (!course) return [];

  const sectionBlocks = (course.sections || []).filter((section) => section.lessons?.length > 0);
  const looseLessons = course.lessons || [];

  if (sectionBlocks.length > 0 && looseLessons.length > 0) {
    return [
      ...sectionBlocks,
      {
        id: 'additional-lessons',
        title: 'Additional lessons',
        lessons: looseLessons,
      },
    ];
  }

  if (sectionBlocks.length > 0) return sectionBlocks;

  return [
    {
      id: 'course-lessons',
      title: 'Course lessons',
      lessons: looseLessons,
    },
  ];
};

function AssignmentWidget({
  lesson,
  courseId,
  lessonId,
  onSubmitted,
}: {
  lesson: Lesson;
  courseId: string;
  lessonId: string;
  onSubmitted: (sub: any) => void;
}) {
  const [submissionType, setSubmissionType] = useState<'text' | 'url'>('url');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sub = lesson.assignmentSubmission;
  const isSubmitted = sub && (sub.status === 'SUBMITTED' || sub.status === 'GRADED');

  const handleSubmit = async () => {
    if (submissionType === 'url' && !submissionUrl.trim()) return;
    if (submissionType === 'text' && !submissionText.trim()) return;

    setSubmitting(true);
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/lessons/${lessonId}/assignment/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionUrl: submissionType === 'url' ? submissionUrl : undefined,
          submissionText: submissionType === 'text' ? submissionText : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSubmitted(data.submission);
      }
    } catch (error) {
      console.error('Submission failed', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_35%)] p-4 sm:p-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.14),_transparent_30%)]">
      <div className="mx-auto grid w-full max-w-5xl gap-6 rounded-[30px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)] dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex flex-col rounded-[26px] bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 p-6 text-white shadow-inner">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <PenTool className="h-7 w-7" />
          </div>
          <div className="mt-6 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-200/80">Assignment studio</p>
            <h3 className="text-2xl font-semibold leading-tight">{lesson.title}</h3>
            <p className="text-sm leading-7 text-slate-200/85">
              Submit polished work, track grading status, and keep all assignment activity in a cleaner focused panel.
            </p>
          </div>
          <div className="mt-8 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Max score</p>
              <p className="mt-2 text-3xl font-semibold">{lesson.assignment?.maxScore || 100}<span className="ml-2 text-sm font-medium text-slate-300">pts</span></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Passing score</p>
              <p className="mt-2 text-xl font-semibold">{lesson.assignment?.passingScore || 0} points</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-[26px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-6 space-y-3">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
              Submission workspace
            </div>
            <div className="rounded-[24px] border border-slate-200/70 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Instructions</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {lesson.assignment?.instructions || 'Review the brief, prepare your answer, and submit a link or written response for evaluation.'}
              </p>
            </div>
          </div>

          {!isSubmitted ? (
            <div className="mt-auto space-y-5">
              <div className="inline-flex w-full gap-2 rounded-2xl bg-slate-200/70 p-1.5 dark:bg-white/5">
                <button
                  onClick={() => setSubmissionType('url')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    submissionType === 'url'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Link / URL
                </button>
                <button
                  onClick={() => setSubmissionType('text')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    submissionType === 'text'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Text answer
                </button>
              </div>

              {submissionType === 'url' ? (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Submission URL
                  </label>
                  <input
                    type="url"
                    value={submissionUrl}
                    onChange={(event) => setSubmissionUrl(event.target.value)}
                    placeholder="https://github.com/your-username/repo"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Written response
                  </label>
                  <textarea
                    value={submissionText}
                    onChange={(event) => setSubmissionText(event.target.value)}
                    placeholder="Describe your solution, reasoning, or key outcomes..."
                    className="min-h-[160px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || (submissionType === 'url' ? !submissionUrl.trim() : !submissionText.trim())}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit work'}
              </button>
            </div>
          ) : (
            <div className="mt-auto rounded-[26px] border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {sub.status === 'GRADED' ? 'Assignment graded' : 'Submission received'}
                  </h3>
                  <p className="text-sm text-emerald-800 dark:text-emerald-100/85">
                    {sub.status === 'GRADED'
                      ? `You scored ${sub.score} / ${lesson.assignment?.maxScore || 100} points.`
                      : "Your work is in review. You'll see the final result here once grading is complete."}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-950/40">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Your submission</p>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {sub.submissionUrl || sub.submissionText || 'File submitted'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LessonViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const locale = (params?.locale as string) || 'en';
  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'qa' | 'notes'>('overview');
  const [completing, setCompleting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [notesDraft, setNotesDraft] = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null);

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);
  const notesStorageKey = `stunity-lesson-notes:${courseId}:${lessonId}`;

  const fetchLesson = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.push(`/${locale}/login`);
        return;
      }

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLesson(data.lesson || data);
      } else {
        const error = await response.json();
        console.error('Lesson error:', error);
        if (response.status === 403) {
          router.push(`/${locale}/learn/course/${courseId}`);
        }
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    }
  }, [courseId, lessonId, getAuthToken, locale, router]);

  const fetchCourse = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, getAuthToken]);

  useEffect(() => {
    if (courseId && lessonId) {
      fetchLesson();
      fetchCourse();
    }
  }, [courseId, lessonId, fetchCourse, fetchLesson]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const syncSidebar = (matches: boolean) => setShowSidebar(matches);

    syncSidebar(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebar(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const sections = getStructuredSections(course);
    if (!sections.length) return;

    setExpandedSections((prev) => {
      const next: Record<string, boolean> = {};
      for (const section of sections) {
        const containsActiveLesson = section.lessons.some((item) => item.id === lessonId);
        next[section.id] = prev[section.id] ?? (containsActiveLesson || sections.length <= 2);
        if (containsActiveLesson) next[section.id] = true;
      }
      return next;
    });
  }, [course, lessonId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(notesStorageKey);
      setNotesDraft(saved || '');
      setNotesSavedAt(saved ? new Date().toISOString() : null);
    } catch (error) {
      console.error('Error loading lesson notes:', error);
      setNotesDraft('');
    } finally {
      setNotesLoaded(true);
    }
  }, [notesStorageKey]);

  useEffect(() => {
    if (!notesLoaded || typeof window === 'undefined') return;

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(notesStorageKey, notesDraft);
        setNotesSavedAt(new Date().toISOString());
      } catch (error) {
        console.error('Error saving lesson notes:', error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [notesDraft, notesLoaded, notesStorageKey]);

  const markComplete = async () => {
    if (!lesson || lesson.isCompleted) return;

    try {
      setCompleting(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true, watchTime: lesson.duration * 60 }),
      });

      if (response.ok) {
        setLesson((prev) => (prev ? { ...prev, isCompleted: true } : null));
        fetchCourse();
      }
    } catch (error) {
      console.error('Error marking complete:', error);
    } finally {
      setCompleting(false);
    }
  };

  const getCurrentLessonIndex = () => {
    const lessons = getStructuredSections(course).flatMap((section) => section.lessons);
    return lessons.findIndex((item) => item.id === lessonId);
  };

  const goToLesson = (direction: 'prev' | 'next') => {
    const lessons = getStructuredSections(course).flatMap((section) => section.lessons);
    if (!lessons.length) return;
    const currentIndex = getCurrentLessonIndex();
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < lessons.length) {
      const targetLesson = lessons[newIndex];
      if (!targetLesson.isLocked) {
        router.push(`/${locale}/learn/course/${courseId}/lesson/${targetLesson.id}`);
      }
    }
  };

  const canGoPrev = () => getCurrentLessonIndex() > 0;

  const canGoNext = () => {
    const lessons = getStructuredSections(course).flatMap((section) => section.lessons);
    if (!lessons.length) return false;
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex < lessons.length - 1) {
      return !lessons[currentIndex + 1].isLocked;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef2f7] px-4 dark:bg-[#020617]">
        <div className="flex min-h-screen items-center justify-center">
          <FeedInlineLoader size="lg" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[#eef2f7] px-4 text-slate-900 dark:bg-[#020617] dark:text-white">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-slate-200/80 bg-white/90 p-10 text-center shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
              <Lock className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold">Lesson not available</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              This lesson is unavailable right now. Return to the course overview to continue from an accessible item.
            </p>
            <Link
              href={`/${locale}/learn/course/${courseId}`}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to course
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const structuredSections = getStructuredSections(course);
  const allCourseLessons = structuredSections.flatMap((section) => section.lessons);
  const currentLessonIndex = allCourseLessons.findIndex((item) => item.id === lessonId);
  const currentPosition = currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1;
  const completedLessons = allCourseLessons.filter((item) => item.isCompleted).length;
  const progressPercentage = getCompletionRatio(course);
  const prevLesson = currentLessonIndex > 0 ? allCourseLessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < allCourseLessons.length - 1
      ? allCourseLessons[currentLessonIndex + 1]
      : null;
  const isReadingLesson = lesson.type === 'ARTICLE' || lesson.type === 'CASE_STUDY';
  const currentSection = structuredSections.find((section) => section.lessons.some((item) => item.id === lessonId)) || null;
  const remainingCourseMinutes = allCourseLessons
    .filter((item) => !item.isCompleted)
    .reduce((sum, item) => sum + item.duration, 0);
  const remainingLessonCount = allCourseLessons.filter((item) => !item.isCompleted).length;
  const nextUnfinishedLesson =
    allCourseLessons.find((item) => !item.isCompleted && item.id !== lessonId && !item.isLocked) || nextLesson;

  const renderInteractiveItem = () => {
    switch (lesson.type) {
      case 'VIDEO':
      case 'AUDIO':
        return lesson.videoUrl ? (
          <VideoPlayer url={lesson.videoUrl} />
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6">
            <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5">
                <Video className="h-10 w-10 text-sky-200/80" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold text-white">No media available</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                The lesson has not been uploaded yet, so the clean reading experience below becomes the primary learning surface for now.
              </p>
            </div>
          </div>
        );

      case 'QUIZ':
        if (lesson.quiz && lesson.quiz.questions.length > 0) {
          return (
            <QuizRunner
              lessonTitle={lesson.title}
              quiz={lesson.quiz}
              onComplete={async (_score, passed) => {
                if (passed) {
                  try {
                    const token = TokenManager.getAccessToken();
                    await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/lessons/${lessonId}/progress`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ completed: true, watchTime: 0 }),
                    });
                    setLesson((prev) => (prev ? { ...prev, isCompleted: true } : prev));
                    fetchCourse();
                  } catch (error) {
                    console.error('Error auto-completing quiz lesson:', error);
                  }
                }
              }}
            />
          );
        }

        return (
          <div className="flex h-full min-h-[420px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] p-6 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
            <div className="w-full max-w-2xl rounded-[28px] border border-slate-200/80 bg-white/95 p-8 text-center shadow-xl dark:border-white/10 dark:bg-slate-900/80">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                <HelpCircle className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold text-slate-900 dark:text-white">{lesson.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
                This quiz has not been populated yet. Once the instructor adds questions, the assessment will appear here in the redesigned workspace.
              </p>
            </div>
          </div>
        );

      case 'ASSIGNMENT':
        return (
          <AssignmentWidget
            lesson={lesson}
            courseId={courseId}
            lessonId={lessonId}
            onSubmitted={(submission) => {
              setLesson((prev) => (prev ? { ...prev, assignmentSubmission: submission } : prev));
            }}
          />
        );

      case 'EXERCISE':
        return (
          <div className="h-full min-h-[520px] bg-[#020617]">
            <CodePlayground
              language={lesson.exercise?.language || 'javascript'}
              initialCode={lesson.exercise?.initialCode || '// Write your code here'}
              onRun={async () => {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                return {
                  stdout: `[SIMULATION] Running ${lesson.exercise?.language}...\n> Hello Stunity!\n\nProgram finished with exit code 0.`,
                  stderr: '',
                };
              }}
            />
          </div>
        );

      case 'IMAGE':
        return (
          <div className="flex min-h-[520px] h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] p-6 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
            <div className="w-full max-w-6xl rounded-[30px] border border-slate-200/80 bg-white/90 p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900/85">
              {lesson.content ? (
                // Using a native img here because lesson assets can come from arbitrary uploaded URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lesson.content} alt={lesson.title} className="max-h-[72vh] w-full rounded-[24px] object-contain bg-slate-100 p-3 dark:bg-slate-950/80" />
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
                  Image preview unavailable
                </div>
              )}
              <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{lesson.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Visual reference</p>
                  </div>
                </div>
                <button
                  onClick={() => window.open(lesson.content || '', '_blank')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                  Download image
                </button>
              </div>
            </div>
          </div>
        );

      case 'FILE':
        return (
          <div className="flex h-full min-h-[460px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.16),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_25%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
            <div className="w-full max-w-3xl rounded-[32px] border border-slate-200/80 bg-white/95 p-8 text-center shadow-2xl dark:border-white/10 dark:bg-slate-900/80">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white">
                <File className="h-12 w-12" />
              </div>
              <h2 className="mt-8 text-3xl font-semibold text-slate-900 dark:text-white">{lesson.title}</h2>
              <p className="mt-4 text-base leading-8 text-slate-500 dark:text-slate-400">
                This lesson is delivered as a supporting file, deck, or document. Download it to continue with the course in a more structured way.
              </p>
              <button
                onClick={() => window.open(lesson.content || '', '_blank')}
                className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/30"
              >
                <Download className="h-5 w-5" />
                Download resource
              </button>
            </div>
          </div>
        );

      case 'CASE_STUDY':
      case 'ARTICLE':
      default:
        return (
          <div className="min-h-[460px] h-full overflow-y-auto bg-white dark:bg-slate-950">
            <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10 sm:py-12">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <FileText className="h-4 w-4" />
                Editorial lesson
              </div>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl dark:text-white">{lesson.title}</h1>
              <div
                className={`mt-8 text-[15px] leading-8 text-slate-600 dark:text-slate-300 ${RICH_TEXT_CLASSNAME}`}
                dangerouslySetInnerHTML={{
                  __html:
                    DOMPurify.sanitize(lesson.content || '', {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
                    }) || '<p class="text-slate-400 italic">This lesson has no written content yet.</p>',
                }}
              />

              {lesson.resources && lesson.resources.length > 0 && (
                <div className="mt-12 border-t border-slate-200 pt-8 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Lesson resources</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {lesson.resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-sky-500/20 dark:hover:bg-white/[0.05]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                            <Download className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{resource.title || 'Attachment'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{resource.type || 'Resource'}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/85 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
      <div className="border-b border-slate-200/70 px-5 py-5 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Course content</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{course?.title || 'Course outline'}</h2>
          </div>
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right dark:bg-white/5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Progress</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{progressPercentage}%</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500" style={{ width: `${progressPercentage}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {completedLessons} of {course?.lessonsCount || 0} lessons completed
        </p>

        <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Continue path</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
            {nextUnfinishedLesson && nextUnfinishedLesson.id !== lesson.id ? nextUnfinishedLesson.title : lesson.title}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {nextUnfinishedLesson && nextUnfinishedLesson.id !== lesson.id
              ? `${formatDuration(nextUnfinishedLesson.duration)} • Next recommended lesson`
              : `${formatDuration(lesson.duration)} • Current focus lesson`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-on-hover">
        <div className="space-y-3">
          {structuredSections.map((section) => {
            const isExpanded = expandedSections[section.id] ?? true;
            const sectionCompleted = section.lessons.filter((item) => item.isCompleted).length;
            const sectionHasActiveLesson = section.lessons.some((item) => item.id === lessonId);

            return (
              <div key={section.id} className="rounded-[26px] border border-slate-200/80 bg-slate-50/70 p-2 dark:border-white/10 dark:bg-white/[0.03]">
                <button
                  onClick={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))}
                  className="flex w-full items-center justify-between gap-3 rounded-[20px] px-3 py-3 text-left transition-colors hover:bg-white/80 dark:hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{section.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {sectionCompleted}/{section.lessons.length} complete
                      {sectionHasActiveLesson ? ' • Current module' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                      {section.lessons.length}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-2 px-1 pb-1">
                    {section.lessons.map((courseLesson, index) => {
                      const isActive = courseLesson.id === lessonId;
                      const isLocked = courseLesson.isLocked;

                      return (
                        <button
                          key={courseLesson.id}
                          onClick={() => {
                            if (!isLocked) {
                              router.push(`/${locale}/learn/course/${courseId}/lesson/${courseLesson.id}`);
                              if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                                setShowSidebar(false);
                              }
                            }
                          }}
                          disabled={isLocked}
                          className={`group w-full rounded-[22px] border px-4 py-4 text-left transition-all ${
                            isActive
                              ? 'border-sky-200 bg-sky-50 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10'
                              : isLocked
                                ? 'border-transparent bg-slate-100/60 opacity-60 dark:bg-white/[0.03]'
                                : 'border-transparent bg-white/80 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white dark:bg-white/[0.03] dark:hover:border-white/10 dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                                courseLesson.isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : isActive
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : isLocked
                                      ? 'bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-500'
                                      : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                              }`}
                            >
                              {courseLesson.isCompleted ? <CheckCircle className="h-4 w-4" /> : isLocked ? <Lock className="h-4 w-4" /> : index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`truncate text-sm font-semibold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {courseLesson.title}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDuration(courseLesson.duration)}
                                    </span>
                                    {courseLesson.isFree && (
                                      <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                        Free
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className={`mt-1 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isActive ? 'translate-x-0.5 text-slate-700 dark:text-slate-300' : 'group-hover:translate-x-0.5'}`} />
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef2f7] text-slate-900 dark:bg-[#020617] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link
                href={`/${locale}/learn/course/${courseId}`}
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="hidden h-10 w-px bg-slate-200 dark:bg-white/10 sm:block" />

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Learning workspace</p>
                <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg dark:text-white">{course?.title}</h1>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">{lesson.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm sm:block dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Progress</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {completedLessons}/{course?.lessonsCount || 0} complete
                </p>
              </div>

              <button
                onClick={toggleTheme}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
                title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <button
                onClick={() => setShowSidebar((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
                title={showSidebar ? 'Hide course content' : 'Show course content'}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <main className="min-w-0 flex-1 space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/88 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
              <div className="border-b border-slate-200/70 px-5 py-5 sm:px-6 dark:border-white/10">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                        {getLessonTypeLabel(lesson.type)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        Lesson {currentPosition} of {course?.lessonsCount || 0}
                      </span>
                      {currentSection && (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          {currentSection.title}
                        </span>
                      )}
                      {lesson.isCompleted && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Completed
                        </span>
                      )}
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl dark:text-white">{lesson.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                      {lesson.description || getLessonTypeSummary(lesson.type)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Duration</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatDuration(lesson.duration)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Resources</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{lesson.resources?.length || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Course done</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{progressPercentage}%</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Remaining</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatDuration(remainingCourseMinutes)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <div className={`overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:border-white/10 ${isReadingLesson ? 'min-h-[460px]' : 'min-h-[420px]'}`}>
                  {renderInteractiveItem()}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)_minmax(0,1fr)]">
              <button
                onClick={() => goToLesson('prev')}
                disabled={!canGoPrev()}
                className="group rounded-[28px] border border-slate-200/80 bg-white/88 p-5 text-left shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-white/20"
              >
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  Previous lesson
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{prevLesson?.title || 'You are at the beginning'}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {prevLesson ? formatDuration(prevLesson.duration) : 'Move forward from here when you are ready.'}
                </p>
              </button>

              <div className="rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Lesson progress</p>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{lesson.isCompleted ? 'Completed' : 'In progress'}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {nextUnfinishedLesson && nextUnfinishedLesson.id !== lesson.id
                            ? `Up next: ${nextUnfinishedLesson.title}`
                            : 'Keep momentum by finishing this lesson before moving on.'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Course</p>
                        <p className="text-xl font-semibold text-slate-900 dark:text-white">{progressPercentage}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500" style={{ width: `${lesson.isCompleted ? 100 : Math.max(progressPercentage, 8)}%` }} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Remaining workload</p>
                      <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{remainingLessonCount} lessons left</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDuration(remainingCourseMinutes)} still to complete</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Current module</p>
                      <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{currentSection?.title || 'Course lessons'}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {currentSection ? `${currentSection.lessons.filter((item) => item.isCompleted).length}/${currentSection.lessons.length} complete` : 'Structured for easier navigation'}
                      </p>
                    </div>
                  </div>

                  {lesson.isCompleted ? (
                    <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <CheckCircle className="h-5 w-5" />
                      Lesson completed
                    </div>
                  ) : (
                    <button
                      onClick={markComplete}
                      disabled={completing}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle className="h-5 w-5" />
                      {completing ? 'Marking...' : 'Mark complete'}
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => goToLesson('next')}
                disabled={!canGoNext()}
                className="group rounded-[28px] border border-slate-200/80 bg-white/88 p-5 text-left shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-white/20"
              >
                <div className="flex items-center justify-end gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Next lesson
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{nextLesson?.title || 'Final lesson reached'}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {nextLesson ? formatDuration(nextLesson.duration) : 'You have reached the end of the current lesson path.'}
                </p>
              </button>
            </section>

            <section className="rounded-[32px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-5 dark:border-white/10 dark:bg-slate-900/75">
              <div className="inline-flex flex-wrap gap-2 rounded-[22px] bg-slate-100/90 p-1.5 dark:bg-white/5">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'qa', label: 'Discussion' },
                  { key: 'notes', label: 'My notes' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as 'overview' | 'qa' | 'notes')}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      activeTab === tab.key
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {activeTab === 'overview' && (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 dark:border-white/10 dark:bg-slate-950/40">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Lesson overview</p>
                      <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{lesson.title}</h3>
                      {lesson.content ? (
                        <div
                          className={`mt-6 text-[15px] leading-8 text-slate-600 dark:text-slate-300 ${RICH_TEXT_CLASSNAME}`}
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(lesson.content, {
                              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
                            }),
                          }}
                        />
                      ) : (
                        <p className="mt-5 text-sm leading-7 text-slate-500 dark:text-slate-400">
                          {lesson.description || 'No description has been provided for this lesson yet.'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Lesson details</p>
                        <div className="mt-5 space-y-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Type</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{getLessonTypeLabel(lesson.type)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Duration</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDuration(lesson.duration)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Status</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{lesson.isCompleted ? 'Completed' : 'Pending completion'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Resources</p>
                            <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Download center</h4>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:bg-slate-950/40 dark:text-white">
                            {lesson.resources?.length || 0}
                          </div>
                        </div>

                        {lesson.resources && lesson.resources.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            {lesson.resources.map((resource) => (
                              <a
                                key={resource.id}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-sky-200 dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-sky-500/20"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{resource.title}</p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {resource.type || 'Attachment'}
                                    {formatResourceSize(resource.size) ? ` • ${formatResourceSize(resource.size)}` : ''}
                                  </p>
                                </div>
                                <Download className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-400">
                            No extra resources are attached to this lesson yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'qa' && (
                  <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-slate-950/30">
                    <QAThreadList courseId={courseId} lessonId={lessonId} />
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-950/40">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Private notes</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Lesson notebook</h3>
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                          <p>Autosaves on this device</p>
                          <p className="mt-1">
                            {notesSavedAt ? `Last saved ${new Date(notesSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not saved yet'}
                          </p>
                        </div>
                      </div>

                      <textarea
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        placeholder="Write key ideas, action items, and reminders for this lesson..."
                        className="mt-5 min-h-[320px] w-full resize-y rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                      />

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Keep short summaries, questions, and follow-up tasks here while you learn.
                        </p>
                        <button
                          onClick={() => setNotesDraft('')}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
                        >
                          Clear notes
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Suggested structure</p>
                        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                          <p><span className="font-semibold text-slate-900 dark:text-white">Key takeaway:</span> What matters most from this lesson?</p>
                          <p><span className="font-semibold text-slate-900 dark:text-white">Questions:</span> What still feels unclear or worth discussing?</p>
                          <p><span className="font-semibold text-slate-900 dark:text-white">Action:</span> What will you apply after this lesson?</p>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Current context</p>
                        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                          <p><span className="font-semibold text-slate-900 dark:text-white">Module:</span> {currentSection?.title || 'Course lessons'}</p>
                          <p><span className="font-semibold text-slate-900 dark:text-white">Lesson:</span> {currentPosition} of {course?.lessonsCount || 0}</p>
                          <p><span className="font-semibold text-slate-900 dark:text-white">Remaining:</span> {remainingLessonCount} lessons, {formatDuration(remainingCourseMinutes)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>

          {showSidebar && <aside className="hidden w-[360px] flex-shrink-0 xl:block">{sidebarContent}</aside>}
        </div>

        {showSidebar && (
          <div className="fixed inset-0 z-40 xl:hidden">
            <button
              aria-label="Close course content"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setShowSidebar(false)}
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-sm p-4">{sidebarContent}</div>
          </div>
        )}
      </div>
    </div>
  );
}
