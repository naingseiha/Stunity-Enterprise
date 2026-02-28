'use client';

import { useState, useTransition, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  MessageCircle,
  ChevronRight,
  Ticket,
  MapPin,
  Loader2,
  Shield,
  Archive,
  UserX,
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
  const searchParams = useSearchParams();
  const locale = pathname.split('/')[1] || 'en';
  const [isPending, startTransition] = useTransition();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeHover, setActiveHover] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Sync search query with URL
  useEffect(() => {
    const q = searchParams?.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      startTransition(() => {
        router.push(`/${locale}/search?q=${encodeURIComponent(searchQuery.trim())}`);
      });
    }
  };

  // Optimistic navigation - track clicked path for instant feedback
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  // Clear optimistic path when pathname changes (navigation completed)
  useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);

  // Handle scroll for navbar background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    pathname.includes('/reports') ||
    pathname.includes('/admin')  // Added for admin pages like claim-codes
    , [pathname]);

  const isFeedContext = useMemo(() => pathname.includes('/feed'), [pathname]);
  const isClubsContext = useMemo(() => pathname.includes('/clubs'), [pathname]);
  const isEventsContext = useMemo(() => pathname.includes('/events'), [pathname]);
  const isLearnContext = useMemo(() => pathname.includes('/learn'), [pathname]);

  // Optimistic active state - uses pending path if navigating, otherwise actual path
  const getOptimisticActive = useCallback((itemPath: string, actualActive: boolean) => {
    if (optimisticPath) {
      // Check if this item's path matches the optimistic path
      return optimisticPath.startsWith(itemPath) || itemPath.startsWith(optimisticPath);
    }
    return actualActive;
  }, [optimisticPath]);

  // Handle optimistic navigation with instant visual feedback
  const handleNavClick = useCallback((e: React.MouseEvent, path: string) => {
    // Set optimistic path immediately for instant visual feedback
    setOptimisticPath(path);
    // Use transition for smooth navigation
    startTransition(() => {
      router.push(path);
    });
  }, [router, startTransition]);

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
      name: 'Clubs',
      icon: Users,
      path: `/${locale}/clubs`,
      active: isClubsContext,
      badge: null,
    },
    {
      name: 'Events',
      icon: Calendar,
      path: `/${locale}/events`,
      active: isEventsContext,
      badge: null,
    },
    {
      name: 'Learn',
      icon: BookOpen,
      path: `/${locale}/learn`,
      active: isLearnContext,
      badge: null,
    },
    {
      name: 'School',
      icon: GraduationCap,
      path: `/${locale}/dashboard`,
      active: isSchoolContext,
      badge: null,
    },
  ].filter(item => {
    // Hide 'School' menu if the user is not part of any school
    if (item.name === 'School' && !school) {
      return false;
    }
    return true;
  }), [locale, isFeedContext, isClubsContext, isEventsContext, isSchoolContext, isLearnContext, school]);

  // Memoized school menu sections with grouped items
  const schoolMenuSections = useMemo(() => [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', icon: BarChart3, path: `/${locale}/dashboard`, prefetch: null },
        { name: 'Messages', icon: MessageCircle, path: `/${locale}/dashboard/messages`, prefetch: null },
      ],
    },
    {
      label: 'Academic',
      items: [
        { name: 'Students', icon: Users, path: `/${locale}/students`, prefetch: 'students' },
        { name: 'Teachers', icon: User, path: `/${locale}/teachers`, prefetch: 'teachers' },
        { name: 'Classes', icon: BookOpen, path: `/${locale}/classes`, prefetch: 'classes' },
        { name: 'Subjects', icon: BookOpen, path: `/${locale}/settings/subjects`, prefetch: null },
      ],
    },
    {
      label: 'Schedule',
      items: [
        { name: 'Timetable', icon: Calendar, path: `/${locale}/timetable`, prefetch: null },
        { name: 'Master Timetable', icon: Calendar, path: `/${locale}/timetable/master`, prefetch: null },
      ],
    },
    {
      label: 'Grades & Attendance',
      items: [
        { name: 'Grade Entry', icon: ClipboardList, path: `/${locale}/grades/entry`, prefetch: null },
        { name: 'Report Cards', icon: FileText, path: `/${locale}/grades/reports`, prefetch: null },
        { name: 'Grade Analytics', icon: TrendingUp, path: `/${locale}/grades/analytics`, prefetch: null },
        { name: 'Mark Attendance', icon: ClipboardCheck, path: `/${locale}/attendance/mark`, prefetch: null },
        { name: 'Attendance Reports', icon: ClipboardCheck, path: `/${locale}/attendance/reports`, prefetch: null },
      ],
    },
    {
      label: 'Year-End',
      items: [
        { name: 'Promotion', icon: TrendingUp, path: `/${locale}/settings/promotion`, prefetch: null },
        { name: 'Failed Students', icon: UserX, path: `/${locale}/settings/failed-students`, prefetch: null },
        { name: 'Year-End Workflow', icon: Archive, path: `/${locale}/settings/year-end-workflow`, prefetch: null },
      ],
    },
    {
      label: 'School Setup',
      items: [
        { name: 'Claim Codes', icon: Ticket, path: `/${locale}/admin/claim-codes`, prefetch: null },
        { name: 'Campus Locations', icon: MapPin, path: `/${locale}/settings/locations`, prefetch: null },
        { name: 'Settings', icon: Settings, path: `/${locale}/settings/academic-years`, prefetch: null },
      ],
    },
  ], [locale]);

  // Flatten for mobile menu compatibility
  const schoolMenuItems = useMemo(
    () => schoolMenuSections.flatMap((s) => s.items),
    [schoolMenuSections]
  );

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
      {/* Global Navigation Loading Bar */}
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-gray-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 animate-loading-bar" />
        </div>
      )}

      {/* Apple-inspired Navigation Bar */}
      <nav className={`
        sticky top-0 z-50 transition-all duration-300 ease-out
        ${scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-800/50'
          : 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800'
        }
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Logo & Main Nav */}
            <div className="flex items-center gap-10">
              {/* Logo */}
              <button
                onClick={() => {
                  setOptimisticPath(isSchoolContext ? `/${locale}/dashboard` : `/${locale}/feed`);
                  startTransition(() => {
                    router.push(isSchoolContext ? `/${locale}/dashboard` : `/${locale}/feed`);
                  });
                }}
                className="flex items-center gap-2 group relative"
                title={isSchoolContext ? "Go to Dashboard" : "Go to Feed"}
              >
                <img
                  src="/stunity-logo.png"
                  alt="Stunity"
                  className="h-8 w-auto object-contain transition-all duration-200 group-hover:opacity-80"
                />
              </button>

              {/* Main Navigation - Apple Style */}
              <div className="hidden md:flex items-center">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = getOptimisticActive(item.path, item.active);
                  const isNavigating = optimisticPath === item.path && isPending;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      prefetch={true}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(e, item.path);
                      }}
                      className="relative group px-4 py-2"
                    >
                      <span className={`
                        relative z-10 flex items-center gap-1.5 text-[13px] font-medium tracking-tight transition-colors duration-150
                        ${isActive
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                        }
                      `}>
                        {isNavigating && <Loader2 className="w-3 h-3 animate-spin" />}
                        {item.name}
                      </span>
                      {/* Active indicator - subtle underline */}
                      {isActive && (
                        <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-150" />
                      )}
                      {/* Hover indicator */}
                      <span className={`
                        absolute inset-0 rounded-lg bg-gray-100 dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150
                        ${isActive ? 'opacity-0 group-hover:opacity-0' : ''}
                      `} />
                      {/* Badge */}
                      {item.badge && (
                        <span className="absolute -top-0.5 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-[9px] font-semibold rounded-full uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Center Search - Expandable */}
            <div className={`
              hidden lg:flex items-center transition-all duration-300 ease-out
              ${searchFocused ? 'flex-1 max-w-xl mx-4' : 'w-64'}
            `}>
              <div className="relative w-full group">
                <Search className={`
                  absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200
                  ${searchFocused ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'}
                `} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={handleSearchKeyDown}
                  className={`
                    w-full pl-9 pr-4 py-2 text-[13px] rounded-lg transition-all duration-200
                    bg-gray-100/80 dark:bg-gray-800/80 border border-transparent
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:bg-white dark:focus:bg-gray-800 focus:border-gray-200 dark:focus:border-gray-700
                    focus:ring-2 focus:ring-orange-500/20 focus:outline-none
                  `}
                />
                {searchFocused && (
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-200/80 dark:bg-gray-700 rounded">
                    ENTER
                  </kbd>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
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

              {/* Messages */}
              <Link
                href={`/${locale}/messages`}
                className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-all duration-200"
              >
                <MessageCircle className="w-[18px] h-[18px]" />
              </Link>

              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-all duration-200">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>

              {/* Profile Menu */}
              <div className="relative ml-1" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`
                    flex items-center gap-2 p-1 rounded-full transition-all duration-200
                    ${profileMenuOpen
                      ? 'ring-2 ring-orange-500/30 bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-100/80 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </button>

                {/* Profile Dropdown - Refined */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold shadow-md">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{school?.name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {user?.isSuperAdmin && (
                        <Link
                          href={`/${locale}/super-admin`}
                          prefetch={true}
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group"
                        >
                          <Shield className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                          <span className="flex-1">Platform Admin</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                        </Link>
                      )}
                      <Link
                        href={`/${locale}/profile/me`}
                        prefetch={true}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group"
                      >
                        <User className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <span className="flex-1">My Profile</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                      </Link>
                      <Link
                        href={`/${locale}/settings`}
                        prefetch={true}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group"
                      >
                        <Settings className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <span className="flex-1">Settings</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-1 pb-0.5">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout?.();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden ml-1 p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-all duration-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Refined */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
            <div className="px-3 py-3 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = getOptimisticActive(item.path, item.active);
                const isNavigating = optimisticPath === item.path && isPending;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    prefetch={true}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      handleNavClick(e, item.path);
                    }}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-150
                      ${isActive
                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                      }
                    `}
                  >
                    {isNavigating ? (
                      <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                    ) : (
                      <Icon className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                    )}
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-[10px] font-semibold rounded-full uppercase">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-gray-300'}`} />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* School Context Sidebar - Refined */}
      {isSchoolContext && (
        <aside className="hidden lg:block fixed left-0 top-14 w-60 h-[calc(100vh-3.5rem)] bg-gray-50/50 dark:bg-gray-900/50 border-r border-gray-200/80 dark:border-gray-800 overflow-y-auto">
          <div className="p-3 space-y-4">
            <p className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              School Management
            </p>
            {schoolMenuSections.map((section) => (
              <div key={section.label} className="space-y-0.5">
                <p className="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {section.label}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = optimisticPath ? optimisticPath === item.path : pathname === item.path;
                  const isHovered = activeHover === item.path;
                  const isNavigating = optimisticPath === item.path && pathname !== item.path;

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      prefetch={true}
                      onClick={(e) => {
                        setOptimisticPath(item.path);
                        handleLinkHover(item.prefetch);
                      }}
                      onMouseEnter={() => {
                        setActiveHover(item.path);
                        handleLinkHover(item.prefetch);
                      }}
                      onMouseLeave={() => setActiveHover(null)}
                      className={`
                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                        ${isActive
                          ? 'text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-800 shadow-sm border border-gray-200/80 dark:border-gray-700'
                          : isHovered
                            ? 'text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/60'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 transition-all duration-150 ${isActive ? 'text-orange-500' : ''}`} />
                      <span className="flex-1">{item.name}</span>
                      {isNavigating && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      )}
    </>
  );
}
