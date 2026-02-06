'use client';

import { useState, useEffect, useCallback, createElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Play,
  Clock,
  Target,
  Trophy,
  Star,
  TrendingUp,
  Zap,
  CheckCircle,
  Lock,
  ChevronRight,
  Search,
  Filter,
  Bookmark,
  BarChart3,
  Award,
  Flame,
  Calendar,
  Users,
  FileText,
  Video,
  Headphones,
  PenTool,
  Brain,
  Lightbulb,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';

// Learning path/course interface
interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  estimatedHours: number;
  lessonsCount: number;
  completedLessons: number;
  progress: number;
  thumbnail?: string;
  instructor: {
    name: string;
    avatar?: string;
  };
  rating: number;
  enrolledCount: number;
  tags: string[];
  isEnrolled: boolean;
  isFeatured: boolean;
}

// Study session interface
interface StudySession {
  id: string;
  subject: string;
  topic: string;
  startTime: string;
  duration: number;
  type: 'READING' | 'VIDEO' | 'PRACTICE' | 'QUIZ' | 'PROJECT';
}

// Achievement interface
interface LearningAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number;
  target: number;
}

const DIFFICULTY_COLORS = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-blue-100 text-blue-700',
  ADVANCED: 'bg-purple-100 text-purple-700',
  EXPERT: 'bg-red-100 text-red-700',
};

const CATEGORY_ICONS: Record<string, any> = {
  'Mathematics': Target,
  'Science': Brain,
  'Languages': BookOpen,
  'Programming': PenTool,
  'Arts': Sparkles,
  'History': FileText,
  'Music': Headphones,
};

// Sample data for demonstration
const SAMPLE_PATHS: LearningPath[] = [
  {
    id: '1',
    title: 'Advanced Mathematics Fundamentals',
    description: 'Master calculus, algebra, and statistics with comprehensive lessons and practice problems.',
    category: 'Mathematics',
    difficulty: 'INTERMEDIATE',
    estimatedHours: 40,
    lessonsCount: 24,
    completedLessons: 8,
    progress: 33,
    instructor: { name: 'Dr. Sarah Chen' },
    rating: 4.8,
    enrolledCount: 1250,
    tags: ['Calculus', 'Algebra', 'Statistics'],
    isEnrolled: true,
    isFeatured: true,
  },
  {
    id: '2',
    title: 'Introduction to Python Programming',
    description: 'Learn Python from scratch with hands-on projects and real-world applications.',
    category: 'Programming',
    difficulty: 'BEGINNER',
    estimatedHours: 30,
    lessonsCount: 20,
    completedLessons: 0,
    progress: 0,
    instructor: { name: 'Prof. Michael Ross' },
    rating: 4.9,
    enrolledCount: 3420,
    tags: ['Python', 'Coding', 'Projects'],
    isEnrolled: false,
    isFeatured: true,
  },
  {
    id: '3',
    title: 'Physics: Mechanics & Thermodynamics',
    description: 'Understand the fundamental principles of physics through interactive simulations.',
    category: 'Science',
    difficulty: 'INTERMEDIATE',
    estimatedHours: 35,
    lessonsCount: 18,
    completedLessons: 18,
    progress: 100,
    instructor: { name: 'Dr. James Wilson' },
    rating: 4.7,
    enrolledCount: 890,
    tags: ['Physics', 'Mechanics', 'Labs'],
    isEnrolled: true,
    isFeatured: false,
  },
  {
    id: '4',
    title: 'English Literature & Writing',
    description: 'Improve your writing skills and explore classic and modern literature.',
    category: 'Languages',
    difficulty: 'BEGINNER',
    estimatedHours: 25,
    lessonsCount: 16,
    completedLessons: 4,
    progress: 25,
    instructor: { name: 'Ms. Emily Parker' },
    rating: 4.6,
    enrolledCount: 670,
    tags: ['Writing', 'Literature', 'Essays'],
    isEnrolled: true,
    isFeatured: false,
  },
];

const SAMPLE_ACHIEVEMENTS: LearningAchievement[] = [
  { id: '1', title: 'First Steps', description: 'Complete your first lesson', icon: '🎯', progress: 1, target: 1, unlockedAt: '2026-01-15' },
  { id: '2', title: 'Week Warrior', description: 'Study for 7 consecutive days', icon: '🔥', progress: 5, target: 7 },
  { id: '3', title: 'Knowledge Seeker', description: 'Complete 10 lessons', icon: '📚', progress: 8, target: 10 },
  { id: '4', title: 'Quiz Master', description: 'Score 100% on 5 quizzes', icon: '⭐', progress: 3, target: 5 },
];

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-learning' | 'explore' | 'achievements'>('my-learning');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  
  // Learning stats
  const [stats, setStats] = useState({
    totalHours: 42,
    currentStreak: 5,
    lessonsCompleted: 30,
    coursesCompleted: 2,
    pointsEarned: 1250,
    rank: 12,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const schoolStr = localStorage.getItem('school');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    }
    
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  const enrolledPaths = SAMPLE_PATHS.filter(p => p.isEnrolled);
  const explorePaths = SAMPLE_PATHS.filter(p => !p.isEnrolled || p.isFeatured);
  const continueLearning = enrolledPaths.find(p => p.progress > 0 && p.progress < 100);

  // Course Card Component
  const CourseCard = ({ path, compact = false }: { path: LearningPath; compact?: boolean }) => {
    const CategoryIcon = CATEGORY_ICONS[path.category] || BookOpen;
    
    return (
      <Link 
        href={`/${locale}/learn/${path.id}`}
        className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-amber-200 transition-all group"
      >
        {/* Thumbnail / Header */}
        <div className={`${compact ? 'h-24' : 'h-32'} bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 relative`}>
          {path.thumbnail ? (
            <img src={path.thumbnail} alt={path.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CategoryIcon className="w-12 h-12 text-amber-300" />
            </div>
          )}
          
          {/* Progress overlay for enrolled courses */}
          {path.isEnrolled && path.progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${path.progress}%` }}
              />
            </div>
          )}
          
          {/* Featured badge */}
          {path.isFeatured && (
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full">
                <Sparkles className="w-3 h-3" />
                Featured
              </span>
            </div>
          )}
          
          {/* Completed badge */}
          {path.progress === 100 && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                <CheckCircle className="w-3 h-3" />
                Completed
              </span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Category & Difficulty */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">{path.category}</span>
            <span className="text-gray-300">•</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[path.difficulty]}`}>
              {path.difficulty}
            </span>
          </div>
          
          {/* Title */}
          <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2 mb-1">
            {path.title}
          </h3>
          
          {/* Description */}
          {!compact && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
              {path.description}
            </p>
          )}
          
          {/* Instructor */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center">
              <span className="text-[10px] text-amber-700 font-medium">
                {path.instructor.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <span className="text-xs text-gray-500">{path.instructor.name}</span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {path.estimatedHours}h
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {path.lessonsCount} lessons
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-medium text-gray-600">{path.rating}</span>
            </div>
          </div>
          
          {/* Progress or Enroll */}
          {path.isEnrolled ? (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {path.completedLessons}/{path.lessonsCount} lessons
                </span>
                <span className="text-xs font-semibold text-amber-600">{path.progress}% complete</span>
              </div>
            </div>
          ) : (
            <button className="w-full mt-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors">
              Start Learning
            </button>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      <FeedZoomLoader 
        isLoading={loading} 
        onAnimationComplete={() => setShowContent(true)}
        minimumDuration={600}
      />
      
      {showContent && (
        <div className="min-h-screen bg-gray-50">
          <UnifiedNavigation user={currentUser} school={school} onLogout={handleLogout} />
          
          {/* 3-column layout */}
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Sidebar - Learning Stats */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-20 space-y-3">
                  {/* Learning Overview Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="h-16 bg-gradient-to-r from-amber-500 to-orange-500 relative">
                      <BookOpen className="absolute bottom-2 right-3 w-6 h-6 text-white/30" />
                    </div>
                    <div className="p-4">
                      <h2 className="font-bold text-gray-900">My Learning</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Track your progress</p>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <p className="text-lg font-bold text-gray-900">{stats.currentStreak}</p>
                          </div>
                          <p className="text-[10px] text-gray-500">Day Streak</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <p className="text-lg font-bold text-gray-900">{stats.totalHours}</p>
                          </div>
                          <p className="text-[10px] text-gray-500">Hours Learned</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <p className="text-lg font-bold text-gray-900">{stats.lessonsCompleted}</p>
                          </div>
                          <p className="text-[10px] text-gray-500">Lessons Done</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="w-4 h-4 text-purple-500" />
                            <p className="text-lg font-bold text-gray-900">{stats.pointsEarned}</p>
                          </div>
                          <p className="text-[10px] text-gray-500">XP Earned</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Daily Goal */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-gray-900">Daily Goal</h3>
                      <span className="text-xs text-amber-600 font-medium">30 min</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: '60%' }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">18 min completed today</p>
                  </div>
                  
                  {/* Categories */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="font-semibold text-sm text-gray-900">Categories</h3>
                    </div>
                    <nav className="py-1">
                      {['All', 'Mathematics', 'Science', 'Languages', 'Programming', 'Arts'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                            (cat === 'All' && !selectedCategory) || selectedCategory === cat
                              ? 'bg-amber-50 text-amber-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {cat === 'All' ? <Sparkles className="w-4 h-4" /> : 
                           CATEGORY_ICONS[cat] ? createElement(CATEGORY_ICONS[cat], { className: 'w-4 h-4' }) : 
                           <BookOpen className="w-4 h-4" />}
                          {cat}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </aside>
              
              {/* Main Content */}
              <main className="lg:col-span-6">
                {/* Continue Learning Card */}
                {continueLearning && activeTab === 'my-learning' && (
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 mb-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-amber-100 text-xs font-medium mb-1">Continue Learning</p>
                        <h3 className="font-bold text-lg mb-1">{continueLearning.title}</h3>
                        <p className="text-amber-100 text-sm">
                          {continueLearning.completedLessons}/{continueLearning.lessonsCount} lessons • {continueLearning.progress}% complete
                        </p>
                      </div>
                      <Link 
                        href={`/${locale}/learn/${continueLearning.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg font-semibold text-sm hover:bg-amber-50 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Resume
                      </Link>
                    </div>
                    <div className="mt-3 w-full h-2 bg-white/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full"
                        style={{ width: `${continueLearning.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => setActiveTab('my-learning')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'my-learning'
                          ? 'text-amber-600 border-b-2 border-amber-500'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      My Courses
                    </button>
                    <button
                      onClick={() => setActiveTab('explore')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'explore'
                          ? 'text-amber-600 border-b-2 border-amber-500'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Explore
                    </button>
                    <button
                      onClick={() => setActiveTab('achievements')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'achievements'
                          ? 'text-amber-600 border-b-2 border-amber-500'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Trophy className="w-4 h-4" />
                      Achievements
                    </button>
                  </div>
                  
                  {/* Search */}
                  {activeTab !== 'achievements' && (
                    <div className="p-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search courses..."
                          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Content */}
                {activeTab === 'my-learning' && (
                  <div className="space-y-4">
                    {enrolledPaths.length === 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="w-7 h-7 text-amber-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">No courses yet</h3>
                        <p className="text-sm text-gray-500 mb-4">Start your learning journey today</p>
                        <button
                          onClick={() => setActiveTab('explore')}
                          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600"
                        >
                          Explore Courses
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {enrolledPaths.map((path) => (
                          <CourseCard key={path.id} path={path} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'explore' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {explorePaths.map((path) => (
                      <CourseCard key={path.id} path={path} compact />
                    ))}
                  </div>
                )}
                
                {activeTab === 'achievements' && (
                  <div className="space-y-3">
                    {SAMPLE_ACHIEVEMENTS.map((achievement) => (
                      <div 
                        key={achievement.id}
                        className={`bg-white rounded-xl border border-gray-200 p-4 ${
                          achievement.unlockedAt ? '' : 'opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            achievement.unlockedAt 
                              ? 'bg-amber-100' 
                              : 'bg-gray-100'
                          }`}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                              {achievement.unlockedAt && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{achievement.description}</p>
                            {!achievement.unlockedAt && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-500">Progress</span>
                                  <span className="font-medium text-gray-700">{achievement.progress}/{achievement.target}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-amber-500 rounded-full"
                                    style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </main>
              
              {/* Right Sidebar */}
              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-20 space-y-3">
                  {/* Leaderboard */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h3 className="font-semibold text-sm text-gray-900">Leaderboard</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      {[
                        { rank: 1, name: 'Alice Chen', xp: 2850, avatar: '👩‍🎓' },
                        { rank: 2, name: 'Bob Smith', xp: 2340, avatar: '👨‍💻' },
                        { rank: 3, name: 'Carol Lee', xp: 2100, avatar: '👩‍🔬' },
                      ].map((user) => (
                        <div key={user.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            user.rank === 1 ? 'bg-amber-100 text-amber-700' :
                            user.rank === 2 ? 'bg-gray-100 text-gray-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {user.rank}
                          </span>
                          <span className="text-lg">{user.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.xp.toLocaleString()} XP</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700">
                            {stats.rank}
                          </span>
                          <span className="text-lg">🎓</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">You</p>
                            <p className="text-xs text-amber-600">{stats.pointsEarned.toLocaleString()} XP</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Suggested Courses */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <h3 className="font-semibold text-sm text-gray-900">Suggested</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      {SAMPLE_PATHS.filter(p => !p.isEnrolled).slice(0, 2).map((path) => (
                        <Link
                          key={path.id}
                          href={`/${locale}/learn/${path.id}`}
                          className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{path.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{path.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              {path.rating}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                      <Link href="#" className="hover:text-gray-600">About</Link>
                      <Link href="#" className="hover:text-gray-600">Help</Link>
                      <Link href="#" className="hover:text-gray-600">Privacy</Link>
                      <Link href="#" className="hover:text-gray-600">Terms</Link>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">© 2026 Stunity</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
