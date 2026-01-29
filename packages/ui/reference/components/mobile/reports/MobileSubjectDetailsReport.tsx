// 📂 src/components/mobile/reports/MobileSubjectDetailsReport.tsx

"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { gradeApi } from "@/lib/api/grades";

interface StudentGrade {
  studentId: string;
  studentName: string;
  gender: string;
  scores: Record<string, number | null>; // subjectId -> score
}

interface SubjectInfo {
  id: string;
  code: string;
  nameKh: string;
  nameEn: string;
  maxScore: number;
  coefficient: number;
  completionRate: number;
  studentsWithGrades: number;
}

export default function MobileSubjectDetailsReport() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const classId = searchParams.get("class");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const className = searchParams.get("className");

  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [expandedStats, setExpandedStats] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    if (classId && month && year) {
      loadData();
    }
  }, [classId, month, year]);

  const loadData = async () => {
    if (!classId || !month || !year) return;

    setLoading(true);
    try {
      const response = await gradeApi.getGradesGrid(
        classId,
        month,
        parseInt(year)
      );

      // Process subjects
      const subjectsData: SubjectInfo[] = response.subjects.map(
        (subject: any) => {
          const studentGrades = response.students.map((student: any) => {
            const grade = student.grades?.[subject.id];
            return grade?.score ?? null;
          });

          const studentsWithGrades = studentGrades.filter(
            (score) => score !== null
          ).length;
          const completionRate =
            response.students.length > 0
              ? Math.round(
                  (studentsWithGrades / response.students.length) * 100
                )
              : 0;

          return {
            id: subject.id,
            code: subject.code,
            nameKh: subject.nameKh,
            nameEn: subject.nameEn || subject.code,
            maxScore: subject.maxScore,
            coefficient: subject.coefficient,
            completionRate,
            studentsWithGrades,
          };
        }
      );

      // Process students
      const studentsData: StudentGrade[] = response.students.map(
        (student: any) => {
          const scores: Record<string, number | null> = {};
          response.subjects.forEach((subject: any) => {
            const grade = student.grades?.[subject.id];
            scores[subject.id] = grade?.score ?? null;
          });

          return {
            studentId: student.studentId,
            studentName: student.studentName || student.khmerName,
            gender: student.gender,
            scores,
          };
        }
      );

      setSubjects(subjectsData);
      setStudents(studentsData);
      setTotalStudents(response.students.length);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getCompletionIcon = (rate: number) => {
    if (rate === 100)
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (rate > 0) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-gray-400" />;
  };

  const getCompletionColor = (rate: number) => {
    if (rate === 100) return "bg-green-100 text-green-700 border-green-300";
    if (rate > 0) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-gray-100 text-gray-500 border-gray-300";
  };

  const completedSubjects = subjects.filter(
    (s) => s.completionRate === 100
  ).length;
  const overallCompletion =
    subjects.length > 0
      ? Math.round(
          subjects.reduce((sum, s) => sum + s.completionRate, 0) /
            subjects.length
        )
      : 0;

  if (loading) {
    return (
      <MobileLayout title="Subject Details">
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="font-battambang text-gray-600">
              កំពុងផ្ទុកទិន្នន័យ...
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="លទ្ធផលលម្អិតមុខវិជ្ជា">
      <div className="flex flex-col min-h-full bg-gradient-to-br from-slate-50 to-gray-100">
        {/* Header */}
        <div className="bg-white px-4 pt-6 pb-4 shadow-md border-b border-gray-200">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-indigo-600 font-battambang font-semibold mb-4 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>ត្រឡប់ក្រោយ</span>
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-koulen text-xl text-gray-900 leading-tight">
                {className || "តារាងលម្អិតមុខវិជ្ជា"}
              </h1>
              <p className="font-battambang text-sm text-gray-600">
                {month} {year}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => setExpandedStats(!expandedStats)}
            className="w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-4 shadow-md border border-indigo-200 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="font-koulen text-base text-gray-900">
                    សង្ខេប
                  </h1>
                  <p className="font-battambang text-xs text-gray-600">
                    Summary
                  </p>
                </div>
              </div>
              {expandedStats ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>

            {expandedStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                  <p className="font-battambang text-xs text-gray-600 mb-1">
                    សិស្សសរុប
                  </p>
                  <p className="font-koulen text-2xl text-indigo-600">
                    {totalStudents}
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                  <p className="font-battambang text-xs text-gray-600 mb-1">
                    មុខវិជ្ជា
                  </p>
                  <p className="font-koulen text-2xl text-purple-600">
                    {subjects.length}
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                  <p className="font-battambang text-xs text-gray-600 mb-1">
                    ភាពពេញលេញ
                  </p>
                  <p className="font-koulen text-2xl text-green-600">
                    {overallCompletion}%
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-200">
                  <p className="font-battambang text-xs text-gray-600 mb-1">
                    បានបញ្ចូល
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="font-koulen text-2xl text-orange-600">
                      {completedSubjects}
                    </p>
                    <p className="font-battambang text-sm text-gray-400">
                      /{subjects.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Subject Status Cards */}
        <div className="px-4 pt-2 pb-3">
          <h1 className="font-koulen text-base text-gray-900 mb-3">
            ស្ថានភាពមុខវិជ្ជា
          </h1>
          <div className="grid grid-cols-2 gap-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className={`rounded-xl p-3 border-2 shadow-sm ${getCompletionColor(
                  subject.completionRate
                )}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-battambang text-xs font-bold truncate">
                      {subject.nameKh}
                    </p>
                    <p className="font-battambang text-[10px] text-gray-600">
                      {subject.code}
                    </p>
                  </div>
                  {getCompletionIcon(subject.completionRate)}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-koulen text-lg">
                    {subject.completionRate}%
                  </span>
                </div>
                <p className="font-battambang text-[10px]">
                  {subject.studentsWithGrades}/{totalStudents} សិស្ស
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="px-4 pb-20">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-koulen text-base text-gray-900">
              តារាងពិន្ទុលម្អិត
            </h1>
            <div className="text-right">
              <p className="font-battambang text-xs text-gray-500">
                ទិសដៅបង្ហាញ → ↑ ↓
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <style jsx>{`
              .vertical-header {
                writing-mode: vertical-rl;
                transform: rotate(180deg);
                white-space: nowrap;
                height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .table-container {
                max-height: 600px;
                overflow-y: auto;
                overflow-x: auto;
              }
              thead {
                position: sticky;
                top: 0;
                z-index: 20;
              }
              .sticky-col {
                position: sticky;
                left: 0;
                z-index: 15;
              }
              thead .sticky-col {
                z-index: 25;
              }
            `}</style>
            <div className="table-container">
              <table className="w-full" style={{ minWidth: "800px" }}>
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-500 to-purple-600">
                    <th className="sticky-col bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-3 text-left">
                      <div className="font-battambang text-xs text-white font-bold">
                        ឈ្មោះសិស្ស
                      </div>
                    </th>
                    {subjects.map((subject) => (
                      <th
                        key={subject.id}
                        className="px-2 py-0 text-center border-l border-indigo-400 bg-gradient-to-r from-indigo-500 to-purple-600"
                        style={{ minWidth: "45px", width: "45px" }}
                      >
                        <div className="vertical-header">
                          <div className="font-battambang text-xs text-white font-bold">
                            {subject.nameKh}
                          </div>
                          <div className="font-battambang text-[10px] text-indigo-100 ml-1">
                            ({subject.maxScore})
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr
                      key={student.studentId}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="sticky-col px-3 py-3 border-b border-gray-200 bg-inherit">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-battambang text-xs font-bold text-gray-900 truncate">
                              {student.studentName}
                            </p>
                            <p className="font-battambang text-[10px] text-gray-500">
                              {student.gender === "ប" ? "ប្រុស" : "ស្រី"}
                            </p>
                          </div>
                        </div>
                      </td>
                      {subjects.map((subject) => {
                        const score = student.scores[subject.id];
                        const hasScore = score !== null && score !== undefined;
                        return (
                          <td
                            key={subject.id}
                            className="px-2 py-3 text-center border-b border-l border-gray-200"
                          >
                            {hasScore ? (
                              <div className="flex flex-col items-center">
                                <span className="font-koulen text-sm text-gray-900">
                                  {score.toFixed(1)}
                                </span>
                                <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        (score / subject.maxScore) * 100,
                                        100
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="font-battambang text-xs text-red-400">
                                -
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mt-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="font-battambang text-sm font-bold text-blue-900 mb-1">
                  ព័ត៌មានសំខាន់
                </p>
                <p className="font-battambang text-xs text-blue-700 leading-relaxed">
                  តារាងនេះបង្ហាញពិន្ទុលម្អិតនៃមុខវិជ្ជាទាំងអស់សម្រាប់សិស្សនីមួយៗ។
                  អ្នកអាចជញ្រ្កាញចំហៀង និងឡើងចុះដើម្បីមើលទិន្នន័យទាំងអស់។
                  ឈ្មោះសិស្ស និងបឋមកថានឹងនៅស្ថានី។
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
