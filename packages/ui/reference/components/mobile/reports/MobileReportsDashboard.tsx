// 📂 src/components/mobile/reports/MobileReportsDashboard.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  BarChart3,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Award,
  ChevronRight,
  ArrowLeft,
  Users,
  Search,
  Bell,
  MapPin,
  Sparkles,
  BookOpen,
  Target,
  Calendar,
  TrendingUp,
  Shield,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useData } from "@/context/DataContext";
import { useRouter } from "next/navigation";
import { gradeApi } from "@/lib/api/grades";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
} from "@/utils/academicYear";

interface StudentGrade {
  studentId: string;
  studentName: string;
  gender: string;
  score: number | null;
  maxScore: number;
}

interface SubjectStatus {
  subjectId: string;
  subjectName: string;
  subjectNameKh: string;
  subjectCode: string;
  maxScore: number;
  coefficient: number;
  totalStudents: number;
  studentsWithGrades: number;
  completionRate: number;
  isComplete: boolean;
  studentGrades: StudentGrade[];
  // ✅ NEW: Confirmation status
  isConfirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: Date;
  confirmedByUser?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

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

const getCurrentKhmerMonth = () => {
  const monthNumber = new Date().getMonth() + 1;
  const month = MONTHS.find((m) => m.number === monthNumber);
  return month?.value || "មករា";
};

export default function MobileReportsDashboard() {
  const { classes, isLoadingClasses, refreshClasses } = useData();
  const router = useRouter();

  // ✅ Hide scrollbar globally for this component
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .mobile-reports-container::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // ✅ Proactively refresh classes if empty
  useEffect(() => {
    if (classes.length === 0 && !isLoadingClasses) {
      console.log("📚 [Mobile Reports] Classes array is empty, fetching classes...");
      refreshClasses();
    }
  }, [classes.length, isLoadingClasses, refreshClasses]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentKhmerMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
  const [subjects, setSubjects] = useState<SubjectStatus[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [classInfo, setClassInfo] = useState<{
    className: string;
    grade: string;
    track?: string;
  } | null>(null);

  const loadSubjectStatus = async () => {
    if (!selectedClass) return;

    try {
      setLoading(true);
      const classData = classes.find((c) => c.id === selectedClass);

      if (!classData) {
        throw new Error("Class not found");
      }

      // ✅ Fetch both grades and confirmations in parallel
      const [response, confirmationsData] = await Promise.all([
        gradeApi.getGradesGrid(
          selectedClass,
          selectedMonth,
          selectedYear
        ),
        gradeApi.getConfirmations(
          selectedClass,
          selectedMonth,
          selectedYear
        ).catch((error) => {
          console.error("Failed to fetch confirmations:", error);
          return []; // Return empty array if fails
        }),
      ]);

      // ✅ Create a map of confirmations by subjectId
      const confirmationsMap = new Map<string, {
        id: string;
        confirmedBy: string;
        confirmedAt: Date;
        user: {
          firstName: string;
          lastName: string;
          email: string;
          role: string;
        };
      }>(
        confirmationsData.map((conf: any) => [
          conf.subjectId,
          {
            id: conf.id,
            confirmedBy: conf.confirmedBy,
            confirmedAt: new Date(conf.confirmedAt),
            user: conf.user,
          },
        ])
      );

      const subjectStatuses: SubjectStatus[] = response.subjects.map(
        (subject: any) => {
          const studentGrades: StudentGrade[] = response.students.map(
            (student: any) => {
              // ✅ FIX: grades is an object with subject IDs as keys, not an array
              const grade = student.grades?.[subject.id];
              return {
                studentId: student.studentId,
                // ✅ FIX: Use studentName field if khmerName is not available
                studentName:
                  student.studentName || student.khmerName || student.studentId,
                gender: student.gender,
                score: grade?.score ?? null,
                maxScore: subject.maxScore,
              };
            }
          );

          const studentsWithGrades = studentGrades.filter(
            (sg) => sg.score !== null
          ).length;
          const totalStudents = studentGrades.length;
          const completionRate =
            totalStudents > 0
              ? Math.round((studentsWithGrades / totalStudents) * 100)
              : 0;

          // ✅ Mark blank scores as "A" (Absent) when >90% have scores
          const updatedStudentGrades = studentGrades.map((sg) => {
            if (sg.score === null && completionRate > 90) {
              return {
                ...sg,
                studentName: `${sg.studentName} (A)`,
              };
            }
            return sg;
          });

          // ✅ Get confirmation status
          const confirmation = confirmationsMap.get(subject.id);
          const isConfirmed = !!confirmation;

          return {
            subjectId: subject.code,
            subjectName: subject.nameEn,
            subjectNameKh: subject.nameKh,
            subjectCode: subject.code,
            maxScore: subject.maxScore,
            coefficient: subject.coefficient,
            totalStudents,
            studentsWithGrades,
            completionRate,
            isComplete: studentsWithGrades === totalStudents,
            studentGrades: updatedStudentGrades,
            // ✅ NEW: Add confirmation data
            isConfirmed,
            confirmedBy: confirmation?.confirmedBy,
            confirmedAt: confirmation?.confirmedAt,
            confirmedByUser: confirmation?.user,
          };
        }
      );

      setSubjects(subjectStatuses);
      setClassInfo({
        className: classData.name,
        grade: classData.grade,
        track: (classData as any).track || undefined,
      });
      setDataLoaded(true);
    } catch (error) {
      console.error("Error loading subject status:", error);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalSubjects = subjects.length;
  const completedSubjects = subjects.filter((s) => s.isComplete).length;
  const confirmedSubjects = subjects.filter((s) => s.isConfirmed).length;
  const overallCompletion =
    totalSubjects > 0
      ? Math.round((completedSubjects / totalSubjects) * 100)
      : 0;

  const handleViewReport = () => {
    router.push(
      `/reports/mobile?class=${selectedClass}&month=${selectedMonth}&year=${selectedYear}`
    );
  };

  const handleViewSubjectDetails = () => {
    const selectedClassName = classes.find((c) => c.id === selectedClass)?.name || "Class";
    router.push(
      `/reports/mobile?view=subject-details&class=${selectedClass}&month=${selectedMonth}&year=${selectedYear}&className=${encodeURIComponent(selectedClassName)}`
    );
  };

  // ✅ Subject Detail Modal
  if (selectedSubject) {
    const isVerified = selectedSubject.isConfirmed;

    return (
      <MobileLayout title="ព័ត៌មានលម្អិត">
        <div className={`mobile-reports-container flex flex-col min-h-full ${
          isVerified
            ? "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"
            : "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50"
        }`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Header */}
          <div className={`px-4 pt-6 pb-4 shadow-lg relative overflow-hidden ${
            isVerified
              ? "bg-gradient-to-br from-green-500 to-emerald-600"
              : "bg-gradient-to-br from-orange-500 to-amber-600"
          }`}>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

            <button
              onClick={() => setSelectedSubject(null)}
              className="flex items-center gap-2 text-white font-battambang font-semibold mb-4 active:scale-95 transition-transform relative z-10 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>ត្រឡប់ក្រោយ</span>
            </button>

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h1 className="font-koulen text-2xl text-white mb-2 drop-shadow-sm">
                    {selectedSubject.subjectNameKh}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="font-battambang text-sm text-white/90 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                      {selectedSubject.subjectCode}
                    </span>
                    <span className="font-battambang text-sm text-white/90">
                      •
                    </span>
                    <span className="font-battambang text-sm text-white/90">
                      Max: {selectedSubject.maxScore} ពិន្ទុ
                    </span>
                  </div>
                </div>
                {/* ✅ Confirmation Badge */}
                {isVerified ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-lg">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span className="font-battambang text-sm font-bold text-green-700">
                      បានបញ្ជាក់ ✓
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-lg animate-pulse">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <span className="font-battambang text-sm font-bold text-orange-700">
                      មិនទាន់បញ្ជាក់
                    </span>
                  </div>
                )}
              </div>

              {/* ✅ Show confirmation details if confirmed */}
              {isVerified && selectedSubject.confirmedAt && (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <p className="font-battambang text-xs text-white font-semibold">
                      បញ្ជាក់ដោយ:{" "}
                      {selectedSubject.confirmedByUser
                        ? `${selectedSubject.confirmedByUser.firstName} ${selectedSubject.confirmedByUser.lastName}`
                        : "N/A"}
                    </p>
                  </div>
                  <p className="font-battambang text-[10px] text-white/80 ml-8">
                    {new Date(selectedSubject.confirmedAt).toLocaleString(
                      "km-KH",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 pt-4 pb-2">
            <div className={`rounded-2xl shadow-lg p-4 border-2 ${
              isVerified
                ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
            }`}>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${
                    isVerified
                      ? "bg-green-100"
                      : "bg-orange-100"
                  }`}>
                    <Users className={`w-5 h-5 ${
                      isVerified ? "text-green-600" : "text-orange-600"
                    }`} />
                  </div>
                  <p className="font-battambang text-[10px] text-gray-600 mb-1 font-semibold">
                    សិស្សសរុប
                  </p>
                  <p className={`font-koulen text-2xl ${
                    isVerified ? "text-green-700" : "text-orange-700"
                  }`}>
                    {selectedSubject.totalStudents}
                  </p>
                </div>
                <div className="text-center border-x-2 border-gray-200">
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${
                    isVerified
                      ? "bg-green-100"
                      : "bg-orange-100"
                  }`}>
                    <CheckCircle2 className={`w-5 h-5 ${
                      isVerified ? "text-green-600" : "text-orange-600"
                    }`} />
                  </div>
                  <p className="font-battambang text-[10px] text-gray-600 mb-1 font-semibold">
                    បានបញ្ចូល
                  </p>
                  <p className={`font-koulen text-2xl ${
                    isVerified ? "text-green-700" : "text-orange-700"
                  }`}>
                    {selectedSubject.studentsWithGrades}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${
                    isVerified
                      ? "bg-green-100"
                      : "bg-orange-100"
                  }`}>
                    <TrendingUp className={`w-5 h-5 ${
                      isVerified ? "text-green-600" : "text-orange-600"
                    }`} />
                  </div>
                  <p className="font-battambang text-[10px] text-gray-600 mb-1 font-semibold">
                    ភាគរយ
                  </p>
                  <p className={`font-koulen text-2xl ${
                    isVerified ? "text-green-700" : "text-orange-700"
                  }`}>
                    {selectedSubject.completionRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="px-4 pb-20">
            <h1 className="font-koulen text-lg text-gray-900 mb-3 mt-2">
              បញ្ជីសិស្ស
            </h1>
            <div className="space-y-2">
              {selectedSubject.studentGrades.map((student, index) => (
                <div
                  key={student.studentId}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-battambang text-sm font-bold text-gray-900">
                          {student.studentName}
                        </p>
                        <p className="font-battambang text-xs text-gray-500">
                          {student.gender === "ប" ? "ប្រុស" : "ស្រី"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {student.score !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="font-koulen text-2xl text-green-600">
                            {student.score}
                          </span>
                          <span className="font-battambang text-xs text-gray-400">
                            /{student.maxScore}
                          </span>
                        </div>
                      ) : (
                        <span className="font-battambang text-xs text-red-500 font-semibold">
                          មិនទាន់បញ្ចូល
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // ✅ Main Dashboard View - Modern Style
  return (
    <MobileLayout title="របាយការណ៍ • Reports">
      <div className="mobile-reports-container flex flex-col min-h-full bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Clean Modern Header */}
        <div className="bg-white px-5 pt-6 pb-5 shadow-sm">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-koulen text-orange-500 text-sm leading-tight">
                  របាយការណ៍
                </p>
                <p className="font-battambang text-[10px] text-gray-500">
                  Grade Entry Reports
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
                <Bell className="w-4 h-4 text-orange-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section - Clean Cards */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <h1 className="font-koulen text-lg text-gray-900">
              ជ្រើសរើសថ្នាក់
            </h1>
          </div>

          {/* Class Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
            <label className="block font-battambang text-xs text-gray-600 font-semibold mb-2 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              ថ្នាក់រៀន • Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setDataLoaded(false);
              }}
              disabled={isLoadingClasses}
              className="w-full h-11 px-3 text-sm font-battambang font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
              style={{ fontSize: "16px" }}
            >
              <option value="">
                {isLoadingClasses ? "កំពុងផ្ទុក..." : "-- ជ្រើសរើសថ្នាក់ --"}
              </option>
              {!isLoadingClasses &&
                classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <label className="block font-battambang text-xs text-gray-600 font-semibold mb-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                ខែ
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setDataLoaded(false);
                }}
                className="w-full h-11 px-3 text-sm font-battambang font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
                style={{ fontSize: "16px" }}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <label className="block font-battambang text-xs text-gray-600 font-semibold mb-2">
                ឆ្នាំ
              </label>
              <select
                value={selectedYear.toString()}
                onChange={(e) => {
                  setSelectedYear(parseInt(e.target.value));
                  setDataLoaded(false);
                }}
                className="w-full h-11 px-3 text-sm font-battambang font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
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

          {/* Check Button */}
          <button
            onClick={loadSubjectStatus}
            disabled={!selectedClass || loading}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-koulen rounded-2xl shadow-md active:scale-95 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>កំពុងពិនិត្យ...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>ពិនិត្យស្ថានភាព</span>
              </>
            )}
          </button>
        </div>

        {/* Content */}
        {dataLoaded && subjects.length > 0 ? (
          <div className="w-full pb-20">
            {/* Summary Card */}
            <div className="px-5 pt-3 pb-4">
              <div className="bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 rounded-3xl p-5 shadow-md border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200 to-pink-200 rounded-full opacity-20 blur-3xl"></div>

                <div className="relative z-10">
                  {/* Track Indicator for Grade 11/12 */}
                  {classInfo &&
                    (classInfo.grade === "11" || classInfo.grade === "12") && (
                      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                        <div className="flex-1">
                          <p className="font-battambang text-xs text-gray-500 font-semibold mb-1">
                            ថ្នាក់
                          </p>
                          <p className="font-koulen text-base text-gray-900">
                            {classInfo.className}
                          </p>
                        </div>
                        {classInfo.track && (
                          <div
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md ${
                              classInfo.track === "science"
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                                : "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                            }`}
                          >
                            {classInfo.track === "science"
                              ? "🔬 វិទ្យាសាស្ត្រ"
                              : "🌍 សង្គម"}
                          </div>
                        )}
                        <div className="text-right">
                          <p className="font-battambang text-xs text-gray-500 font-semibold mb-1">
                            មុខវិជ្ជា
                          </p>
                          <p className="font-koulen text-base text-gray-900">
                            {totalSubjects}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Progress - Modern Grid */}
                  <div className="space-y-3 mb-3">
                    {/* Completion Progress */}
                    <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-battambang text-xs text-white/90 font-semibold">
                          ភាពពេញលេញ • Completion
                        </p>
                        <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                          <p className="font-koulen text-2xl text-white">
                            {overallCompletion}%
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-500"
                          style={{ width: `${overallCompletion}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Imported */}
                      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border-2 border-green-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </div>
                          <p className="font-battambang text-[10px] text-gray-600 font-semibold">
                            បានបញ្ចូល
                          </p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="font-koulen text-3xl text-green-600">
                            {completedSubjects}
                          </p>
                          <p className="font-battambang text-sm text-gray-400">
                            /{totalSubjects}
                          </p>
                        </div>
                      </div>

                      {/* Verified */}
                      <div className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm ${
                        confirmedSubjects === totalSubjects
                          ? "border-2 border-blue-200"
                          : "border-2 border-orange-200"
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            confirmedSubjects === totalSubjects
                              ? "bg-blue-100"
                              : "bg-orange-100"
                          }`}>
                            <Shield className={`w-4 h-4 ${
                              confirmedSubjects === totalSubjects
                                ? "text-blue-600"
                                : "text-orange-600"
                            }`} />
                          </div>
                          <p className="font-battambang text-[10px] text-gray-600 font-semibold">
                            បានបញ្ជាក់
                          </p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className={`font-koulen text-3xl ${
                            confirmedSubjects === totalSubjects
                              ? "text-blue-600"
                              : "text-orange-600"
                          }`}>
                            {confirmedSubjects}
                          </p>
                          <p className="font-battambang text-sm text-gray-400">
                            /{totalSubjects}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Count */}
                  <div className="flex items-center gap-2 bg-white/50 rounded-xl px-3 py-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="font-battambang text-xs text-gray-700 font-semibold">
                      សិស្សសរុប: {subjects[0]?.totalStudents || 0} នាក់
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject List */}
            <div className="px-5">
              <h1 className="font-koulen text-lg text-gray-900 mb-3">
                មុខវិជ្ជាទាំងអស់
              </h1>
              <div className="space-y-3">
                {subjects.map((subject, index) => {
                  const isComplete = subject.isComplete;
                  const isPartial =
                    subject.studentsWithGrades > 0 && !isComplete;
                  const isVerified = subject.isConfirmed;

                  return (
                    <button
                      key={subject.subjectId}
                      onClick={() => setSelectedSubject(subject)}
                      className={`w-full rounded-2xl shadow-md p-4 hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-3 relative overflow-hidden ${
                        isVerified
                          ? "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200"
                          : "bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200"
                      }`}
                    >
                      {/* Verification Status Indicator */}
                      <div className={`absolute top-0 right-0 w-16 h-16 ${
                        isVerified
                          ? "bg-gradient-to-br from-green-200/30 to-emerald-300/30"
                          : "bg-gradient-to-br from-orange-200/30 to-amber-300/30"
                      } rounded-bl-full`} />

                      {/* Number Badge */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md relative z-10 ${
                          isVerified
                            ? "bg-gradient-to-br from-green-500 to-emerald-600"
                            : "bg-gradient-to-br from-orange-500 to-amber-600"
                        }`}
                      >
                        <span className="text-white font-bold text-base">
                          {index + 1}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-left relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-battambang text-sm font-bold text-gray-900">
                            {subject.subjectNameKh}
                          </h4>
                          {/* ✅ Verification Badge */}
                          {isVerified ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white shadow-sm">
                              <Shield className="w-3 h-3" />
                              <span className="font-battambang text-[10px] font-bold">
                                ✓
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-sm animate-pulse">
                              <AlertCircle className="w-3 h-3" />
                              <span className="font-battambang text-[10px] font-bold">
                                !
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-battambang text-xs px-2 py-0.5 rounded font-semibold ${
                            isVerified
                              ? "bg-green-200/50 text-green-800"
                              : "bg-orange-200/50 text-orange-800"
                          }`}>
                            {subject.subjectCode}
                          </span>
                          <span className="font-battambang text-xs text-gray-500">
                            •
                          </span>
                          <span className="font-battambang text-xs text-indigo-700 font-semibold">
                            {subject.maxScore} ពិន្ទុ
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex-1 h-2 rounded-full overflow-hidden ${
                            isVerified ? "bg-green-200" : "bg-orange-200"
                          }`}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isVerified
                                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                  : "bg-gradient-to-r from-orange-500 to-amber-600"
                              }`}
                              style={{ width: `${subject.completionRate}%` }}
                            />
                          </div>
                          <span className={`font-koulen text-sm font-bold min-w-[45px] text-right ${
                            isVerified ? "text-green-700" : "text-orange-700"
                          }`}>
                            {subject.completionRate}%
                          </span>
                        </div>
                      </div>

                      {/* Status Icon */}
                      <div className="relative z-10">
                        {isComplete ? (
                          <CheckCircle2 className={`w-7 h-7 ${
                            isVerified ? "text-green-600" : "text-orange-600"
                          }`} />
                        ) : isPartial ? (
                          <AlertCircle className={`w-7 h-7 ${
                            isVerified ? "text-green-500" : "text-orange-500"
                          }`} />
                        ) : (
                          <XCircle className="w-7 h-7 text-gray-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 pt-4 pb-2 space-y-3">
              {/* View Subject Details Button - Always Available */}
              <button
                onClick={handleViewSubjectDetails}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-koulen rounded-2xl shadow-md active:scale-95 flex items-center justify-center gap-2 transition-all"
              >
                <BookOpen className="w-5 h-5" />
                <span>មើលលម្អិតមុខវិជ្ជាទាំងអស់</span>
              </button>

              {/* View Monthly Report Button - Only if complete */}
              {completedSubjects === totalSubjects ? (
                <button
                  onClick={handleViewReport}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-koulen rounded-2xl shadow-md active:scale-95 flex items-center justify-center gap-2 transition-all"
                >
                  <Award className="w-5 h-5" />
                  <span>មើលរបាយការណ៍ប្រចាំខែ</span>
                </button>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-battambang text-sm font-bold text-amber-900 mb-1">
                        របាយការណ៍ប្រចាំខែមិនទាន់ពេញលេញ
                      </p>
                      <p className="font-battambang text-xs text-amber-700">
                        សូមបញ្ចូលពិន្ទុគ្រប់មុខវិជ្ជាជាមុនសិន
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-xs">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <BarChart3 className="w-12 h-12 text-orange-400" />
              </div>
              <h1 className="font-koulen text-lg text-gray-900 mb-2">
                ជ្រើសរើសថ្នាក់រៀន
              </h1>
              <p className="font-battambang text-sm text-gray-600 leading-relaxed">
                សូមជ្រើសរើសថ្នាក់ ខែ និងឆ្នាំ ដើម្បីពិនិត្យស្ថានភាព
              </p>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
