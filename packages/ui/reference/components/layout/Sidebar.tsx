"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BookIcon,
  Calendar,
  ClipboardList,
  BarChart3,
  Award,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Sparkles,
  Loader2,
  User,
} from "lucide-react";

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);

  const userRole = currentUser?.role;
  const teacherRole = currentUser?.teacher?.role;

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "ផ្ទាំងគ្រប់គ្រង",
      href: "/dashboard",
      roles: ["ADMIN", "TEACHER"],
      permission: PERMISSIONS.VIEW_DASHBOARD,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: User,
      label: "ប្រវត្តិរូប",
      href: `/profile/${currentUser?.id || ''}`,
      roles: ["ADMIN", "TEACHER"],
      permission: null, // Everyone can view their own profile
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      icon: Users,
      label: "សិស្ស",
      href: "/students",
      roles: ["ADMIN"],
      permission: PERMISSIONS.MANAGE_STUDENTS,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: UserCheck,
      label: "គ្រូបង្រៀន",
      href: "/teachers",
      roles: ["ADMIN"],
      permission: PERMISSIONS.MANAGE_TEACHERS,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: GraduationCap,
      label: "ថ្នាក់រៀន",
      href: "/classes",
      roles: ["ADMIN"],
      permission: PERMISSIONS.MANAGE_CLASSES,
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: BookIcon,
      label: "មុខវិជ្ជា",
      href: "/subjects",
      roles: ["ADMIN"],
      permission: PERMISSIONS.MANAGE_SUBJECTS,
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      icon: ClipboardList,
      label: "ពិន្ទុ",
      href: "/grade-entry",
      roles: ["ADMIN", "TEACHER"],
      permission: PERMISSIONS.MANAGE_GRADES,
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      icon: Calendar,
      label: "វត្តមាន",
      href: "/attendance",
      roles: ["ADMIN", "TEACHER"],
      permission: PERMISSIONS.MANAGE_ATTENDANCE,
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      icon: BarChart3,
      label: "របាយការណ៍",
      href: "/reports/monthly",
      roles: ["ADMIN", "TEACHER"],
      permission: PERMISSIONS.VIEW_REPORTS,
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: Award,
      label: "តារាងកិត្តិយស",
      href: "/reports/award",
      roles: ["ADMIN", "TEACHER"],
      permission: PERMISSIONS.VIEW_AWARD_REPORT,
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: BookOpen,
      label: "សៀវភៅតាមដានសិស្ស",
      href: "/reports/tracking-book",
      roles: ["ADMIN", "TEACHER"],
      permission: PERMISSIONS.VIEW_TRACKING_BOOK,
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: Settings,
      label: "ការកំណត់",
      href: "/settings",
      roles: ["ADMIN"],
      permission: PERMISSIONS.VIEW_SETTINGS,
      gradient: "from-gray-500 to-slate-500",
    },
  ];

  // Filter menu items based on role AND permissions
  const filteredMenuItems = menuItems.filter((item) => {
    // Check if user has the required role
    if (!item.roles.includes(userRole || "")) return false;
    
    // For ADMIN users, check permissions (unless Super Admin)
    if (userRole === "ADMIN" && item.permission) {
      // Super Admins see everything
      if (isSuperAdmin) {
        console.log(`✅ [SIDEBAR] ${item.label}: Super Admin - showing`);
        return true;
      }
      
      // Regular admins need specific permission
      const hasAccess = hasPermission(item.permission);
      console.log(`🔍 [SIDEBAR] ${item.label}: Permission ${item.permission} = ${hasAccess}`);
      return hasAccess;
    }
    
    // TEACHER users see all teacher-allowed items
    return true;
  });

  const getRoleDisplay = (userRole?: string, teacherRole?: string) => {
    if (userRole === "ADMIN") {
      return {
        khmerLabel: "អ្នកគ្រប់គ្រង",
        color: "text-indigo-600",
        bg: "bg-indigo-100",
      };
    }

    if (userRole === "TEACHER") {
      if (teacherRole === "INSTRUCTOR") {
        return {
          khmerLabel: "គ្រូប្រចាំថ្នាក់",
          color: "text-purple-600",
          bg: "bg-purple-100",
        };
      }
      return {
        khmerLabel: "គ្រូបង្រៀន",
        color: "text-green-600",
        bg: "bg-green-100",
      };
    }

    return {
      khmerLabel: "មិនស្គាល់",
      color: "text-gray-600",
      bg: "bg-gray-100",
    };
  };

  const roleInfo = getRoleDisplay(userRole, teacherRole);

  // ✅ Handle navigation with loading state
  const handleNavigation = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href === pathname) return; // Already on this page

      e.preventDefault();
      setIsNavigating(true);
      setTargetPath(href);

      // Start navigation
      router.push(href);
    },
    [pathname, router]
  );

  // ✅ Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
    setTargetPath(null);
  }, [pathname]);

  // ✅ Prefetch routes on hover for faster navigation
  const handleMouseEnter = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  return (
    <aside
      className={`bg-gradient-to-b from-indigo-600 via-purple-600 to-pink-500 shadow-2xl transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-72"
      } relative flex flex-col h-screen`}
    >

      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/20 bg-black/10 backdrop-blur-md">
        {!isCollapsed && (
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-200">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h1 className="font-moul text-base text-white drop-shadow-lg">
                ប្រព័ន្ធគ្រប់គ្រង
              </h1>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-white/20 transition-all duration-200 group"
          aria-label={isCollapsed ? "បើក" : "បិទ"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-hide">
        {filteredMenuItems.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mb-4 animate-bounce">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <span className="text-4xl font-moul">⚠️</span>
              </div>
            </div>
            <p className="font-battambang font-semibold text-white mb-2">
              មិនមានម៉ឺនុយ
            </p>
            <p className="font-battambang text-xs text-white/70 mb-3">
              តួនាទី:{" "}
              <span className="font-medium text-yellow-300">
                {userRole || "មិនស្គាល់"}
              </span>
            </p>
          </div>
        ) : (
          filteredMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isLoadingThis = isNavigating && targetPath === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavigation(e, item.href)}
                onMouseEnter={() => handleMouseEnter(item.href)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                  ${
                    isActive
                      ? "bg-white/95 text-indigo-600 shadow-lg scale-[1.02]"
                      : "text-white/90 hover:bg-white/20 hover:shadow-md"
                  }
                  ${isLoadingThis ? "opacity-75 cursor-wait" : ""}
                `}
                style={{
                  animationDelay: `${index * 30}ms`,
                  animation: "slideIn 0.2s ease-out forwards",
                }}
              >
                {/* Icon */}
                <div className="relative z-10 flex items-center justify-center">
                  {isLoadingThis ? (
                    <Loader2
                      className={`w-5 h-5 animate-spin ${
                        isActive ? "text-indigo-600" : "text-white"
                      }`}
                    />
                  ) : (
                    <Icon
                      className={`w-5 h-5 transition-all duration-200 ${
                        isActive
                          ? "text-indigo-600"
                          : "text-white group-hover:scale-110"
                      }`}
                    />
                  )}
                </div>

                {/* Labels */}
                {!isCollapsed && (
                  <div className="flex-1 relative z-10">
                    <p
                      className={`font-koulen text-sm transition-colors ${
                        isActive ? "text-indigo-600" : "text-white"
                      }`}
                    >
                      {item.label}
                    </p>
                  </div>
                )}

                {/* Active indicator */}
                {isActive && !isCollapsed && (
                  <div className="w-2 h-2 bg-indigo-600 rounded-full shadow-md animate-pulse relative z-10"></div>
                )}

                {/* Collapsed active indicator */}
                {isActive && isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-md"></div>
                )}
              </Link>
            );
          })
        )}
      </nav>

      {/* User Info at Bottom */}
      {currentUser && (
        <div
          className={`border-t border-white/20 bg-black/20 backdrop-blur-md transition-all duration-300 ${
            isCollapsed ? "p-3" : "p-4"
          }`}
        >
          <div
            className={`flex items-center gap-3 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            {/* Avatar */}
            <div className="relative group">
              <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-indigo-600 font-bold text-sm shadow-lg transform group-hover:scale-105 transition-transform duration-200">
                {currentUser.firstName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-sm">
                <div className="w-full h-full bg-green-500 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>

            {/* User Details */}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-battambang text-xs font-bold text-white truncate mb-1">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-battambang font-semibold bg-white/20 text-white`}
                  >
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    {roleInfo.khmerLabel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Collapsed mode indicator */}
          {isCollapsed && (
            <div className="mt-2 text-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mx-auto animate-pulse"></div>
            </div>
          )}
        </div>
      )}

      {/* Custom Scrollbar Styles - Hidden */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </aside>
  );
}

// ✅ Memoize to prevent unnecessary re-renders
export default memo(Sidebar);
