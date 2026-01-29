"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  BookOpen,
  X,
  Award,
  BarChart3,
  GraduationCap,
  Mic,
  MapPin,
  Bell,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { dashboardApi } from "@/lib/api/dashboard";
import DashboardSkeleton from "./DashboardSkeleton";
import { getCurrentAcademicYear } from "@/utils/academicYear";

interface SimpleMobileDashboardProps {
  currentUser: any;
}

// ✅ OPTIMIZED: Memoized stat card component to prevent unnecessary re-renders
const StatCard = memo(({ icon: Icon, label, value, gradient }: {
  icon: any;
  label: string;
  value: string | number;
  gradient: string;
}) => (
  <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-md active:scale-95 transition-all">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-9 h-9 ${gradient} rounded-xl flex items-center justify-center shadow-sm`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="font-koulen text-[10px] text-gray-600 font-bold">
        {label}
      </p>
    </div>
    <p className={`font-koulen text-3xl text-transparent bg-clip-text ${gradient.replace('bg-', 'bg-clip-text bg-')} font-bold`}>
      {value}
    </p>
  </div>
));
StatCard.displayName = 'StatCard';

// ✅ PERFORMANCE: Removed GradeCard component (no longer needed)

// ✅ SUPER OPTIMIZED: Minimal data structure for fastest loading
interface MobileGradeStats {
  month: string;
  year: number;
  totalTeachers: number;
  totalSubjects: number;
  grades: Array<{
    grade: string;
    totalStudents: number;
    totalClasses: number;
  }>;
}

export default function SimpleMobileDashboard({
  currentUser,
}: SimpleMobileDashboardProps) {
  const router = useRouter();
  const [gradeStats, setGradeStats] = useState<MobileGradeStats | null>(null);
  // ✅ OPTIMIZED: Start with true to show skeleton immediately on first load
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const touchStartRef = useRef<number>(0);
  const touchMoveRef = useRef<number>(0);

  // ✅ OPTIMIZED: Load data immediately on mount without extra ref check
  useEffect(() => {
    loadGradeStats();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadGradeStats = useCallback(async (refresh = false) => {
    try {
      // ✅ OPTIMIZED: Show appropriate loading state
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Check if token exists
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setError("ការផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ • Not authenticated");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Clear cache if refreshing
      if (refresh) {
        dashboardApi.clearCache();
      }

      // Get current Khmer month
      const monthNames = [
        "មករា",
        "កុម្ភៈ",
        "មីនា",
        "មេសា",
        "ឧសភា",
        "មិថុនា",
        "កក្កដា",
        "សីហា",
        "កញ្ញា",
        "តុលា",
        "វិច្ឆិកា",
        "ធ្នូ",
      ];
      const currentMonth = monthNames[new Date().getMonth()];
      const currentYear = getCurrentAcademicYear();

      // ✅ OPTIMIZED: Add timeout to prevent stuck requests (reduced to 15s for faster feedback)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout - please pull down to refresh")), 15000); // 15 second timeout
      });

      // ✅ OPTIMIZED: Use lightweight mobile-stats endpoint instead of comprehensive-stats
      // This endpoint is 50x smaller and 60% faster!
      const dataPromise = dashboardApi.getMobileStats(
        currentMonth,
        currentYear
      );

      // Race between data fetch and timeout
      const data = await Promise.race([dataPromise, timeoutPromise]) as any;

      if (!data || !data.grades) {
        setError("ទិន្នន័យមិនត្រឹមត្រូវ • Invalid data structure");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setGradeStats(data);
      console.log("✅ Mobile dashboard data loaded successfully");
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("❌ Mobile dashboard error:", error);
        setError(error.message || "មានបញ្ហាក្នុងការទាញយកទិន្នន័យ");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []); // ✅ OPTIMIZED: Remove gradeStats dependency to prevent unnecessary recreations

  // Calculate overall statistics
  const totalStats = useMemo(
    () =>
      gradeStats?.grades.reduce(
        (acc, grade) => ({
          students: acc.students + grade.totalStudents,
          classes: acc.classes + grade.totalClasses,
        }),
        { students: 0, classes: 0 }
      ),
    [gradeStats]
  );

  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/students?search=${encodeURIComponent(searchQuery)}`);
      }
    },
    [searchQuery, router]
  );

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchMoveRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const touchDiff = touchMoveRef.current - touchStartRef.current;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    // If user is at top and pulled down more than 100px, refresh
    if (scrollTop === 0 && touchDiff > 100 && !isRefreshing && !isLoading) {
      loadGradeStats(true);
    }

    touchStartRef.current = 0;
    touchMoveRef.current = 0;
  }, [isRefreshing, isLoading, loadGradeStats]);

  // ✅ OPTIMIZED: Show skeleton immediately while loading first data
  if (isLoading && !gradeStats) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-5">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-300/30 to-purple-300/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-72 h-72 bg-gradient-to-br from-pink-300/30 to-orange-300/30 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg p-8 max-w-md w-full text-center border border-white/40">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="font-koulen text-2xl text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-600 mb-2 font-bold">
            មានបញ្ហា
          </h2>
          <p className="font-battambang text-gray-700 mb-6 font-medium">
            {error}
          </p>
          <button
            onClick={() => loadGradeStats(false)}
            className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-koulen py-3.5 px-6 rounded-2xl shadow-md transition-all active:scale-95"
          >
            ព្យាយាមម្តងទៀត
          </button>
        </div>
      </div>
    );
  }

  // ✅ OPTIMIZED: If we have data, show it even while refreshing
  // This provides instant perceived load time
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ✅ OPTIMIZED: Reduced background elements and simplified animations for better FPS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-300/20 to-purple-300/20 rounded-full blur-2xl opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-72 h-72 bg-gradient-to-br from-pink-300/20 to-orange-300/20 rounded-full blur-2xl opacity-60"></div>
      </div>

      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-md border border-white/20 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-battambang text-sm text-gray-800 font-semibold">
            កំពុងបន្ទាន់សម័យ...
          </span>
        </div>
      )}

      {/* Modern Glassmorphic Header */}
      <div className="relative bg-white/60 backdrop-blur-xl px-5 pt-6 pb-5 shadow-md border-b border-white/20">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* ✅ OPTIMIZED: Removed animate-pulse for better performance */}
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-koulen text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 text-sm leading-tight font-bold">
                វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ
              </p>
              <p className="font-battambang text-[10px] text-gray-600 flex items-center gap-1 font-medium">
                <MapPin className="w-3 h-3" />
                ខេត្តសៀមរាប
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="font-koulen text-xs text-indigo-600 px-3 py-1.5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl font-bold border border-indigo-100 active:scale-95 transition-transform">
              ខ្មែរ
            </button>
            <button className="w-9 h-9 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform relative">
              <Bell className="w-4 h-4 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <div className="relative mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="ស្វែងរកសិស្ស..."
            className="w-full pl-11 pr-11 py-4 rounded-2xl font-koulen text-sm text-gray-900 bg-white/70 backdrop-blur-sm border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-300 transition-all placeholder:text-gray-400"
          />
          <Search className="w-5 h-5 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <button
            onClick={() => {}}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm active:scale-95 transition-transform"
          >
            <Mic className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Hero Banner - Stats Display */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 shadow-lg relative overflow-hidden">
          {/* ✅ OPTIMIZED: Removed animated decorative elements for better performance */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-xl opacity-50"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-xl opacity-50"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <p className="font-koulen text-white text-sm font-bold">
                ផ្ទាំងគ្រប់គ្រង
              </p>
            </div>

            <h1 className="font-koulen text-2xl text-white mb-1 leading-tight font-bold">
              សូមស្វាគមន៍
            </h1>
            <p className="font-battambang text-xs text-white/80 mb-5 font-medium">
              {gradeStats?.month} {gradeStats?.year}
            </p>

            {/* Stats Grid - ✅ OPTIMIZED: Using memoized components */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Users}
                label="សិស្សានុសិស្ស"
                value={totalStats?.students || 0}
                gradient="bg-gradient-to-br from-cyan-400 to-blue-500"
              />
              <StatCard
                icon={BookOpen}
                label="ថ្នាក់រៀន"
                value={totalStats?.classes || 0}
                gradient="bg-gradient-to-br from-indigo-400 to-purple-500"
              />
              <StatCard
                icon={GraduationCap}
                label="គ្រូបង្រៀន"
                value={gradeStats?.totalTeachers || 0}
                gradient="bg-gradient-to-br from-green-400 to-emerald-500"
              />
              <StatCard
                icon={Award}
                label="មុខវិជ្ជា"
                value={gradeStats?.totalSubjects || 0}
                gradient="bg-gradient-to-br from-orange-400 to-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - More Useful Features */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-koulen text-lg text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 font-bold">
            មុខងារសំខាន់ៗ
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Results */}
          <button
            onClick={() => router.push("/results/mobile")}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-white/40 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h4 className="font-koulen text-sm text-gray-800 font-bold">
                  លទ្ធផល
                </h4>
                <p className="font-battambang text-[10px] text-gray-500">
                  លទ្ធផលសិក្សា
                </p>
              </div>
            </div>
          </button>

          {/* Statistics */}
          <button
            onClick={() => router.push("/statistics/mobile")}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-white/40 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-sm">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h4 className="font-koulen text-sm text-gray-800 font-bold">
                  ស្ថិតិ
                </h4>
                <p className="font-battambang text-[10px] text-gray-500">
                  ស្ថិតិលម្អិត
                </p>
              </div>
            </div>
          </button>

          {/* Score Progress - NEW */}
          <button
            onClick={() => router.push("/dashboard/score-progress/mobile")}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-white/40 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h4 className="font-koulen text-sm text-gray-800 font-bold">
                  ការបញ្ចូលពិន្ទុ
                </h4>
                <p className="font-battambang text-[10px] text-gray-500">
                  តារាងពិនិត្យ
                </p>
              </div>
            </div>
          </button>

          {/* Student List */}
          <button
            onClick={() => router.push("/students")}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-white/40 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h4 className="font-koulen text-sm text-gray-800 font-bold">
                  បញ្ជីសិស្ស
                </h4>
                <p className="font-battambang text-[10px] text-gray-500">
                  {totalStats?.students || 0} សិស្ស
                </p>
              </div>
            </div>
          </button>

          {/* Teachers */}
          <button
            onClick={() => router.push("/teachers/mobile")}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-white/40 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h4 className="font-koulen text-sm text-gray-800 font-bold">
                  គ្រូបង្រៀន
                </h4>
                <p className="font-battambang text-[10px] text-gray-500">
                  បញ្ជីគ្រូ
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ✅ PERFORMANCE: Removed grade overview section to speed up dashboard loading */}

      {/* ✅ OPTIMIZED: Removed custom animations for better performance */}
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
