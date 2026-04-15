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
  HelpCircle,
  PenTool,
  Code,
  Image as ImageIcon,
  File,
} from 'lucide-react';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';
import { TokenManager } from '@/lib/api/auth';
import { VideoPlayer } from '@/components/learn/VideoPlayer';
import { QAThreadList } from '@/components/learn/QAThread';
import CodePlayground from '@/components/learn/CodePlayground';
import QuizRunner from '@/components/learn/QuizRunner';

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
  // Polymorphic
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

interface Course {
  id: string;
  title: string;
  lessonsCount: number;
  lessons: CourseLesson[];
}

// ============================================
// CONSTANTS
// ============================================

const FEED_SERVICE = LEARN_SERVICE_URL;

// ============================================
// MAIN COMPONENT & WIDGETS
// ============================================

function AssignmentWidget({ lesson, courseId, lessonId, onSubmitted }: { lesson: Lesson; courseId: string; lessonId: string; onSubmitted: (sub: any) => void }) {
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
    } catch (e) {
      console.error('Submission failed', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-[#1E293B] overflow-y-auto">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden text-gray-800 flex flex-col md:flex-row my-8">
        <div className="w-full md:w-1/3 bg-indigo-50 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-indigo-100">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <PenTool className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-extrabold text-indigo-900 text-center mb-2">Assignment</h3>
          <p className="text-sm text-indigo-600 font-medium text-center px-4 mb-4">Complete the task to test your skills.</p>
          <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-indigo-50 text-center mt-auto">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Max Score</p>
            <p className="text-2xl font-black text-indigo-600">{lesson.assignment?.maxScore || 100} <span className="text-sm font-medium text-gray-400">pts</span></p>
          </div>
        </div>
        <div className="w-full md:w-2/3 p-8 flex flex-col">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold mb-4 text-gray-900">{lesson.title}</h2>
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instructions</h4>
              <p className="text-gray-700 leading-relaxed font-medium">
                {lesson.assignment?.instructions || 'Review the instructions carefully and submit your repository link or document.'}
              </p>
            </div>
          </div>

          {!isSubmitted ? (
            <div className="mt-auto">
              <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl mb-6">
                <button
                  onClick={() => setSubmissionType('url')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${submissionType === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Link/URL
                </button>
                <button
                  onClick={() => setSubmissionType('text')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${submissionType === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Text Answer
                </button>
              </div>

              {submissionType === 'url' ? (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 mb-2">Submission URL</label>
                  <input
                    type="url"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    placeholder="https://github.com/your-username/repo"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium placeholder-gray-400"
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 mb-2">Text Response</label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium placeholder-gray-400 min-h-[120px] resize-y"
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || (submissionType === 'url' ? !submissionUrl.trim() : !submissionText.trim())}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-lg rounded-xl transition-all shadow-lg hover:shadow-indigo-200 transform hover:-translate-y-0.5"
              >
                {submitting ? 'Submitting...' : 'Submit Work'}
              </button>
            </div>
          ) : (
            <div className="mt-auto">
              <div className={`rounded-2xl p-6 flex flex-col items-center justify-center border-2 ${sub.status === 'GRADED' ? 'border-green-100 bg-green-50' : 'border-indigo-100 bg-indigo-50'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${sub.status === 'GRADED' ? 'bg-green-100' : 'bg-indigo-100'}`}>
                  <CheckCircle className={`w-8 h-8 ${sub.status === 'GRADED' ? 'text-green-600' : 'text-indigo-600'}`} />
                </div>
                <h3 className={`text-xl font-extrabold mb-2 ${sub.status === 'GRADED' ? 'text-green-900' : 'text-indigo-900'}`}>
                  {sub.status === 'GRADED' ? 'Assignment Graded' : 'Successfully Submitted'}
                </h3>
                <p className={`text-sm font-medium text-center ${sub.status === 'GRADED' ? 'text-green-700' : 'text-indigo-700'}`}>
                  {sub.status === 'GRADED' 
                    ? `You scored ${sub.score} / ${lesson.assignment?.maxScore || 100} points.`
                    : "Your assignment is under review. You'll be notified once graded."}
                </p>
                <div className="mt-4 w-full bg-white/60 p-3 rounded-xl border border-white">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Your Submission</p>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">
                    {sub.submissionUrl || sub.submissionText || 'File submitted'}
                  </p>
                </div>
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
  const locale = (params?.locale as string) || 'en';
  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;

  // State
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'qa' | 'notes'>('overview');
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
        setLesson(data.lesson || data);
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
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <FeedInlineLoader size="lg" />
      </div>
    );
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

  const renderInteractiveItem = () => {
    switch (lesson.type) {
      case 'VIDEO':
      case 'AUDIO':
        return lesson.videoUrl ? (
          <VideoPlayer url={lesson.videoUrl} />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8 bg-black">
            <div className="max-w-3xl w-full bg-gray-800 rounded-xl p-8 text-white text-center">
              <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Media Available</h2>
              <p className="text-gray-400">Please check the text overview below.</p>
            </div>
          </div>
        );
      
      case 'QUIZ':
        if (lesson.quiz && lesson.quiz.questions.length > 0) {
          return (
            <QuizRunner
              lessonTitle={lesson.title}
              quiz={lesson.quiz}
              onComplete={async (score, passed) => {
                if (passed) {
                  // Auto-mark complete on quiz pass
                  try {
                    const token = TokenManager.getAccessToken();
                    await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/lessons/${lessonId}/progress`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ completed: true, watchTime: 0 }),
                    });
                    setLesson(prev => prev ? { ...prev, isCompleted: true } : prev);
                  } catch (e) { /* silent fail */ }
                }
              }}
            />
          );
        }
        return (
          <div className="w-full h-full flex items-center justify-center p-8 bg-[#1E293B]">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center text-gray-800">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <HelpCircle className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4">{lesson.title}</h2>
              <p className="text-gray-500">This quiz has no questions yet. The instructor is still building it.</p>
            </div>
          </div>
        );
      
      case 'ASSIGNMENT':
        return (
          <AssignmentWidget
            lesson={lesson}
            courseId={courseId}
            lessonId={lessonId}
            onSubmitted={(sub) => {
              setLesson(prev => prev ? { ...prev, assignmentSubmission: sub } : prev);
            }}
          />
        );

      case 'EXERCISE':
        return (
          <div className="w-full h-full bg-[#1e1e1e]">
            <CodePlayground
              language={lesson.exercise?.language || 'javascript'}
              initialCode={lesson.exercise?.initialCode || '// Write your code here'}
              onRun={async (code) => {
                // Simulate Piston API for now
                await new Promise(resolve => setTimeout(resolve, 1500));
                return {
                  stdout: `[SIMULATION] Running ${lesson.exercise?.language}...\n> Hello Stunity!\n\nProgram finished with exit code 0.`,
                  stderr: ''
                };
              }}
            />
          </div>
        );
      
      case 'IMAGE':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gray-50 overflow-y-auto">
            <div className="max-w-5xl w-full bg-white rounded-2xl shadow-2xl p-4 overflow-hidden border border-gray-100">
              <img 
                src={lesson.content || ''} 
                alt={lesson.title} 
                className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
              />
              <div className="mt-4 p-4 flex items-center justify-between border-t border-gray-50">
                <div className="flex items-center gap-2 text-gray-500">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">{lesson.title}</span>
                </div>
                <button
                  onClick={() => window.open(lesson.content || '', '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Download Image
                </button>
              </div>
            </div>
          </div>
        );

      case 'FILE':
        return (
          <div className="w-full h-full flex items-center justify-center p-8 bg-indigo-50/30">
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-12 text-center border border-indigo-100">
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <File className="w-12 h-12 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-4">{lesson.title}</h2>
              <p className="text-lg text-gray-600 mb-10 leading-relaxed italic">
                This is a downloadable resource file (PDF, Slides, or Document) attached to this lesson. 
                Please download it to follow along with the curriculum.
              </p>
              <button
                onClick={() => window.open(lesson.content || '', '_blank')}
                className="inline-flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-200 transform hover:-translate-y-1"
              >
                <Download className="w-6 h-6" />
                Download Resource
              </button>
            </div>
          </div>
        );

      case 'CASE_STUDY':
      case 'ARTICLE':
      default:
        return (
          <div className="w-full h-full flex flex-col bg-white overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full p-8 md:p-16">
              <div className="flex items-center gap-3 text-amber-600 mb-8">
                <FileText className="w-6 h-6" />
                <span className="text-sm font-bold uppercase tracking-wider">Learning Article</span>
              </div>
              
              <h1 className="text-4xl font-extrabold text-gray-900 mb-8 leading-tight">
                {lesson.title}
              </h1>
              
              <div 
                className="prose prose-lg prose-amber max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: lesson.content || '<p className="text-gray-400 italic">This lesson has no written content yet.</p>' }}
              />
              
              {lesson.resources && lesson.resources.length > 0 && (
                <div className="mt-16 pt-8 border-t border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Lesson Resources</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lesson.resources.map((res: any) => (
                      <a 
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-amber-200 transition-colors group"
                      >
                        <Download className="w-5 h-5 text-gray-400 group-hover:text-amber-500" />
                        <span className="text-gray-700 font-medium">{res.title || 'Attachment'}</span>
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
        <div className="flex-1 flex flex-col bg-[#0F172A] overflow-y-auto">
          {/* Interactive Player Area */}
          <div className="w-full flex-shrink-0 bg-black aspect-video max-h-[70vh]">
            {renderInteractiveItem()}
          </div>

          {/* Lesson Controls */}
          <div className="bg-gray-800 border-y border-gray-700 px-4 py-4 flex-shrink-0">
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

          {/* Tabs Container */}
          <div className="flex-1 flex flex-col p-4 sm:p-8 max-w-4xl mx-auto w-full text-white">
            <div className="flex gap-6 border-b border-gray-700 mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 font-semibold text-sm border-b-2 transition-colors ${
                  activeTab === 'overview' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('qa')}
                className={`flex gap-2 items-center py-3 font-semibold text-sm border-b-2 transition-colors ${
                  activeTab === 'qa' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Q&A
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex gap-2 items-center py-3 font-semibold text-sm border-b-2 transition-colors ${
                  activeTab === 'notes' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                My Notes
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8 pb-12">
                <div>
                  <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
                  {lesson.content ? (
                    <div 
                      className="prose prose-invert max-w-none text-gray-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'] }) }}
                    />
                  ) : (
                    <p className="text-gray-400">{lesson.description || 'No description provided.'}</p>
                  )}
                </div>

                {/* Resources */}
                {lesson.resources && lesson.resources.length > 0 && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Downloadable Resources</h3>
                    <div className="flex flex-col gap-2">
                      {lesson.resources.map((resource) => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Download className="w-5 h-5 text-amber-400" />
                            <span className="font-medium">{resource.title}</span>
                          </div>
                          {resource.size && <span className="text-xs text-gray-400">{Math.round(resource.size / 1024)} KB</span>}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qa' && (
              <QAThreadList courseId={courseId} lessonId={lessonId} />
            )}

            {activeTab === 'notes' && (
              <div className="p-8 text-center text-gray-400 border border-dashed border-gray-700 rounded-xl">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-medium text-white mb-2">Personal Notes</h3>
                <p>Take private notes securely stored for your eyes only.</p>
                {/* TO BE IMPLEMENTED IN B2 */}
              </div>
            )}
          </div>
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
