'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Users,
  Star,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle,
  Lock,
  Award,
  BarChart3,
  FileText,
  Video,
  Download,
  MessageSquare,
  ThumbsUp,
  Share2,
  Bookmark,
  ArrowLeft,
  GraduationCap,
  Target,
  Zap,
  Code,
  Calculator,
  Beaker,
  Languages,
  Briefcase,
  PenTool,
  Brain,
  Globe,
  Music,
  Palette,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';

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
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}

interface Enrollment {
  progress: number;
  enrolledAt: string;
  lastAccessedAt: string;
}

// ============================================
// CONSTANTS
// ============================================

const FEED_SERVICE = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

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

  // Fetch course details
  const fetchCourse = useCallback(async () => {
    try {
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
      } else {
        console.error('Course not found');
        router.push(`/${locale}/learn`);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId, getAuthToken, locale, router]);

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

  if (loading) {
    return <FeedZoomLoader isLoading={true} />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Course not found</h2>
          <Link href={`/${locale}/learn`} className="text-amber-600 hover:underline mt-2 inline-block">
            Back to Learn Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation />

      {/* Course Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href={`/${locale}/learn`} className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Learn Hub
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-300">{course.category}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{course.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${LEVEL_COLORS[course.level] || 'bg-gray-100 text-gray-700'}`}>
                  {course.level.replace('_', ' ')}
                </span>
                {course.isFeatured && (
                  <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                    Featured
                  </span>
                )}
                {course.isFree && (
                  <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    Free
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              <p className="text-gray-300 text-lg mb-6 line-clamp-3">{course.description}</p>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <Star className="w-5 h-5 text-amber-400 fill-current" />
                  <span className="font-semibold">{course.rating.toFixed(1)}</span>
                  <span className="text-gray-400">({course.reviewsCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Users className="w-5 h-5" />
                  <span>{course.enrolledCount.toLocaleString()} enrolled</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Clock className="w-5 h-5" />
                  <span>{formatDuration(getTotalDuration())} total</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Video className="w-5 h-5" />
                  <span>{course.lessonsCount} lessons</span>
                </div>
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-700">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold">
                  {course.instructor.avatar ? (
                    <img src={course.instructor.avatar} alt={course.instructor.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    course.instructor.name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="font-medium">{course.instructor.name}</p>
                  <p className="text-sm text-gray-400">{course.instructor.title || 'Instructor'}</p>
                </div>
              </div>
            </div>

            {/* Course Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-xl overflow-hidden sticky top-24">
                {/* Thumbnail */}
                <div className="h-48 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 relative">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CategoryIcon className="w-20 h-20 text-amber-300" />
                    </div>
                  )}
                  {isEnrolled && enrollment && (
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5">
                  {isEnrolled ? (
                    <>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{enrollment?.progress || 0}% complete</span>
                          <span className="text-gray-500">{getCompletedCount()}/{course.lessonsCount} lessons</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                            style={{ width: `${enrollment?.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      <Link 
                        href={`/${locale}/learn/course/${courseId}/lesson/${getNextLesson()?.id}`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
                      >
                        <Play className="w-5 h-5" />
                        {enrollment?.progress === 0 ? 'Start Learning' : 'Continue Learning'}
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="text-center mb-4">
                        <p className="text-3xl font-bold text-gray-900">
                          {course.isFree ? 'Free' : `$${course.price}`}
                        </p>
                      </div>

                      <button
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                      >
                        {enrolling ? 'Enrolling...' : 'Enroll Now'}
                      </button>
                    </>
                  )}

                  {/* Quick Info */}
                  <div className="mt-5 pt-5 border-t border-gray-100 space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">{course.lessonsCount} video lessons</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">{formatDuration(getTotalDuration())} total length</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">Certificate of completion</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">Lifetime access</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-5 border-t border-gray-100 flex justify-center gap-4">
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-amber-600 text-sm">
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-amber-600 text-sm">
                      <Bookmark className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-6">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'curriculum', label: 'Curriculum' },
                { key: 'reviews', label: 'Reviews' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-5 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* What you'll learn */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">What you'll learn</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {course.tags.map((tag, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Master {tag} concepts and best practices</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Build real-world projects</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Get a certificate of completion</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">About this course</h2>
                  <p className="text-gray-700 leading-relaxed">{course.description}</p>
                </div>

                {/* Instructor */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructor</h2>
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 text-2xl font-bold flex-shrink-0">
                      {course.instructor.avatar ? (
                        <img src={course.instructor.avatar} alt={course.instructor.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        course.instructor.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{course.instructor.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{course.instructor.title || 'Course Instructor'}</p>
                      <p className="text-gray-600 text-sm">{course.instructor.bio || 'Passionate educator with years of experience helping students achieve their learning goals.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="font-semibold text-gray-900">Course Content</h2>
                  <span className="text-sm text-gray-500">
                    {course.lessonsCount} lessons • {formatDuration(getTotalDuration())}
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {course.lessons.map((lesson, index) => (
                    <div 
                      key={lesson.id}
                      className={`flex items-center gap-4 p-4 ${
                        lesson.isLocked ? 'opacity-60' : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!lesson.isLocked) {
                          router.push(`/${locale}/learn/course/${courseId}/lesson/${lesson.id}`);
                        }
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        lesson.isCompleted 
                          ? 'bg-green-100 text-green-600'
                          : lesson.isLocked
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-amber-100 text-amber-600'
                      }`}>
                        {lesson.isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : lesson.isLocked ? (
                          <Lock className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-medium">{index + 1}</span>
                          <h3 className="font-medium text-gray-900 truncate">{lesson.title}</h3>
                          {lesson.isFree && !isEnrolled && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Preview</span>
                          )}
                        </div>
                        {lesson.description && (
                          <p className="text-sm text-gray-500 truncate mt-0.5">{lesson.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{formatDuration(lesson.duration)}</span>
                        {!lesson.isLocked && (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-gray-900">{course.rating.toFixed(1)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${star <= Math.round(course.rating) ? 'text-amber-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{course.reviewsCount} reviews</p>
                  </div>
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-500 w-3">{stars}</span>
                        <Star className="w-4 h-4 text-amber-400 fill-current" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${stars === 5 ? 70 : stars === 4 ? 20 : stars === 3 ? 7 : stars === 2 ? 2 : 1}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Reviews will appear here after students complete the course.</p>
                </div>
              </div>
            )}
          </div>

          {/* Tags Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Topics covered</h3>
              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">This course includes</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-gray-400" />
                  {course.lessonsCount} video lessons
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {formatDuration(getTotalDuration())} of content
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-gray-400" />
                  Downloadable resources
                </li>
                <li className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-gray-400" />
                  Certificate of completion
                </li>
                <li className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  Lifetime access
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
