'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';

// ============================================
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
  createdAt: string;
  updatedAt: string;
}

interface EnrolledCourse extends Course {
  progress: number;
  completedLessons: number;
  lastAccessedAt: string;
  enrolledAt: string;
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

// ============================================
// CONSTANTS & SAMPLE DATA
// ============================================

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

const CATEGORIES = [
  'All', 'Programming', 'Data Science', 'Machine Learning', 'Mobile Development',
  'Design', 'Database', 'Cloud Computing', 'Mathematics', 'Science', 
  'Languages', 'Business', 'Technology', 'Personal Development'
];

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SUBJECT_SERVICE = process.env.NEXT_PUBLIC_SUBJECT_SERVICE_URL || 'http://localhost:3006';
const GRADE_SERVICE = process.env.NEXT_PUBLIC_GRADE_SERVICE_URL || 'http://localhost:3007';
const FEED_SERVICE = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

// ============================================
// MAIN COMPONENT
// ============================================

export default function LearnHubPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'explore' | 'my-courses' | 'curriculum' | 'paths'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('');
  
  // User State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isStudent, setIsStudent] = useState(false);
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
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

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);

  // Fetch courses from API
  const fetchCourses = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/courses`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, [getAuthToken]);

  // Fetch enrolled courses
  const fetchEnrolledCourses = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/courses/my-courses`, {
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
  }, [getAuthToken]);

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
    setTimeout(() => setLoading(false), 500);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchCourses();
      fetchEnrolledCourses();
      fetchLearningPaths();
      fetchSubjects();
      fetchGrades();
    }
  }, [currentUser, fetchCourses, fetchEnrolledCourses, fetchLearningPaths, fetchSubjects, fetchGrades]);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  // Enroll in course
  const handleEnroll = async (courseId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        // Refresh enrolled courses
        fetchEnrolledCourses();
        fetchCourses();
      }
    } catch (err) {
      console.error('Error enrolling in course:', err);
    }
  };

  // Enroll in learning path
  const handleEnrollPath = async (pathId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${FEED_SERVICE}/learning-paths/paths/${pathId}/enroll`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        fetchLearningPaths();
      }
    } catch (err) {
      console.error('Error enrolling in path:', err);
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

  // Course Card
  const CourseCard = ({ course, enrolled }: { course: Course | EnrolledCourse; enrolled?: boolean }) => {
    const Icon = CATEGORY_ICONS[course.category] || BookOpen;
    const enrolledCourse = enrolled ? course as EnrolledCourse : null;
    
    return (
      <Link 
        href={`/${locale}/learn/course/${course.id}`}
        className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-amber-200 transition-all group"
      >
        {/* Thumbnail */}
        <div className="h-36 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 relative">
          {course.thumbnail ? (
            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-14 h-14 text-amber-300" />
            </div>
          )}
          
          {/* Progress bar for enrolled */}
          {enrolledCourse && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${enrolledCourse.progress}%` }}
              />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {course.isFree && (
              <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">Free</span>
            )}
            {course.isNew && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">New</span>
            )}
          </div>
          
          {/* Play button overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <Play className="w-5 h-5 text-amber-600 ml-0.5" />
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_COLORS[course.level]}`}>
              {course.level.replace('_', ' ')}
            </span>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-medium text-gray-700">{course.rating}</span>
            </div>
          </div>
          
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-amber-600 transition-colors">
            {course.title}
          </h3>
          
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
          
          {/* Instructor */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-xs font-medium text-amber-700">
              {course.instructor.name.charAt(0)}
            </div>
            <span className="text-xs text-gray-600">{course.instructor.name}</span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-100">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {course.duration}h
            </span>
            <span className="flex items-center gap-1">
              <PlayCircle className="w-3.5 h-3.5" />
              {course.lessonsCount} lessons
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {(course.enrolledCount / 1000).toFixed(1)}k
            </span>
          </div>
          
          {/* Progress for enrolled */}
          {enrolledCourse && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{enrolledCourse.progress}% complete</span>
                <span className="text-gray-500">{enrolledCourse.completedLessons}/{course.lessonsCount}</span>
              </div>
              <button className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                Continue Learning
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
              className="w-full mt-3 px-4 py-2 border-2 border-amber-500 text-amber-600 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors"
            >
              Enroll Now - Free
            </button>
          )}
        </div>
      </Link>
    );
  };

  // Learning Path Card
  const PathCard = ({ path }: { path: LearningPath }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-amber-200 transition-all">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
          <Route className="w-7 h-7 text-purple-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{path.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{path.description}</p>
            </div>
            {path.isFeatured && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex-shrink-0">
                Featured
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {path.coursesCount} courses
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {path.totalDuration}h total
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {(path.enrolledCount / 1000).toFixed(1)}k enrolled
            </span>
          </div>
          
          <button className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors">
            Start Learning Path
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
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{subject.name}</h4>
            <p className="text-xs text-gray-500">Grade {subject.grade} • {subject.weeklyHours}h/week</p>
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

  if (loading) {
    return <FeedZoomLoader isLoading={true} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation />

      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* ============================================ */}
          {/* LEFT SIDEBAR */}
          {/* ============================================ */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4">
            {/* User Learning Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-lg font-bold text-amber-700">
                  {currentUser?.firstName?.charAt(0) || 'L'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {currentUser?.firstName || 'Learner'}
                  </p>
                  <p className="text-xs text-gray-500">Keep learning! 🔥</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-amber-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-amber-600">{stats.enrolledCourses}</p>
                  <p className="text-xs text-gray-600">Enrolled</p>
                </div>
                <div className="p-2.5 bg-green-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-600">{stats.completedCourses}</p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-600">{stats.hoursLearned}h</p>
                  <p className="text-xs text-gray-600">Learned</p>
                </div>
                <div className="p-2.5 bg-orange-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-orange-600">{stats.currentStreak}🔥</p>
                  <p className="text-xs text-gray-600">Day Streak</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Vertical) */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Learning</h3>
              </div>
              <nav className="p-2">
                {[
                  { id: 'explore', label: 'Explore Courses', icon: Compass, desc: 'Discover new skills' },
                  { id: 'my-courses', label: 'My Courses', icon: BookOpen, desc: 'Continue learning' },
                  { id: 'paths', label: 'Learning Paths', icon: Route, desc: 'Guided journeys' },
                  ...(isStudent ? [{ id: 'curriculum', label: 'My Curriculum', icon: GraduationCap, desc: 'School subjects' }] : []),
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-amber-600' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-sm font-medium ${activeTab === tab.id ? 'text-amber-700' : 'text-gray-700'}`}>
                        {tab.label}
                      </p>
                      <p className="text-xs text-gray-500">{tab.desc}</p>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Categories Filter */}
            {activeTab === 'explore' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</h3>
                </div>
                <nav className="p-2 max-h-64 overflow-y-auto">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        selectedCategory === cat
                          ? 'bg-amber-50 text-amber-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
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
          <main className="lg:col-span-6">
            {/* Search & Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses, topics, skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              {/* Mobile Tab Switcher */}
              <div className="flex gap-1 mt-4 p-1 bg-gray-100 rounded-xl lg:hidden">
                {[
                  { id: 'explore', label: 'Explore', icon: Compass },
                  { id: 'my-courses', label: 'My Courses', icon: BookOpen },
                  { id: 'paths', label: 'Paths', icon: Route },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.id ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Learning Banner */}
            {continueLearning && activeTab !== 'curriculum' && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-5 mb-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80 mb-1">Continue where you left off</p>
                    <h3 className="font-semibold text-lg">{continueLearning.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/90">
                      <span>{continueLearning.progress}% complete</span>
                      <span>•</span>
                      <span>{continueLearning.completedLessons} of {continueLearning.lessonsCount} lessons</span>
                    </div>
                  </div>
                  <button className="px-5 py-2.5 bg-white text-amber-600 font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                </div>
                <div className="mt-3 h-2 bg-white/30 rounded-full">
                  <div 
                    className="h-full bg-white rounded-full"
                    style={{ width: `${continueLearning.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* EXPLORE TAB */}
            {activeTab === 'explore' && (
              <div className="space-y-4">
                {/* Featured Banner */}
                {selectedCategory === 'All' && !searchQuery && (
                  <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6 text-white mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5" />
                      <span className="text-sm font-medium text-white/80">Featured</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Start Your Learning Journey</h2>
                    <p className="text-white/80 mb-4">Explore {courses.length}+ free courses from expert instructors</p>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-gray-100 transition-colors">
                        Browse All Courses
                      </button>
                    </div>
                  </div>
                )}

                {/* Course Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>

                {filteredCourses.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                    <p className="text-gray-500">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            )}

            {/* MY COURSES TAB */}
            {activeTab === 'my-courses' && (
              <div className="space-y-4">
                {enrolledCourses.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No enrolled courses yet</h3>
                    <p className="text-gray-500 mb-4">Start learning by exploring our course catalog</p>
                    <button 
                      onClick={() => setActiveTab('explore')}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                    >
                      Explore Courses
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {enrolledCourses.map(course => (
                      <CourseCard key={course.id} course={course} enrolled />
                    ))}
                  </div>
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

            {/* CURRICULUM TAB (Students only) */}
            {activeTab === 'curriculum' && (
              <div className="space-y-4">
                {!isStudent ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">School Curriculum</h3>
                    <p className="text-gray-500">This section is for enrolled students. Explore our courses instead!</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
                    <p className="text-gray-500">Your curriculum will appear here</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Your School Subjects</h3>
                      <div className="space-y-2">
                        {subjects.slice(0, 10).map(subject => (
                          <SubjectCard key={subject.id} subject={subject} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </main>

          {/* ============================================ */}
          {/* RIGHT SIDEBAR */}
          {/* ============================================ */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4">
            {/* Popular This Week */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Trending Courses
              </h3>
              <div className="space-y-3">
                {featuredCourses.slice(0, 3).map((course, i) => (
                  <div key={course.id} className="flex items-start gap-3 group cursor-pointer">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-100 text-gray-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                        {course.title}
                      </p>
                      <p className="text-xs text-gray-500">{(course.enrolledCount / 1000).toFixed(1)}k learners</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Your Achievements
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['🎯', '📚', '🏆'].map((emoji, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-amber-50 flex items-center justify-center text-2xl">
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 text-center">
                <span className="font-medium">3</span> of <span className="font-medium">15</span> unlocked
              </p>
            </div>

            {/* Weekly Goal */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Weekly Goal
                </h3>
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-sm text-white/80 mb-2">Learn 5 hours this week</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/30 rounded-full">
                  <div className="w-3/5 h-full bg-white rounded-full" />
                </div>
                <span className="text-sm font-medium">3/5h</span>
              </div>
            </div>

            {/* Study Streak */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Study Streak
                </h3>
                <span className="text-lg font-bold text-orange-500">{stats.currentStreak} days</span>
              </div>
              <div className="flex justify-between">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      i < stats.currentStreak ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      {i < stats.currentStreak ? (
                        <CheckCircle className="w-4 h-4 text-orange-500" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
