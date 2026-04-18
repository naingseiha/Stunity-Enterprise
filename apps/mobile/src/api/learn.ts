/**
 * Learning API Client
 *
 * Handles course, lesson, enrollment, and learning path APIs.
 */

import { learnApi as api } from './client';
import i18n from '@/lib/i18n';

export type LearnCourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';

export interface LearnInstructor {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  title?: string;
}

export interface LearnCourse {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  level: LearnCourseLevel;
  sourceLocale?: string;
  supportedLocales?: string[];
  duration: number;
  lessonsCount: number;
  enrolledCount: number;
  rating: number;
  reviewsCount: number;
  price: number;
  isFree: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isPublished?: boolean;
  tags: string[];
  instructor: LearnInstructor;
  createdAt: string;
  updatedAt: string;
}

export interface LearnEnrolledCourse extends LearnCourse {
  progress: number;
  completedLessons: number;
  enrolledAt?: string;
  lastAccessedAt?: string;
  completedAt?: string;
}

export interface LearnCourseLesson {
  id: string;
  title: string;
  description?: string | null;
  type?: string;
  duration: number;
  order: number;
  isFree: boolean;
  isCompleted: boolean;
  isLocked: boolean;
}

export interface LearnCourseSection {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: LearnCourseLesson[];
}

export interface LearnEnrollment {
  progress: number;
  enrolledAt: string;
  lastAccessedAt: string;
}

export interface LearnCourseDetail extends LearnCourse {
  sections: LearnCourseSection[];
  lessons: LearnCourseLesson[]; // Legacy flat list for backward compatibility
  isEnrolled: boolean;
  isInstructor?: boolean;
  enrollment: LearnEnrollment | null;
}

export interface LearnCourseAnnouncement {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  sentAt: string;
  author?: {
    id: string;
    name: string;
    avatar?: string | null;
    title?: string | null;
  } | null;
}

export interface LearnPathCourse {
  id: string;
  title: string;
  thumbnail?: string;
  duration: number;
  order: number;
}

export interface LearnPath {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  level: string;
  isFeatured: boolean;
  totalDuration: number;
  coursesCount: number;
  enrolledCount: number;
  isEnrolled: boolean;
  courses: LearnPathCourse[];
}

export interface LearnLessonResource {
  id: string;
  title: string;
  type: string;
  url: string;
  locale?: string;
  isDefault?: boolean;
  size: number | null;
}

export interface LearnLessonTextTrack {
  id: string;
  kind: 'SUBTITLE' | 'CAPTION' | 'TRANSCRIPT';
  locale: string;
  label?: string | null;
  url?: string | null;
  content?: string | null;
  isDefault: boolean;
}

export interface LearnLessonDetail {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  duration: number;
  order: number;
  isFree: boolean;
  type: string;
  resources: LearnLessonResource[];
  textTracks: LearnLessonTextTrack[];
  isCompleted: boolean;
  watchTime: number;
  quiz?: any;
  assignment?: {
    id: string;
    maxScore: number;
    passingScore: number;
    instructions: string;
    rubric?: string | null;
  };
  assignmentSubmission?: {
    id: string;
    submissionText: string | null;
    submissionUrl: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RESUBMISSION_REQUIRED';
    score: number | null;
    feedback?: string | null;
  };
}

export interface LearningStats {
  enrolledCourses: number;
  completedCourses: number;
  completedLessons: number;
  hoursLearned: number;
  currentStreak: number;
  totalPoints: number;
  level: number;
}

export interface LearnHubData {
  courses: LearnCourse[];
  myCourses: LearnEnrolledCourse[];
  myCreated: LearnCourse[];
  paths: LearnPath[];
  stats: LearningStats;
}

export interface PerformanceData {
  name: string;
  students: number;
  revenue: number;
}

export interface InstructorCourseStats {
  id: string;
  title: string;
  students: number;
  revenue: number;
  rating: number;
}

export interface InstructorDashboardStats {
  stats: {
    totalRevenue: number;
    totalStudents: number;
    activeCourses: number;
    averageRating: number;
  };
  performance: PerformanceData[];
  courses: InstructorCourseStats[];
}

export interface CreateCourseBulkPayload extends CreateCoursePayload {
  lessons: CreateLessonPayload[];
  publish?: boolean;
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  titleTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  titleEn?: string;
  titleKm?: string;
  descriptionEn?: string;
  descriptionKm?: string;
  thumbnail?: string;
  category: string;
  level: LearnCourseLevel;
  sourceLocale?: string;
  supportedLocales?: string[];
  tags?: string[];
}

export interface CreateLessonPayload {
  type?: string;
  title: string;
  titleTranslations?: Record<string, string>;
  titleEn?: string;
  titleKm?: string;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  descriptionEn?: string;
  descriptionKm?: string;
  duration: number;
  isFree: boolean;
  content?: string;
  contentTranslations?: Record<string, string>;
  contentEn?: string;
  contentKm?: string;
  videoUrl?: string;
  resources?: Array<{
    title: string;
    url: string;
    type?: 'FILE' | 'LINK' | 'VIDEO';
    locale?: string;
    isDefault?: boolean;
    size?: number | null;
  }>;
  textTracks?: Array<{
    kind?: 'SUBTITLE' | 'CAPTION' | 'TRANSCRIPT';
    locale?: string;
    label?: string;
    url?: string;
    content?: string;
    isDefault?: boolean;
  }>;
  quiz?: {
    passingScore?: number;
    questions?: Array<{
      question: string;
      explanation?: string;
      order?: number;
      options?: Array<{ text: string; isCorrect: boolean }>;
    }>;
  };
  assignment?: {
    maxScore?: number;
    passingScore?: number;
    instructions?: string;
    instructionsTranslations?: Record<string, string>;
    instructionsEn?: string;
    instructionsKm?: string;
    rubric?: string;
    rubricTranslations?: Record<string, string>;
    rubricEn?: string;
    rubricKm?: string;
  };
  exercise?: {
    language?: string;
    initialCode?: string;
    solutionCode?: string;
    solution?: string;
    testCases?: unknown;
  };
  order?: number;
}

const DEFAULT_DATE = new Date(0).toISOString();

const getLearnLocale = (): 'en' | 'km' => {
  const language = String(i18n.resolvedLanguage || i18n.language || 'en').toLowerCase();
  return language.startsWith('km') || language.startsWith('kh') ? 'km' : 'en';
};

const withLocaleParams = <T extends Record<string, unknown> | undefined>(params?: T) => ({
  ...(params || {}),
  locale: getLearnLocale(),
});

const normalizeTrimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeLocaleTag = (value: unknown, fallback = 'en') => {
  const normalized = normalizeTrimmed(value).toLowerCase().replace('_', '-');
  if (!normalized) return fallback;
  if (normalized === 'kh' || normalized === 'km-kh' || normalized === 'kh-kh') return 'km';
  if (normalized === 'en-us' || normalized === 'en-gb') return 'en';
  return normalized;
};

const normalizeTranslations = (translations?: Record<string, unknown> | null): Record<string, string> | undefined => {
  if (!translations || typeof translations !== 'object') return undefined;

  const normalized = Object.entries(translations).reduce<Record<string, string>>((acc, [localeKey, rawValue]) => {
    const value = normalizeTrimmed(rawValue);
    if (!value) return acc;
    acc[normalizeLocaleTag(localeKey)] = value;
    return acc;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeSupportedLocalesForPayload = (locales: unknown, sourceLocale: string) => {
  const normalized = Array.isArray(locales)
    ? Array.from(
        new Set(
          locales
            .map((locale) => normalizeLocaleTag(locale))
            .filter(Boolean)
        )
      )
    : [];

  if (!normalized.includes(sourceLocale)) {
    normalized.unshift(sourceLocale);
  }

  return normalized.length > 0 ? normalized : [sourceLocale];
};

const normalizeLevel = (level: unknown): LearnCourseLevel => {
  if (level === 'BEGINNER' || level === 'INTERMEDIATE' || level === 'ADVANCED' || level === 'ALL_LEVELS') {
    return level;
  }
  return 'ALL_LEVELS';
};

const normalizeInstructor = (instructor: any): LearnInstructor => {
  const fullName = typeof instructor?.name === 'string' ? instructor.name.trim() : '';
  const firstNameFromSplit = fullName.split(' ').filter(Boolean)[0] || '';
  const lastNameFromSplit = fullName.split(' ').filter(Boolean).slice(1).join(' ') || '';
  const firstName = typeof instructor?.firstName === 'string' ? instructor.firstName : firstNameFromSplit;
  const lastName = typeof instructor?.lastName === 'string' ? instructor.lastName : lastNameFromSplit;

  return {
    id: String(instructor?.id ?? ''),
    name: `${firstName} ${lastName}`.trim() || fullName || 'Unknown Instructor',
    firstName: firstName || 'Unknown',
    lastName: lastName || '',
    avatar: instructor?.avatar || instructor?.profilePictureUrl || undefined,
    title: instructor?.title || instructor?.professionalTitle || undefined,
  };
};

const normalizeCourse = (course: any): LearnCourse => ({
  id: String(course?.id ?? ''),
  title: String(course?.title ?? ''),
  description: String(course?.description ?? ''),
  thumbnail: course?.thumbnail || course?.thumbnailUrl || undefined,
  category: String(course?.category ?? 'General'),
  level: normalizeLevel(course?.level),
  sourceLocale: typeof course?.sourceLocale === 'string' ? course.sourceLocale : 'en',
  supportedLocales: Array.isArray(course?.supportedLocales)
    ? course.supportedLocales.map((locale: unknown) => String(locale))
    : ['en'],
  duration: Number(course?.duration ?? 0),
  lessonsCount: Number(course?.lessonsCount ?? 0),
  enrolledCount: Number(course?.enrolledCount ?? 0),
  rating: Number(course?.rating ?? 0),
  reviewsCount: Number(course?.reviewsCount ?? 0),
  price: Number(course?.price ?? 0),
  isFree: Boolean(course?.isFree ?? Number(course?.price ?? 0) === 0),
  isFeatured: Boolean(course?.isFeatured),
  isNew: Boolean(course?.isNew),
  isPublished: typeof course?.isPublished === 'boolean' ? course.isPublished : undefined,
  tags: Array.isArray(course?.tags) ? course.tags : [],
  instructor: normalizeInstructor(course?.instructor),
  createdAt: typeof course?.createdAt === 'string' ? course.createdAt : DEFAULT_DATE,
  updatedAt: typeof course?.updatedAt === 'string' ? course.updatedAt : DEFAULT_DATE,
});

export const getCourses = async (params?: {
  category?: string;
  level?: LearnCourseLevel;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}): Promise<LearnCourse[]> => {
  const response = await api.get('/courses', { params: withLocaleParams(params) });
  const rawCourses = Array.isArray(response.data?.courses) ? response.data.courses : [];
  return rawCourses.map(normalizeCourse);
};

export const getMyCourses = async (): Promise<LearnEnrolledCourse[]> => {
  // Use getLearnHub to get enrolled courses — it returns the correct shape including progress
  const hub = await getLearnHub();
  return hub.myCourses;
};

export const getMyCreatedCourses = async (): Promise<LearnCourse[]> => {
  // Use getLearnHub to get created courses — single network request
  const hub = await getLearnHub();
  return hub.myCreated;
};

export const getLearningPaths = async (params?: {
  featured?: boolean;
  limit?: number;
}): Promise<LearnPath[]> => {
  // Route is /learning-paths/paths on the learn-service (coursesRouter mounted at /learning-paths)
  const response = await api.get('/paths', { params });
  const rawPaths = Array.isArray(response.data?.paths) ? response.data.paths : [];

  return rawPaths.map((path: any) => ({
    id: String(path?.id ?? ''),
    title: String(path?.title ?? ''),
    description: String(path?.description ?? ''),
    thumbnail: path?.thumbnail || undefined,
    level: String(path?.level ?? 'BEGINNER'),
    isFeatured: Boolean(path?.isFeatured),
    totalDuration: Number(path?.totalDuration ?? 0),
    coursesCount: Number(path?.coursesCount ?? 0),
    enrolledCount: Number(path?.enrolledCount ?? 0),
    isEnrolled: Boolean(path?.isEnrolled),
    courses: Array.isArray(path?.courses)
      ? path.courses.map((course: any) => ({
        id: String(course?.id ?? ''),
        title: String(course?.title ?? ''),
        thumbnail: course?.thumbnail || undefined,
        duration: Number(course?.duration ?? 0),
        order: Number(course?.order ?? 0),
      }))
      : [],
  }));
};

const LEARN_COURSE_DETAIL_CACHE_TTL = 60_000;
const _courseDetailCache = new Map<string, { data: LearnCourseDetail; ts: number }>();

const getCourseDetailCacheKey = (courseId: string) => `${getLearnLocale()}:${courseId}`;

const normalizeCourseDetail = (responseData: any): LearnCourseDetail => {
  const rawCourse = responseData?.course ?? {};
  const baseCourse = normalizeCourse(rawCourse);
  const rawSections = Array.isArray(rawCourse?.sections) ? rawCourse.sections : [];
  const rawLessons = Array.isArray(rawCourse?.lessons) ? rawCourse.lessons : [];

  const normalizeLesson = (lesson: any): LearnCourseLesson => ({
    id: String(lesson?.id ?? ''),
    title: String(lesson?.title ?? ''),
    description: lesson?.description ?? null,
    type: lesson?.type ? String(lesson.type) : undefined,
    duration: Number(lesson?.duration ?? 0),
    order: Number(lesson?.order ?? 0),
    isFree: Boolean(lesson?.isFree),
    isCompleted: Boolean(lesson?.isCompleted),
    isLocked: Boolean(lesson?.isLocked),
  });

  return {
    ...baseCourse,
    sections: rawSections.map((section: any) => ({
      id: String(section?.id ?? ''),
      title: String(section?.title ?? ''),
      description: section?.description ?? null,
      order: Number(section?.order ?? 0),
      lessons: Array.isArray(section?.lessons) ? section.lessons.map(normalizeLesson) : [],
    })),
    lessons: rawLessons.map(normalizeLesson),
    isEnrolled: Boolean(responseData?.isEnrolled),
    isInstructor: Boolean(responseData?.isInstructor),
    enrollment: responseData?.enrollment
      ? {
        progress: Number(responseData.enrollment.progress ?? 0),
        enrolledAt: String(responseData.enrollment.enrolledAt ?? DEFAULT_DATE),
        lastAccessedAt: String(responseData.enrollment.lastAccessedAt ?? DEFAULT_DATE),
      }
      : null,
  };
};

export const getCachedCourseDetail = (courseId: string): LearnCourseDetail | null => {
  const cached = _courseDetailCache.get(getCourseDetailCacheKey(courseId));
  if (!cached) return null;

  if (Date.now() - cached.ts >= LEARN_COURSE_DETAIL_CACHE_TTL) {
    _courseDetailCache.delete(getCourseDetailCacheKey(courseId));
    return null;
  }

  return cached.data;
};

export const getCourseDetail = async (courseId: string, force = false): Promise<LearnCourseDetail> => {
  if (!force) {
    const cached = getCachedCourseDetail(courseId);
    if (cached) {
      return cached;
    }
  }

  const response = await api.get(`/courses/${courseId}`, { params: withLocaleParams(undefined) });
  const data = normalizeCourseDetail(response.data);
  _courseDetailCache.set(getCourseDetailCacheKey(courseId), { data, ts: Date.now() });
  return data;
};

export const prefetchCourseDetail = async (courseId: string): Promise<void> => {
  try {
    await getCourseDetail(courseId);
  } catch {
    // Ignore prefetch failures; the detail screen will fetch normally.
  }
};

export const invalidateCourseDetailCache = (courseId?: string): void => {
  if (courseId) {
    const suffix = `:${courseId}`;
    Array.from(_courseDetailCache.keys())
      .filter((key) => key.endsWith(suffix))
      .forEach((key) => _courseDetailCache.delete(key));
    return;
  }

  _courseDetailCache.clear();
};

export const enrollInCourse = async (courseId: string): Promise<{ message: string }> => {
  const response = await api.post(`/courses/${courseId}/enroll`);
  invalidateCourseDetailCache(courseId);
  invalidateLearnHubCache();
  return {
    message: String(response.data?.message ?? 'Successfully enrolled'),
  };
};

export const enrollInPath = async (pathId: string): Promise<{ message: string }> => {
  const response = await api.post(`/learning-paths/paths/${pathId}/enroll`);
  return {
    message: String(response.data?.message ?? 'Successfully enrolled in learning path'),
  };
};

export const getLessonDetail = async (courseId: string, lessonId: string): Promise<LearnLessonDetail> => {
  const response = await api.get(`/courses/${courseId}/lessons/${lessonId}`, { params: withLocaleParams(undefined) });
  const lesson = response.data?.lesson ?? response.data ?? {};

  return {
    id: String(lesson?.id ?? ''),
    title: String(lesson?.title ?? ''),
    description: lesson?.description ?? null,
    content: lesson?.content ?? null,
    videoUrl: lesson?.videoUrl ?? null,
    duration: Number(lesson?.duration ?? 0),
    order: Number(lesson?.order ?? 0),
    isFree: Boolean(lesson?.isFree),
    type: String(lesson?.type ?? 'VIDEO'),
    resources: Array.isArray(lesson?.resources)
      ? lesson.resources.map((resource: any) => ({
        id: String(resource?.id ?? ''),
        title: String(resource?.title ?? ''),
        type: String(resource?.type ?? 'FILE'),
        url: String(resource?.url ?? ''),
        locale: resource?.locale ? String(resource.locale) : 'en',
        isDefault: Boolean(resource?.isDefault),
        size: typeof resource?.size === 'number' ? resource.size : null,
      }))
      : [],
    textTracks: Array.isArray(lesson?.textTracks)
      ? lesson.textTracks.map((track: any) => ({
        id: String(track?.id ?? ''),
        kind: String(track?.kind ?? 'SUBTITLE') as LearnLessonTextTrack['kind'],
        locale: String(track?.locale ?? 'en'),
        label: track?.label ?? null,
        url: track?.url ?? null,
        content: track?.content ?? null,
        isDefault: Boolean(track?.isDefault),
      }))
      : [],
    isCompleted: Boolean(lesson?.isCompleted),
    watchTime: Number(lesson?.watchTime ?? 0),
    quiz: lesson?.quiz ? {
      passingScore: Number(lesson.quiz.passingScore ?? 80),
      questions: Array.isArray(lesson.quiz.questions) ? lesson.quiz.questions.map((q: any) => ({
        id: String(q.id ?? ''),
        question: String(q.question ?? ''),
        explanation: q.explanation ?? null,
        order: Number(q.order ?? 0),
        options: Array.isArray(q.options) ? q.options.map((o: any) => ({
           id: String(o.id ?? ''),
           text: String(o.text ?? ''),
           isCorrect: Boolean(o.isCorrect)
        })) : []
      })) : []
    } : undefined,
    assignment: lesson?.assignment ? {
      id: String(lesson.assignment.id ?? ''),
      instructions: String(lesson.assignment.instructions ?? ''),
      rubric: lesson.assignment.rubric ?? null,
      maxScore: Number(lesson.assignment.maxScore ?? 100),
      passingScore: Number(lesson.assignment.passingScore ?? 80),
    } : undefined,
    assignmentSubmission: lesson?.assignmentSubmission ? {
      id: String(lesson.assignmentSubmission.id ?? ''),
      submissionText: lesson.assignmentSubmission.submissionText ?? null,
      submissionUrl: lesson.assignmentSubmission.submissionUrl ?? null,
      fileUrl: lesson.assignmentSubmission.fileUrl ?? null,
      fileName: lesson.assignmentSubmission.fileName ?? null,
      status: lesson.assignmentSubmission.status ?? 'NOT_SUBMITTED',
      score: lesson.assignmentSubmission.score !== null ? Number(lesson.assignmentSubmission.score) : null,
      feedback: lesson.assignmentSubmission.feedback ?? null,
    } : undefined,
  };
};

export const updateLessonProgress = async (
  courseId: string,
  lessonId: string,
  payload: { completed?: boolean; watchTime?: number }
) => {
  const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/progress`, payload);
  invalidateCourseDetailCache(courseId);
  return response.data;
};

export const getLessonNote = async (
  courseId: string,
  lessonId: string
): Promise<{ id: string; content: string; timestamp: number | null; updatedAt: string | null } | null> => {
  const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/note`);
  const note = response.data?.note;
  if (!note) return null;

  return {
    id: String(note.id ?? ''),
    content: String(note.content ?? ''),
    timestamp: note.timestamp !== null && note.timestamp !== undefined ? Number(note.timestamp) : null,
    updatedAt: note.updatedAt ? String(note.updatedAt) : null,
  };
};

export const saveLessonNote = async (
  courseId: string,
  lessonId: string,
  payload: { content: string; timestamp?: number | null }
): Promise<{ id: string; content: string; timestamp: number | null; updatedAt: string | null } | null> => {
  const response = await api.put(`/courses/${courseId}/lessons/${lessonId}/note`, payload);
  const note = response.data?.note;
  if (!note) return null;

  return {
    id: String(note.id ?? ''),
    content: String(note.content ?? ''),
    timestamp: note.timestamp !== null && note.timestamp !== undefined ? Number(note.timestamp) : null,
    updatedAt: note.updatedAt ? String(note.updatedAt) : null,
  };
};

export const getCourseAnnouncements = async (courseId: string): Promise<{
  announcements: LearnCourseAnnouncement[];
  isInstructor: boolean;
}> => {
  const response = await api.get(`/courses/${courseId}/announcements`);
  const rawAnnouncements = Array.isArray(response.data?.announcements) ? response.data.announcements : [];

  return {
    announcements: rawAnnouncements.map((announcement: any) => ({
      id: String(announcement?.id ?? ''),
      courseId: String(announcement?.courseId ?? ''),
      authorId: String(announcement?.authorId ?? ''),
      title: String(announcement?.title ?? ''),
      body: String(announcement?.body ?? ''),
      sentAt: String(announcement?.sentAt ?? DEFAULT_DATE),
      author: announcement?.author
        ? {
            id: String(announcement.author.id ?? ''),
            name: String(announcement.author.name ?? ''),
            avatar: announcement.author.avatar ?? null,
            title: announcement.author.title ?? null,
          }
        : null,
    })),
    isInstructor: Boolean(response.data?.isInstructor),
  };
};

export const createCourseAnnouncement = async (
  courseId: string,
  payload: { title: string; body: string }
): Promise<LearnCourseAnnouncement> => {
  const response = await api.post(`/courses/${courseId}/announcements`, payload);
  const announcement = response.data?.announcement ?? {};

  return {
    id: String(announcement?.id ?? ''),
    courseId: String(announcement?.courseId ?? ''),
    authorId: String(announcement?.authorId ?? ''),
    title: String(announcement?.title ?? ''),
    body: String(announcement?.body ?? ''),
    sentAt: String(announcement?.sentAt ?? DEFAULT_DATE),
    author: announcement?.author
      ? {
          id: String(announcement.author.id ?? ''),
          name: String(announcement.author.name ?? ''),
          avatar: announcement.author.avatar ?? null,
          title: announcement.author.title ?? null,
        }
      : null,
  };
};

export const submitAssignment = async (
  courseId: string,
  lessonId: string,
  payload: { submissionText?: string; submissionUrl?: string; fileUrl?: string; fileName?: string }
) => {
  const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/assignment/submit`, payload);
  invalidateCourseDetailCache(courseId);
  return response.data;
};

const uploadLearnMediaFile = async (
  fileUri: string,
  fileName: string,
  contentType: string,
  folder: string
): Promise<{ fileUrl: string; fileName: string }> => {
  const { Config } = await import('@/config/env');
  const { tokenService } = await import('@/services/token');
  const FileSystem = await import('expo-file-system');

  const token = await tokenService.getAccessToken();
  if (!token) {
    throw new Error('You are not authenticated. Please sign in again.');
  }

  const ticketRes = await fetch(`${Config.learnUrl}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName,
      contentType,
      folder,
    }),
  });

  if (!ticketRes.ok) {
    throw new Error(`Failed to get upload URL (${ticketRes.status})`);
  }

  const ticketData = await ticketRes.json();
  if (!ticketData?.success || !ticketData?.data?.presignedUrl || !ticketData?.data?.publicUrl) {
    throw new Error('Invalid upload ticket response');
  }

  const uploadResponse = await FileSystem.uploadAsync(ticketData.data.presignedUrl, fileUri, {
    httpMethod: 'PUT',
    uploadType: 0,
    headers: {
      'Content-Type': contentType,
    },
  });

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    throw new Error(`File upload failed (${uploadResponse.status})`);
  }

  return {
    fileUrl: ticketData.data.publicUrl,
    fileName,
  };
};

export const uploadAssignmentAttachment = async (
  fileUri: string,
  fileName: string,
  contentType: string
): Promise<{ fileUrl: string; fileName: string }> => uploadLearnMediaFile(
  fileUri,
  fileName,
  contentType,
  'assignments'
);

export const uploadCourseLessonResourceAttachment = async (
  fileUri: string,
  fileName: string,
  contentType: string
): Promise<{ fileUrl: string; fileName: string }> => uploadLearnMediaFile(
  fileUri,
  fileName,
  contentType,
  'course-resources'
);

export const uploadCourseThumbnail = async (
  fileUri: string,
  fileName: string,
  contentType: string
): Promise<{ fileUrl: string; fileName: string }> => uploadLearnMediaFile(
  fileUri,
  fileName,
  contentType,
  'course-thumbnails'
);

export const getLearningStats = async (): Promise<LearningStats> => {
  // Stats come from getLearnHub — avoids a separate network request
  try {
    const hub = await getLearnHub();
    return hub.stats;
  } catch {
    return {
      enrolledCourses: 0,
      completedCourses: 0,
      completedLessons: 0,
      hoursLearned: 0,
      currentStreak: 0,
      totalPoints: 0,
      level: 1,
    };
  }
};

// ─── Learn Hub (combined single-request loader) ───────────────────────────────

const LEARN_HUB_CACHE_TTL = 30_000; // 30 seconds
let _learnHubCache: { data: LearnHubData; locale: string; ts: number } | null = null;

const normalizeStats = (data: any): LearningStats => ({
  enrolledCourses: Number(data?.enrolledCourses ?? 0),
  completedCourses: Number(data?.completedCourses ?? 0),
  completedLessons: Number(data?.completedLessons ?? 0),
  hoursLearned: Number(data?.hoursLearned ?? 0),
  currentStreak: Number(data?.currentStreak ?? 0),
  totalPoints: Number(data?.totalPoints ?? 0),
  level: Number(data?.level ?? 1),
});

const normalizeEnrolledCourse = (course: any): LearnEnrolledCourse => ({
  ...normalizeCourse(course),
  progress: Number(course?.progress ?? 0),
  completedLessons: Number(course?.completedLessons ?? 0),
  enrolledAt: typeof course?.enrolledAt === 'string' ? course.enrolledAt : undefined,
  lastAccessedAt: typeof course?.lastAccessedAt === 'string' ? course.lastAccessedAt : undefined,
  completedAt: typeof course?.completedAt === 'string' ? course.completedAt : undefined,
});

const normalizePath = (path: any): LearnPath => ({
  id: String(path?.id ?? ''),
  title: String(path?.title ?? ''),
  description: String(path?.description ?? ''),
  thumbnail: path?.thumbnail || undefined,
  level: String(path?.level ?? 'BEGINNER'),
  isFeatured: Boolean(path?.isFeatured),
  totalDuration: Number(path?.totalDuration ?? 0),
  coursesCount: Number(path?.coursesCount ?? 0),
  enrolledCount: Number(path?.enrolledCount ?? 0),
  isEnrolled: Boolean(path?.isEnrolled),
  courses: Array.isArray(path?.courses)
    ? path.courses.map((c: any) => ({
        id: String(c?.id ?? ''),
        title: String(c?.title ?? ''),
        thumbnail: c?.thumbnail || undefined,
        duration: Number(c?.duration ?? 0),
        order: Number(c?.order ?? 0),
      }))
    : [],
});

/**
 * Fetches all Learn screen data in a single HTTP request.
 * Results are cached for 30 seconds — subsequent calls within the TTL
 * are instant (zero network). Pass force=true to bypass the cache
 * (e.g., on pull-to-refresh or post-enroll).
 */
export const getLearnHub = async (force = false): Promise<LearnHubData> => {
  const locale = getLearnLocale();
  if (!force && _learnHubCache && _learnHubCache.locale === locale && Date.now() - _learnHubCache.ts < LEARN_HUB_CACHE_TTL) {
    return _learnHubCache.data;
  }

  const response = await api.get('/courses/learn-hub', { params: { limit: 30, pathLimit: 20, locale } });
  const d = response.data;

  const data: LearnHubData = {
    courses:   Array.isArray(d?.courses)   ? d.courses.map(normalizeCourse)        : [],
    myCourses: Array.isArray(d?.myCourses) ? d.myCourses.map(normalizeEnrolledCourse) : [],
    myCreated: Array.isArray(d?.myCreated) ? d.myCreated.map(normalizeCourse)      : [],
    paths:     Array.isArray(d?.paths)     ? d.paths.map(normalizePath)            : [],
    stats:     normalizeStats(d?.stats),
  };

  _learnHubCache = { data, locale, ts: Date.now() };
  return data;
};

/**
 * Proactively fetches Learn Hub data in the background.
 * Useful for pre-warming the cache before the user navigates to the screen.
 */
export const prefetchLearnHub = async (): Promise<void> => {
  try {
    await getLearnHub(true);
  } catch (error) {
    // Silently ignore prefetch errors
  }
};

/** Call this after an enroll action so the next navigation shows fresh data. */
export const invalidateLearnHubCache = (): void => {
  _learnHubCache = null;
};

const normalizeResourceType = (value: unknown): 'FILE' | 'LINK' | 'VIDEO' => {
  const normalized = normalizeTrimmed(value).toUpperCase();
  if (normalized === 'LINK' || normalized === 'VIDEO') return normalized;
  return 'FILE';
};

const normalizeTrackKind = (value: unknown): 'SUBTITLE' | 'CAPTION' | 'TRANSCRIPT' => {
  const normalized = normalizeTrimmed(value).toUpperCase();
  if (normalized === 'CAPTION' || normalized === 'TRANSCRIPT') return normalized;
  return 'SUBTITLE';
};

const normalizeLessonType = (value: unknown) => {
  const normalized = normalizeTrimmed(value);
  return normalized ? normalized.toUpperCase().replace(/[\s-]+/g, '_') : undefined;
};

const normalizeLessonResourcesForPayload = (resources: CreateLessonPayload['resources'], sourceLocale: string) => {
  if (!Array.isArray(resources)) return undefined;

  const normalized = resources
    .map((resource, index) => {
      const title = normalizeTrimmed(resource?.title);
      const url = normalizeTrimmed(resource?.url);
      if (!title || !url) return null;

      return {
        title,
        url,
        type: normalizeResourceType(resource?.type),
        locale: normalizeLocaleTag(resource?.locale, sourceLocale),
        isDefault: Boolean(resource?.isDefault ?? index === 0),
        size: Number.isFinite(Number(resource?.size)) ? Number(resource?.size) : null,
      };
    })
    .filter((resource): resource is NonNullable<typeof resource> => Boolean(resource));

  return normalized.length > 0 ? normalized : [];
};

const normalizeLessonTracksForPayload = (tracks: CreateLessonPayload['textTracks'], sourceLocale: string) => {
  if (!Array.isArray(tracks)) return undefined;

  const normalized = tracks
    .map((track, index) => {
      const url = normalizeTrimmed(track?.url);
      const content = normalizeTrimmed(track?.content);
      if (!url && !content) return null;

      return {
        kind: normalizeTrackKind(track?.kind),
        locale: normalizeLocaleTag(track?.locale, sourceLocale),
        label: normalizeTrimmed(track?.label) || null,
        url: url || null,
        content: content || null,
        isDefault: Boolean(track?.isDefault ?? index === 0),
      };
    })
    .filter((track): track is NonNullable<typeof track> => Boolean(track));

  return normalized.length > 0 ? normalized : [];
};

const normalizeLessonQuizForPayload = (quiz: CreateLessonPayload['quiz']) => {
  if (!quiz) return undefined;

  const questions = Array.isArray(quiz.questions)
    ? quiz.questions
        .map((question, questionIndex) => {
          const prompt = normalizeTrimmed(question?.question);
          const options = Array.isArray(question?.options)
            ? question.options
                .map((option) => ({
                  text: normalizeTrimmed(option?.text),
                  isCorrect: Boolean(option?.isCorrect),
                }))
                .filter((option) => option.text.length > 0)
            : [];

          if (!prompt || options.length === 0) return null;

          return {
            question: prompt,
            explanation: normalizeTrimmed(question?.explanation) || undefined,
            order: Number.isFinite(Number(question?.order))
              ? Number(question?.order)
              : questionIndex + 1,
            options,
          };
        })
        .filter((question): question is NonNullable<typeof question> => Boolean(question))
    : [];

  return {
    passingScore: Number.isFinite(Number(quiz.passingScore)) ? Number(quiz.passingScore) : 80,
    questions,
  };
};

const normalizeLessonAssignmentForPayload = (assignment: CreateLessonPayload['assignment']) => {
  if (!assignment) return undefined;

  const instructionsTranslations = normalizeTranslations(assignment.instructionsTranslations);
  const rubricTranslations = normalizeTranslations(assignment.rubricTranslations);
  const instructionsEn = normalizeTrimmed(assignment.instructionsEn);
  const instructionsKm = normalizeTrimmed(assignment.instructionsKm);
  const rubricEn = normalizeTrimmed(assignment.rubricEn);
  const rubricKm = normalizeTrimmed(assignment.rubricKm);

  return {
    maxScore: Number.isFinite(Number(assignment.maxScore)) ? Number(assignment.maxScore) : 100,
    passingScore: Number.isFinite(Number(assignment.passingScore)) ? Number(assignment.passingScore) : 80,
    instructions:
      normalizeTrimmed(assignment.instructions)
      || instructionsTranslations?.en
      || instructionsTranslations?.km
      || instructionsEn
      || instructionsKm
      || '',
    instructionsTranslations,
    instructionsEn: instructionsEn || instructionsTranslations?.en || undefined,
    instructionsKm: instructionsKm || instructionsTranslations?.km || undefined,
    rubric: normalizeTrimmed(assignment.rubric) || rubricEn || rubricKm || undefined,
    rubricTranslations,
    rubricEn: rubricEn || rubricTranslations?.en || undefined,
    rubricKm: rubricKm || rubricTranslations?.km || undefined,
  };
};

const normalizeLessonExerciseForPayload = (exercise: CreateLessonPayload['exercise']) => {
  if (!exercise) return undefined;

  return {
    language: normalizeTrimmed(exercise.language) || 'javascript',
    initialCode: normalizeTrimmed(exercise.initialCode),
    solutionCode: normalizeTrimmed(exercise.solutionCode || exercise.solution),
    testCases: exercise.testCases,
  };
};

const normalizeLessonForMutation = (
  lesson: CreateLessonPayload,
  sourceLocale: string,
  fallbackOrder?: number
) => {
  const titleTranslations = normalizeTranslations(lesson.titleTranslations);
  const descriptionTranslations = normalizeTranslations(lesson.descriptionTranslations);
  const contentTranslations = normalizeTranslations(lesson.contentTranslations);
  const titleEn = normalizeTrimmed(lesson.titleEn);
  const titleKm = normalizeTrimmed(lesson.titleKm);
  const descriptionEn = normalizeTrimmed(lesson.descriptionEn);
  const descriptionKm = normalizeTrimmed(lesson.descriptionKm);
  const contentEn = normalizeTrimmed(lesson.contentEn);
  const contentKm = normalizeTrimmed(lesson.contentKm);

  const normalizedLesson = {
    title: normalizeTrimmed(lesson.title),
    titleTranslations,
    titleEn: titleEn || titleTranslations?.en || undefined,
    titleKm: titleKm || titleTranslations?.km || undefined,
    description: normalizeTrimmed(lesson.description) || '',
    descriptionTranslations,
    descriptionEn: descriptionEn || descriptionTranslations?.en || undefined,
    descriptionKm: descriptionKm || descriptionTranslations?.km || undefined,
    type: normalizeLessonType(lesson.type),
    duration: Number.isFinite(Number(lesson.duration)) && Number(lesson.duration) > 0 ? Number(lesson.duration) : 0,
    isFree: Boolean(lesson.isFree),
    content: normalizeTrimmed(lesson.content) || '',
    contentTranslations,
    contentEn: contentEn || contentTranslations?.en || undefined,
    contentKm: contentKm || contentTranslations?.km || undefined,
    videoUrl: normalizeTrimmed(lesson.videoUrl) || '',
    order: Number.isFinite(Number(lesson.order)) ? Number(lesson.order) : fallbackOrder,
    resources: normalizeLessonResourcesForPayload(lesson.resources, sourceLocale),
    textTracks: normalizeLessonTracksForPayload(lesson.textTracks, sourceLocale),
    quiz: normalizeLessonQuizForPayload(lesson.quiz),
    assignment: normalizeLessonAssignmentForPayload(lesson.assignment),
    exercise: normalizeLessonExerciseForPayload(lesson.exercise),
  };

  return normalizedLesson;
};

export const createCourse = async (payload: CreateCoursePayload): Promise<{ id: string }> => {
  const sourceLocale = normalizeLocaleTag(payload.sourceLocale, 'en');
  const supportedLocales = normalizeSupportedLocalesForPayload(payload.supportedLocales, sourceLocale);
  const titleTranslations = normalizeTranslations(payload.titleTranslations);
  const descriptionTranslations = normalizeTranslations(payload.descriptionTranslations);
  const titleEn = normalizeTrimmed(payload.titleEn);
  const titleKm = normalizeTrimmed(payload.titleKm);
  const descriptionEn = normalizeTrimmed(payload.descriptionEn);
  const descriptionKm = normalizeTrimmed(payload.descriptionKm);

  const normalizedPayload = {
    title: normalizeTrimmed(payload.title),
    description: normalizeTrimmed(payload.description),
    titleTranslations,
    descriptionTranslations,
    titleEn: titleEn || titleTranslations?.en || undefined,
    titleKm: titleKm || titleTranslations?.km || undefined,
    descriptionEn: descriptionEn || descriptionTranslations?.en || undefined,
    descriptionKm: descriptionKm || descriptionTranslations?.km || undefined,
    category: payload.category,
    level: payload.level,
    sourceLocale,
    supportedLocales,
    thumbnail: normalizeTrimmed(payload.thumbnail) || undefined,
    tags: (payload.tags || []).map(tag => normalizeTrimmed(tag)).filter(Boolean),
  };

  const response = await api.post('/courses', normalizedPayload);
  const id = String(response.data?.course?.id ?? '');
  if (!id) {
    throw new Error('Course creation failed: invalid response');
  }

  return { id };
};

/**
 * Creates a course and all its lessons in a single transaction.
 * This is the preferred way to create courses to prevent N+2 network requests.
 */
export const bulkCreateCourse = async (payload: CreateCourseBulkPayload): Promise<{ id: string }> => {
  const sourceLocale = normalizeLocaleTag(payload.sourceLocale, 'en');
  const supportedLocales = normalizeSupportedLocalesForPayload(payload.supportedLocales, sourceLocale);
  const titleTranslations = normalizeTranslations(payload.titleTranslations);
  const descriptionTranslations = normalizeTranslations(payload.descriptionTranslations);
  const titleEn = normalizeTrimmed(payload.titleEn);
  const titleKm = normalizeTrimmed(payload.titleKm);
  const descriptionEn = normalizeTrimmed(payload.descriptionEn);
  const descriptionKm = normalizeTrimmed(payload.descriptionKm);

  const normalizedPayload = {
    title: normalizeTrimmed(payload.title),
    description: normalizeTrimmed(payload.description),
    titleTranslations,
    descriptionTranslations,
    titleEn: titleEn || titleTranslations?.en || undefined,
    titleKm: titleKm || titleTranslations?.km || undefined,
    descriptionEn: descriptionEn || descriptionTranslations?.en || undefined,
    descriptionKm: descriptionKm || descriptionTranslations?.km || undefined,
    category: payload.category,
    level: payload.level,
    sourceLocale,
    supportedLocales,
    thumbnail: normalizeTrimmed(payload.thumbnail) || undefined,
    tags: (payload.tags || []).map(tag => normalizeTrimmed(tag)).filter(Boolean),
    publish: payload.publish,
    lessons: (payload.lessons || []).map((lesson, index) => normalizeLessonForMutation(lesson, sourceLocale, index + 1)),
  };

  const response = await api.post('/courses/bulk', normalizedPayload);
  invalidateLearnHubCache();
  
  const id = String(response.data?.id ?? '');
  if (!id) {
    throw new Error('Bulk course creation failed: invalid response');
  }

  return { id };
};

export const addLessonToCourse = async (
  courseId: string,
  payload: CreateLessonPayload
): Promise<{ id: string }> => {
  const normalizedPayload = normalizeLessonForMutation(payload, 'en');

  const response = await api.post(`/courses/${courseId}/lessons`, normalizedPayload);
  const id = String(response.data?.lesson?.id ?? '');
  if (!id) {
    throw new Error('Lesson creation failed: invalid response');
  }

  return { id };
};

export const publishCourse = async (courseId: string): Promise<void> => {
  await api.post(`/courses/${courseId}/publish`);
};

export const getInstructorStats = async (): Promise<InstructorDashboardStats> => {
  const response = await api.get('/courses/stats/instructor');
  return response.data;
};

export interface CertificateData {
  id: string;
  verificationCode: string;
  issuedAt: string;
  course: { title: string; instructor: { firstName: string, lastName: string } };
  user: { firstName: string, lastName: string };
  pdfUrl?: string;
}

export const getCertificate = async (courseId: string): Promise<CertificateData> => {
  const response = await api.get(`/courses/${courseId}/certificate`);
  return response.data;
};

// ─── Q&A ──────────────────────────────────────────────────────────

export interface QAUser {
  firstName: string;
  lastName: string;
  role: string;
}

export interface QAAnswer {
  id: string;
  body: string;
  userId: string;
  isInstructor: boolean;
  createdAt: string;
  user: QAUser;
}

export interface QAThread {
  id: string;
  title: string;
  body: string;
  isResolved: boolean;
  createdAt: string;
  user: QAUser;
  _count?: { answers: number };
  answers?: QAAnswer[];
}

export const getQAThreads = async (courseId: string, lessonId?: string): Promise<QAThread[]> => {
  const url = lessonId ? `/courses/${courseId}/qa?itemId=${lessonId}` : `/courses/${courseId}/qa`;
  const response = await api.get(url);
  return response.data?.threads || [];
};

export const createQAThread = async (courseId: string, title: string, body: string, lessonId?: string): Promise<QAThread> => {
  const response = await api.post(`/courses/${courseId}/qa`, { title, body, itemId: lessonId });
  return response.data?.thread;
};

export const getQAThreadDetail = async (threadId: string): Promise<QAThread> => {
  const response = await api.get(`/courses/qa/${threadId}`);
  return response.data?.thread;
};

export const postQAAnswer = async (threadId: string, body: string): Promise<QAAnswer> => {
  const response = await api.post(`/courses/qa/${threadId}/answers`, { body });
  return response.data?.answer;
};
