'use client';

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  Bookmark,
  Languages,
  List,
  Lock,
  Moon,
  PenTool,
  Search,
  SlidersHorizontal,
  Sun,
  X,
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
import { getCourseLanguageLabel, normalizeCourseLocale } from '@/lib/course-locales';

interface LessonResource {
  id: string;
  title: string;
  type: string;
  url: string;
  locale?: string;
  isDefault?: boolean;
  size: number | null;
}

interface LessonTextTrack {
  id: string;
  kind: 'SUBTITLE' | 'CAPTION' | 'TRANSCRIPT';
  locale: string;
  label: string | null;
  url: string | null;
  content: string | null;
  isDefault: boolean;
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
  textTracks: LessonTextTrack[];
  isCompleted: boolean;
  isLocked?: boolean;
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
  sourceLocale?: string;
  supportedLocales?: string[];
  lessonsCount: number;
  sections: CourseSection[];
  lessons: CourseLesson[];
}

interface StoredLessonNotePayload {
  content: string;
  savedAt: string | null;
}

const FEED_SERVICE = LEARN_SERVICE_URL;
const RECENT_LESSON_STORAGE_PREFIX = 'stunity-recent-lesson';
const LESSON_BOOKMARKS_STORAGE_PREFIX = 'stunity-lesson-bookmarks';

const parseStoredLessonNotePayload = (rawValue: string | null): StoredLessonNotePayload => {
  if (!rawValue) return { content: '', savedAt: null };

  try {
    const parsed = JSON.parse(rawValue);
    if (typeof parsed === 'string') {
      return { content: parsed, savedAt: null };
    }

    return {
      content: typeof parsed?.content === 'string' ? parsed.content : '',
      savedAt: typeof parsed?.savedAt === 'string' ? parsed.savedAt : null,
    };
  } catch {
    return { content: rawValue, savedAt: null };
  }
};

const RICH_TEXT_CLASSNAME =
  '[&_a]:font-semibold [&_a]:text-sky-600 dark:[&_a]:text-sky-300 [&_blockquote]:border-l-2 [&_blockquote]:border-sky-200 [&_blockquote]:pl-4 [&_blockquote]:italic dark:[&_blockquote]:border-sky-900 [&_code]:rounded-md [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] dark:[&_code]:bg-white/10 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:leading-7 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:mb-4 [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5';

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
    case 'DOCUMENT':
      return 'Document lesson';
    case 'PDF':
      return 'PDF lesson';
    case 'FILE':
      return 'Downloadable asset';
    case 'CASE_STUDY':
      return 'Case study';
    case 'PRACTICE':
      return 'Practice lesson';
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
    case 'DOCUMENT':
      return 'Read the attached document, guide, slides, or workbook.';
    case 'PDF':
      return 'Open the PDF handout and follow the structured reading.';
    case 'FILE':
      return 'Access supporting documents, slides, or learning resources.';
    case 'CASE_STUDY':
      return 'Study the scenario carefully and connect it to the course context.';
    case 'PRACTICE':
      return 'Follow the steps and apply the concept directly.';
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

const getResourceUrlPath = (url: string) => {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

const isLikelyAssetUrl = (value: string | null | undefined) => {
  const normalized = (value || '').trim();
  return /^(https?:\/\/|\/)/i.test(normalized);
};

const normalizeResourceLocale = (value: string | null | undefined) => {
  return normalizeCourseLocale(value, 'en');
};

const selectLocalizedResources = (resources: LessonResource[], requestedLocale: string) => {
  const normalizedLocale = normalizeResourceLocale(requestedLocale);
  const matching = resources.filter((resource) => normalizeResourceLocale(resource.locale) === normalizedLocale);
  if (matching.length > 0) return matching;

  const defaults = resources.filter((resource) => resource.isDefault);
  if (defaults.length > 0) return defaults;

  return resources;
};

const selectLocalizedTextTrack = <T extends { locale?: string | null; isDefault?: boolean }>(
  tracks: T[],
  requestedLocale: string
) => {
  if (tracks.length === 0) return null;
  const normalizedLocale = normalizeResourceLocale(requestedLocale);
  const localeMatch = tracks.find((track) => normalizeResourceLocale(track.locale) === normalizedLocale);
  if (localeMatch) return localeMatch;
  const defaultTrack = tracks.find((track) => Boolean(track.isDefault));
  if (defaultTrack) return defaultTrack;
  return tracks[0];
};

const getResolvedResourceType = (resource: Pick<LessonResource, 'type' | 'url'>) => {
  const declaredType = (resource.type || '').trim().toUpperCase();
  if (declaredType) return declaredType;

  const path = getResourceUrlPath(resource.url || '');
  if (path.endsWith('.pdf')) return 'PDF';
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/.test(path)) return 'IMAGE';
  if (/\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/.test(path)) return 'AUDIO';
  if (/\.(mp4|mov|webm|m3u8)(\?|#|$)/.test(path)) return 'VIDEO';
  return 'FILE';
};

const getInlineDocumentPreviewMode = (resource: Pick<LessonResource, 'type' | 'url'>) => {
  const resolvedType = getResolvedResourceType(resource);
  if (resolvedType === 'PDF') return 'pdf';
  if (resolvedType === 'IMAGE') return 'image';
  return null;
};

const buildInlineDocumentPreviewUrl = (resourceUrl: string, mode: 'pdf' | 'image') => {
  if (mode !== 'pdf') return resourceUrl;
  if (!resourceUrl) return resourceUrl;
  if (resourceUrl.includes('#')) return resourceUrl;
  return `${resourceUrl}#view=FitH`;
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
      <div className="lesson-surface mx-auto grid w-full max-w-5xl gap-6 rounded-[30px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)] dark:border-white/10 dark:bg-slate-900/80">
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
                className="lesson-cta inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const locale = (params?.locale as string) || 'en';
  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;
  const headerVariant = searchParams.get('header') === 'editorial' ? 'editorial' : 'minimal';
  const isEditorialHeader = headerVariant === 'editorial';
  const defaultContentLocale = normalizeCourseLocale(locale, 'en');
  const contentLocale = normalizeCourseLocale(searchParams.get('contentLocale') || locale, defaultContentLocale);

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
  const [notesSyncReady, setNotesSyncReady] = useState(false);
  const [notesSyncState, setNotesSyncState] = useState<'syncing' | 'saving' | 'synced' | 'local'>('syncing');
  const [bookmarkedLessonIds, setBookmarkedLessonIds] = useState<string[]>([]);
  const [bookmarkSyncState, setBookmarkSyncState] = useState<'syncing' | 'synced' | 'local'>('syncing');
  const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [showSidebarFilters, setShowSidebarFilters] = useState(false);
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);
  const [transcriptLocalePreference, setTranscriptLocalePreference] = useState<string | null>(null);
  const lastAccessSyncKeyRef = useRef<string>('');

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);
  const getCurrentUserId = useCallback(() => {
    if (typeof window === 'undefined') return 'guest';
    try {
      const rawUser = window.localStorage.getItem('user');
      if (!rawUser) return 'guest';
      const parsedUser = JSON.parse(rawUser);
      const user = typeof parsedUser === 'string' ? JSON.parse(parsedUser) : parsedUser;
      return user?.id || 'guest';
    } catch {
      return 'guest';
    }
  }, []);
  const notesStorageKey = `stunity-lesson-notes:${courseId}:${lessonId}`;
  const recentLessonStorageKey = `${RECENT_LESSON_STORAGE_PREFIX}:${getCurrentUserId()}:${courseId}`;
  const lessonBookmarksStorageKey = `${LESSON_BOOKMARKS_STORAGE_PREFIX}:${getCurrentUserId()}:${courseId}`;
  const persistLocalLessonBookmarks = useCallback((lessonIds: string[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(lessonBookmarksStorageKey, JSON.stringify(lessonIds));
    setBookmarkedLessonIds(lessonIds);
  }, [lessonBookmarksStorageKey]);
  const lessonTheme = {
    '--lesson-bg': '#f6f1e8',
    '--lesson-panel': '#fffdf8',
    '--lesson-ink': '#1e293b',
    '--lesson-accent': '#f59e0b',
  } as CSSProperties;
  const buildLessonHref = useCallback((targetLessonId: string, nextContentLocale = contentLocale) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedLocale = normalizeCourseLocale(nextContentLocale, defaultContentLocale);
    if (normalizedLocale === defaultContentLocale) {
      nextParams.delete('contentLocale');
    } else {
      nextParams.set('contentLocale', normalizedLocale);
    }
    const query = nextParams.toString();
    return `/${locale}/learn/course/${courseId}/lesson/${targetLessonId}${query ? `?${query}` : ''}`;
  }, [contentLocale, courseId, defaultContentLocale, locale, searchParams]);
  const buildCourseHref = useCallback((nextContentLocale = contentLocale) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedLocale = normalizeCourseLocale(nextContentLocale, defaultContentLocale);
    if (normalizedLocale === defaultContentLocale) {
      nextParams.delete('contentLocale');
    } else {
      nextParams.set('contentLocale', normalizedLocale);
    }
    nextParams.delete('header');
    const query = nextParams.toString();
    return `/${locale}/learn/course/${courseId}${query ? `?${query}` : ''}`;
  }, [contentLocale, courseId, defaultContentLocale, locale, searchParams]);

  const fetchLesson = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.push(`/${locale}/login`);
        return;
      }

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}?locale=${contentLocale}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLesson(data.lesson || data);
      } else {
        const error = await response.json();
        console.error('Lesson error:', error);
        if (response.status === 403) {
          router.push(buildCourseHref());
        }
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    }
  }, [buildCourseHref, contentLocale, courseId, lessonId, getAuthToken, locale, router]);

  const fetchCourse = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}?locale=${contentLocale}`, {
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
  }, [contentLocale, courseId, getAuthToken]);

  useEffect(() => {
    if (courseId && lessonId) {
      fetchLesson();
      fetchCourse();
    }
  }, [courseId, lessonId, fetchCourse, fetchLesson]);

  useEffect(() => {
    setTranscriptLocalePreference(null);
  }, [lessonId]);

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
      const saved = parseStoredLessonNotePayload(window.localStorage.getItem(notesStorageKey));
      setNotesDraft(saved.content);
      setNotesSavedAt(saved.savedAt);

      const rawBookmarkedLessons = window.localStorage.getItem(lessonBookmarksStorageKey);
      if (rawBookmarkedLessons) {
        const parsed = JSON.parse(rawBookmarkedLessons) as string[];
        setBookmarkedLessonIds(Array.isArray(parsed) ? parsed : []);
      } else {
        setBookmarkedLessonIds([]);
      }
    } catch (error) {
      console.error('Error loading lesson notes:', error);
      setNotesDraft('');
      setBookmarkedLessonIds([]);
    } finally {
      setNotesLoaded(true);
    }
  }, [lessonBookmarksStorageKey, notesStorageKey]);

  useEffect(() => {
    if (!notesLoaded) return;

    let isCancelled = false;

    const loadRemoteNote = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          if (!isCancelled) {
            setNotesSyncState('local');
            setNotesSyncReady(true);
          }
          return;
        }

        const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}/note`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch note: ${response.status}`);
        }

        const data = await response.json();
        const remoteNote = data.note;
        const localSavedAt = parseStoredLessonNotePayload(
          typeof window === 'undefined' ? null : window.localStorage.getItem(notesStorageKey)
        ).savedAt;
        const localTimestamp = localSavedAt ? new Date(localSavedAt).getTime() : 0;
        const remoteTimestamp = remoteNote?.updatedAt ? new Date(remoteNote.updatedAt).getTime() : 0;

        if (!isCancelled && remoteNote && remoteTimestamp >= localTimestamp) {
          setNotesDraft(remoteNote.content || '');
          setNotesSavedAt(remoteNote.updatedAt || null);
          window.localStorage.setItem(
            notesStorageKey,
            JSON.stringify({
              content: remoteNote.content || '',
              savedAt: remoteNote.updatedAt || new Date().toISOString(),
            })
          );
        }

        if (!isCancelled) {
          setNotesSyncState('synced');
        }
      } catch (error) {
        console.error('Error syncing lesson note:', error);
        if (!isCancelled) {
          setNotesSyncState('local');
        }
      } finally {
        if (!isCancelled) {
          setNotesSyncReady(true);
        }
      }
    };

    void loadRemoteNote();

    return () => {
      isCancelled = true;
    };
  }, [courseId, getAuthToken, lessonId, notesLoaded, notesStorageKey]);

  useEffect(() => {
    if (!notesSyncReady || typeof window === 'undefined') return;

    const timeout = window.setTimeout(() => {
      void (async () => {
        const savedAt = new Date().toISOString();

        try {
          window.localStorage.setItem(
            notesStorageKey,
            JSON.stringify({
              content: notesDraft,
              savedAt,
            })
          );
          setNotesSavedAt(savedAt);

          const token = getAuthToken();
          if (!token) {
            setNotesSyncState('local');
            return;
          }

          setNotesSyncState('saving');

          const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}/note`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: notesDraft }),
          });

          if (!response.ok) {
            throw new Error(`Failed to save note: ${response.status}`);
          }

          const data = await response.json();
          const persistedSavedAt = data.note?.updatedAt || savedAt;

          window.localStorage.setItem(
            notesStorageKey,
            JSON.stringify({
              content: notesDraft,
              savedAt: persistedSavedAt,
            })
          );
          setNotesSavedAt(persistedSavedAt);
          setNotesSyncState('synced');
        } catch (error) {
          console.error('Error saving lesson notes:', error);
          setNotesSyncState('local');
        }
      })();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [courseId, getAuthToken, lessonId, notesDraft, notesStorageKey, notesSyncReady]);

  useEffect(() => {
    if (!bookmarkFeedback || typeof window === 'undefined') return;
    const timeout = window.setTimeout(() => setBookmarkFeedback(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [bookmarkFeedback]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isCancelled = false;

    const syncLessonBookmarks = async () => {
      const token = getAuthToken();
      if (!token) {
        if (!isCancelled) {
          setBookmarkSyncState('local');
        }
        return;
      }

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
          setBookmarkSyncState('synced');
        }

        const missingRemoteLessonIds = mergedLessonIds.filter((id) => !remoteLessonIds.includes(id));
        if (missingRemoteLessonIds.length > 0) {
          await Promise.all(
            missingRemoteLessonIds.map((targetLessonId) =>
              fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${targetLessonId}/bookmark`, {
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
        if (!isCancelled) {
          setBookmarkSyncState('local');
        }
      }
    };

    void syncLessonBookmarks();

    return () => {
      isCancelled = true;
    };
  }, [courseId, getAuthToken, lessonBookmarksStorageKey, persistLocalLessonBookmarks]);

  useEffect(() => {
    if (typeof window === 'undefined' || !lesson) return;

    try {
      window.localStorage.setItem(
        recentLessonStorageKey,
        JSON.stringify({
          lessonId,
          title: lesson.title,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Error storing recent lesson:', error);
    }
  }, [courseId, lesson, lessonId, recentLessonStorageKey]);

  useEffect(() => {
    if (!lesson || lesson.isLocked) return;

    const syncKey = `${courseId}:${lessonId}`;
    if (lastAccessSyncKeyRef.current === syncKey) return;
    lastAccessSyncKeyRef.current = syncKey;

    const syncLessonAccess = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}/progress`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
      } catch (error) {
        console.error('Error syncing lesson access:', error);
      }
    };

    void syncLessonAccess();
  }, [courseId, getAuthToken, lesson, lessonId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      setIsHeaderCondensed(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (lessonSearchQuery.trim().length > 0 || showBookmarkedOnly) {
      setShowSidebarFilters(true);
    }
  }, [lessonSearchQuery, showBookmarkedOnly]);

  const handleToggleLessonBookmark = async (targetLessonId: string) => {
    if (typeof window === 'undefined') return;

    const willBookmark = !bookmarkedLessonIds.includes(targetLessonId);
    const nextBookmarkedLessonIds = willBookmark
      ? [...bookmarkedLessonIds, targetLessonId]
      : bookmarkedLessonIds.filter((id) => id !== targetLessonId);

    try {
      persistLocalLessonBookmarks(nextBookmarkedLessonIds);

      const token = getAuthToken();
      if (!token) {
        setBookmarkSyncState('local');
        setBookmarkFeedback(willBookmark ? 'Saved on this device' : 'Removed on this device');
        return;
      }

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${targetLessonId}/bookmark`, {
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

      setBookmarkSyncState('synced');
      setBookmarkFeedback(willBookmark ? 'Saved to your account' : 'Removed from saved lessons');
    } catch (error) {
      console.error('Error updating lesson bookmarks:', error);
      setBookmarkSyncState('local');
      setBookmarkFeedback(willBookmark ? 'Saved locally. Account sync will retry later.' : 'Removed locally. Account sync will retry later.');
    }
  };

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
        router.push(buildLessonHref(targetLesson.id));
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
              href={buildCourseHref()}
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
  const isReadingLesson = lesson.type === 'ARTICLE' || lesson.type === 'CASE_STUDY' || lesson.type === 'PRACTICE';
  const currentSection = structuredSections.find((section) => section.lessons.some((item) => item.id === lessonId)) || null;
  const remainingCourseMinutes = allCourseLessons
    .filter((item) => !item.isCompleted)
    .reduce((sum, item) => sum + item.duration, 0);
  const remainingLessonCount = allCourseLessons.filter((item) => !item.isCompleted).length;
  const nextUnfinishedLesson =
    allCourseLessons.find((item) => !item.isCompleted && item.id !== lessonId && !item.isLocked) || nextLesson;
  const canGoToPrev = canGoPrev();
  const canGoToNext = canGoNext();
  const visibleResources = selectLocalizedResources(lesson.resources || [], contentLocale);
  const transcriptTracks = (lesson.textTracks || []).filter((track) => track.kind === 'TRANSCRIPT' && Boolean(track.content));
  const activeTranscriptTrack = selectLocalizedTextTrack(
    transcriptTracks,
    transcriptLocalePreference || contentLocale
  );
  const inlineLessonContentAssetUrl = isLikelyAssetUrl(lesson.content) ? (lesson.content || '').trim() : '';
  const primaryVisibleResource = visibleResources[0] || null;
  const primaryLessonResource = primaryVisibleResource || (inlineLessonContentAssetUrl ? {
    id: `${lesson.id}-content-asset`,
    title: lesson.title,
    type: lesson.type,
    url: inlineLessonContentAssetUrl,
    locale: contentLocale,
    isDefault: true,
    size: null,
  } : null);
  const primaryLessonResourceUrl = primaryLessonResource?.url || '';
  const primaryLessonPreviewMode = primaryLessonResource ? getInlineDocumentPreviewMode(primaryLessonResource) : null;
  const additionalVisibleResources = primaryVisibleResource ? visibleResources.slice(1) : visibleResources;
  const lessonBodyContent = inlineLessonContentAssetUrl === (lesson.content || '').trim() ? '' : (lesson.content || '');
  const normalizedLessonSearchQuery = lessonSearchQuery.trim().toLowerCase();
  const hasActiveSidebarFilters = normalizedLessonSearchQuery.length > 0 || showBookmarkedOnly;
  const filteredSections = structuredSections
    .map((section) => ({
      ...section,
      lessons: section.lessons.filter((item) => {
        const matchesQuery =
          !normalizedLessonSearchQuery ||
          item.title.toLowerCase().includes(normalizedLessonSearchQuery);
        const matchesBookmark = !showBookmarkedOnly || bookmarkedLessonIds.includes(item.id);
        return matchesQuery && matchesBookmark;
      }),
    }))
    .filter((section) => section.lessons.length > 0);
  const isCurrentLessonBookmarked = bookmarkedLessonIds.includes(lessonId);
  const lessonHeaderStats = [
    { label: 'Duration', value: formatDuration(lesson.duration) },
    { label: 'Resources', value: String(visibleResources.length || 0) },
    { label: 'Remaining', value: formatDuration(remainingCourseMinutes) },
  ];
  const primaryHeaderActionLabel = !lesson.isCompleted
    ? completing ? 'Marking...' : 'Mark complete'
    : canGoToNext ? 'Continue lesson' : 'Back to course';

  const handlePrimaryHeaderAction = () => {
    if (!lesson.isCompleted) {
      void markComplete();
      return;
    }

    if (canGoToNext) {
      goToLesson('next');
      return;
    }

    router.push(buildCourseHref());
  };

  const renderInteractiveItem = () => {
    switch (lesson.type) {
      case 'VIDEO':
      case 'AUDIO':
        return lesson.videoUrl ? (
          <div className="h-full overflow-y-auto bg-slate-950">
            <div className="h-[min(62vh,560px)]">
              <VideoPlayer url={lesson.videoUrl} textTracks={lesson.textTracks} preferredLocale={contentLocale} />
            </div>
            {activeTranscriptTrack?.content && (
              <div className="border-t border-white/10 bg-slate-900/95 p-6 text-slate-100">
                <div className="mx-auto max-w-4xl">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">
                    <FileText className="h-4 w-4" />
                    Transcript
                  </div>
                  {transcriptTracks.length > 1 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {transcriptTracks.map((track) => {
                        const isActive = track.id === activeTranscriptTrack.id;
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => setTranscriptLocalePreference(track.locale)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                              isActive
                                ? 'border-sky-300 bg-sky-500/20 text-sky-100'
                                : 'border-white/20 bg-white/5 text-slate-300 hover:border-sky-500/40 hover:text-sky-100'
                            }`}
                          >
                            {track.label || getCourseLanguageLabel(track.locale || '')}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {activeTranscriptTrack.content}
                  </div>
                </div>
              </div>
            )}
          </div>
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
                  className="lesson-icon-btn inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                  Download image
                </button>
              </div>
            </div>
          </div>
        );

      case 'DOCUMENT':
      case 'PDF':
      case 'FILE':
        return (
          <div className="h-full min-h-[520px] overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.16),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_25%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] sm:p-6">
            <div className="mx-auto w-full max-w-7xl">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
                <div className="min-w-0 rounded-[32px] border border-slate-200/80 bg-white/95 p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900/80">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Document workspace</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                        {primaryLessonResource?.title || lesson.title}
                      </h3>
                    </div>
                    {primaryLessonResource && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300">
                          {getResolvedResourceType(primaryLessonResource)}
                        </span>
                        {primaryLessonResource.locale && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                            {getCourseLanguageLabel(primaryLessonResource.locale)}
                          </span>
                        )}
                        {formatResourceSize(primaryLessonResource.size) && (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
                            {formatResourceSize(primaryLessonResource.size)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 dark:border-white/10">
                    {primaryLessonResourceUrl && primaryLessonPreviewMode === 'pdf' ? (
                      <iframe
                        src={buildInlineDocumentPreviewUrl(primaryLessonResourceUrl, 'pdf')}
                        title={`${lesson.title} document preview`}
                        className="h-[72vh] min-h-[480px] w-full bg-white"
                      />
                    ) : primaryLessonResourceUrl && primaryLessonPreviewMode === 'image' ? (
                      <div className="flex min-h-[480px] items-center justify-center bg-slate-950 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={primaryLessonResourceUrl}
                          alt={primaryLessonResource?.title || lesson.title}
                          className="max-h-[68vh] w-full rounded-[24px] object-contain"
                        />
                      </div>
                    ) : primaryLessonResourceUrl ? (
                      <div className="flex min-h-[480px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_35%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] p-8">
                        <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
                          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-white">
                            <File className="h-10 w-10" />
                          </div>
                          <h4 className="mt-6 text-2xl font-semibold text-white">Open this document</h4>
                          <p className="mt-3 text-sm leading-7 text-slate-300">
                            Some files and external document hosts cannot be embedded inline. Open the resource in a new tab to continue the lesson while keeping the guide rail available here.
                          </p>
                          <button
                            type="button"
                            onClick={() => window.open(primaryLessonResourceUrl, '_blank')}
                            className="lesson-cta mt-6 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/30"
                          >
                            <Download className="h-5 w-5" />
                            Open resource
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[480px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_35%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] p-8 text-center">
                        <div className="max-w-2xl">
                          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-white">
                            <File className="h-10 w-10" />
                          </div>
                          <h4 className="mt-6 text-2xl font-semibold text-white">No document attached yet</h4>
                          <p className="mt-3 text-sm leading-7 text-slate-300">
                            Add a PDF, workbook, slide deck, or external document link to turn this lesson into a full document-based learning experience.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-5 shadow-xl dark:border-white/10 dark:bg-slate-900/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Lesson guide</p>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">{lesson.title}</h3>
                    {lessonBodyContent ? (
                      <div
                        className={`mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 ${RICH_TEXT_CLASSNAME}`}
                        dangerouslySetInnerHTML={{
                          __html:
                            DOMPurify.sanitize(lessonBodyContent, {
                              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
                            }) || '<p class="text-slate-400 italic">No lesson guide has been written yet.</p>',
                        }}
                      />
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
                        {lesson.description || 'Use the attached document alongside notes, discussion, and the lesson overview to guide learners through this material.'}
                      </p>
                    )}
                  </div>

                  <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-5 shadow-xl dark:border-white/10 dark:bg-slate-900/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Study context</p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Current module</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{currentSection?.title || 'Course content'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Content language</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{getCourseLanguageLabel(contentLocale)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Attached resources</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{visibleResources.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-5 shadow-xl dark:border-white/10 dark:bg-slate-900/80">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Localized resources</p>
                        <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Download center</h4>
                      </div>
                      <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 dark:bg-slate-950/40 dark:text-white">
                        {visibleResources.length}
                      </div>
                    </div>

                    {primaryLessonResourceUrl ? (
                      <button
                        type="button"
                        onClick={() => window.open(primaryLessonResourceUrl, '_blank')}
                        className="lesson-cta mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/30"
                      >
                        <Download className="h-4 w-4" />
                        Open primary resource
                      </button>
                    ) : null}

                    {visibleResources.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {visibleResources.map((resource) => (
                          <a
                            key={resource.id}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-sky-500/20 dark:hover:bg-white/[0.05]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900 dark:text-white">{resource.title || 'Attachment'}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {getResolvedResourceType(resource)}
                                {resource.locale ? ` • ${getCourseLanguageLabel(resource.locale)}` : ''}
                                {formatResourceSize(resource.size) ? ` • ${formatResourceSize(resource.size)}` : ''}
                              </p>
                            </div>
                            <ChevronRight className="ml-3 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                        No localized resources are attached to this lesson yet.
                      </div>
                    )}

                    {additionalVisibleResources.length > 0 && (
                      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        Additional attachments are available for this lesson in the selected content language.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        );

      case 'CASE_STUDY':
      case 'PRACTICE':
      case 'ARTICLE':
      default:
        return (
          <div className="h-full min-h-[390px] overflow-y-auto bg-white dark:bg-slate-950">
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <FileText className="h-4 w-4" />
                    Editorial lesson
                  </div>
                  <h1 className="text-[2rem] font-semibold leading-tight text-slate-900 sm:text-[2.35rem] dark:text-white">{lesson.title}</h1>
                  <div
                    className={`mt-6 text-base leading-8 text-slate-700 dark:text-slate-200 ${RICH_TEXT_CLASSNAME}`}
                    dangerouslySetInnerHTML={{
                      __html:
                        DOMPurify.sanitize(lesson.content || '', {
                          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
                        }) || '<p class="text-slate-400 italic">This lesson has no written content yet.</p>',
                    }}
                  />

                  {visibleResources.length > 0 && (
                    <div className="mt-10 border-t border-slate-200 pt-6 dark:border-white/10">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Lesson resources</h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {visibleResources.map((resource) => (
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
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {resource.type || 'Resource'}{resource.locale ? ` • ${getCourseLanguageLabel(resource.locale)}` : ''}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <aside className="hidden xl:block">
                  <div className="lesson-panel rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Reading focus</p>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-slate-950/40">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Current module</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {currentSection?.title || 'Core concepts'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-slate-950/40">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Lesson status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                          {lesson.isCompleted ? 'Completed' : 'In progress'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {isCurrentLessonBookmarked ? 'Saved to bookmarks' : 'Bookmark to revisit later'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-slate-950/40">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Next up</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {nextUnfinishedLesson && nextUnfinishedLesson.id !== lesson.id
                            ? nextUnfinishedLesson.title
                            : 'Continue this lesson'}
                        </p>
                        {nextUnfinishedLesson && nextUnfinishedLesson.id !== lesson.id && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatDuration(nextUnfinishedLesson.duration)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        );
    }
  };

  const sidebarContent = (
    <div className="lesson-surface lesson-sidebar flex h-full flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/85 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
      <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-white/10 xl:hidden">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Course content</p>
        <button
          type="button"
          onClick={() => setShowSidebar(false)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
        >
          Close
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="border-b border-slate-200/70 px-5 py-5 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.08em] text-slate-600 dark:text-slate-300">Course content</p>
            <h2 className="mt-2 line-clamp-2 break-words text-lg font-semibold text-slate-900 dark:text-white">{course?.title || 'Course outline'}</h2>
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
          <p className="text-xs font-semibold tracking-[0.08em] text-slate-600 dark:text-slate-300">Continue path</p>
          <p className="mt-2 line-clamp-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
            {nextUnfinishedLesson && nextUnfinishedLesson.id !== lesson.id ? nextUnfinishedLesson.title : lesson.title}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {nextUnfinishedLesson && nextUnfinishedLesson.id !== lesson.id
              ? `${formatDuration(nextUnfinishedLesson.duration)} • Next recommended lesson`
              : `${formatDuration(lesson.duration)} • Current focus lesson`}
          </p>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowSidebarFilters((current) => !current)}
            className="lesson-panel inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveSidebarFilters && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                  Active
                </span>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showSidebarFilters ? 'rotate-180' : ''}`} />
          </button>

          {showSidebarFilters && (
            <div className="mt-3 flex flex-col gap-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={lessonSearchQuery}
                  onChange={(event) => setLessonSearchQuery(event.target.value)}
                  placeholder="Search lessons..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                />
              </label>
              <button
                onClick={() => setShowBookmarkedOnly((current) => !current)}
                className={`lesson-panel inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  showBookmarkedOnly
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${showBookmarkedOnly ? 'fill-current' : ''}`} />
                Bookmarked only
              </button>
              <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
                {bookmarkFeedback
                  || (bookmarkSyncState === 'local'
                    ? 'Saved lessons are staying on this device until account sync is available again.'
                    : bookmarkSyncState === 'syncing'
                      ? 'Syncing saved lessons with your account...'
                      : 'Saved lessons sync across your account.')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-on-hover">
        <div className="space-y-3">
          {filteredSections.map((section) => {
            const isExpanded = expandedSections[section.id] ?? true;
            const sectionCompleted = section.lessons.filter((item) => item.isCompleted).length;
            const sectionHasActiveLesson = section.lessons.some((item) => item.id === lessonId);

            return (
              <div key={section.id} className="lesson-panel rounded-[26px] border border-slate-200/80 bg-slate-50/70 p-2 dark:border-white/10 dark:bg-white/[0.03]">
                <button
                  onClick={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))}
                  className="flex w-full items-center justify-between gap-3 rounded-[20px] px-3 py-3 text-left transition-colors hover:bg-white/80 dark:hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words text-sm font-semibold text-slate-900 dark:text-white">{section.title}</p>
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
                      const isBookmarked = bookmarkedLessonIds.includes(courseLesson.id);

                      return (
                        <div
                          key={courseLesson.id}
                          className={`lesson-sidebar-lesson group w-full rounded-[22px] border px-4 py-4 text-left transition-all ${
                            isActive
                              ? 'border-sky-200 bg-sky-50 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10'
                              : isLocked
                                ? 'border-transparent bg-slate-100/60 opacity-60 dark:bg-white/[0.03]'
                                : 'border-transparent bg-white/80 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white dark:bg-white/[0.03] dark:hover:border-white/10 dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (!isLocked) {
                                  router.push(buildLessonHref(courseLesson.id));
                                  if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                                    setShowSidebar(false);
                                  }
                                }
                              }}
                              disabled={isLocked}
                              className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            >
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
                                    <p className={`line-clamp-2 break-words text-sm font-semibold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
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
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLessonBookmark(courseLesson.id)}
                              className={`rounded-full p-2 transition ${
                                isBookmarked
                                  ? 'text-amber-500'
                                  : 'text-slate-400 hover:text-amber-500 dark:text-slate-500'
                              }`}
                              aria-label={isBookmarked ? 'Remove lesson bookmark' : 'Bookmark lesson'}
                            >
                              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="lesson-panel rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
              No lessons match this filter yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={lessonTheme} className="lesson-stage relative min-h-screen overflow-hidden bg-[var(--lesson-bg)] text-[var(--lesson-ink)] dark:bg-[#020617] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-500/10" />
        <div className="absolute -left-24 bottom-20 h-[280px] w-[280px] rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className={`lesson-shell reveal-item reveal-1 sticky top-0 z-30 border-b backdrop-blur-xl transition-all duration-300 ${
          isEditorialHeader
            ? 'border-amber-200/80 bg-[linear-gradient(112deg,rgba(255,251,235,0.96),rgba(254,242,242,0.92))] shadow-[0_20px_40px_-34px_rgba(217,119,6,0.55)] dark:border-amber-500/30 dark:bg-[linear-gradient(112deg,rgba(17,24,39,0.95),rgba(30,41,59,0.9))]'
            : 'border-slate-200/80 bg-[linear-gradient(115deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] dark:border-white/10 dark:bg-[linear-gradient(115deg,rgba(2,6,23,0.92),rgba(15,23,42,0.84))]'
        }`}>
          <div className={`mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${isHeaderCondensed ? 'py-2.5' : 'py-4'}`}>
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link
                href={buildCourseHref()}
                className={`lesson-icon-btn inline-flex flex-shrink-0 items-center justify-center rounded-2xl border text-slate-700 transition-all hover:-translate-y-0.5 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${
                  isEditorialHeader
                    ? 'border-amber-200 bg-white/95 shadow-[0_16px_26px_-22px_rgba(217,119,6,0.5)] hover:border-amber-300 dark:border-amber-500/35 dark:bg-amber-500/10 dark:hover:border-amber-400/45'
                    : 'border-slate-200/90 bg-white/95 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.55)] hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20'
                } ${isHeaderCondensed ? 'h-10 w-10' : 'h-11 w-11'}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isEditorialHeader && <span className="hidden h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.14)] sm:inline-flex" />}
                  <p className={`font-semibold transition-all duration-300 ${
                    isEditorialHeader
                      ? `text-slate-600 dark:text-slate-300 ${isHeaderCondensed ? 'text-[10px] uppercase tracking-[0.14em]' : 'text-[11px] uppercase tracking-[0.18em]'}`
                      : `text-slate-500 dark:text-slate-400 ${isHeaderCondensed ? 'text-[11px] tracking-[0.03em]' : 'text-xs tracking-[0.08em]'}`
                  }`}>
                    Learning workspace
                  </p>
                </div>
                <div className={`flex min-w-0 items-center gap-2 ${isHeaderCondensed ? 'mt-0.5' : 'mt-1'}`}>
                  <h1 className={`truncate text-slate-900 transition-all duration-300 dark:text-white ${
                    isEditorialHeader
                      ? `${isHeaderCondensed ? 'text-[15px] font-bold sm:text-base' : 'text-[17px] font-extrabold sm:text-[1.7rem]'}`
                      : `${isHeaderCondensed ? 'text-[15px] font-semibold sm:text-base' : 'text-base font-semibold sm:text-lg'}`
                  }`}>
                    {course?.title}
                  </h1>
                  {!isHeaderCondensed && currentSection && (
                    <span className={`hidden lg:inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      isEditorialHeader
                        ? 'border-amber-200 bg-white/95 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                        : 'border-slate-200 bg-white/90 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300'
                    }`}>
                      {currentSection.title}
                    </span>
                  )}
                </div>
                <div className={isHeaderCondensed ? 'hidden md:flex md:items-center md:gap-2' : 'mt-1.5 flex items-center gap-2'}>
                  <p className={`truncate text-sm ${isEditorialHeader ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{lesson.title}</p>
                  {!isHeaderCondensed && (
                    <span className={`hidden md:inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isEditorialHeader
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                    }`}>
                      {getLessonTypeLabel(lesson.type)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 sm:flex">
                <div className={`inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white ${
                  isEditorialHeader
                    ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 shadow-[0_18px_30px_-20px_rgba(236,72,153,0.8)]'
                    : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 shadow-[0_18px_30px_-20px_rgba(37,99,235,0.82)]'
                } ${isHeaderCondensed ? 'h-10 min-w-[184px] pl-3 pr-4' : 'h-11 min-w-[196px] pl-3.5 pr-5'} whitespace-nowrap`}>
                  <span>Current lesson</span>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    {currentPosition}/{course?.lessonsCount || 0}
                  </span>
                </div>

                <div className={`inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white ${
                  isEditorialHeader
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_18px_30px_-20px_rgba(20,184,166,0.78)]'
                    : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-500 shadow-[0_18px_30px_-20px_rgba(147,51,234,0.78)]'
                } ${isHeaderCondensed ? 'h-10 min-w-[184px] pl-3 pr-4' : 'h-11 min-w-[196px] pl-3.5 pr-5'} whitespace-nowrap`}>
                  <span>Course progress</span>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    {progressPercentage}%
                  </span>
                </div>

                <button
                  onClick={handlePrimaryHeaderAction}
                  disabled={completing}
                  className={`lesson-cta hidden items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex ${
                    isEditorialHeader
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-[0_18px_30px_-20px_rgba(234,88,12,0.8)]'
                      : 'bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 shadow-[0_18px_30px_-20px_rgba(14,165,233,0.82)]'
                  } ${isHeaderCondensed ? 'h-10 min-w-[184px] pl-3 pr-5' : 'h-11 min-w-[196px] pl-3.5 pr-6'} whitespace-nowrap`}
                >
                  <span className={`inline-flex items-center justify-center rounded-full bg-white/20 ${isHeaderCondensed ? 'h-6 w-6' : 'h-7 w-7'}`}>
                    {!lesson.isCompleted ? <CheckCircle className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <span className="hidden sm:inline">{primaryHeaderActionLabel}</span>
                  <span className="sm:hidden">{!lesson.isCompleted ? (completing ? '...' : 'Complete') : (canGoToNext ? 'Continue' : 'Course')}</span>
                </button>
              </div>

              <div className={`flex items-center gap-1 rounded-2xl border p-1 ${
                isEditorialHeader
                  ? 'border-amber-200 bg-white/95 shadow-[0_14px_24px_-20px_rgba(217,119,6,0.45)] dark:border-amber-500/30 dark:bg-amber-500/10'
                  : 'border-slate-200/90 bg-white/90 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-white/[0.04]'
              }`}>
                <button
                  onClick={toggleTheme}
                  className={`lesson-icon-btn inline-flex items-center justify-center rounded-xl border border-transparent text-slate-700 transition-all hover:-translate-y-0.5 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${
                    isEditorialHeader
                      ? 'hover:border-amber-200 hover:bg-white dark:hover:border-amber-500/30 dark:hover:bg-amber-500/15'
                      : 'hover:border-slate-200 hover:bg-white dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
                  } ${isHeaderCondensed ? 'h-9 w-9' : 'h-10 w-10'}`}
                  title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                <button
                  onClick={() => setShowSidebar((prev) => !prev)}
                  className={`lesson-icon-btn inline-flex items-center justify-center rounded-xl border border-transparent text-slate-700 transition-all hover:-translate-y-0.5 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${
                    isEditorialHeader
                      ? 'hover:border-amber-200 hover:bg-white dark:hover:border-amber-500/30 dark:hover:bg-amber-500/15'
                      : 'hover:border-slate-200 hover:bg-white dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
                  } ${isHeaderCondensed ? 'h-9 w-9' : 'h-10 w-10'}`}
                  title={showSidebar ? 'Hide course content' : 'Show course content'}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 gap-6 px-4 py-4 pb-28 sm:px-6 sm:pb-4 lg:px-8">
          <main className="min-w-0 flex-1 space-y-6">
            <section className="lesson-shell lesson-surface reveal-item reveal-2 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/88 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
              <div className="border-b border-slate-200/70 px-5 py-4 sm:px-6 dark:border-white/10">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                        {getLessonTypeLabel(lesson.type)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                        Lesson {currentPosition} of {course?.lessonsCount || 0}
                      </span>
                      {currentSection && (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.08em] text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                          {currentSection.title}
                        </span>
                      )}
                      {lesson.isCompleted && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Completed
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold leading-tight text-slate-900 sm:text-2xl dark:text-white">{lesson.title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {lesson.description || getLessonTypeSummary(lesson.type)}
                    </p>
                  </div>

                  <div className="w-full xl:w-[440px]">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 xl:justify-end dark:text-slate-300">
                      {lessonHeaderStats.map((item) => (
                        <p key={item.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.value}</span>
                        </p>
                      ))}
                      <button
                        onClick={() => handleToggleLessonBookmark(lesson.id)}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] transition ${
                          isCurrentLessonBookmarked
                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
                        }`}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${isCurrentLessonBookmarked ? 'fill-current' : ''}`} />
                        {isCurrentLessonBookmarked ? 'Bookmarked' : 'Bookmark'}
                      </button>
                    </div>
                    {Array.isArray(course?.supportedLocales) && course.supportedLocales.length > 1 && (
                      <div className="mt-3 flex items-center gap-2 xl:justify-end">
                        <Languages className="h-4 w-4 text-sky-500" />
                        <select
                          value={contentLocale}
                          onChange={(event) => router.replace(buildLessonHref(lessonId, event.target.value))}
                          className="min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {course.supportedLocales.map((localeKey) => (
                            <option key={localeKey} value={localeKey}>
                              {getCourseLanguageLabel(localeKey)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <div className={`lesson-media-shell overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:border-white/10 ${isReadingLesson ? 'min-h-[390px]' : 'min-h-[420px]'}`}>
                  {renderInteractiveItem()}
                </div>
              </div>
            </section>

            <section className="reveal-item reveal-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)_minmax(0,1fr)]">
              <button
                onClick={() => goToLesson('prev')}
                disabled={!canGoToPrev}
                className="lesson-surface lesson-nav-card group rounded-[28px] border border-slate-200/80 bg-white/88 p-5 text-left shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-white/20"
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

              <div className="lesson-surface rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900/75">
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
                    <div className="lesson-stat rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Remaining workload</p>
                      <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{remainingLessonCount} lessons left</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDuration(remainingCourseMinutes)} still to complete</p>
                    </div>
                    <div className="lesson-stat rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
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
                      className="lesson-cta inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle className="h-5 w-5" />
                      {completing ? 'Marking...' : 'Mark complete'}
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => goToLesson('next')}
                disabled={!canGoToNext}
                className={`lesson-surface lesson-nav-card group rounded-[28px] border p-5 text-left shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                  canGoToNext
                    ? 'border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/70 hover:border-emerald-300 dark:border-emerald-500/35 dark:from-slate-900/75 dark:to-emerald-500/10 dark:hover:border-emerald-400/45'
                    : 'border-slate-200/80 bg-white/88 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-end gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Next lesson
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
                {canGoToNext && (
                  <p className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Recommended next
                  </p>
                )}
                <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{nextLesson?.title || 'Final lesson reached'}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {nextLesson ? formatDuration(nextLesson.duration) : 'You have reached the end of the current lesson path.'}
                </p>
              </button>
            </section>

            <section className="lesson-shell lesson-surface reveal-item reveal-4 rounded-[32px] border border-slate-200/80 bg-white/88 p-3 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-4 dark:border-white/10 dark:bg-slate-900/75">
              <div className="lesson-tab-rail inline-flex flex-wrap gap-2 rounded-[22px] bg-slate-100/90 p-1.5 dark:bg-white/5">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'qa', label: 'Discussion' },
                  { key: 'notes', label: 'My notes' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as 'overview' | 'qa' | 'notes')}
                    className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      activeTab === tab.key
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {activeTab === 'overview' && (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="lesson-panel rounded-[28px] border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-950/40">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Lesson overview</p>
                      <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{lesson.title}</h3>
                      {lesson.content ? (
                        <div
                          className={`mt-5 text-base leading-7 text-slate-600 dark:text-slate-300 ${RICH_TEXT_CLASSNAME}`}
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(lesson.content, {
                              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
                            }),
                          }}
                        />
                      ) : (
                        <p className="mt-5 text-[15px] leading-7 text-slate-500 dark:text-slate-400">
                          {lesson.description || 'No description has been provided for this lesson yet.'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="lesson-panel rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Lesson details</p>
                        <div className="mt-4 space-y-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/40">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Type</p>
                            <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{getLessonTypeLabel(lesson.type)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/40">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Duration</p>
                            <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{formatDuration(lesson.duration)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/40">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Status</p>
                            <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">{lesson.isCompleted ? 'Completed' : 'Pending completion'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="lesson-panel rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Resources</p>
                            <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Download center</h4>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:bg-slate-950/40 dark:text-white">
                            {visibleResources.length || 0}
                          </div>
                        </div>

                        {visibleResources.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            {visibleResources.map((resource) => (
                              <a
                                key={resource.id}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            className="lesson-resource-row group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-sky-200 dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-sky-500/20"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{resource.title}</p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {resource.type || 'Attachment'}
                                    {resource.locale ? ` • ${getCourseLanguageLabel(resource.locale)}` : ''}
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
                  <div className="lesson-panel rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-slate-950/30">
                    <QAThreadList courseId={courseId} lessonId={lessonId} />
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="lesson-panel rounded-[28px] border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-950/40">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Private notes</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Lesson notebook</h3>
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                          <p>
                            {notesSyncState === 'saving'
                              ? 'Saving to your account'
                              : notesSyncState === 'synced'
                                ? 'Synced to your account'
                                : notesSyncState === 'syncing'
                                  ? 'Checking your saved note'
                                  : 'Saved on this device'}
                          </p>
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
                      <div className="lesson-panel rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Suggested structure</p>
                        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                          <p><span className="font-semibold text-slate-900 dark:text-white">Key takeaway:</span> What matters most from this lesson?</p>
                          <p><span className="font-semibold text-slate-900 dark:text-white">Questions:</span> What still feels unclear or worth discussing?</p>
                          <p><span className="font-semibold text-slate-900 dark:text-white">Action:</span> What will you apply after this lesson?</p>
                        </div>
                      </div>

                      <div className="lesson-panel rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
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

          {showSidebar && (
            <aside className="reveal-item reveal-5 hidden h-[calc(100vh-104px)] w-[360px] flex-shrink-0 xl:sticky xl:top-20 xl:block">
              {sidebarContent}
            </aside>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-slate-950/90 xl:hidden">
          <div className="mx-auto grid w-full max-w-[1800px] grid-cols-3 gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:px-6">
            <button
              onClick={() => goToLesson('prev')}
              disabled={!canGoToPrev}
              className="inline-flex h-12 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={handlePrimaryHeaderAction}
              disabled={completing}
              className="lesson-cta inline-flex h-12 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!lesson.isCompleted ? <CheckCircle className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {!lesson.isCompleted ? (completing ? 'Marking...' : 'Complete') : (canGoToNext ? 'Continue' : 'Course')}
            </button>
            <button
              onClick={() => goToLesson('next')}
              disabled={!canGoToNext}
              className="inline-flex h-12 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showSidebar && (
          <div className="fixed inset-0 z-40 xl:hidden">
            <button
              aria-label="Close course content"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setShowSidebar(false)}
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-sm p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4">{sidebarContent}</div>
          </div>
        )}
        <style jsx global>{`
          .lesson-stage {
            font-family: 'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', sans-serif;
            isolation: isolate;
          }

          .lesson-stage::before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.52;
            background-image:
              linear-gradient(120deg, rgba(245, 158, 11, 0.08) 0%, transparent 35%),
              repeating-linear-gradient(-32deg, rgba(100, 116, 139, 0.08) 0 1px, transparent 1px 24px);
            mask-image: radial-gradient(circle at top, black 38%, transparent 92%);
          }

          .lesson-stage h1,
          .lesson-stage h2,
          .lesson-stage h3 {
            font-family: 'Manrope', 'Plus Jakarta Sans', 'Avenir Next', sans-serif;
            letter-spacing: -0.01em;
          }

          .lesson-stage .reveal-item {
            animation: lessonReveal 640ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .lesson-stage .reveal-1 { animation-delay: 40ms; }
          .lesson-stage .reveal-2 { animation-delay: 90ms; }
          .lesson-stage .reveal-3 { animation-delay: 140ms; }
          .lesson-stage .reveal-4 { animation-delay: 190ms; }
          .lesson-stage .reveal-5 { animation-delay: 240ms; }

          .lesson-stage .lesson-shell {
            transition: border-color 260ms ease, box-shadow 260ms ease;
          }

          .lesson-stage .lesson-shell:hover {
            border-color: rgba(245, 158, 11, 0.28);
          }

          .lesson-stage .lesson-surface {
            transition: transform 280ms ease, border-color 280ms ease, box-shadow 280ms ease;
          }

          .lesson-stage .lesson-surface:hover {
            border-color: rgba(245, 158, 11, 0.3);
            box-shadow: 0 30px 90px -46px rgba(15, 23, 42, 0.5);
            transform: translateY(-2px);
          }

          .lesson-stage .lesson-panel {
            transition: transform 220ms ease, border-color 220ms ease;
          }

          .lesson-stage .lesson-panel:hover {
            border-color: rgba(14, 165, 233, 0.26);
            transform: translateY(-1px);
          }

          .lesson-stage .lesson-stat {
            transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
          }

          .lesson-stage .lesson-stat:hover {
            border-color: rgba(245, 158, 11, 0.28);
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
            transform: translateY(-1px);
          }

          .lesson-stage .lesson-media-shell {
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 22px 44px -36px rgba(2, 6, 23, 0.7);
          }

          .lesson-stage .lesson-nav-card {
            position: relative;
            overflow: hidden;
          }

          .lesson-stage .lesson-nav-card::after {
            content: '';
            position: absolute;
            inset: auto -30% -90% -30%;
            height: 130%;
            pointer-events: none;
            opacity: 0;
            transition: opacity 260ms ease;
            background: radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, transparent 70%);
          }

          .lesson-stage .lesson-nav-card:hover::after {
            opacity: 1;
          }

          .lesson-stage .lesson-tab-rail {
            border: 1px solid rgba(148, 163, 184, 0.26);
          }

          .lesson-stage .lesson-chip {
            border-color: rgba(245, 158, 11, 0.2);
            box-shadow: 0 10px 22px -20px rgba(245, 158, 11, 0.85);
          }

          .lesson-stage .lesson-icon-btn {
            transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
          }

          .lesson-stage .lesson-icon-btn:hover {
            border-color: rgba(245, 158, 11, 0.34);
            box-shadow: 0 10px 24px -18px rgba(245, 158, 11, 0.8);
          }

          .lesson-stage .lesson-sidebar-lesson:not([disabled]):hover {
            transform: translateX(2px);
          }

          .lesson-stage .lesson-resource-row:hover {
            border-color: rgba(14, 165, 233, 0.34);
            box-shadow: 0 14px 26px -22px rgba(15, 23, 42, 0.55);
          }

          .lesson-stage .lesson-cta {
            box-shadow: 0 12px 28px rgba(245, 158, 11, 0.3);
          }

          .lesson-stage .lesson-cta:hover {
            box-shadow: 0 16px 36px rgba(245, 158, 11, 0.34);
          }

          @keyframes lessonReveal {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .lesson-stage .reveal-item {
              animation: none !important;
            }

            .lesson-stage .lesson-shell,
            .lesson-stage .lesson-surface,
            .lesson-stage .lesson-panel,
            .lesson-stage .lesson-stat,
            .lesson-stage .lesson-icon-btn,
            .lesson-stage .lesson-resource-row,
            .lesson-stage .lesson-sidebar-lesson {
              transition: none !important;
            }

            .lesson-stage .lesson-surface:hover,
            .lesson-stage .lesson-panel:hover,
            .lesson-stage .lesson-stat:hover,
            .lesson-stage .lesson-sidebar-lesson:not([disabled]):hover {
              transform: none !important;
            }

            .lesson-stage .lesson-nav-card::after {
              display: none;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
