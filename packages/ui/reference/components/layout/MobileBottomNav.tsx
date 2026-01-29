"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  PenTool,
  Calendar,
  GraduationCap,
  BarChart3,
  UserCircle2,
  Rss,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

interface NavItem {
  id: string;
  label: string;
  labelKh: string;
  icon: LucideIcon;
  href: string | ((userId: string) => string); // Support dynamic hrefs
  roles?: string[];
  color: string; // Gradient color for active state
}

const NAV_ITEMS: NavItem[] = [
  // Common: Feed/Home for all users
  {
    id: "feed",
    label: "Feed",
    labelKh: "ផ្ទះ",
    icon: Home,
    href: "/feed",
    roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
    color: "from-indigo-500 to-purple-500",
  },

  // Teacher/Admin Navigation
  {
    id: "dashboard",
    label: "Dashboard",
    labelKh: "ទិន្នន័យ",
    icon: BarChart3,
    href: "/dashboard",
    roles: ["ADMIN", "TEACHER"],
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "grade-entry",
    label: "Tasks",
    labelKh: "កិច្ចការ",
    icon: PenTool,
    href: "/grade-entry",
    roles: ["ADMIN", "TEACHER"],
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "schedule",
    label: "Schedule",
    labelKh: "កាលវិភាគ",
    icon: Calendar,
    href: "/schedule",
    roles: ["ADMIN", "TEACHER"],
    color: "from-green-500 to-emerald-500",
  },

  // Student Navigation
  {
    id: "my-courses",
    label: "My Courses",
    labelKh: "កម្មវិធី",
    icon: GraduationCap,
    href: "/student/courses",
    roles: ["STUDENT"],
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "assignments",
    label: "Assignments",
    labelKh: "កិច្ចការ",
    icon: PenTool,
    href: "/student/assignments",
    roles: ["STUDENT"],
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "progress",
    label: "Progress",
    labelKh: "ឧត្តុន",
    icon: BarChart3,
    href: "/student/progress",
    roles: ["STUDENT"],
    color: "from-green-500 to-emerald-500",
  },

  // Common: Profile for all users
  {
    id: "profile",
    label: "Profile",
    labelKh: "ប្រវត្តិរូប",
    icon: UserCircle2,
    href: (userId: string) => `/profile/${userId}`,
    roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
    color: "from-pink-500 to-rose-500",
  },
];

interface MobileBottomNavProps {
  onNavigate?: (href: string) => boolean; // Returns false to prevent navigation
}

export default function MobileBottomNav({ onNavigate }: MobileBottomNavProps = {}) {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  // Generate nav items with dynamic hrefs
  const navItems = useMemo(() => {
    return NAV_ITEMS.map(item => ({
      ...item,
      href: typeof item.href === 'function' 
        ? item.href(currentUser?.id || '') 
        : item.href
    }));
  }, [currentUser?.id]);

  // Filter nav items based on user role
  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(currentUser?.role || "")
  );

  // If we have less than 5 items, we might want to adjust the grid
  const gridCols =
    filteredItems.length === 3
      ? "grid-cols-3"
      : filteredItems.length === 4
      ? "grid-cols-4"
      : "grid-cols-5";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 z-50 safe-bottom shadow-lg">
      <div className={`grid ${gridCols} px-2 py-1.5`}>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          const handleClick = (e: React.MouseEvent) => {
            // If onNavigate returns false, prevent navigation
            if (onNavigate && !onNavigate(item.href)) {
              e.preventDefault();
            }
          };

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={handleClick}
              className="flex flex-col items-center justify-center py-2 px-1 touch-feedback transition-all duration-300 ease-out group relative"
              aria-label={item.label}
            >
              {/* Active indicator - floating pill background */}
              {isActive && (
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-10 rounded-2xl scale-95 animate-in fade-in zoom-in duration-300`}></div>
              )}

              {/* Icon with gradient background when active */}
              <div className="relative">
                {isActive ? (
                  <div className={`w-11 h-11 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-lg transform transition-all duration-300 ease-out group-active:scale-95`}>
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-300 ease-out group-hover:bg-gray-100 group-active:scale-95">
                    <Icon className="w-6 h-6 text-gray-500 group-hover:text-gray-700 transition-colors duration-200" strokeWidth={2} />
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-0.5 font-koulen transition-all duration-200 ${
                  isActive
                    ? "font-black text-transparent bg-clip-text bg-gradient-to-r " + item.color
                    : "font-medium text-gray-500 group-hover:text-gray-700"
                }`}
              >
                {item.labelKh}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <div className={`absolute -bottom-0.5 w-1 h-1 bg-gradient-to-r ${item.color} rounded-full animate-pulse`}></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
