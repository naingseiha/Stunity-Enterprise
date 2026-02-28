'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  Activity,
  ArrowUpRight,
  CalendarRange,
  ArrowDownRight,
  Clock,
  Award,
  Target,
  Zap,
  Crown,
  Star,
  ChevronRight,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import AcademicYearSelector from '@/components/AcademicYearSelector';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface UserData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: number;
}

interface SchoolData {
  id: number;
  name: string;
  slug: string;
  subscriptionTier: string;
  isActive: boolean;
  trialDaysRemaining?: number;
  maxStudents?: number;
  maxTeachers?: number;
  maxStorageGB?: number;
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down';
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  subtitle?: string;
}) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      light: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
    green: {
      bg: 'from-emerald-500 to-green-600',
      light: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      light: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      light: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
    },
    pink: {
      bg: 'from-pink-500 to-pink-600',
      light: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-1">
      {/* Gradient orb decoration */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${colors.bg} rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity`}></div>
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${colors.light}`}>
              {changeType === 'up' ? (
                <ArrowUpRight className={`w-3.5 h-3.5 ${colors.text}`} />
              ) : (
                <ArrowDownRight className={`w-3.5 h-3.5 ${colors.text}`} />
              )}
              <span className={`text-xs font-semibold ${colors.text}`}>{change}</span>
            </div>
          )}
        </div>

        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

// Quick Action Card
function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  color,
}: {
  title: string;
  description: string;
  icon: any;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative bg-white rounded-xl p-5 shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 hover:-translate-y-0.5 text-left w-full"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-stunity-primary-600 transition-colors">
            {title}
          </h4>
          <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-stunity-primary-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </button>
  );
}

export default function EnhancedDashboard({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = TokenManager.getAccessToken();
      
      if (!token) {
        router.replace(`/${locale}/auth/login`);
        return;
      }

      const { user: storedUser, school: storedSchool } = TokenManager.getUserData();
      
      if (storedUser && storedSchool) {
        setUser(storedUser);
        setSchool(storedSchool);
      } else {
        await TokenManager.logout();
        router.replace(`/${locale}/auth/login`);
        return;
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-stunity-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user || !school) {
    return null;
  }

  // Get tier badge styling
  const getTierBadge = () => {
    const tier = school.subscriptionTier || 'FREE_TRIAL_1M';
    
    if (tier.includes('ENTERPRISE')) {
      return {
        icon: Crown,
        text: 'Enterprise',
        className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
      };
    } else if (tier.includes('PROFESSIONAL')) {
      return {
        icon: Star,
        text: 'Professional',
        className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      };
    } else if (tier.includes('STANDARD')) {
      return {
        icon: Zap,
        text: 'Standard',
        className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      };
    } else {
      return {
        icon: Target,
        text: 'Free Trial',
        className: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white',
      };
    }
  };

  const tierBadge = getTierBadge();
  const TierIcon = tierBadge.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/30">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stunity-primary-600 to-purple-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Stunity</h1>
                <p className="text-xs text-gray-500">Enterprise</p>
              </div>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students, classes, teachers..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              {/* Academic Year Selector */}
              <AcademicYearSelector />
              
              <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500">{school.name}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-md">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-stunity-primary-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl mb-8">
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10 p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white/90 text-xs font-semibold">Live</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${tierBadge.className}`}>
                    <TierIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{tierBadge.text}</span>
                  </div>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Welcome back, {user.firstName}! 👋
                </h1>
                <p className="text-white/90 text-lg font-medium mb-2">
                  {school.name}
                </p>
                {school.trialDaysRemaining !== undefined && school.trialDaysRemaining > 0 && (
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{school.trialDaysRemaining} days remaining in trial</span>
                  </div>
                )}
              </div>

              {/* Quick stats in hero */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
                  <div className="text-white/80 text-xs font-semibold mb-1">Students</div>
                  <div className="text-3xl font-bold text-white">250</div>
                </div>
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
                  <div className="text-white/80 text-xs font-semibold mb-1">Teachers</div>
                  <div className="text-3xl font-bold text-white">18</div>
                </div>
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
                  <div className="text-white/80 text-xs font-semibold mb-1">Classes</div>
                  <div className="text-3xl font-bold text-white">12</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Students"
            value="250"
            change="+12%"
            changeType="up"
            icon={Users}
            color="blue"
            subtitle="From last month"
          />
          <StatCard
            title="Active Teachers"
            value="18"
            change="+2"
            changeType="up"
            icon={GraduationCap}
            color="green"
            subtitle="Fully staffed"
          />
          <StatCard
            title="Classes Running"
            value="12"
            change="100%"
            changeType="up"
            icon={BookOpen}
            color="purple"
            subtitle="All grades covered"
          />
          <StatCard
            title="Attendance Rate"
            value="94.5%"
            change="+2.3%"
            changeType="up"
            icon={Activity}
            color="orange"
            subtitle="This week"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                  <p className="text-sm text-gray-500 mt-1">Common tasks and workflows</p>
                </div>
              </div>

              <div className="grid gap-3">
                <QuickActionCard
                  title="Manage Students"
                  description="View, add, or edit student records and information"
                  icon={Users}
                  onClick={() => router.push(`/${locale}/students`)}
                  color="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <QuickActionCard
                  title="Manage Teachers"
                  description="View teacher profiles and class assignments"
                  icon={GraduationCap}
                  onClick={() => router.push(`/${locale}/teachers`)}
                  color="bg-gradient-to-br from-emerald-500 to-green-600"
                />
                <QuickActionCard
                  title="Class Management"
                  description="Organize classes, assign students and teachers"
                  icon={BookOpen}
                  onClick={() => router.push(`/${locale}/classes`)}
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
                />
                <QuickActionCard
                  title="View Reports"
                  description="Generate and export academic performance reports"
                  icon={BarChart3}
                  onClick={() => alert('Reports feature coming soon!')}
                  color="bg-gradient-to-br from-orange-500 to-orange-600"
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  <p className="text-sm text-gray-500 mt-1">Latest updates and changes</p>
                </div>
                <button className="text-sm text-stunity-primary-600 hover:text-stunity-primary-700 font-semibold">
                  View All
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { action: 'New student enrolled', name: 'John Doe', time: '2 hours ago', icon: Users, color: 'text-blue-600 bg-blue-50' },
                  { action: 'Class roster updated', name: 'Grade 10A', time: '5 hours ago', icon: BookOpen, color: 'text-purple-600 bg-purple-50' },
                  { action: 'Teacher assigned', name: 'Sarah Wilson', time: '1 day ago', icon: GraduationCap, color: 'text-green-600 bg-green-50' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg ${activity.color}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.name}</p>
                    </div>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Subscription Info */}
            <div className="bg-gradient-to-br from-stunity-primary-600 to-purple-600 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-2 mb-4">
                <TierIcon className="w-5 h-5" />
                <h3 className="font-bold text-lg">{tierBadge.text} Plan</h3>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Students</span>
                  <span className="font-semibold">250 / {school.maxStudents || 100}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2" style={{ width: '65%' }}></div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Teachers</span>
                  <span className="font-semibold">18 / {school.maxTeachers || 10}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2" style={{ width: '90%' }}></div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Storage</span>
                  <span className="font-semibold">0.5 / {school.maxStorageGB || 1} GB</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2" style={{ width: '50%' }}></div>
                </div>
              </div>

              <button className="w-full py-3 bg-white text-stunity-primary-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Upgrade Plan
              </button>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">System Status</h3>
              
              <div className="space-y-3">
                {[
                  { label: 'All Systems', status: 'Operational', color: 'bg-green-500' },
                  { label: 'Database', status: 'Healthy', color: 'bg-green-500' },
                  { label: 'API Services', status: 'Online', color: 'bg-green-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 ${item.color} rounded-full`}></div>
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
              
              <div className="space-y-2">
                <button 
                  onClick={() => router.push(`/${locale}/settings/academic-years`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-sm text-gray-700">Academic Years</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                  <span className="text-sm text-gray-700">Settings</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                  <span className="text-sm text-gray-700">Help Center</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 transition-colors text-left group"
                >
                  <span className="text-sm text-gray-700 group-hover:text-red-600">Sign Out</span>
                  <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
