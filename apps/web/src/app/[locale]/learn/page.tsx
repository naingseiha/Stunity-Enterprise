'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ChevronDown,
  Book,
  ClipboardList,
  LineChart,
  Percent,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import FeedZoomLoader from '@/components/feed/FeedZoomLoader';

// Interfaces
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
  annualHours: number;
  maxScore: number;
  coefficient: number;
  isActive: boolean;
  _count?: {
    grades: number;
    subjectTeachers: number;
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
  academicYear: string;
  subject?: Subject;
  createdAt: string;
}

interface GradeSummary {
  subjectId: string;
  subjectName: string;
  averageScore: number;
  averagePercentage: number;
  gradeCount: number;
  trend: 'up' | 'down' | 'stable';
  lastGrade?: Grade;
}

interface LearningStats {
  totalSubjects: number;
  completedAssessments: number;
  averageScore: number;
  currentStreak: number;
  weeklyStudyHours: number;
  rank?: number;
  totalStudents?: number;
}

// Subject category icons
const SUBJECT_ICONS: Record<string, any> = {
  'Core': BookOpen,
  'Optional': Book,
  'Elective': Palette,
  'Mathematics': Calculator,
  'Science': Beaker,
  'Language': Languages,
  'Social': Globe,
  'Arts': Music,
  'Physical': Dumbbell,
};

const GRADE_COLORS: Record<string, string> = {
  'A': 'text-green-600 bg-green-100',
  'B': 'text-blue-600 bg-blue-100',
  'C': 'text-amber-600 bg-amber-100',
  'D': 'text-orange-600 bg-orange-100',
  'E': 'text-red-500 bg-red-100',
  'F': 'text-red-700 bg-red-200',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SUBJECT_SERVICE = process.env.NEXT_PUBLIC_SUBJECT_SERVICE_URL || 'http://localhost:3006';
const GRADE_SERVICE = process.env.NEXT_PUBLIC_GRADE_SERVICE_URL || 'http://localhost:3007';

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subjects' | 'grades' | 'progress'>('subjects');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  
  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [myGrades, setMyGrades] = useState<Grade[]>([]);
  const [gradeSummaries, setGradeSummaries] = useState<GradeSummary[]>([]);
  const [stats, setStats] = useState<LearningStats>({
    totalSubjects: 0,
    completedAssessments: 0,
    averageScore: 0,
    currentStreak: 7,
    weeklyStudyHours: 12,
    rank: 15,
    totalStudents: 120,
  });
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get auth token
  const getAuthToken = useCallback(() => {
    return TokenManager.getAccessToken();
  }, []);

  // Fetch subjects from API
  const fetchSubjects = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const queryParams = new URLSearchParams();
      if (selectedGrade) queryParams.append('grade', selectedGrade);
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (searchQuery) queryParams.append('search', searchQuery);
      queryParams.append('isActive', 'true');

      const response = await fetch(`${SUBJECT_SERVICE}/subjects?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
        setStats(prev => ({ ...prev, totalSubjects: data.length }));
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  }, [getAuthToken, selectedGrade, selectedCategory, searchQuery]);

  // Fetch grades for current user
  const fetchMyGrades = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token || !currentUser?.id) return;

      const response = await fetch(`${GRADE_SERVICE}/grades/student/${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyGrades(data.grades || data || []);
        
        // Calculate stats from grades
        if (Array.isArray(data.grades || data)) {
          const grades = data.grades || data;
          const totalScore = grades.reduce((sum: number, g: Grade) => sum + (g.percentage || 0), 0);
          const avgScore = grades.length > 0 ? totalScore / grades.length : 0;
          setStats(prev => ({
            ...prev,
            completedAssessments: grades.length,
            averageScore: Math.round(avgScore),
          }));
          
          // Group by subject for summaries
          const subjectGroups: Record<string, Grade[]> = {};
          grades.forEach((g: Grade) => {
            if (!subjectGroups[g.subjectId]) subjectGroups[g.subjectId] = [];
            subjectGroups[g.subjectId].push(g);
          });
          
          const summaries: GradeSummary[] = Object.entries(subjectGroups).map(([subjectId, gradeList]) => {
            const avgPct = gradeList.reduce((s, g) => s + (g.percentage || 0), 0) / gradeList.length;
            const sorted = [...gradeList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const latest = sorted[0];
            const previous = sorted[1];
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (latest && previous) {
              if (latest.percentage > previous.percentage) trend = 'up';
              else if (latest.percentage < previous.percentage) trend = 'down';
            }
            return {
              subjectId,
              subjectName: latest?.subject?.name || 'Unknown',
              averageScore: gradeList.reduce((s, g) => s + g.score, 0) / gradeList.length,
              averagePercentage: avgPct,
              gradeCount: gradeList.length,
              trend,
              lastGrade: latest,
            };
          });
          setGradeSummaries(summaries);
        }
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
      if (userStr) setCurrentUser(JSON.parse(userStr));
      if (schoolStr) setSchool(JSON.parse(schoolStr));
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubjects(), fetchMyGrades()]);
      setLoading(false);
    };
    
    if (currentUser) {
      loadData();
    } else {
      // Still load subjects even without user
      fetchSubjects().then(() => setLoading(false));
    }
  }, [currentUser, fetchSubjects, fetchMyGrades]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSubjects(), fetchMyGrades()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/login`);
  };

  // Get unique grades from subjects
  const gradeOptions = [...new Set(subjects.map(s => s.grade))].sort();
  const categoryOptions = [...new Set(subjects.map(s => s.category))].filter(Boolean);

  // Subject Card Component
  const SubjectCard = ({ subject }: { subject: Subject }) => {
    const Icon = SUBJECT_ICONS[subject.category] || BookOpen;
    const mySummary = gradeSummaries.find(s => s.subjectId === subject.id);
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-amber-200 transition-all">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-1">{subject.name}</h3>
                <p className="text-sm text-gray-500">{subject.nameKh}</p>
              </div>
              {mySummary && (
                <div className={`px-2 py-1 rounded-lg text-sm font-bold ${GRADE_COLORS[mySummary.lastGrade?.gradeLevel || 'C']}`}>
                  {mySummary.lastGrade?.gradeLevel || '-'}
                </div>
              )}
            </div>
            
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                Grade {subject.grade}
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded">
                {subject.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {subject.weeklyHours}h/week
              </span>
            </div>
            
            {mySummary && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Average: {Math.round(mySummary.averagePercentage)}%</span>
                  <span className="flex items-center gap-1">
                    {mySummary.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                    {mySummary.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                    <span className={mySummary.trend === 'up' ? 'text-green-600' : mySummary.trend === 'down' ? 'text-red-600' : 'text-gray-500'}>
                      {mySummary.gradeCount} assessments
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                    style={{ width: `${mySummary.averagePercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Grade Entry Card
  const GradeCard = ({ grade }: { grade: Grade }) => {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${GRADE_COLORS[grade.gradeLevel]}`}>
              {grade.gradeLevel}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{grade.subject?.name || 'Subject'}</h4>
              <p className="text-xs text-gray-500">{grade.month} • {grade.semester}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-900">{grade.score}/{grade.maxScore}</div>
            <div className="text-sm text-gray-500">{Math.round(grade.percentage)}%</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <FeedZoomLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation
        currentUser={currentUser}
        school={school}
        onLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Stats & Quick Actions */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Learning Stats Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">My Progress</h2>
                <button 
                  onClick={handleRefresh}
                  className={`p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-gray-600">Subjects</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.totalSubjects}</p>
                </div>
                
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-gray-600">Assessments</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.completedAssessments}</p>
                </div>
                
                <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-600">Average</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.averageScore}%</p>
                </div>
                
                <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-gray-600">Rank</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">#{stats.rank}</p>
                  <p className="text-xs text-gray-500">of {stats.totalStudents}</p>
                </div>
              </div>
              
              {/* Streak */}
              <div className="mt-4 p-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5" />
                    <span className="font-medium">{stats.currentStreak} Day Streak!</span>
                  </div>
                  <span className="text-2xl">🔥</span>
                </div>
                <p className="text-xs text-white/80 mt-1">Keep learning daily to maintain your streak</p>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  Filter by Grade
                </h3>
              </div>
              <div className="p-2">
                <button
                  onClick={() => setSelectedGrade('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !selectedGrade ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Grades
                </button>
                {gradeOptions.map(grade => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedGrade === grade ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Grade {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  Categories
                </h3>
              </div>
              <div className="p-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !selectedCategory ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {categoryOptions.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-6">
            {/* Header with Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4 p-1 bg-gray-100 rounded-xl">
                {[
                  { id: 'subjects', label: 'Subjects', icon: BookOpen },
                  { id: 'grades', label: 'My Grades', icon: BarChart3 },
                  { id: 'progress', label: 'Progress', icon: LineChart },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Content based on active tab */}
            {activeTab === 'subjects' && (
              <div className="space-y-4">
                {subjects.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
                    <p className="text-gray-500">
                      {searchQuery || selectedGrade || selectedCategory
                        ? 'Try adjusting your filters'
                        : 'Subjects will appear here once they are added to your curriculum'}
                    </p>
                  </div>
                ) : (
                  subjects.map(subject => (
                    <SubjectCard key={subject.id} subject={subject} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'grades' && (
              <div className="space-y-3">
                {myGrades.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No grades yet</h3>
                    <p className="text-gray-500">Your assessment grades will appear here</p>
                  </div>
                ) : (
                  myGrades.slice(0, 20).map(grade => (
                    <GradeCard key={grade.id} grade={grade} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="space-y-4">
                {/* Overall Progress Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Overall Academic Progress</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <p className="text-3xl font-bold text-green-600">{stats.averageScore}%</p>
                      <p className="text-sm text-gray-600">Overall Average</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <p className="text-3xl font-bold text-blue-600">{stats.completedAssessments}</p>
                      <p className="text-sm text-gray-600">Total Assessments</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-xl">
                      <p className="text-3xl font-bold text-amber-600">{gradeSummaries.length}</p>
                      <p className="text-sm text-gray-600">Subjects Graded</p>
                    </div>
                  </div>

                  {/* Subject Performance Bars */}
                  <h4 className="font-medium text-gray-700 mb-3">Performance by Subject</h4>
                  {gradeSummaries.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">No grade data available yet</p>
                  ) : (
                    <div className="space-y-3">
                      {gradeSummaries.map(summary => (
                        <div key={summary.subjectId} className="flex items-center gap-3">
                          <div className="w-32 text-sm text-gray-700 truncate">{summary.subjectName}</div>
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                summary.averagePercentage >= 80 ? 'bg-green-500' :
                                summary.averagePercentage >= 60 ? 'bg-blue-500' :
                                summary.averagePercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${summary.averagePercentage}%` }}
                            />
                          </div>
                          <div className="w-12 text-sm font-medium text-right">
                            {Math.round(summary.averagePercentage)}%
                          </div>
                          {summary.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {summary.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Recent Assessments</h3>
                  {myGrades.length === 0 ? (
                    <p className="text-gray-500 text-sm">No recent assessments</p>
                  ) : (
                    <div className="space-y-3">
                      {myGrades.slice(0, 5).map(grade => (
                        <div key={grade.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${GRADE_COLORS[grade.gradeLevel]}`}>
                              {grade.gradeLevel}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{grade.subject?.name}</p>
                              <p className="text-xs text-gray-500">{grade.month}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{grade.score}/{grade.maxScore}</p>
                            <p className="text-xs text-gray-500">{Math.round(grade.percentage)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar - Achievements & Tips */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Study Tips */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5" />
                <h3 className="font-semibold">Today's Goal</h3>
              </div>
              <p className="text-sm text-white/90 mb-3">Complete at least 2 study sessions today</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/30 rounded-full">
                  <div className="w-1/2 h-full bg-white rounded-full" />
                </div>
                <span className="text-sm font-medium">1/2</span>
              </div>
            </div>

            {/* Achievements Preview */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Achievements
                </h3>
                <span className="text-xs text-amber-600 font-medium">3/12</span>
              </div>
              
              <div className="space-y-3">
                {[
                  { icon: '🎯', title: 'First Assessment', desc: 'Complete your first test', done: true },
                  { icon: '📚', title: 'Bookworm', desc: 'Study 10 subjects', done: true },
                  { icon: '🏆', title: 'Top Scorer', desc: 'Get 90%+ in any subject', done: true },
                  { icon: '🔥', title: 'Week Warrior', desc: '7-day streak', progress: 5, target: 7 },
                ].map((achievement, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${achievement.done ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <span className="text-xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${achievement.done ? 'text-green-700' : 'text-gray-700'}`}>
                        {achievement.title}
                      </p>
                      <p className="text-xs text-gray-500">{achievement.desc}</p>
                      {achievement.progress !== undefined && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                            <div 
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${(achievement.progress / (achievement.target || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{achievement.progress}/{achievement.target}</span>
                        </div>
                      )}
                    </div>
                    {achievement.done && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  Class Leaderboard
                </h3>
              </div>
              
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'Sovann K.', score: 96, avatar: '👤' },
                  { rank: 2, name: 'Srey Mom', score: 94, avatar: '👤' },
                  { rank: 3, name: 'Visal P.', score: 92, avatar: '👤' },
                ].map((student) => (
                  <div key={student.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      student.rank === 1 ? 'bg-amber-100 text-amber-700' :
                      student.rank === 2 ? 'bg-gray-200 text-gray-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {student.rank}
                    </div>
                    <span className="text-lg">{student.avatar}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{student.score}%</span>
                  </div>
                ))}
                
                {/* Current user */}
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700">
                      {stats.rank}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-sm">
                      {currentUser?.firstName?.charAt(0) || 'Y'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">You</p>
                    </div>
                    <span className="text-sm font-bold text-amber-700">{stats.averageScore}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Study Resources */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                Study Resources
              </h3>
              <div className="space-y-2">
                {[
                  { icon: '📖', title: 'Textbooks', count: 12 },
                  { icon: '📝', title: 'Practice Tests', count: 24 },
                  { icon: '🎬', title: 'Video Lessons', count: 48 },
                  { icon: '📊', title: 'Study Guides', count: 8 },
                ].map((resource, i) => (
                  <button key={i} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left">
                    <span className="text-lg">{resource.icon}</span>
                    <span className="flex-1 text-sm text-gray-700">{resource.title}</span>
                    <span className="text-xs text-gray-400">{resource.count}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
