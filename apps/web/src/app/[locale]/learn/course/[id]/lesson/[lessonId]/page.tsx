'use client';

import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle,
  Lock,
  ArrowLeft,
  Menu,
  X,
  FileText,
  Video,
  Download,
  ThumbsUp,
  MessageSquare,
  SkipBack,
  SkipForward,
  List,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';

// ============================================
// INTERFACES
// ============================================

interface LessonResource {
  id: string;
  title: string;
  type: string;
  url: string;
  size: number | null;
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
  resources: LessonResource[];
  isCompleted: boolean;
  watchTime: number;
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

interface Course {
  id: string;
  title: string;
  lessonsCount: number;
  lessons: CourseLesson[];
}

// ============================================
// CONSTANTS
// ============================================

const FEED_SERVICE = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

// ============================================
// MAIN COMPONENT
// ============================================

export default function LessonViewerPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;

  // State
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [completing, setCompleting] = useState(false);

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);

  // Fetch lesson details
  const fetchLesson = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.push(`/${locale}/login`);
        return;
      }

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLesson(data.lesson);
      } else {
        const error = await response.json();
        console.error('Lesson error:', error);
        if (response.status === 403) {
          router.push(`/${locale}/learn/course/${courseId}`);
        }
      }
    } catch (err) {
      console.error('Error fetching lesson:', err);
    }
  }, [courseId, lessonId, getAuthToken, locale, router]);

  // Fetch course for sidebar
  const fetchCourse = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId, getAuthToken]);

  useEffect(() => {
    if (courseId && lessonId) {
      fetchLesson();
      fetchCourse();
    }
  }, [courseId, lessonId, fetchLesson, fetchCourse]);

  // Mark lesson as complete
  const markComplete = async () => {
    if (!lesson || lesson.isCompleted) return;
    
    try {
      setCompleting(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true, watchTime: lesson.duration * 60 }),
      });

      if (response.ok) {
        setLesson(prev => prev ? { ...prev, isCompleted: true } : null);
        fetchCourse(); // Refresh course data
      }
    } catch (err) {
      console.error('Error marking complete:', err);
    } finally {
      setCompleting(false);
    }
  };

  // Navigate to next/prev lesson
  const getCurrentLessonIndex = () => {
    if (!course?.lessons) return -1;
    return course.lessons.findIndex(l => l.id === lessonId);
  };

  const goToLesson = (direction: 'prev' | 'next') => {
    if (!course?.lessons) return;
    const currentIndex = getCurrentLessonIndex();
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < course.lessons.length) {
      const nextLesson = course.lessons[newIndex];
      if (!nextLesson.isLocked) {
        router.push(`/${locale}/learn/course/${courseId}/lesson/${nextLesson.id}`);
      }
    }
  };

  const canGoPrev = () => {
    const currentIndex = getCurrentLessonIndex();
    return currentIndex > 0;
  };

  const canGoNext = () => {
    if (!course?.lessons) return false;
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex < course.lessons.length - 1) {
      return !course.lessons[currentIndex + 1].isLocked;
    }
    return false;
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return <FeedZoomLoader isLoading={true} />;
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <Lock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Lesson not available</h2>
          <p className="text-gray-400 mt-2">Enroll in the course to access this lesson.</p>
          <Link 
            href={`/${locale}/learn/course/${courseId}`} 
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href={`/${locale}/learn/course/${courseId}`}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Course</span>
          </Link>
          
          <div className="h-6 w-px bg-gray-700" />
          
          <h1 className="text-white font-medium truncate max-w-md">
            {course?.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress */}
          {course && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
              <span>{course.lessons.filter(l => l.isCompleted).length}/{course.lessonsCount} complete</span>
            </div>
          )}

          {/* Toggle Sidebar */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video/Content Area */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            {lesson.videoUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="w-20 h-20 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Video Player</p>
                  <p className="text-sm text-gray-500 mt-1">{lesson.videoUrl}</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="max-w-3xl w-full bg-gray-800 rounded-xl p-8 text-white">
                  <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
                  {lesson.content ? (
                    <div 
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'] }) }}
                    />
                  ) : (
                    <p className="text-gray-400">{lesson.description || 'Lesson content will be displayed here.'}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lesson Controls */}
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              {/* Prev Button */}
              <button
                onClick={() => goToLesson('prev')}
                disabled={!canGoPrev()}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Lesson Info & Complete Button */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <h3 className="text-white font-medium">{lesson.title}</h3>
                  <p className="text-sm text-gray-400">{formatDuration(lesson.duration)}</p>
                </div>

                {lesson.isCompleted ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span>Completed</span>
                  </div>
                ) : (
                  <button
                    onClick={markComplete}
                    disabled={completing}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>{completing ? 'Marking...' : 'Mark Complete'}</span>
                  </button>
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={() => goToLesson('next')}
                disabled={!canGoNext()}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Resources */}
          {lesson.resources && lesson.resources.length > 0 && (
            <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-white font-medium mb-3">Resources</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.resources.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">{resource.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Course Content</h2>
              <p className="text-sm text-gray-400 mt-1">
                {course?.lessons.filter(l => l.isCompleted).length || 0} of {course?.lessonsCount || 0} complete
              </p>
            </div>

            <div className="divide-y divide-gray-700">
              {course?.lessons.map((courseLesson, index) => (
                <div
                  key={courseLesson.id}
                  onClick={() => {
                    if (!courseLesson.isLocked) {
                      router.push(`/${locale}/learn/course/${courseId}/lesson/${courseLesson.id}`);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                    courseLesson.id === lessonId
                      ? 'bg-amber-500/20 border-l-2 border-amber-500'
                      : courseLesson.isLocked
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    courseLesson.isCompleted
                      ? 'bg-green-500/20 text-green-400'
                      : courseLesson.id === lessonId
                        ? 'bg-amber-500 text-white'
                        : courseLesson.isLocked
                          ? 'bg-gray-700 text-gray-500'
                          : 'bg-gray-700 text-gray-400'
                  }`}>
                    {courseLesson.isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : courseLesson.isLocked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-medium truncate ${
                      courseLesson.id === lessonId ? 'text-amber-400' : 'text-white'
                    }`}>
                      {courseLesson.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(courseLesson.duration)}</span>
                      {courseLesson.isFree && (
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">Free</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
