'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  Clock,
  Target,
  Trophy,
  Star,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Search,
  BarChart3,
  Award,
  Flame,
  Calendar,
  FileText,
  GraduationCap,
  ArrowRight,
  Calculator,
  Beaker,
  Languages,
  Globe,
  Music,
  Palette,
  Dumbbell,
  RefreshCw,
  AlertCircle,
  Book,
  ClipboardList,
  LineChart,
  Percent,
  Play,
  Users,
  Heart,
  Bookmark,
  Filter,
  Sparkles,
  Compass,
  Route,
  Video,
  Code,
  Briefcase,
  PenTool,
  Brain,
  Zap,
  Lock,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { buildRouteDataCacheKey, readRouteDataCache, writeRouteDataCache } from '@/lib/route-data-cache';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import SubmissionsDashboard from '@/components/learn/SubmissionsDashboard';
import LearnHomeMobile from '@/components/learn/LearnHomeMobile';

import { useTranslations } from 'next-intl';
// =============
// INTERFACES
// ============================================

interface Subject {
  id: string;
  name: string;
  nameKh: string;
  nameEn?: string;
  code: string;
  description?: string;
  grade: string;
  track?: string;
  category: string;
  weeklyHours: number;
  maxScore: number;
  coefficient: number;
  isActive: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
  duration: number; // in hours
  lessonsCount: number;
  enrolledCount: number;
  rating: number;
  reviewsCount: number;
  price: number; // 0 = free
  instructor: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
  };
  tags: string[];
  isFree: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EnrolledCourse extends Course {
  progress: number;
  completedLessons: number;
  lastAccessedAt: string;
  enrolledAt: string;
  completedAt?: string | null;
  resumeLessonId?: string | null;
  resumeLessonTitle?: string | null;
  resumeUpdatedAt?: string | null;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  coursesCount: number;
  totalDuration: number;
  enrolledCount: number;
  level: string;
  courses: { id: string; title: string; order: number }[];
  isFeatured: boolean;
  isEnrolled?: boolean;
}

interface SavedLesson {
  lessonId: string;
  courseId: string;
  title: string;
  duration: number;
  type: string;
  isFree: boolean;
  isCompleted: boolean;
  isEnrolled: boolean;
  isLocked: boolean;
  bookmarkedAt: string;
  course: {
    id: string;
    title: string;
    thumbnail?: string | null;
    category: string;
    level: Course['level'];
  };
}

interface RecentLesson {
  lessonId: string;
  courseId: string;
  title: string;
  duration: number;
  watchTime: number;
  type: string;
  isFree: boolean;
  isCompleted: boolean;
  isEnrolled: boolean;
  isLocked: boolean;
  openedAt: string;
  course: {
    id: string;
    title: string;
    thumbnail?: string | null;
    category: string;
    level: Course['level'];
  };
}

interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  score: number;
  maxScore: number;
  percentage: number;
  gradeLevel: string;
  month: string;
  semester: string;
  subject?: Subject;
  createdAt: string;
}

interface CachedLearnPayload {
  courses: Course[];
  enrolledCourses: EnrolledCourse[];
  createdCourses: Course[];
  learningPaths: LearningPath[];
  savedLessons: SavedLesson[];
  recentLessons: RecentLesson[];
  subjects: Subject[];
  myGrades: Grade[];
  stats: {
    enrolledCourses: number;
    completedCourses: number;
    hoursLearned: number;
    currentStreak: number;
    certificates: number;
  };
}

interface CachedCourseDetailPayload {
  course: any;
  enrollment: any;
  isEnrolled: boolean;
}

// ============================================
// CONSTANTS & SAMPLE DATA
// ============================================

const LEVEL_COLORS: Record<string, string> = {
  'BEGINNER': 'bg-green-100 text-green-700',
  'INTERMEDIATE': 'bg-blue-100 text-blue-700',
  'ADVANCED': 'bg-purple-100 text-purple-700',
  'ALL_LEVELS': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
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

const CATEGORIES = [
  'All', 'Programming', 'Data Science', 'Machine Learning', 'Mobile Development',
  'Design', 'Database', 'Cloud Computing', 'Mathematics', 'Science', 
  'Languages', 'Business', 'Technology', 'Personal Development'
];

const clampProgress = (value: number | null | undefined) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(100, Math.max(0, numericValue));
};

const formatProgressPercent = (value: number | null | undefined) => `${Math.round(clampProgress(value))}%`;

// Sample courses data (will be replaced with API)
const SAMPLE_COURSES: Course[] = [
  {
    id: '1',
    title: 'Complete Python Programming Masterclass',
    description: 'Learn Python from scratch to advanced. Build real projects including web apps, data analysis, and automation scripts.',
    category: 'Programming',
    level: 'BEGINNER',
    duration: 42,
    lessonsCount: 156,
    enrolledCount: 15420,
    rating: 4.8,
    reviewsCount: 2340,
    price: 0,
    instructor: { id: '1', name: 'Dr. Sarah Chen', title: 'Senior Software Engineer' },
    tags: ['Python', 'Programming', 'Web Development'],
    isFree: true,
    isFeatured: true,
    isNew: false,
    createdAt: '2025-06-15',
    updatedAt: '2026-01-20',
  },
  {
    id: '2',
    title: 'Advanced Mathematics for Data Science',
    description: 'Master linear algebra, calculus, statistics, and probability - the mathematical foundations for machine learning and AI.',
    category: 'Mathematics',
    level: 'INTERMEDIATE',
    duration: 38,
    lessonsCount: 98,
    enrolledCount: 8750,
    rating: 4.9,
    reviewsCount: 1520,
    price: 0,
    instructor: { id: '2', name: 'Prof. Michael Ross', title: 'Mathematics Professor' },
    tags: ['Math', 'Data Science', 'Statistics'],
    isFree: true,
    isFeatured: true,
    isNew: false,
    createdAt: '2025-08-10',
    updatedAt: '2026-01-15',
  },
  {
    id: '3',
    title: 'English Communication & Public Speaking',
    description: 'Improve your English speaking skills, presentation abilities, and become a confident communicator.',
    category: 'Languages',
    level: 'ALL_LEVELS',
    duration: 24,
    lessonsCount: 64,
    enrolledCount: 12300,
    rating: 4.7,
    reviewsCount: 1890,
    price: 0,
    instructor: { id: '3', name: 'Ms. Emily Parker', title: 'Communication Coach' },
    tags: ['English', 'Speaking', 'Communication'],
    isFree: true,
    isFeatured: false,
    isNew: true,
    createdAt: '2026-01-05',
    updatedAt: '2026-02-01',
  },
  {
    id: '4',
    title: 'UI/UX Design Fundamentals',
    description: 'Learn user interface and experience design from scratch. Create beautiful, user-friendly digital products.',
    category: 'Design',
    level: 'BEGINNER',
    duration: 30,
    lessonsCount: 85,
    enrolledCount: 9200,
    rating: 4.6,
    reviewsCount: 1240,
    price: 0,
    instructor: { id: '4', name: 'Alex Rivera', title: 'Lead Product Designer' },
    tags: ['UI', 'UX', 'Figma', 'Design'],
    isFree: true,
    isFeatured: true,
    isNew: false,
    createdAt: '2025-09-20',
    updatedAt: '2026-01-25',
  },
  {
    id: '5',
    title: 'Web Development Bootcamp 2026',
    description: 'Full-stack web development with HTML, CSS, JavaScript, React, Node.js, and databases. Build 20+ projects.',
    category: 'Programming',
    level: 'BEGINNER',
    duration: 65,
    lessonsCount: 320,
    enrolledCount: 28500,
    rating: 4.9,
    reviewsCount: 5200,
    price: 0,
    instructor: { id: '5', name: 'James Wilson', title: 'Full-Stack Developer' },
    tags: ['Web', 'JavaScript', 'React', 'Node.js'],
    isFree: true,
    isFeatured: true,
    isNew: false,
    createdAt: '2025-03-01',
    updatedAt: '2026-02-05',
  },
  {
    id: '6',
    title: 'Physics: From Basics to Quantum Mechanics',
    description: 'Comprehensive physics course covering mechanics, thermodynamics, electromagnetism, and quantum physics.',
    category: 'Science',
    level: 'INTERMEDIATE',
    duration: 48,
    lessonsCount: 142,
    enrolledCount: 6800,
    rating: 4.8,
    reviewsCount: 920,
    price: 0,
    instructor: { id: '6', name: 'Dr. Robert Kim', title: 'Physics Professor' },
    tags: ['Physics', 'Science', 'Quantum'],
    isFree: true,
    isFeatured: false,
    isNew: false,
    createdAt: '2025-07-15',
    updatedAt: '2026-01-10',
  },
];

const SAMPLE_ENROLLED: EnrolledCourse[] = [
  {
    ...SAMPLE_COURSES[0],
    progress: 45,
    completedLessons: 70,
    lastAccessedAt: '2026-02-06T10:30:00Z',
    enrolledAt: '2026-01-15',
  },
  {
    ...SAMPLE_COURSES[4],
    progress: 22,
    completedLessons: 70,
    lastAccessedAt: '2026-02-05T14:20:00Z',
    enrolledAt: '2026-01-20',
  },
];

const SAMPLE_PATHS: LearningPath[] = [
  {
    id: '1',
    title: 'Full-Stack Developer Path',
    description: 'Complete journey from beginner to professional full-stack developer. Covers frontend, backend, databases, and deployment.',
    coursesCount: 8,
    totalDuration: 180,
    enrolledCount: 5420,
    level: 'BEGINNER to ADVANCED',
    courses: [
      { id: '5', title: 'Web Development Bootcamp', order: 1 },
      { id: '1', title: 'Python Programming', order: 2 },
    ],
    isFeatured: true,
  },
  {
    id: '2',
    title: 'Data Science & AI Mastery',
    description: 'Learn data science, machine learning, and AI from mathematical foundations to real-world applications.',
    coursesCount: 6,
    totalDuration: 150,
    enrolledCount: 3890,
    level: 'INTERMEDIATE',
    courses: [
      { id: '2', title: 'Advanced Mathematics', order: 1 },
      { id: '1', title: 'Python Programming', order: 2 },
    ],
    isFeatured: true,
  },
  {
    id: '3',
    title: 'Product Design Career Path',
    description: 'Become a professional product designer. Learn UI/UX, user research, prototyping, and design systems.',
    coursesCount: 5,
    totalDuration: 95,
    enrolledCount: 2150,
    level: 'BEGINNER',
    courses: [
      { id: '4', title: 'UI/UX Design Fundamentals', order: 1 },
    ],
    isFeatured: false,
  },
];

const SUBJECT_SERVICE = process.env.NEXT_PUBLIC_SUBJECT_SERVICE_URL || 'http://localhost:3006';
const GRADE_SERVICE = process.env.NEXT_PUBLIC_GRADE_SERVICE_URL || 'http://localhost:3007';
const FEED_SERVICE = LEARN_SERVICE_URL;
const LEARN_CACHE_TTL_MS = 2 * 60 * 1000;

// ============================================
// MAIN COMPONENT
// ============================================

export default function LearnHubPage() {
    const autoT = useTranslations();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('common');
  const locale = (params?.locale as string) || 'en';
  const showMobileHub = searchParams.get('hub') === '1' || searchParams.get('tab') === 'explore';
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /** Mobile default tab = LearnHome path; skip heavy marketplace fetches. */
  const mobilePathOnly = isMobileViewport && !showMobileHub;
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'explore' | 'my-courses' | 'curriculum' | 'paths' | 'my-created' | 'submissions'>(
    showMobileHub ? 'explore' : 'curriculum'
  );
  const [selectedGrade, setSelectedGrade] = useState<string>('12');
  const [selectedTrack, setSelectedTrack] = useState<'ALL' | 'SCIENCE' | 'SOCIAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [enrollingPathId, setEnrollingPathId] = useState<string | null>(null);
  const [resumingCourseId, setResumingCourseId] = useState<string | null>(null);
  const [selectedSubmissionCourseId, setSelectedSubmissionCourseId] = useState<string>('');
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumLoaded, setCurriculumLoaded] = useState(false);
  
  // User State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isStudent, setIsStudent] = useState(false);
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [savedLessons, setSavedLessons] = useState<SavedLesson[]>([]);
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [myGrades, setMyGrades] = useState<Grade[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    enrolledCourses: 2,
    completedCourses: 1,
    hoursLearned: 28,
    currentStreak: 7,
    certificates: 1,
  });
  const learnCacheKey = buildRouteDataCacheKey('learn', 'hub', locale, currentUser?.id || 'guest');

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

  const fetchLearnHub = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return false;

      const response = await fetch(`${FEED_SERVICE}/courses/learn-hub?limit=30&pathLimit=20&locale=${locale}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return false;

      const data = await response.json();
      setCourses(Array.isArray(data?.courses) ? data.courses : []);
      setEnrolledCourses(Array.isArray(data?.myCourses) ? data.myCourses : []);
      setCreatedCourses(Array.isArray(data?.myCreated) ? data.myCreated : []);
      setLearningPaths(Array.isArray(data?.paths) ? data.paths : []);
      setSavedLessons(Array.isArray(data?.savedLessons) ? data.savedLessons : []);
      setRecentLessons(Array.isArray(data?.recentLessons) ? data.recentLessons : []);
      setStats(prev => ({
        ...prev,
        enrolledCourses: Number(data?.stats?.enrolledCourses ?? prev.enrolledCourses),
        completedCourses: Number(data?.stats?.completedCourses ?? prev.completedCourses),
        hoursLearned: Number(data?.stats?.hoursLearned ?? prev.hoursLearned),
        currentStreak: Number(data?.stats?.currentStreak ?? prev.currentStreak),
      }));
      return true;
    } catch (err) {
      console.error('Error fetching learn hub:', err);
      return false;
    }
  }, [getAuthToken, locale]);

  const fetchSavedLessons = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/courses/bookmarked-lessons?limit=6&locale=${locale}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedLessons(Array.isArray(data?.lessons) ? data.lessons : []);
      }
    } catch (err) {
      console.error('Error fetching saved lessons:', err);
    }
  }, [getAuthToken, locale]);

  // Fetch courses from API
  const fetchCourses = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/courses?locale=${locale}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, [getAuthToken, locale]);

  // Fetch enrolled courses
  const fetchEnrolledCourses = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/courses/my-courses?locale=${locale}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEnrolledCourses(data.courses || []);
        // Update stats
        setStats(prev => ({
          ...prev,
          enrolledCourses: data.courses?.length || 0,
          completedCourses: data.courses?.filter((c: any) => c.progress === 100).length || 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching enrolled courses:', err);
    }
  }, [getAuthToken, locale]);

  // Fetch learning paths
  const fetchLearningPaths = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/learning-paths/paths`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLearningPaths(data.paths || []);
      }
    } catch (err) {
      console.error('Error fetching learning paths:', err);
    }
  }, [getAuthToken]);

  // Fetch my created courses
  const fetchCreatedCourses = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/courses/my-created?locale=${locale}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreatedCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Error fetching created courses:', err);
    }
  }, [getAuthToken, locale]);

  const fetchLearningStats = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/courses/stats/my-learning`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({
          ...prev,
          enrolledCourses: Number(data?.enrolledCourses ?? prev.enrolledCourses),
          completedCourses: Number(data?.completedCourses ?? prev.completedCourses),
          hoursLearned: Number(data?.hoursLearned ?? prev.hoursLearned),
          currentStreak: Number(data?.currentStreak ?? prev.currentStreak),
        }));
      }
    } catch (err) {
      console.error('Error fetching learning stats:', err);
    }
  }, [getAuthToken]);

  // Fetch subjects (for curriculum tab)
  const fetchSubjects = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${SUBJECT_SERVICE}/subjects?isActive=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  }, [getAuthToken]);

  // Fetch grades
  const fetchGrades = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token || !currentUser?.id) return;
      
      const response = await fetch(`${GRADE_SERVICE}/grades/student/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyGrades(data.grades || data || []);
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
    }
  }, [getAuthToken, currentUser?.id]);

  // Initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const schoolStr = localStorage.getItem('school');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsStudent(user.role === 'STUDENT');
      }
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    }
  }, []);

  useEffect(() => {
    setCurriculumLoaded(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || mobilePathOnly) return;

    const cachedPayload = readRouteDataCache<CachedLearnPayload>(learnCacheKey, LEARN_CACHE_TTL_MS);
    if (!cachedPayload) return;

    setCourses(cachedPayload.courses);
    setEnrolledCourses(cachedPayload.enrolledCourses);
    setCreatedCourses(cachedPayload.createdCourses);
    setLearningPaths(cachedPayload.learningPaths);
    setSavedLessons(cachedPayload.savedLessons || []);
    setRecentLessons(cachedPayload.recentLessons || []);
    setSubjects(cachedPayload.subjects);
    setMyGrades(cachedPayload.myGrades);
    setStats(cachedPayload.stats);
    setCurriculumLoaded(cachedPayload.subjects.length > 0 || cachedPayload.myGrades.length > 0);
    setLoading(false);
  }, [currentUser?.id, learnCacheKey, mobilePathOnly]);

  // Mobile path home still needs a light courses strip (native parity).
  useEffect(() => {
    if (!mobilePathOnly || !currentUser) return;
    setLoading(false);
    void (async () => {
      const loadedFromHub = await fetchLearnHub();
      if (!loadedFromHub) await fetchCourses();
    })();
  }, [currentUser, fetchCourses, fetchLearnHub, mobilePathOnly]);

  useEffect(() => {
    if (mobilePathOnly) return;
    if (currentUser) {
      const loadAll = async () => {
        const cachedPayload = readRouteDataCache<CachedLearnPayload>(learnCacheKey, LEARN_CACHE_TTL_MS);
        if (!cachedPayload) setLoading(true);
        const loadedFromHub = await fetchLearnHub();
        if (!loadedFromHub) {
          await Promise.all([
            fetchCourses(),
            fetchEnrolledCourses(),
            fetchCreatedCourses(),
            fetchLearningPaths(),
            fetchSavedLessons(),
            fetchLearningStats(),
          ]);
        }
        setLoading(false);
      };
      loadAll();
    }
  }, [currentUser, fetchCourses, fetchCreatedCourses, fetchEnrolledCourses, fetchLearnHub, fetchLearningPaths, fetchLearningStats, fetchSavedLessons, learnCacheKey, mobilePathOnly]);

  useEffect(() => {
    if (mobilePathOnly || curriculumLoaded || curriculumLoading) return;
    setCurriculumLoading(true);
    Promise.all([fetchSubjects(), fetchGrades()]).finally(() => {
      setCurriculumLoaded(true);
      setCurriculumLoading(false);
    });
  }, [curriculumLoaded, curriculumLoading, fetchGrades, fetchSubjects, mobilePathOnly]);


  useEffect(() => {
    if (mobilePathOnly || !currentUser?.id) return;

    writeRouteDataCache<CachedLearnPayload>(learnCacheKey, {
      courses,
      enrolledCourses,
      createdCourses,
      learningPaths,
      savedLessons,
      recentLessons,
      subjects,
      myGrades,
      stats,
    });
  }, [courses, createdCourses, currentUser?.id, enrolledCourses, learnCacheKey, learningPaths, myGrades, mobilePathOnly, recentLessons, savedLessons, stats, subjects]);

  useEffect(() => {
    if (createdCourses.length === 0) {
      setSelectedSubmissionCourseId('');
      return;
    }

    setSelectedSubmissionCourseId((prev) => {
      if (prev && createdCourses.some((course) => course.id === prev)) return prev;
      return createdCourses[0].id;
    });
  }, [createdCourses]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/login`);
  };

  const getNextLessonId = useCallback(async (courseId: string): Promise<string | null> => {
    try {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}?locale=${locale}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return null;
      const data = await response.json();
      const looseLessons = Array.isArray(data?.course?.lessons) ? data.course.lessons : [];
      const sectionLessons = Array.isArray(data?.course?.sections)
        ? data.course.sections.flatMap((section: any) => (Array.isArray(section?.lessons) ? section.lessons : []))
        : [];
      const lessons = [...sectionLessons, ...looseLessons].filter((lesson: any, index: number, arr: any[]) => (
        lesson?.id && arr.findIndex((candidate) => candidate?.id === lesson.id) === index
      ));
      const nextLesson = lessons.find((lesson: any) => !lesson.isCompleted && !lesson.isLocked) || lessons.find((lesson: any) => !lesson.isLocked) || lessons[0];
      return nextLesson?.id || null;
    } catch (err) {
      console.error('Error resolving next lesson:', err);
      return null;
    }
  }, [getAuthToken, locale]);

  const handleResumeCourse = useCallback(async (courseId: string, preferredLessonId?: string | null) => {
    try {
      setResumingCourseId(courseId);
      if (preferredLessonId) {
        router.push(`/${locale}/learn/course/${courseId}/lesson/${preferredLessonId}`);
        return;
      }

      const resolvedLessonId = await getNextLessonId(courseId);
      if (resolvedLessonId) {
        router.push(`/${locale}/learn/course/${courseId}/lesson/${resolvedLessonId}`);
      } else {
        router.push(`/${locale}/learn/course/${courseId}`);
      }
    } finally {
      setResumingCourseId(null);
    }
  }, [getNextLessonId, locale, router]);

  const prefetchCourseDetailData = useCallback(async (courseId: string) => {
    const token = getAuthToken();
    if (!token) return;

    const userId = getCurrentUserId();
    const cacheKey = buildRouteDataCacheKey('learn', 'course-detail', locale, courseId, userId);
    const cached = readRouteDataCache<CachedCourseDetailPayload>(cacheKey, LEARN_CACHE_TTL_MS);
    if (cached) return;

    try {
      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}?locale=${locale}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return;
      const data = await response.json();
      writeRouteDataCache<CachedCourseDetailPayload>(cacheKey, {
        course: data?.course,
        enrollment: data?.enrollment ?? null,
        isEnrolled: Boolean(data?.isEnrolled),
      });
    } catch {
      // Ignore prefetch failures and allow normal navigation fetch.
    }
  }, [getAuthToken, getCurrentUserId, locale]);

  const prefetchLearnCourseRoute = useCallback((courseId: string) => {
    router.prefetch(`/${locale}/learn/course/${courseId}`);
    void prefetchCourseDetailData(courseId);
  }, [locale, prefetchCourseDetailData, router]);

  const prefetchInstructorCurriculumRoute = useCallback((courseId: string) => {
    router.prefetch(`/${locale}/instructor/course/${courseId}/curriculum`);
    void prefetchCourseDetailData(courseId);
  }, [locale, prefetchCourseDetailData, router]);

  const prefetchInstructorCourseEditRoute = useCallback((courseId: string) => {
    router.prefetch(`/${locale}/instructor/course/${courseId}/edit`);
    void prefetchCourseDetailData(courseId);
  }, [locale, prefetchCourseDetailData, router]);

  // Enroll in course
  const handleEnroll = async (courseId: string) => {
    try {
      setEnrollingCourseId(courseId);
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        await fetchLearnHub();
      }
    } catch (err) {
      console.error('Error enrolling in course:', err);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  // Enroll in learning path
  const handleEnrollPath = async (pathId: string) => {
    try {
      setEnrollingPathId(pathId);
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/learning-paths/paths/${pathId}/enroll`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        await fetchLearnHub();
      }
    } catch (err) {
      console.error('Error enrolling in path:', err);
    } finally {
      setEnrollingPathId(null);
    }
  };

  // Filter courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const matchesLevel = !selectedLevel || course.level === selectedLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const featuredCourses = courses.filter(c => c.isFeatured);
  const continueLearning = enrolledCourses.find(c => c.progress > 0 && c.progress < 100);

  // ============================================
  // COMPONENTS
  // ============================================

  // Course Card Skeleton
  const CourseCardSkeleton = () => (
    <div className="learn-surface overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 shadow-sm animate-pulse dark:border-slate-800 dark:bg-slate-900/75">
      <div className="h-40 bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3 p-4">
        <div className="flex justify-between">
          <div className="h-4 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-8 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mb-4 h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mb-3 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );

  // Course Card
  const CourseCard = ({ course, enrolled }: { course: Course | EnrolledCourse; enrolled?: boolean }) => {
    const Icon = CATEGORY_ICONS[course.category] || BookOpen;
    const enrolledCourse = enrolled ? course as EnrolledCourse : null;
    
    return (
      <Link 
        href={`/${locale}/learn/course/${course.id}`}
        onMouseEnter={() => prefetchLearnCourseRoute(course.id)}
        onFocus={() => prefetchLearnCourseRoute(course.id)}
        className="feed-card-mobile learn-course-card group block overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300/50 hover:shadow-lg hover:shadow-amber-100/40 dark:border-slate-800 dark:bg-slate-900/75 dark:hover:border-amber-400/40"
      >
        {/* Thumbnail */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 dark:from-amber-500/10 dark:via-slate-900 dark:to-cyan-500/10">
          {course.thumbnail ? (
            <Image src={course.thumbnail} alt={course.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="h-14 w-14 text-amber-300/90" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
          
          {/* Progress bar for enrolled */}
          {enrolledCourse && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white dark:bg-gray-900/30 dark:bg-slate-900/70">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_18px_rgba(245,158,11,0.6)]"
                style={{ width: `${clampProgress(enrolledCourse.progress)}%` }}
              />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {course.isFree && (
              <span className="rounded-full border border-emerald-300/50 bg-emerald-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_2c563eeb" /></span>
            )}
            {course.isNew && (
              <span className="rounded-full border border-blue-300/50 bg-blue-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_fa7d3b26" /></span>
            )}
          </div>

          <div className="absolute bottom-3 left-3">
            <span className="rounded-full border border-white/25 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/90">
              {course.category}
            </span>
          </div>
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-900/90 opacity-0 shadow-lg backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <Play className="ml-0.5 h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${LEVEL_COLORS[course.level]}`}>
              {course.level.replace('_', ' ')}
            </span>
            <div className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-gray-800 px-2 py-0.5 text-amber-500 dark:border-slate-700">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{course.rating}</span>
            </div>
          </div>
          
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-white transition-colors group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-300">
            {course.title}
          </h3>
          
          <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{course.description}</p>
          
          {/* Instructor */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-200 text-xs font-semibold text-amber-700">
              {course.instructor.name.charAt(0)}
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{course.instructor.name}</span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {course.duration}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_76d2709c" />
            </span>
            <span className="inline-flex items-center gap-1">
              <PlayCircle className="h-3.5 w-3.5" />
              {course.lessonsCount} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_755ae213" />
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {(course.enrolledCount / 1000).toFixed(1)}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_db3868eb" />
            </span>
          </div>
          
          {/* Progress for enrolled */}
          {enrolledCourse && (
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">{formatProgressPercent(enrolledCourse.progress)} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_ff97bf4b" /></span>
                <span className="text-slate-500 dark:text-slate-400">{enrolledCourse.completedLessons}/{course.lessonsCount}</span>
              </div>
              <div className="mb-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                  style={{ width: `${clampProgress(enrolledCourse.progress)}%` }}
                />
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleResumeCourse(course.id, enrolledCourse?.resumeLessonId);
                }}
                disabled={resumingCourseId === course.id}
                className="premium-cta mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-amber-400 hover:to-orange-400 disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                {resumingCourseId === course.id ? 'Opening...' : 'Continue Learning'}
              </button>
            </div>
          )}
          
          {/* Enroll button for non-enrolled */}
          {!enrolled && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleEnroll(course.id);
              }}
              disabled={enrollingCourseId === course.id}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/70 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 disabled:opacity-60"
            >
              {enrollingCourseId === course.id ? 'Enrolling...' : 'Enroll Now'}
            </button>
          )}
        </div>
      </Link>
    );
  };

  const SavedLessonCard = ({ item }: { item: SavedLesson }) => {
    const Icon = CATEGORY_ICONS[item.course.category] || BookOpen;
    const destinationHref = item.isLocked
      ? `/${locale}/learn/course/${item.courseId}`
      : `/${locale}/learn/course/${item.courseId}/lesson/${item.lessonId}`;

    return (
      <Link
        href={destinationHref}
        onMouseEnter={() => prefetchLearnCourseRoute(item.courseId)}
        onFocus={() => prefetchLearnCourseRoute(item.courseId)}
        className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300/60 hover:shadow-lg hover:shadow-amber-100/50 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-amber-500/40"
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-amber-100/70 via-orange-50 to-cyan-100/60 dark:from-amber-500/10 dark:via-transparent dark:to-cyan-500/10" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white dark:bg-gray-900 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            {item.course.thumbnail ? (
              <Image src={item.course.thumbnail} alt={item.course.title} width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-7 w-7 text-amber-500 dark:text-amber-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${LEVEL_COLORS[item.course.level]}`}>
                {item.course.level.replace('_', ' ')}
              </span>
              <span className="rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                {item.course.category}
              </span>
              {item.isCompleted && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b7f95aed" />
                </span>
              )}
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_3fd3058f" /> {item.course.title}
            </p>
            <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-slate-900 dark:text-white transition-colors group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-300">
              {item.title}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {item.duration}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b51ac839" />
              </span>
              <span className="inline-flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5 fill-current text-amber-500" />
                {new Date(item.bookmarkedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
              <span className={`inline-flex items-center gap-1 ${item.isLocked ? 'text-rose-500 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                {item.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {item.isLocked ? 'Open course' : 'Resume lesson'}
              </span>
            </div>
          </div>

          <ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-slate-600" />
        </div>
      </Link>
    );
  };

  const RecentLessonCard = ({ item }: { item: RecentLesson }) => {
    const Icon = CATEGORY_ICONS[item.course.category] || BookOpen;
    const destinationHref = item.isLocked
      ? `/${locale}/learn/course/${item.courseId}`
      : `/${locale}/learn/course/${item.courseId}/lesson/${item.lessonId}`;

    return (
      <Link
        href={destinationHref}
        onMouseEnter={() => prefetchLearnCourseRoute(item.courseId)}
        onFocus={() => prefetchLearnCourseRoute(item.courseId)}
        className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300/60 hover:shadow-lg hover:shadow-sky-100/50 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-sky-500/40"
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-sky-100/70 via-cyan-50 to-amber-100/60 dark:from-sky-500/10 dark:via-transparent dark:to-amber-500/10" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white dark:bg-gray-900 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            {item.course.thumbnail ? (
              <Image src={item.course.thumbnail} alt={item.course.title} width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-7 w-7 text-sky-500 dark:text-sky-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${LEVEL_COLORS[item.course.level]}`}>
                {item.course.level.replace('_', ' ')}
              </span>
              <span className="rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                {item.course.category}
              </span>
              {item.isCompleted && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b7f95aed" />
                </span>
              )}
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_11cbc46a" />
            </p>
            <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-slate-900 dark:text-white transition-colors group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
              {item.title}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {item.duration}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b51ac839" />
              </span>
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5 text-sky-500" />
                {new Date(item.openedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
              <span className={`inline-flex items-center gap-1 ${item.isLocked ? 'text-rose-500 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                {item.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {item.isLocked ? 'Open course' : 'Resume lesson'}
              </span>
            </div>
          </div>

          <ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-500 dark:text-slate-600" />
        </div>
      </Link>
    );
  };

  // Learning Path Card
  const PathCard = ({ path }: { path: LearningPath }) => (
    <div className="learn-surface rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300/50 hover:shadow-lg hover:shadow-amber-100/40 dark:border-slate-800 dark:bg-slate-900/75">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-cyan-100 dark:from-indigo-500/20 dark:to-cyan-500/20">
          <Route className="h-7 w-7 text-indigo-600 dark:text-cyan-300" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{path.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{path.description}</p>
            </div>
            {path.isFeatured && (
              <span className="flex-shrink-0 rounded-full border border-indigo-300/50 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_067c5b13" />
              </span>
            )}
          </div>
          
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {path.coursesCount} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b867f528" />
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {path.totalDuration}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_481d65cc" />
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {(path.enrolledCount / 1000).toFixed(1)}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_65b073c8" />
            </span>
          </div>
          
          <button
            onClick={() => handleEnrollPath(path.id)}
            disabled={path.isEnrolled || enrollingPathId === path.id}
            className="premium-cta mt-4 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-indigo-400 hover:to-cyan-400 disabled:opacity-60"
          >
            {path.isEnrolled ? 'Enrolled' : enrollingPathId === path.id ? 'Enrolling...' : 'Start Learning Path'}
          </button>
        </div>
      </div>
    </div>
  );

  // Subject Card (for curriculum)
  const SubjectCard = ({ subject }: { subject: Subject }) => {
    const Icon = CATEGORY_ICONS[subject.category] || BookOpen;
    const subjectGrades = myGrades.filter(g => g.subjectId === subject.id);
    const avgGrade = subjectGrades.length > 0 
      ? subjectGrades.reduce((sum, g) => sum + g.percentage, 0) / subjectGrades.length 
      : null;
    
    return (
      <div className="learn-surface bg-white dark:bg-none dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white">{subject.name}</h4>
            <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_86fdf21f" /> {subject.grade} • {subject.weeklyHours}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_501d8f76" /></p>
          </div>
          {avgGrade !== null && (
            <div className={`px-2 py-1 rounded-lg text-sm font-bold ${
              avgGrade >= 80 ? 'bg-green-100 text-green-700' :
              avgGrade >= 60 ? 'bg-blue-100 text-blue-700' :
              avgGrade >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {Math.round(avgGrade)}%
            </div>
          )}
        </div>
      </div>
    );
  };

  // Content handled globally
  // We use unified navigation which handles tokens/logout
  const learnTheme = {
    '--learn-bg': '#f6f4ee',
    '--learn-panel': '#fffdf7',
    '--learn-accent': '#f59e0b',
    '--learn-ink': '#1e2433',
  } as CSSProperties;
  const welcomeName = currentUser?.firstName || 'Learner';

  return (
    <div style={learnTheme} className="learn-stage min-h-screen bg-[var(--learn-bg)] text-[var(--learn-ink)] dark:bg-slate-950 dark:text-slate-100">
      <UnifiedNavigation />

      {/* ═══ Mobile: native LearnHome parity (path hub) ═══ */}
      {!showMobileHub && (
        <div className="md:hidden pt-[calc(var(--top-bar-height)+env(safe-area-inset-top,0px))] pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+8px)]">
          <LearnHomeMobile
            locale={locale}
            user={currentUser}
            courses={courses.map((c) => ({
              id: c.id,
              title: c.title,
              category: c.category,
              thumbnailUrl: c.thumbnail,
              enrolledCount: c.enrolledCount,
            }))}
          />
        </div>
      )}

      {/* ═══ Desktop marketplace (and optional mobile hub via ?hub=1) ═══ */}
      <div className={`relative overflow-hidden ${showMobileHub ? 'block' : 'hidden md:block'}`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-amber-100/70 via-rose-50/40 to-transparent dark:from-amber-500/10 dark:via-cyan-500/5 dark:to-transparent" />
        <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/10" />
        <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-500/10" />

        <div className="feed-mobile-container mx-auto max-w-7xl px-0 sm:px-6 lg:px-8 pt-[calc(var(--top-bar-height)+env(safe-area-inset-top,0px)+8px)] md:pt-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+12px)] md:pb-5">
          {showMobileHub && (
            <button
              type="button"
              onClick={() => router.push(`/${locale}/learn`)}
              className="md:hidden mb-3 mx-4 inline-flex items-center gap-1.5 text-sm font-bold text-sky-600"
            >
              ← {locale === 'km' ? 'ត្រឡប់ទៅផ្លូវសិក្សា' : 'Back to learning path'}
            </button>
          )}
          <section className="learn-hero hidden md:block reveal-item reveal-1 mb-5 rounded-[1.75rem] border border-amber-100 bg-[var(--learn-panel)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900/90 md:p-6">
            <div className="grid gap-4 md:grid-cols-[1.2fr_auto] md:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_dbdd7bc4" /></p>
                <h1 className="mt-2 text-3xl font-black leading-[1.06] tracking-[-0.02em] text-slate-900 dark:text-white md:text-4xl">
                  <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_e9a357c5" /> {welcomeName}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
                  <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_7abb6765" />
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-900/75">
                  <p className="font-black text-amber-600">{stats.enrolledCourses}</p>
                  <p className="text-slate-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_fe30264e" /></p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-900/75">
                  <p className="font-black text-emerald-600">{stats.completedCourses}</p>
                  <p className="text-slate-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b7f95aed" /></p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-900/75">
                  <p className="font-black text-cyan-600">{stats.hoursLearned}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_76d2709c" /></p>
                  <p className="text-slate-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_a72e8920" /></p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-900/75">
                  <p className="font-black text-orange-600">{stats.currentStreak}🔥</p>
                  <p className="text-slate-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_ae1e4fa6" /></p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          
          {/* ============================================ */}
          {/* LEFT SIDEBAR */}
          {/* ============================================ */}
          <aside className="reveal-item reveal-2 hidden space-y-4 lg:col-span-3 lg:block">
            {/* User Learning Stats */}
            <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 p-5 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-lg font-bold text-amber-700">
                  {currentUser?.firstName?.charAt(0) || 'L'}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {currentUser?.firstName || 'Learner'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_f2191f18" /></p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-amber-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-amber-600">{stats.enrolledCourses}</p>
                  <p className="text-xs text-gray-600"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_fe30264e" /></p>
                </div>
                <div className="p-2.5 bg-green-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-600">{stats.completedCourses}</p>
                  <p className="text-xs text-gray-600"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b7f95aed" /></p>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-600">{stats.hoursLearned}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_76d2709c" /></p>
                  <p className="text-xs text-gray-600"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_a72e8920" /></p>
                </div>
                <div className="p-2.5 bg-orange-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-orange-600">{stats.currentStreak}🔥</p>
                  <p className="text-xs text-gray-600"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_25c59879" /></p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Vertical) */}
            <div className="learn-surface overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="border-b border-gray-100 p-3 dark:border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_2f71b80f" /></h3>
              </div>
              <nav className="p-2">
                {[
                  { id: 'explore', label: 'Explore Courses', icon: Compass, desc: 'Discover new skills' },
                  { id: 'my-courses', label: 'My Courses', icon: BookOpen, desc: 'Continue learning' },
                  { id: 'my-created', label: 'My Created', icon: Video, desc: 'Courses you teach' },
                  { id: 'submissions', label: 'Submissions', icon: ClipboardList, desc: 'Grade assignments' },
                  { id: 'paths', label: 'Learning Paths', icon: Route, desc: 'Guided journeys' },
                  ...(isStudent ? [{ id: 'curriculum', label: 'My Curriculum', icon: GraduationCap, desc: 'School subjects' }] : []),
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                        : 'text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-amber-600' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-sm font-medium ${activeTab === tab.id ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-slate-200'}`}>
                        {tab.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{tab.desc}</p>
                    </div>
                  </button>
                ))}
              </nav>
              
              {/* Create Course Button */}
              <div className="border-t border-gray-100 p-3 dark:border-slate-800">
                <Link
                  href={`/${locale}/learn/create`}
                  className="premium-cta flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:from-amber-600 hover:to-orange-600"
                >
                  <Plus className="w-4 h-4" />
                  <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_9a4a98af" />
                </Link>
              </div>
            </div>

            {/* Categories Filter */}
            {activeTab === 'explore' && (
              <div className="learn-surface overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="border-b border-gray-100 p-3 dark:border-slate-800">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_0626e350" /></h3>
                </div>
                <nav className="p-2 max-h-64 overflow-y-auto">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        selectedCategory === cat
                          ? 'bg-amber-50 text-amber-700 font-medium dark:bg-amber-500/10 dark:text-amber-300'
                          : 'text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:text-slate-300 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      {cat === 'All' ? <Sparkles className="w-4 h-4" /> : 
                       CATEGORY_ICONS[cat] ? <span className="w-4 h-4">{(() => { const I = CATEGORY_ICONS[cat]; return <I className="w-4 h-4" />; })()}</span> :
                       <BookOpen className="w-4 h-4" />}
                      {cat}
                    </button>
                  ))}
                </nav>
              </div>
            )}
          </aside>

          {/* ============================================ */}
          {/* MAIN CONTENT */}
          {/* ============================================ */}
          <main className="reveal-item reveal-3 lg:col-span-6">
            {/* Search & Filters */}
            <div className="learn-surface mb-4 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder={autoT("auto.web.app_locale_learn_page.k_1d690caa")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-gray-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-3 py-2.5 text-sm text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="">{autoT("auto.web.app_locale_learn_page.k_73980f93")}</option>
                  <option value="BEGINNER">{autoT("auto.web.app_locale_learn_page.k_e65faed6")}</option>
                  <option value="INTERMEDIATE">{autoT("auto.web.app_locale_learn_page.k_6c06078f")}</option>
                  <option value="ADVANCED">{autoT("auto.web.app_locale_learn_page.k_5b9e0ef4")}</option>
                </select>
              </div>

              {/* Mobile Tab Switcher - Focus on Grade Subjects */}
              <div className="mobile-feed-tabs flex gap-2 mb-3 overflow-x-auto pb-2 px-4 sm:px-0 lg:hidden hide-scrollbar whitespace-nowrap">
                {[
                  { id: 'curriculum', label: 'រៀនតាមថ្នាក់ (Grades 7-12)', icon: GraduationCap },
                  { id: 'paths', label: 'ផ្លូវសិក្សា (Paths)', icon: Route },
                  { id: 'my-courses', label: 'វគ្គសិក្សារបស់ខ្ញុំ', icon: BookOpen },
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-xs transition-all whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-[#F9A825] text-white shadow-sm font-bold'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Continue Learning Banner */}
            {continueLearning && activeTab !== 'curriculum' && activeTab !== 'submissions' && (
              <div className="premium-banner relative mb-4 overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-5 text-white shadow-lg shadow-amber-200/50">
                <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-white dark:bg-none dark:bg-gray-900/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-12 left-1/4 h-28 w-28 rounded-full bg-white dark:bg-none dark:bg-gray-900/10 blur-2xl" />
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <p className="mb-1 text-sm text-white/80"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_54bf8094" /></p>
                    <h3 className="font-semibold text-lg">{continueLearning.title}</h3>
                    <div className="mt-2 flex items-center gap-4 text-sm text-white/90">
                      <span>{formatProgressPercent(continueLearning.progress)} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_ff97bf4b" /></span>
                      <span>•</span>
                      <span>{continueLearning.completedLessons} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_e412664f" /> {continueLearning.lessonsCount} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_755ae213" /></span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResumeCourse(continueLearning.id, continueLearning.resumeLessonId)}
                    disabled={resumingCourseId === continueLearning.id}
                    className="relative flex items-center gap-2 rounded-lg bg-white dark:bg-none dark:bg-gray-900 px-5 py-2.5 font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-70"
                  >
                    <Play className="w-4 h-4" />
                    {resumingCourseId === continueLearning.id ? 'Opening...' : 'Resume'}
                  </button>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white dark:bg-gray-900/30">
                  <div 
                    className="h-full rounded-full bg-white dark:bg-gray-900"
                    style={{ width: `${clampProgress(continueLearning.progress)}%` }}
                  />
                </div>
              </div>
            )}

            {/* EXPLORE TAB */}
            {activeTab === 'explore' && (
              <div className="space-y-4">
                {/* Featured Banner */}
                {selectedCategory === 'All' && !searchQuery && (
                  <div className="premium-banner relative mb-4 overflow-hidden rounded-2xl border border-indigo-300/30 bg-gradient-to-br from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-lg shadow-sky-200/50">
                    <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-white dark:bg-none dark:bg-gray-900/10 blur-2xl" />
                    <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-indigo-200/30 blur-2xl" />
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      <span className="text-sm font-medium text-white/80"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_067c5b13" /></span>
                    </div>
                    <h2 className="mb-2 text-2xl font-black tracking-[-0.01em]"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_e2391476" /></h2>
                    <p className="mb-4 text-white/80"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_befde278" /> {courses.length}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_38893a8c" /></p>
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-white dark:bg-none dark:bg-gray-900 px-4 py-2 font-semibold text-indigo-700 transition hover:bg-slate-100 dark:bg-none dark:bg-gray-800">
                        <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_8cec6728" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Course Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 bg-gray-100 dark:bg-gray-950 sm:bg-transparent sm:dark:bg-transparent">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <CourseCardSkeleton key={`skeleton-${i}`} />)
                  ) : filteredCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>

                {!loading && filteredCourses.length === 0 && (
                  <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 p-12 text-center dark:border-slate-800 dark:bg-slate-900/80">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-slate-100"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_4db5ae0e" /></h3>
                    <p className="text-gray-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_dc8983d5" /></p>
                  </div>
                )}
              </div>
            )}

            {/* MY COURSES TAB */}
            {activeTab === 'my-courses' && (
              <div className="space-y-5">
                {loading ? (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => <CourseCardSkeleton key={`saved-skeleton-${i}`} />)}
                  </div>
                ) : (
                  <section className="learn-surface overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_3c2a770d" /></p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_54bf8094" /></h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_7cda3235" />
                        </p>
                      </div>
                      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-right dark:border-sky-500/20 dark:bg-sky-500/10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_12c53882" /></p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{recentLessons.length}</p>
                      </div>
                    </div>

                    {recentLessons.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <Clock className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                        <h4 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_f1a3d7b7" /></h4>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_740cf0a1" />
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
                        {recentLessons.map((item) => (
                          <RecentLessonCard key={`${item.courseId}:${item.lessonId}:${item.openedAt}`} item={item} />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {loading ? (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => <CourseCardSkeleton key={`saved-list-skeleton-${i}`} />)}
                  </div>
                ) : (
                  <section className="learn-surface overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_2f8cb9cd" /></p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_105f711c" /></h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_729ed5fe" />
                        </p>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-right dark:border-amber-500/20 dark:bg-amber-500/10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b5a6a3bb" /></p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{savedLessons.length}</p>
                      </div>
                    </div>

                    {savedLessons.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <Bookmark className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                        <h4 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_da44a717" /></h4>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_9db9275a" />
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
                        {savedLessons.map((item) => (
                          <SavedLessonCard key={`${item.courseId}:${item.lessonId}`} item={item} />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => <CourseCardSkeleton key={`skeleton-enrolled-${i}`} />)}
                  </div>
                ) : enrolledCourses.length === 0 ? (
                  <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center dark:border-slate-800 dark:bg-slate-900/80">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-slate-100"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_e4f46f77" /></h3>
                    <p className="mb-4 text-gray-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_8c17a854" /></p>
                    <button 
                      onClick={() => setActiveTab('explore')}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                    >
                      <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_a01c274b" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-1 sm:gap-4 xl:grid-cols-2 bg-gray-100 dark:bg-gray-950 sm:bg-transparent sm:dark:bg-transparent">
                      {enrolledCourses.map(course => (
                        <CourseCard key={course.id} course={course} enrolled />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MY CREATED COURSES TAB */}
            {activeTab === 'my-created' && (
              <div className="space-y-4">
                {/* Create Course CTA */}
                <div className="learn-surface rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-between">
                  <div>
                    <h3 className="mb-1 font-semibold text-gray-900 dark:text-slate-100"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_25be04f0" /></h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_a050ffba" /></p>
                  </div>
                  <Link
                    href={`/${locale}/learn/create`}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_6068c3e7" />
                  </Link>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => <CourseCardSkeleton key={`skeleton-created-${i}`} />)}
                  </div>
                ) : createdCourses.length === 0 ? (
                  <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center dark:border-slate-800 dark:bg-slate-900/80">
                    <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-slate-100"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_e05a2964" /></h3>
                    <p className="mb-4 text-gray-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_948889a8" /></p>
                    <Link 
                      href={`/${locale}/learn/create`}
                      className="inline-block px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                    >
                      <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_9a4a98af" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {createdCourses.map(course => (
                      <div key={course.id} className="learn-surface overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="relative">
                          <div className={`relative aspect-video ${course.thumbnail ? '' : 'bg-gradient-to-br from-amber-200 to-orange-200'}`}>
                            {course.thumbnail && (
                              <Image src={course.thumbnail} alt={course.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                            )}
                          </div>
                          {/* Status badge */}
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                            course.isPublished 
                              ? 'bg-green-500 text-white' 
                              : 'bg-yellow-500 text-white'
                          }`}>
                            {course.isPublished ? 'Published' : 'Draft'}
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="mb-1 line-clamp-2 font-medium text-gray-900 dark:text-slate-100">{course.title}</h4>
                          <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-slate-400">{course.description}</p>
                          
                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {course.enrolledCount || 0} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_4feaf5da" />
                            </span>
                            <span className="flex items-center gap-1">
                              <PlayCircle className="w-4 h-4" />
                              {course.lessonsCount || 0} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_755ae213" />
                            </span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/${locale}/learn/course/${course.id}`}
                              onMouseEnter={() => prefetchLearnCourseRoute(course.id)}
                              onFocus={() => prefetchLearnCourseRoute(course.id)}
                              className="flex-1 min-w-[88px] text-center py-2 px-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_6ef274df" />
                            </Link>
                            <Link
                              href={`/${locale}/instructor/course/${course.id}/edit`}
                              onMouseEnter={() => prefetchInstructorCourseEditRoute(course.id)}
                              onFocus={() => prefetchInstructorCourseEditRoute(course.id)}
                              className="flex-1 min-w-[88px] text-center py-2 px-3 bg-sky-100 text-sky-700 text-sm font-medium rounded-lg hover:bg-sky-200 transition-colors"
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_99399c7e" />
                            </Link>
                            <Link
                              href={`/${locale}/instructor/course/${course.id}/curriculum`}
                              onMouseEnter={() => prefetchInstructorCurriculumRoute(course.id)}
                              onFocus={() => prefetchInstructorCurriculumRoute(course.id)}
                              className="flex-1 min-w-[88px] text-center py-2 px-3 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-200 transition-colors"
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_a72c0e4c" />
                            </Link>
                            <button
                              onClick={() => {
                                setSelectedSubmissionCourseId(course.id);
                                setActiveTab('submissions');
                              }}
                              className="flex-1 min-w-[120px] text-center py-2 px-3 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_c717398e" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBMISSIONS TAB */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                {createdCourses.length === 0 ? (
                  <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 p-12 text-center dark:border-slate-800 dark:bg-slate-900/80">
                    <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-slate-100"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_45db57f9" /></h3>
                    <p className="mb-4 text-gray-500 dark:text-slate-400"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_155738e5" /></p>
                    <Link
                      href={`/${locale}/learn/create`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_9a4a98af" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 p-4 dark:border-slate-800 dark:bg-slate-900/80 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_4a70b26c" /></label>
                        <select
                          value={selectedSubmissionCourseId}
                          onChange={(event) => setSelectedSubmissionCourseId(event.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-none dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {createdCourses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedSubmissionCourseId && (
                        <Link
                          href={`/${locale}/instructor/course/${selectedSubmissionCourseId}/curriculum`}
                          onMouseEnter={() => prefetchInstructorCurriculumRoute(selectedSubmissionCourseId)}
                          onFocus={() => prefetchInstructorCurriculumRoute(selectedSubmissionCourseId)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl hover:bg-amber-200 transition-colors"
                        >
                          <Book className="w-4 h-4" />
                          <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b2ed0906" />
                        </Link>
                      )}
                    </div>

                    {selectedSubmissionCourseId && (
                      <SubmissionsDashboard
                        key={selectedSubmissionCourseId}
                        courseId={selectedSubmissionCourseId}
                        locale={locale}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {/* LEARNING PATHS TAB */}
            {activeTab === 'paths' && (
              <div className="space-y-4">
                {learningPaths.map(path => (
                  <PathCard key={path.id} path={path} />
                ))}
              </div>
            )}

            {/* CURRICULUM TAB (Exact Mobile App Parity: Grade 7-12 & Subject Discovery) */}
            {activeTab === 'curriculum' && (
              <div className="space-y-5">
                {/* 1. Course Discovery Top Greeting Header */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      សួស្តី! {currentUser?.firstName || 'អ្នកសិក្សា'} 👋
                    </p>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      ស្វែងរកវគ្គសិក្សារបស់អ្នក (Find your course)
                    </h2>
                  </div>
                  <button className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50">
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. World-Class Enterprise Hero Banner Card (Promo Offer Banner) */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0EA5E9] via-[#06A8CC] to-[#0284C7] p-6 text-white shadow-xl shadow-cyan-500/20">
                  {/* Subtle Dark Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />

                  {/* Watermark Trophy Silhouette */}
                  <Trophy className="absolute -right-6 -bottom-6 w-36 h-36 text-white/15 pointer-events-none stroke-1" />

                  <div className="relative z-10 space-y-3 max-w-md">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold">
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>ការផ្តល់ជូនមានកំណត់ (Limited Time Offer)</span>
                    </div>

                    <h3 className="text-3xl font-black tracking-tight text-white">
                      បញ្ចុះតម្លៃ 60% OFF
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>១៤ កុម្ភៈ - ២០ មីនា</span>
                    </div>

                    <button className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#06A8CC] font-bold text-xs shadow-md hover:bg-slate-50 transition-transform active:scale-95">
                      <span>ទទួលបានការផ្តល់ជូន (Claim Offer)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3. Pick Your Grade (Horizontal Scrollable Chips Row) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>ជ្រើសរើសថ្នាក់ (Pick Grade)</span>
                    </h3>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      ថ្នាក់ទី ៧ - ១២
                    </span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {['7', '8', '9', '10', '11', '12'].map((g) => {
                      const selected = selectedGrade === g;
                      const khGrade = g === '12' ? '១២' : g === '11' ? '១១' : g === '10' ? '១០' : g === '9' ? '៩' : g === '8' ? '៨' : '៧';
                      return (
                        <button
                          key={g}
                          onClick={() => setSelectedGrade(g)}
                          className={`flex-1 min-w-[76px] py-3 px-3 rounded-2xl font-bold text-xs transition-all text-center flex flex-col items-center justify-center gap-0.5 border ${
                            selected
                              ? 'bg-gradient-to-br from-[#0EA5E9] to-[#06A8CC] text-white border-transparent shadow-md shadow-cyan-500/20 scale-[1.03]'
                              : 'bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-200 border-gray-200 dark:border-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-[10px] opacity-75 uppercase tracking-wider font-semibold">Grade</span>
                          <span className="text-sm font-black">ថ្នាក់ទី {khGrade}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specialization / Track Selector for High School (Grades 10, 11, 12) */}
                {['10', '11', '12'].includes(selectedGrade) && (
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-gray-800/60 p-1.5 rounded-xl text-xs">
                    <span className="font-semibold px-2 text-slate-600 dark:text-slate-400">ឯកទេស:</span>
                    <div className="flex gap-1 flex-1">
                      {[
                        { id: 'ALL', label: 'ទាំងអស់' },
                        { id: 'SCIENCE', label: 'វិទ្យាសាស្ត្រ (Science)' },
                        { id: 'SOCIAL', label: 'សង្គម (Social)' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTrack(t.id as any)}
                          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                            selectedTrack === t.id
                              ? 'bg-white dark:bg-gray-900 text-[#06A8CC] shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Pick Your Subjects (Grid Cards with Subject Graphics & Lesson Progress Bar) */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    ជ្រើសរើសមុខវិជ្ជា (Pick Subjects)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'math', name: `គណិតវិទ្យា ថ្នាក់ទី${selectedGrade === '12' ? '១២' : selectedGrade === '11' ? '១១' : selectedGrade === '10' ? '១០' : selectedGrade === '9' ? '៩' : selectedGrade === '8' ? '៨' : '៧'}${['10','11','12'].includes(selectedGrade) ? ' (វិទ្យា.)' : ''}`, code: 'MATH', track: 'ALL', icon: Calculator, color: 'from-blue-500 to-indigo-600', topics: 24, progress: 35 },
                      { id: 'phys', name: `រូបវិទ្យា ថ្នាក់ទី${selectedGrade === '12' ? '១២' : selectedGrade === '11' ? '១១' : selectedGrade === '10' ? '១០' : selectedGrade === '9' ? '៩' : selectedGrade === '8' ? '៨' : '៧'}`, code: 'PHYS', track: 'SCIENCE', icon: Zap, color: 'from-purple-500 to-violet-600', topics: 18, progress: 60 },
                      { id: 'chem', name: `គីមីវិទ្យា ថ្នាក់ទី${selectedGrade === '12' ? '១២' : selectedGrade === '11' ? '១១' : selectedGrade === '10' ? '១០' : selectedGrade === '9' ? '៩' : selectedGrade === '8' ? '៨' : '៧'}`, code: 'CHEM', track: 'SCIENCE', icon: Beaker, color: 'from-pink-500 to-rose-600', topics: 20, progress: 20 },
                      { id: 'bio', name: `ជីវវិទ្យា ថ្នាក់ទី${selectedGrade === '12' ? '១២' : selectedGrade === '11' ? '១១' : selectedGrade === '10' ? '១០' : selectedGrade === '9' ? '៩' : selectedGrade === '8' ? '៨' : '៧'}`, code: 'BIO', track: 'SCIENCE', icon: Flame, color: 'from-emerald-500 to-teal-600', topics: 16, progress: 45 },
                      { id: 'khmer', name: `អក្សរសាស្ត្រខ្មែរ ថ្នាក់ទី${selectedGrade === '12' ? '១២' : selectedGrade === '11' ? '១១' : selectedGrade === '10' ? '១០' : selectedGrade === '9' ? '៩' : selectedGrade === '8' ? '៨' : '៧'}`, code: 'KHMER', track: 'ALL', icon: BookOpen, color: 'from-amber-500 to-orange-600', topics: 22, progress: 75 },
                      { id: 'hist', name: `ប្រវត្តិវិទ្យា ថ្នាក់ទី${selectedGrade === '12' ? '១២' : selectedGrade === '11' ? '១១' : selectedGrade === '10' ? '១០' : selectedGrade === '9' ? '៩' : selectedGrade === '8' ? '៨' : '៧'}`, code: 'HIST', track: 'SOCIAL', icon: Globe, color: 'from-orange-500 to-red-600', topics: 15, progress: 10 },
                      { id: 'geog', name: `ភូមិវិទ្យា ថ្នាក់ទី${selectedGrade === '12' ? '១២' : selectedGrade === '11' ? '១១' : selectedGrade === '10' ? '១០' : selectedGrade === '9' ? '៩' : selectedGrade === '8' ? '៨' : '៧'}`, code: 'GEOG', track: 'SOCIAL', icon: Compass, color: 'from-cyan-500 to-blue-600', topics: 14, progress: 50 },
                      { id: 'eng', name: `ភាសាអង់គ្លេស ថ្នាក់ទី${selectedGrade === '12' ? '១២' : selectedGrade === '11' ? '១១' : selectedGrade === '10' ? '១០' : selectedGrade === '9' ? '៩' : selectedGrade === '8' ? '៨' : '៧'}`, code: 'ENG', track: 'ALL', icon: Languages, color: 'from-sky-500 to-indigo-600', topics: 26, progress: 80 },
                    ]
                      .filter(s => selectedTrack === 'ALL' || s.track === 'ALL' || s.track === selectedTrack)
                      .map((s) => {
                        const IconComp = s.icon;
                        return (
                          <div
                            key={s.id}
                            className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                                <IconComp className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300">
                                {s.topics} មេរៀន
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-[#06A8CC] transition-colors leading-snug">
                                {s.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                {s.progress}% ធ្លាប់បានសិក្សា
                              </p>
                            </div>

                            {/* Lesson Progress Bar */}
                            <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#06A8CC]"
                                style={{ width: `${s.progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 5. Start Learning Action Button (Cyan Gradient CTA Button) */}
                <div className="pt-2">
                  <button className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#0EA5E9] to-[#06A8CC] text-white font-bold text-base shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2">
                    <span>ចាប់ផ្ដើមរៀន (Start Learning)</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* ============================================ */}
          {/* RIGHT SIDEBAR */}
          {/* ============================================ */}
          <aside className="reveal-item reveal-4 hidden space-y-4 lg:col-span-3 lg:block">
            {/* Popular This Week */}
            <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 p-5 dark:border-slate-800 dark:bg-slate-900/80">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-slate-100">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_435ac93e" />
              </h3>
              <div className="space-y-3">
                {featuredCourses.slice(0, 3).map((course, i) => (
                  <div key={course.id} className="flex items-start gap-3 group cursor-pointer">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white transition-colors group-hover:text-amber-600 dark:text-slate-100 dark:group-hover:text-amber-300">
                        {course.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{(course.enrolledCount / 1000).toFixed(1)}<AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_b843de3c" /></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 p-5 dark:border-slate-800 dark:bg-slate-900/80">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-slate-100">
                <Award className="w-4 h-4 text-amber-600" />
                <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_a681242d" />
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['🎯', '📚', '🏆'].map((emoji, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-amber-50 flex items-center justify-center text-2xl">
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-slate-300">
                <span className="font-medium">3</span> <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_e412664f" /> <span className="font-medium">15</span> <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_03561be8" />
              </p>
            </div>

            {/* Weekly Goal */}
            <div className="premium-banner rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 p-5 text-white">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Target className="w-4 h-4" />
                  <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_8c262c4b" />
                </h3>
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-sm text-white/80 mb-2"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_43ae6add" /></p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white dark:bg-none dark:bg-gray-900/30 rounded-full">
                  <div className="w-3/5 h-full bg-white dark:bg-none dark:bg-gray-900 rounded-full" />
                </div>
                <span className="text-sm font-medium"><AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_590de898" /></span>
              </div>
            </div>

            {/* Study Streak */}
            <div className="learn-surface rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900/95 p-5 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-slate-100">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_0e9d8ae9" />
                </h3>
                <span className="text-lg font-bold text-orange-500">{stats.currentStreak} <AutoI18nText i18nKey="auto.web.app_locale_learn_page.k_e9854d0f" /></span>
              </div>
              <div className="flex justify-between">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      i < stats.currentStreak ? 'bg-orange-100' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {i < stats.currentStreak ? (
                        <CheckCircle className="w-4 h-4 text-orange-500" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
      </div>
      <style jsx global>{`
        .learn-stage .reveal-item {
          animation: learnReveal 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .learn-stage .reveal-1 { animation-delay: 50ms; }
        .learn-stage .reveal-2 { animation-delay: 100ms; }
        .learn-stage .reveal-3 { animation-delay: 140ms; }
        .learn-stage .reveal-4 { animation-delay: 190ms; }

        .learn-stage .learn-surface,
        .learn-stage .learn-hero,
        .learn-stage .learn-course-card {
          transition: box-shadow 260ms ease, transform 260ms ease, border-color 260ms ease;
        }

        .learn-stage .learn-surface:hover,
        .learn-stage .learn-hero:hover {
          border-color: rgba(245, 158, 11, 0.35);
          box-shadow: 0 18px 46px rgba(15, 23, 42, 0.12);
          transform: translateY(-2px);
        }

        .learn-stage .learn-course-card:hover {
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);
        }

        .learn-stage .premium-banner {
          position: relative;
          overflow: hidden;
        }

        .learn-stage .premium-banner::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 35%);
        }

        .learn-stage .premium-cta {
          box-shadow: 0 10px 24px rgba(245, 158, 11, 0.28);
        }

        .learn-stage .premium-cta:hover {
          box-shadow: 0 14px 34px rgba(245, 158, 11, 0.35);
        }

        @keyframes learnReveal {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .learn-stage .reveal-item {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
