"use client";

import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Student {
  studentId: string;
  khmerName: string;
  gender: string;
  score: number | null;
}

interface ScoreReportTemplateProps {
  className: string;
  subjectName: string;
  subjectCode: string;
  maxScore: number;
  month: string;
  year: number;
  students: Student[];
  teacherName?: string;
  exportRef?: React.RefObject<HTMLDivElement>;
}

export default function ScoreReportTemplate({
  className,
  subjectName,
  subjectCode,
  maxScore,
  month,
  year,
  students,
  teacherName,
  exportRef,
}: ScoreReportTemplateProps) {
  // Calculate statistics
  const totalStudents = students.length;
  const studentsWithScores = students.filter((s) => s.score !== null).length;
  const absentStudents = students.filter((s) => s.score === 0).length;
  const passedStudents = students.filter(
    (s) => s.score !== null && s.score >= maxScore * 0.5
  ).length;

  // ✅ NEW: Count students without scores (blank or zero)
  const studentsWithoutScore = students.filter(
    (s) => s.score === null || s.score === 0
  ).length;

  const passRate =
    totalStudents > 0
      ? ((passedStudents / totalStudents) * 100).toFixed(1)
      : "0.0";

  // Get current date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      ref={exportRef}
      className="bg-white w-[800px] mx-auto p-8"
      style={{ fontFamily: "Battambang, Arial, sans-serif" }}
    >
      {/* Header */}
      <div className="text-center mb-6 border-b-4 border-purple-600 pb-4">
        <h1 className="text-3xl font-bold text-purple-800 mb-2">
          របាយការណ៍ពិន្ទុតាមមុខវិជ្ជា
        </h1>
        <p className="text-lg text-gray-700">Score Report by Subject</p>
      </div>

      {/* Report Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
        <div>
          <p className="text-sm text-gray-600 mb-1">ថ្នាក់ • Class</p>
          <p className="text-lg font-bold text-gray-900">{className}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">មុខវិជ្ជា • Subject</p>
          <p className="text-lg font-bold text-gray-900">
            {subjectName} ({subjectCode})
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">ខែ និងឆ្នាំ • Month & Year</p>
          <p className="text-lg font-bold text-gray-900">
            {month} {year}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">ពិន្ទុអតិបរមា • Max Score</p>
          <p className="text-lg font-bold text-gray-900">{maxScore} ពិន្ទុ</p>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{totalStudents}</p>
          <p className="text-xs text-blue-600">សិស្សសរុប</p>
          <p className="text-[10px] text-gray-500">Total</p>
        </div>
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{passedStudents}</p>
          <p className="text-xs text-green-600">ជាប់</p>
          <p className="text-[10px] text-gray-500">Pass</p>
        </div>
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">
            {studentsWithoutScore}
          </p>
          <p className="text-xs text-red-600">គ្មានពិន្ទុ</p>
          <p className="text-[10px] text-gray-500">No Score</p>
        </div>
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{passRate}%</p>
          <p className="text-xs text-orange-600">អត្រាជាប់</p>
          <p className="text-[10px] text-gray-500">Pass Rate</p>
        </div>
      </div>

      {/* Student Scores Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border-2 border-gray-300">
          <thead>
            <tr className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <th className="border border-gray-300 px-3 py-2 text-sm w-16">
                #
              </th>
              <th className="border border-gray-300 px-3 py-2 text-sm text-left">
                ឈ្មោះសិស្ស • Student Name
              </th>
              <th className="border border-gray-300 px-3 py-2 text-sm w-20">
                ភេទ
              </th>
              <th className="border border-gray-300 px-3 py-2 text-sm w-24">
                ពិន្ទុ • Score
              </th>
              <th className="border border-gray-300 px-3 py-2 text-sm w-24">
                ស្ថានភាព
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              const isAbsent = student.score === 0;
              const isPassed =
                student.score !== null && student.score >= maxScore * 0.5;
              const isFailed =
                student.score !== null &&
                student.score > 0 &&
                student.score < maxScore * 0.5;
              const isEmpty = student.score === null;

              return (
                <tr
                  key={student.studentId}
                  className={`${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } ${isAbsent ? "bg-red-50" : ""} ${
                    isPassed ? "bg-green-50" : ""
                  } ${isFailed ? "bg-orange-50" : ""} ${
                    isEmpty ? "bg-yellow-50" : ""
                  }`}
                >
                  <td className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                    {index + 1}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                    {student.khmerName}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-xs">
                    <span
                      className={`inline-block px-2 py-1 rounded ${
                        student.gender === "MALE"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {student.gender === "MALE" ? "ប្រុស" : "ស្រី"}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {isEmpty ? (
                      <span className="text-yellow-600 font-bold text-sm">
                        -
                      </span>
                    ) : (
                      <span
                        className={`text-lg font-bold ${
                          isAbsent
                            ? "text-red-600"
                            : isPassed
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {student.score}
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {isEmpty ? (
                        <span className="text-yellow-600 text-xs font-semibold">
                          មិនទាន់
                        </span>
                      ) : isAbsent ? (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-red-600 text-xs font-semibold">
                            អវត្តមាន
                          </span>
                        </>
                      ) : isPassed ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 text-xs font-semibold">
                            ជាប់
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-orange-600 text-xs font-semibold">
                            ធ្លាក់
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-bold text-gray-700 mb-2">
          ការពន្យល់សញ្ញា • Legend:
        </p>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
            <span className="text-gray-700">ជាប់ (Pass)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-200 border border-orange-400 rounded"></div>
            <span className="text-gray-700">ធ្លាក់ (Fail)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
            <span className="text-gray-700">អវត្តមាន (Absent)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
            <span className="text-gray-700">មិនទាន់បញ្ចូល (Empty)</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-gray-300">
        <div>
          <p className="text-xs text-gray-600 mb-1">
            គ្រូបង្រៀន/អ្នករៀបចំ • Teacher/Prepared by:
          </p>
          <p className="text-sm font-bold text-gray-900">
            {teacherName || "N/A"}
          </p>
          <div className="mt-4 border-t border-gray-400 pt-1">
            <p className="text-xs text-gray-500 text-center">
              ហត្ថលេខា • Signature
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600 mb-1">
            កាលបរិច្ឆេទបង្កើត • Generated:
          </p>
          <p className="text-sm font-medium text-gray-900">{dateStr}</p>
          <p className="text-xs text-gray-500">{timeStr}</p>
          <div className="mt-2">
            <p className="text-[10px] text-gray-400">
              Generated by School Management System
            </p>
          </div>
        </div>
      </div>

      {/* QR Code placeholder or verification stamp */}
      <div className="mt-4 text-center">
        <div className="inline-block bg-purple-100 border-2 border-purple-300 rounded-lg px-4 py-2">
          <p className="text-xs font-bold text-purple-800">
            ✓ របាយការណ៍ត្រូវបានបញ្ជាក់ • Report Verified
          </p>
        </div>
      </div>
    </div>
  );
}
