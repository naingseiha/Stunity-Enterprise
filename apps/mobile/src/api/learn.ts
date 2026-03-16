/**
 * Learning API Client
 *
 * Handles course, lesson, enrollment, and learning path APIs.
 */

import { feedApi as api } from './client';

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
  duration: number;
  order: number;
  isFree: boolean;
  isCompleted: boolean;
  isLocked: boolean;
}

export interface LearnEnrollment {
  progress: number;
  enrolledAt: string;
  lastAccessedAt: string;
}

export interface LearnCourseDetail extends LearnCourse {
  lessons: LearnCourseLesson[];
  isEnrolled: boolean;
  enrollment: LearnEnrollment | null;
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
  size: number | null;
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
  resources: LearnLessonResource[];
  isCompleted: boolean;
  watchTime: number;
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

export interface CreateCoursePayload {
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  level: LearnCourseLevel;
  tags?: string[];
}

export interface CreateLessonPayload {
  title: string;
  description?: string;
  duration: number;
  isFree: boolean;
  content?: string;
  videoUrl?: string;
  order?: number;
}

const DEFAULT_DATE = new Date(0).toISOString();

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
  const response = await api.get('/courses', { params });
  const rawCourses = Array.isArray(response.data?.courses) ? response.data.courses : [];
  return rawCourses.map(normalizeCourse);
};

export const getMyCourses = async (): Promise<LearnEnrolledCourse[]> => {
  const response = await api.get('/courses/my-courses');
  const rawCourses = Array.isArray(response.data?.courses) ? response.data.courses : [];

  return rawCourses.map((course: any) => ({
    ...normalizeCourse(course),
    progress: Number(course?.progress ?? 0),
    completedLessons: Number(course?.completedLessons ?? 0),
    enrolledAt: typeof course?.enrolledAt === 'string' ? course.enrolledAt : undefined,
    lastAccessedAt: typeof course?.lastAccessedAt === 'string' ? course.lastAccessedAt : undefined,
    completedAt: typeof course?.completedAt === 'string' ? course.completedAt : undefined,
  }));
};

export const getMyCreatedCourses = async (): Promise<LearnCourse[]> => {
  const response = await api.get('/courses/my-created');
  const rawCourses = Array.isArray(response.data?.courses) ? response.data.courses : [];
  return rawCourses.map(normalizeCourse);
};

export const getLearningPaths = async (params?: {
  featured?: boolean;
  limit?: number;
}): Promise<LearnPath[]> => {
  const response = await api.get('/learning-paths/paths', { params });
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

export const getCourseDetail = async (courseId: string): Promise<LearnCourseDetail> => {
  const response = await api.get(`/courses/${courseId}`);
  const rawCourse = response.data?.course ?? {};
  const baseCourse = normalizeCourse(rawCourse);
  const rawLessons = Array.isArray(rawCourse?.lessons) ? rawCourse.lessons : [];

  return {
    ...baseCourse,
    lessons: rawLessons.map((lesson: any) => ({
      id: String(lesson?.id ?? ''),
      title: String(lesson?.title ?? ''),
      description: lesson?.description ?? null,
      duration: Number(lesson?.duration ?? 0),
      order: Number(lesson?.order ?? 0),
      isFree: Boolean(lesson?.isFree),
      isCompleted: Boolean(lesson?.isCompleted),
      isLocked: Boolean(lesson?.isLocked),
    })),
    isEnrolled: Boolean(response.data?.isEnrolled),
    enrollment: response.data?.enrollment
      ? {
        progress: Number(response.data.enrollment.progress ?? 0),
        enrolledAt: String(response.data.enrollment.enrolledAt ?? DEFAULT_DATE),
        lastAccessedAt: String(response.data.enrollment.lastAccessedAt ?? DEFAULT_DATE),
      }
      : null,
  };
};

export const enrollInCourse = async (courseId: string): Promise<{ message: string }> => {
  const response = await api.post(`/courses/${courseId}/enroll`);
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
  const response = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
  const lesson = response.data?.lesson ?? {};

  return {
    id: String(lesson?.id ?? ''),
    title: String(lesson?.title ?? ''),
    description: lesson?.description ?? null,
    content: lesson?.content ?? null,
    videoUrl: lesson?.videoUrl ?? null,
    duration: Number(lesson?.duration ?? 0),
    order: Number(lesson?.order ?? 0),
    isFree: Boolean(lesson?.isFree),
    resources: Array.isArray(lesson?.resources)
      ? lesson.resources.map((resource: any) => ({
        id: String(resource?.id ?? ''),
        title: String(resource?.title ?? ''),
        type: String(resource?.type ?? 'FILE'),
        url: String(resource?.url ?? ''),
        size: typeof resource?.size === 'number' ? resource.size : null,
      }))
      : [],
    isCompleted: Boolean(lesson?.isCompleted),
    watchTime: Number(lesson?.watchTime ?? 0),
  };
};

export const updateLessonProgress = async (
  courseId: string,
  lessonId: string,
  payload: { completed?: boolean; watchTime?: number }
) => {
  const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/progress`, payload);
  return response.data;
};

export const getLearningStats = async (): Promise<LearningStats> => {
  const response = await api.get('/courses/stats/my-learning');
  return {
    enrolledCourses: Number(response.data?.enrolledCourses ?? 0),
    completedCourses: Number(response.data?.completedCourses ?? 0),
    completedLessons: Number(response.data?.completedLessons ?? 0),
    hoursLearned: Number(response.data?.hoursLearned ?? 0),
    currentStreak: Number(response.data?.currentStreak ?? 0),
    totalPoints: Number(response.data?.totalPoints ?? 0),
    level: Number(response.data?.level ?? 1),
  };
};

export const createCourse = async (payload: CreateCoursePayload): Promise<{ id: string }> => {
  const normalizedPayload = {
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category,
    level: payload.level,
    thumbnail: payload.thumbnail?.trim() || undefined,
    tags: (payload.tags || []).map(tag => tag.trim()).filter(Boolean),
  };

  const response = await api.post('/courses', normalizedPayload);
  const id = String(response.data?.course?.id ?? '');
  if (!id) {
    throw new Error('Course creation failed: invalid response');
  }

  return { id };
};

export const addLessonToCourse = async (
  courseId: string,
  payload: CreateLessonPayload
): Promise<{ id: string }> => {
  const normalizedPayload = {
    title: payload.title.trim(),
    description: payload.description?.trim() || undefined,
    duration: payload.duration,
    isFree: payload.isFree,
    content: payload.content?.trim() || undefined,
    videoUrl: payload.videoUrl?.trim() || undefined,
    order: payload.order,
  };

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
