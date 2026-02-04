'use client';

import { useState, useTransition, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  GraduationCap,
  BookOpen,
  Bell,
  Search,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Users,
  Calendar,
  BarChart3,
  FileText,
  TrendingUp,
  ClipboardList,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import AcademicYearSelector from './AcademicYearSelector';
import LanguageSwitcher from './LanguageSwitcher';
import { prefetchStudents } from '@/hooks/useStudents';
import { prefetchTeachers } from '@/hooks/useTeachers';
import { prefetchClasses } from '@/hooks/useClasses';

interface UnifiedNavProps {
  user?: any;
  school?: any;
  onLogout?: () => void;
}

export default function UnifiedNavigation({ user, school, onLogout }: UnifiedNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';
  const [isPending, startTransition] = useTransition();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeHover, setActiveHover] = useState<string | null>(null);
  
  // Optimistic navigation - track clicked path for instant feedback
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  
  // Clear optimistic path when pathname changes (navigation completed)
  useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);

  // Memoize context calculations for better performance
  const isSchoolContext = useMemo(() => 
    pathname.includes('/dashboard') || 
    pathname.includes('/students') || 
    pathname.includes('/teachers') || 
    pathname.includes('/classes') ||
    pathname.includes('/grades') ||
    pathname.includes('/attendance') ||
    pathname.includes('/timetable') ||
    pathname.includes('/settings') ||
    pathname.includes('/reports')
  , [pathname]);
  
  const isFeedContext = useMemo(() => pathname.includes('/feed'), [pathname]);
  const isLearnContext = useMemo(() => pathname.includes('/learn'), [pathname]);

  // Memoized nav items to prevent re-creation on every render
  const navItems = useMemo(() => [
    { 
      name: 'Feed', 
      icon: Home, 
      path: `/${locale}/feed`,
      active: isFeedContext,
      badge: null,
    },
    { 
      name: 'School', 
      icon: GraduationCap, 
      path: `/${locale}/dashboard`,
      active: isSchoolContext,
      badge: null,
    },
    { 
      name: 'Learn', 
      icon: BookOpen, 
      path: `/${locale}/learn`,
      active: isLearnContext,
      badge: 'Soon',
    },
  ], [locale, isFeedContext, isSchoolContext, isLearnContext]);

  // Memoized school menu items
  const schoolMenuItems = useMemo(() => [
    { name: 'Dashboard', icon: BarChart3, path: `/${locale}/dashboard`, prefetch: null },
    { name: 'Students', icon: Users, path: `/${locale}/students`, prefetch: 'students' },
    { name: 'Teachers', icon: User, path: `/${locale}/teachers`, prefetch: 'teachers' },
    { name: 'Classes', icon: BookOpen, path: `/${locale}/classes`, prefetch: 'classes' },
    { name: 'Subjects', icon: BookOpen, path: `/${locale}/settings/subjects`, prefetch: null },
    { name: 'Timetable', icon: Calendar, path: `/${locale}/timetable`, prefetch: null },
    { name: 'Master Timetable', icon: Calendar, path: `/${locale}/timetable/master`, prefetch: null },
    { name: 'Grade Entry', icon: ClipboardList, path: `/${locale}/grades/entry`, prefetch: null },
    { name: 'Report Cards', icon: FileText, path: `/${locale}/grades/reports`, prefetch: null },
    { name: 'Attendance', icon: ClipboardCheck, path: `/${locale}/attendance/mark`, prefetch: null },
    { name: 'Promotion', icon: TrendingUp, path: `/${locale}/settings/promotion`, prefetch: null },
    { name: 'Settings', icon: Settings, path: `/${locale}/settings/academic-years`, prefetch: null },
  ], [locale]);

  // Prefetch data on hover for instant navigation
  const handleLinkHover = useCallback((prefetchType: string | null) => {
    if (!prefetchType) return;
    
    switch (prefetchType) {
      case 'students':
        prefetchStudents({ limit: 20 });
        break;
      case 'teachers':
        prefetchTeachers({ limit: 20 });
        break;
      case 'classes':
        prefetchClasses({ limit: 50 });
        break;
    }
  }, []);

  return (
    <>
      {/* Main Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center gap-8">
              <button 
                onClick={() => router.push(isSchoolContext ? `/${locale}/dashboard` : `/${locale}/feed`)}
                className="flex items-center gap-2 group"
                title={isSchoolContext ? "Go to Dashboard" : "Go to Feed"}
              >
                <img 
                  src="/stunity-logo.png" 
                  alt="Stunity Logo" 
                  className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
                />
              </button>

              {/* Main Navigation Items */}
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      prefetch={true}
                      className={`
                        relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                        ${item.active 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                      {item.active && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Academic Year Selector (only in school context) */}
              {isSchoolContext && (
                <div className="hidden sm:block">
                  <AcademicYearSelector />
                </div>
              )}

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </button>

                {/* Profile Dropdown */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-gray-500">{school?.name}</p>
                    </div>
                    <Link
                      href={`/${locale}/profile`}
                      prefetch={true}
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      href={`/${locale}/settings`}
                      prefetch={true}
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    <div className="border-t border-gray-100 my-2"></div>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    prefetch={true}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                      ${item.active 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* School Context Sidebar - Fixed Position */}
      {isSchoolContext && (
        <aside className="hidden lg:block fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-1">
            <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              School Management
            </p>
            {schoolMenuItems.map((item) => {
              const Icon = item.icon;
              // Use optimistic path for instant feedback, fallback to actual pathname
              const isActive = optimisticPath ? optimisticPath === item.path : pathname === item.path;
              const isHovered = activeHover === item.path;
              const isNavigating = optimisticPath === item.path && pathname !== item.path;
              
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  prefetch={true}
                  onClick={(e) => {
                    // Set optimistic path immediately on click for instant feedback
                    setOptimisticPath(item.path);
                    handleLinkHover(item.prefetch);
                  }}
                  onMouseEnter={() => {
                    setActiveHover(item.path);
                    handleLinkHover(item.prefetch);
                  }}
                  onMouseLeave={() => setActiveHover(null)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-100
                    ${isActive 
                      ? 'text-blue-600 bg-blue-50 shadow-sm' 
                      : isHovered
                        ? 'text-blue-600 bg-blue-50/50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-100 ${isHovered && !isActive ? 'scale-110' : ''}`} />
                  <span>{item.name}</span>
                  {isNavigating && (
                    <Loader2 className="w-4 h-4 ml-auto animate-spin text-blue-500" />
                  )}
                </Link>
              );
            })}
          </div>
        </aside>
      )}
    </>
  );
}
