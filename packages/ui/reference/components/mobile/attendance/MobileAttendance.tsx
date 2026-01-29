"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Download,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
} from "@/utils/academicYear";

type AttendanceValue = "" | "A" | "P"; // Empty = Present, A = Absent, P = Permission

interface StudentAttendance {
  studentId: string;
  studentName: string;
  khmerName: string;
  rollNumber?: number;
  gender: string;
  morningAttendance: {
    [day: number]: AttendanceValue;
  };
  afternoonAttendance: {
    [day: number]: AttendanceValue;
  };
}

interface MobileAttendanceProps {
  classId?: string;
  month?: string;
  year?: number;
}

// ✅ Same MONTHS structure as MobileGradeEntry
const MONTHS = [
  { value: "មករា", label: "មករា", number: 1 },
  { value: "កុម្ភៈ", label: "កុម្ភៈ", number: 2 },
  { value: "មីនា", label: "មីនា", number: 3 },
  { value: "មេសា", label: "មេសា", number: 4 },
  { value: "ឧសភា", label: "ឧសភា", number: 5 },
  { value: "មិថុនា", label: "មិថុនា", number: 6 },
  { value: "កក្កដា", label: "កក្កដា", number: 7 },
  { value: "សីហា", label: "សីហា", number: 8 },
  { value: "កញ្ញា", label: "កញ្ញា", number: 9 },
  { value: "តុលា", label: "តុលា", number: 10 },
  { value: "វិច្ឆិកា", label: "វិច្ឆិកា", number: 11 },
  { value: "ធ្នូ", label: "ធ្នូ", number: 12 },
];

// ✅ Get current Khmer month
const getCurrentKhmerMonth = () => {
  const monthNumber = new Date().getMonth() + 1; // 1-12
  const month = MONTHS.find((m) => m.number === monthNumber);
  return month?.value || "មករា";
};

export default function MobileAttendance({
  classId,
  month,
  year,
}: MobileAttendanceProps) {
  const router = useRouter();
  const { classes, isLoadingClasses, refreshClasses } = useData();
  const { currentUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const [selectedClass, setSelectedClass] = useState(classId || "");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentKhmerMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
  const [currentDay, setCurrentDay] = useState(new Date().getDate());

  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // ✅ Track if data has been loaded

  // ✅ NEW: Unsaved changes warning
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoLoaded = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const touchStartRef = useRef<number>(0);
  const touchMoveRef = useRef<number>(0);

  useEffect(() => {
    if (classes.length === 0 && !isLoadingClasses) {
      refreshClasses();
    }
  }, [classes.length, isLoadingClasses, refreshClasses]);

  // ✅ Get homeroom class ID for INSTRUCTOR
  const teacherHomeroomClassId = useMemo(() => {
    if (currentUser?.role === "TEACHER") {
      return currentUser.teacher?.homeroomClassId || null;
    }
    return null;
  }, [currentUser]);

  // ✅ Get class name
  const selectedClassName = useMemo(() => {
    const classObj = classes.find((c) => c.id === selectedClass);
    return classObj?.name || "";
  }, [classes, selectedClass]);

  const selectedMonthData = MONTHS.find((m) => m.value === selectedMonth);
  const monthNumber = selectedMonthData?.number || 1;
  const daysInMonth = new Date(selectedYear, monthNumber, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ✅ Auto-select class for INSTRUCTOR (but don't auto-load)
  useEffect(() => {
    if (
      !authLoading &&
      currentUser &&
      teacherHomeroomClassId &&
      !selectedClass &&
      !hasAutoLoaded.current
    ) {
      setSelectedClass(teacherHomeroomClassId);
      hasAutoLoaded.current = true;
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [authLoading, currentUser, teacherHomeroomClassId, selectedClass]);

  const loadAttendanceData = useCallback(
    async (refresh = false) => {
      if (!selectedClass) {
        setStudents([]);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoadingData(true);
      }
      setError(null);
      setHasUnsavedChanges(false);

      try {
        // Abort previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/attendance/grid/${selectedClass}?month=${selectedMonth}&year=${selectedYear}`,
          { 
            signal: abortControllerRef.current.signal,
            credentials: "include", // ✅ iOS 16 FIX: Required for PWA mode
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`មានបញ្ហា:  ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to load attendance");
        }

        const gridData = result.data;

        const studentsData: StudentAttendance[] = gridData.students.map(
          (student: any) => {
            const morningAttendance: { [day: number]: AttendanceValue } = {};
            const afternoonAttendance: { [day: number]: AttendanceValue } = {};

            daysArray.forEach((day) => {
              const morningKey = `${day}_M`;
              const afternoonKey = `${day}_A`;

              const morningData = student.attendance[morningKey];
              const afternoonData = student.attendance[afternoonKey];

              // Morning session
              morningAttendance[day] = (morningData?.displayValue ||
                "") as AttendanceValue;

              // Afternoon session
              afternoonAttendance[day] = (afternoonData?.displayValue ||
                "") as AttendanceValue;
            });

            return {
              studentId: student.studentId,
              studentName: student.studentName,
              khmerName: student.studentName,
              gender: student.gender,
              morningAttendance,
              afternoonAttendance,
            };
          }
        );

        setStudents(studentsData);
        setDataLoaded(true); // ✅ Mark as loaded
      } catch (error: any) {
        if (error.name !== "AbortError") {
          setError(`មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ:  ${error.message}`);
        }
      } finally {
        setLoadingData(false);
        setIsRefreshing(false);
      }
    },
    [selectedClass, selectedMonth, selectedYear, monthNumber, daysArray]
  );

  // ✅ Toggle student status for morning or afternoon - NO AUTO SAVE
  const toggleStudentStatus = (studentId: string, session: "M" | "A") => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.studentId !== studentId) return student;

        const attendanceMap =
          session === "M"
            ? student.morningAttendance
            : student.afternoonAttendance;
        const currentValue = attendanceMap[currentDay] || "";

        // Cycle through: "" (Present) -> "A" (Absent) -> "P" (Permission) -> "" (Present)
        const valueCycle: AttendanceValue[] = ["", "A", "P"];
        const currentIndex = valueCycle.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % valueCycle.length;
        const nextValue = valueCycle[nextIndex];

        if (session === "M") {
          return {
            ...student,
            morningAttendance: {
              ...student.morningAttendance,
              [currentDay]: nextValue,
            },
          };
        } else {
          return {
            ...student,
            afternoonAttendance: {
              ...student.afternoonAttendance,
              [currentDay]: nextValue,
            },
          };
        }
      })
    );

    // ✅ ONLY mark as unsaved - NO AUTO SAVE
    setHasUnsavedChanges(true);
  };

  // ✅ OPTIMIZED: Manual Save with performance tracking
  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      // If no changes, just show success briefly
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1000);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    const startTime = performance.now();

    try {
      const attendanceRecords: any[] = [];

      // ✅ Save BOTH morning and afternoon sessions for current day
      students.forEach((student) => {
        const morningValue = student.morningAttendance[currentDay] || "";
        const afternoonValue = student.afternoonAttendance[currentDay] || "";

        // Save morning session
        attendanceRecords.push({
          studentId: student.studentId,
          day: currentDay,
          session: "M",
          value: morningValue,
        });

        // Save afternoon session
        attendanceRecords.push({
          studentId: student.studentId,
          day: currentDay,
          session: "A",
          value: afternoonValue,
        });
      });

      console.log(
        `📤 Sending ${attendanceRecords.length} attendance records...`
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/attendance/bulk-save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // ✅ iOS 16 FIX: Required for PWA mode
          body: JSON.stringify({
            classId: selectedClass,
            month: selectedMonth,
            year: selectedYear,
            monthNumber: monthNumber,
            attendance: attendanceRecords,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();

      const elapsedTime = Math.round(performance.now() - startTime);
      console.log(
        `✅ Save completed in ${elapsedTime}ms (${
          result.data?.performanceMs || "?"
        }ms backend)`
      );

      if (result.success) {
        setSaveSuccess(true);
        setHasUnsavedChanges(false);

        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);

        // ✅ Optional: Show performance info in dev mode
        if (process.env.NODE_ENV === "development" && elapsedTime < 500) {
          console.log(`⚡ Fast save! Total: ${elapsedTime}ms`);
        }
      } else {
        throw new Error(result.message || "Save failed");
      }
    } catch (error: any) {
      console.error("❌ Save error:", error);
      alert(`មានបញ្ហាក្នុងការរក្សាទុក: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Set all status for a specific session - NO AUTO SAVE
  const setAllStatus = (value: AttendanceValue, session: "M" | "A") => {
    setStudents((prev) =>
      prev.map((student) => {
        if (session === "M") {
          return {
            ...student,
            morningAttendance: {
              ...student.morningAttendance,
              [currentDay]: value,
            },
          };
        } else {
          return {
            ...student,
            afternoonAttendance: {
              ...student.afternoonAttendance,
              [currentDay]: value,
            },
          };
        }
      })
    );
    setHasUnsavedChanges(true); // Mark as unsaved only
  };

  // ✅ NEW: Handle unsaved changes warning
  const handleSaveAndContinue = async () => {
    try {
      setShowUnsavedWarning(false);
      setSaving(true);

      // Save first
      await handleSave();

      // Clear the unsaved flag before navigation
      setHasUnsavedChanges(false);

      // Then execute pending action (could be navigation or state change)
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (error) {
      console.error("Error during save and continue:", error);
      setShowUnsavedWarning(false);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
    setSaving(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelChange = () => {
    setShowUnsavedWarning(false);
    setPendingAction(null);
  };

  const handlePrevDay = () => {
    if (currentDay > 1) {
      if (hasUnsavedChanges) {
        setPendingAction(() => () => setCurrentDay((prev) => prev - 1));
        setShowUnsavedWarning(true);
      } else {
        setCurrentDay((prev) => prev - 1);
      }
    }
  };

  const handleNextDay = () => {
    if (currentDay < daysInMonth) {
      if (hasUnsavedChanges) {
        setPendingAction(() => () => setCurrentDay((prev) => prev + 1));
        setShowUnsavedWarning(true);
      } else {
        setCurrentDay((prev) => prev + 1);
      }
    }
  };

  const handleDayChange = (newDay: number) => {
    // Don't do anything if clicking the same day
    if (newDay === currentDay) return;

    if (hasUnsavedChanges) {
      setPendingAction(() => () => setCurrentDay(newDay));
      setShowUnsavedWarning(true);
    } else {
      setCurrentDay(newDay);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedMonth(newMonth);
        setCurrentDay(1);
        setStudents([]);
        setDataLoaded(false);
      });
      setShowUnsavedWarning(true);
    } else {
      setSelectedMonth(newMonth);
      setCurrentDay(1);
      setStudents([]);
      setDataLoaded(false);
    }
  };

  const handleYearChange = (newYear: number) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedYear(newYear);
        setStudents([]);
        setDataLoaded(false);
      });
      setShowUnsavedWarning(true);
    } else {
      setSelectedYear(newYear);
      setStudents([]);
      setDataLoaded(false);
    }
  };

  const handleClassChange = (newClassId: string) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedClass(newClassId);
        setStudents([]);
        setDataLoaded(false);
      });
      setShowUnsavedWarning(true);
    } else {
      setSelectedClass(newClassId);
      setStudents([]);
      setDataLoaded(false);
    }
  };

  // ✅ Calculate totals with real-time counts (A or P can be 0, 1, or 2 per student per day)
  const currentDaySummary = useMemo(() => {
    let totalAbsent = 0;
    let totalPermission = 0;
    let totalPresent = 0;

    students.forEach((student) => {
      const morningValue = student.morningAttendance[currentDay] || "";
      const afternoonValue = student.afternoonAttendance[currentDay] || "";

      // Count A and P for both sessions
      if (morningValue === "A") totalAbsent++;
      if (afternoonValue === "A") totalAbsent++;
      if (morningValue === "P") totalPermission++;
      if (afternoonValue === "P") totalPermission++;

      // Count as present only if both sessions are present (no A or P)
      if (morningValue === "" && afternoonValue === "") {
        totalPresent++;
      }
    });

    return {
      present: totalPresent,
      absent: totalAbsent,
      permission: totalPermission,
    };
  }, [students, currentDay]);

  // ✅ Protect against navigation away from page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Modern browsers require this
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // ✅ Intercept Next.js client-side navigation (tab bar, etc.)
  useEffect(() => {
    const handleRouteChange = (e: MouseEvent) => {
      if (!hasUnsavedChanges) return;

      // Check if clicking on a navigation link
      const target = e.target as HTMLElement;
      const link = target.closest("a[href]") as HTMLAnchorElement;

      if (link) {
        const href = link.getAttribute("href");
        // Only block if navigating away from current page
        if (href && !href.startsWith("#") && !href.includes("/attendance")) {
          e.preventDefault();
          e.stopPropagation();

          console.log("🚫 Navigation blocked - unsaved changes detected");

          // Store the intended navigation URL
          setPendingAction(() => () => {
            console.log("✅ Navigating to:", href);
            // Clear unsaved flag before navigation
            setHasUnsavedChanges(false);
            // Use Next.js router for client-side navigation
            router.push(href);
          });
          setShowUnsavedWarning(true);
        }
      }
    };

    // Capture phase to intercept before Next.js Link processes the click
    document.addEventListener("click", handleRouteChange, true);

    return () => {
      document.removeEventListener("click", handleRouteChange, true);
    };
  }, [hasUnsavedChanges, router]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // ✅ Loading state
  if (authLoading) {
    return (
      <MobileLayout title="វត្តមាន • Attendance">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  // ✅ No permission state
  if (
    currentUser &&
    !teacherHomeroomClassId &&
    currentUser.role === "TEACHER"
  ) {
    return (
      <MobileLayout title="វត្តមាន • Attendance">
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-800 mb-2">
              អ្នកមិនមានសិទ្ធិចូលប្រើប្រាស់
            </p>
            <p className="text-xs text-gray-600">
              មានតែគ្រូប្រចាំថ្នាក់ (INSTRUCTOR) ទើបអាចបញ្ចូលអវត្តមានបាន
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="វត្តមាន • Attendance">
      {/* Clean Modern Header */}
      <div className="bg-white px-5 pt-6 pb-5 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-koulen text-xl text-gray-900 leading-tight">
              វត្តមាន
            </h1>
            <p className="font-battambang text-xs text-gray-500">
              Attendance Tracking
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col min-h-full bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
        {/* Modern Filters Section */}
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Class Info Card */}
          {selectedClassName && (
            <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-green-200 rounded-3xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-battambang text-xs text-green-700 font-semibold mb-0.5">
                    ថ្នាក់របស់អ្នក • Your Class
                  </p>
                  <p className="font-koulen text-base text-gray-900">
                    {selectedClassName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Month & Year Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <label className="font-battambang text-sm font-semibold text-gray-700">
                ខែ និងឆ្នាំ • Month & Year
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full h-12 px-3 font-battambang bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                style={{ fontSize: "16px" }}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear.toString()}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="w-full h-12 px-3 font-battambang bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                style={{ fontSize: "16px" }}
              >
                {getAcademicYearOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Load Data Button */}
          <button
            onClick={() => loadAttendanceData()}
            disabled={!selectedClass || loadingData}
            className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl font-battambang font-semibold text-base flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
          >
            {loadingData ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                កំពុងផ្ទុក...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                ផ្ទុកទិន្នន័យ
              </>
            )}
          </button>

          {/* Modern Save Button */}
          {dataLoaded && (
            <button
              onClick={handleSave}
              disabled={saving || (!hasUnsavedChanges && !saveSuccess)}
              className={`w-full h-14 rounded-2xl font-koulen flex items-center justify-center gap-2 transition-all shadow-md ${
                saving
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                  : saveSuccess
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                  : hasUnsavedChanges
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:scale-95"
                  : "bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>កំពុងរក្សាទុក...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>រក្សាទុករួចរាល់ ✓</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Save className="w-5 h-5" />
                  <span>រក្សាទុក • Save</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>រួចរាល់ • Saved</span>
                </>
              )}
            </button>
          )}

          {/* Unsaved Changes Warning */}
          {hasUnsavedChanges && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-3 shadow-sm">
              <p className="font-battambang text-xs text-orange-700 text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                មានការផ្លាស់ប្តូរមិនទាន់រក្សាទុក • សូមចុច "រក្សាទុក"
              </p>
            </div>
          )}

          {/* INSTRUCTOR Badge */}
          {currentUser?.role === "TEACHER" &&
            teacherHomeroomClassId === selectedClass && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-3 shadow-sm">
                <p className="font-battambang text-xs text-green-700 text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  អ្នកគឺជា INSTRUCTOR - គ្រប់គ្រងអវត្តមានថ្នាក់នេះ
                </p>
              </div>
            )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mx-4 mt-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="font-battambang text-sm text-red-700 flex-1 pt-2">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingData && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
              <p className="font-battambang text-sm font-semibold text-gray-700">
                កំពុងផ្ទុកទិន្នន័យ...
              </p>
              <p className="font-battambang text-xs text-gray-500 mt-1">
                Loading attendance data
              </p>
            </div>
          </div>
        )}

        {/* Main Content - SCROLLABLE */}
        {!loadingData && students.length > 0 ? (
          <div className="w-full pb-20">
            {/* Modern Day Navigator */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

              <div className="relative px-4 py-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handlePrevDay}
                    disabled={currentDay === 1}
                    className="p-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl disabled:opacity-30 transition-all active:scale-95 shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>

                  <div className="text-center flex-1 px-4">
                    <div className="font-koulen text-3xl text-white drop-shadow-lg">
                      ថ្ងៃទី {currentDay}
                    </div>
                    <div className="font-battambang text-xs text-green-100 mt-1">
                      {selectedMonth} {selectedYear}
                    </div>
                  </div>

                  <button
                    onClick={handleNextDay}
                    disabled={currentDay === daysInMonth}
                    className="p-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl disabled:opacity-30 transition-all active:scale-95 shadow-md"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Day Grid Selector */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2.5">
                  <div className="grid grid-cols-7 gap-1.5">
                    {daysArray.map((day) => (
                      <button
                        key={day}
                        onClick={() => handleDayChange(day)}
                        className={`h-9 rounded-xl font-battambang text-sm font-semibold transition-all ${
                          day === currentDay
                            ? "bg-white text-green-700 shadow-lg scale-110"
                            : "bg-white/20 text-white hover:bg-white/30 active:scale-95"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Removed (not needed with individual session controls) */}

            {/* Modern Summary Cards */}
            <div className="px-4 py-4 bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                <h1 className="font-koulen text-base text-gray-900">
                  សង្ខេបសរុប
                </h1>
              </div>
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-2 shadow-md">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-koulen text-2xl text-green-600">
                      {currentDaySummary.present}
                    </div>
                    <div className="font-battambang text-[9px] text-gray-600 font-medium mt-0.5">
                      Present
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center mb-2 shadow-md">
                      <X className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-koulen text-2xl text-red-600">
                      {currentDaySummary.absent}
                    </div>
                    <div className="font-battambang text-[9px] text-gray-600 font-medium mt-0.5">
                      Absent
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mb-2 shadow-md">
                      <span className="font-koulen text-base text-white">
                        P
                      </span>
                    </div>
                    <div className="font-koulen text-2xl text-orange-600">
                      {currentDaySummary.permission}
                    </div>
                    <div className="font-battambang text-[9px] text-gray-600 font-medium mt-0.5">
                      Permission
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-indigo-100 to-blue-100 border border-indigo-200 rounded-xl p-2.5">
                <p className="font-battambang text-xs text-indigo-800 text-center">
                  A/P can be 0-2 per student (M+A sessions)
                </p>
              </div>
            </div>

            {/* Student List - with Morning/Afternoon Sessions */}
            <div className="px-4 py-3 space-y-3">
              {students.map((student, index) => {
                const morningValue =
                  student.morningAttendance[currentDay] || "";
                const afternoonValue =
                  student.afternoonAttendance[currentDay] || "";

                // Helper to get button style
                const getButtonStyle = (value: AttendanceValue) => {
                  if (value === "A") {
                    return "bg-red-500 text-white border-red-600";
                  } else if (value === "P") {
                    return "bg-orange-500 text-white border-orange-600";
                  } else {
                    return "bg-green-500 text-white border-green-600";
                  }
                };

                // Helper to get button label
                const getButtonLabel = (value: AttendanceValue) => {
                  if (value === "A") return "A";
                  if (value === "P") return "P";
                  return "✓";
                };

                return (
                  <div
                    key={student.studentId}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-koulen text-base shadow-md">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-battambang text-sm font-bold text-gray-900">
                          {student.khmerName}
                        </div>
                        <div
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-battambang font-medium mt-1 ${
                            student.gender === "M"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-pink-100 text-pink-700"
                          }`}
                        >
                          {student.gender === "M" ? "ប្រុស" : "ស្រី"}
                        </div>
                      </div>
                    </div>

                    {/* Session Controls */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Morning */}
                      <div>
                        <div className="font-battambang text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
                          🌅 ព្រឹក
                        </div>
                        <button
                          onClick={() =>
                            toggleStudentStatus(student.studentId, "M")
                          }
                          className={`w-full h-13 rounded-xl font-koulen text-xl shadow-md transition-all active:scale-95 border-2 ${getButtonStyle(
                            morningValue
                          )}`}
                        >
                          {getButtonLabel(morningValue)}
                        </button>
                      </div>

                      {/* Afternoon */}
                      <div>
                        <div className="font-battambang text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                          🌆 ល្ងាច
                        </div>
                        <button
                          onClick={() =>
                            toggleStudentStatus(student.studentId, "A")
                          }
                          className={`w-full h-13 rounded-xl font-koulen text-xl shadow-md transition-all active:scale-95 border-2 ${getButtonStyle(
                            afternoonValue
                          )}`}
                        >
                          {getButtonLabel(afternoonValue)}
                        </button>
                      </div>
                    </div>

                    {/* Hint */}
                    <div className="mt-3 text-center">
                      <p className="font-battambang text-xs text-gray-500">
                        Tap: ✓ → A → P
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : !loadingData && !error && !dataLoaded ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-xs">
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <ClipboardCheck className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="font-koulen text-lg text-gray-900 mb-2">
                ជ្រើសរើសថ្នាក់រៀន
              </h1>
              <p className="font-battambang text-sm text-gray-600 leading-relaxed mb-1">
                សូមជ្រើសរើសខែ និងឆ្នាំ
              </p>
              <p className="font-battambang text-xs text-gray-500">
                ហើយចុច "ផ្ទុកទិន្នន័យ" ដើម្បីចាប់ផ្តើម
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ✅ Floating Save Button - Shows when there are unsaved changes */}
      {dataLoaded && hasUnsavedChanges && !showUnsavedWarning && (
        <div className="fixed right-5 bottom-24 z-40 flex flex-col items-end gap-2 animate-in slide-in-from-right duration-300">
          {/* Tooltip */}
          <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-battambang font-medium shadow-lg whitespace-nowrap">
            រក្សាទុក • Save
          </div>

          {/* FAB Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              saving
                ? "bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse"
                : saveSuccess
                ? "bg-gradient-to-r from-green-500 to-green-600 scale-110"
                : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            }`}
            style={{
              animation:
                hasUnsavedChanges && !saving && !saveSuccess
                  ? "bounce 2s infinite"
                  : "none",
            }}
          >
            {saving ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-7 h-7 text-white" />
            ) : (
              <>
                <Save className="w-7 h-7 text-white" />
                {/* Pulse ring */}
                <span className="absolute inset-0 rounded-full border-4 border-orange-400 opacity-0 animate-ping"></span>
              </>
            )}

            {/* Unsaved indicator badge */}
            {!saving && !saveSuccess && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white">
                <span className="text-[10px] font-bold">!</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* ✅ Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <h1 className="font-koulen text-xl text-gray-900">
                  មានការផ្លាស់ប្តូរមិនទាន់រក្សាទុក
                </h1>
                <p className="font-battambang text-xs text-gray-600 mt-1">
                  Unsaved Changes
                </p>
              </div>
            </div>

            <p className="font-battambang text-sm text-gray-700 mb-6 leading-relaxed">
              អ្នកមានការផ្លាស់ប្តូរវត្តមានដែលមិនទាន់បានរក្សាទុក។
              តើអ្នកចង់ធ្វើយ៉ាងណា?
            </p>

            <div className="space-y-3">
              {/* Save & Continue Button */}
              <button
                onClick={handleSaveAndContinue}
                disabled={saving}
                className="w-full px-5 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-koulen rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>កំពុងរក្សាទុក...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>រក្សាទុក ហើយបន្ត • Save & Continue</span>
                  </>
                )}
              </button>

              {/* Don't Save Button */}
              <button
                onClick={handleDiscardChanges}
                disabled={saving}
                className="w-full px-5 py-3.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-battambang font-semibold rounded-2xl transition-all active:scale-[0.98]"
              >
                កុំរក្សាទុក • Don't Save
              </button>

              {/* Cancel Button */}
              <button
                onClick={handleCancelChange}
                disabled={saving}
                className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 hover:border-gray-300 disabled:border-gray-100 text-gray-700 font-battambang font-semibold rounded-2xl transition-all active:scale-[0.98]"
              >
                បោះបង់ • Cancel
              </button>
            </div>

            <p className="font-battambang text-xs text-gray-500 mt-4 text-center">
              💡 ចុច "រក្សាទុក ហើយបន្ត" ដើម្បីរក្សាការផ្លាស់ប្តូរមុនពេលចេញ
            </p>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
