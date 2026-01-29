"use client";

import { type MonthlyReportData } from "@/lib/api/reports";

interface MonthlyReportViewerProps {
  data: MonthlyReportData;
}

export default function MonthlyReportViewer({
  data,
}: MonthlyReportViewerProps) {
  const getGradeLevelColor = (level: string) => {
    const colors: { [key: string]: string } = {
      A: "bg-green-600 text-white",
      B: "bg-blue-600 text-white",
      C: "bg-yellow-600 text-white",
      D: "bg-orange-600 text-white",
      E: "bg-red-500 text-white",
      F: "bg-red-700 text-white",
    };
    return colors[level] || "bg-gray-600 text-white";
  };

  // Get Khmer short names
  const getKhmerShortName = (code: string): string => {
    const mapping: { [key: string]: string } = {
      KH_W: "តែង.  ក្តី",
      KH_R: "ស.  អាន",
      MATH: "គណិត",
      PHYSICS: "រូប",
      CHEMISTRY: "គីមី",
      BIOLOGY: "ជីវៈ",
      EARTH_SCI: "ផែនដី",
      MORAL: "សីលធម៌",
      GEO: "ភូមិ",
      HISTORY: "ប្រវត្តិ",
      ENGLISH: "ភាសា",
      HOME_EC: "គេហ",
      PE: "កីឡា",
      AGRI: "កសិកម្ម",
      IT: "ICT",
      KH_LANG: "ខ្មែរ",
    };
    return mapping[code] || code;
  };

  return (
    <div
      className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200"
      id="report-content"
    >
      {/* Report Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6 print:bg-white print:border-b-2 print:border-gray-300">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white print:text-gray-900">
            របាយការណ៍ប្រចាំខែ
          </h1>
          <div className="mt-4 space-y-2">
            <p className="text-lg font-bold text-white print:text-gray-800">
              {data.className} • {data.month} {data.year}
            </p>
            {data.teacherName && (
              <p className="text-sm font-semibold text-white/90 print:text-gray-700">
                គ្រូបន្ទុក: {data.teacherName}
              </p>
            )}
            <p className="text-xs font-medium text-white/80 print:text-gray-600">
              ចំនួនសិស្ស: {data.students.length} នាក់ • មុខវិជ្ជា:{" "}
              {data.subjects.length}
            </p>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-gray-300 w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[180px]">
                គោត្តនាម និងនាម
              </th>
              <th className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-gray-300 w-14">
                ភេទ
              </th>

              {/* Subject Headers */}
              {data.subjects.map((subject) => (
                <th
                  key={subject.id}
                  className="px-3 py-3 text-center text-xs font-bold text-gray-700 border-r border-gray-300 min-w-[60px]"
                  title={`${subject.nameKh} (Max: ${subject.maxScore}, Coef: ${subject.coefficient})`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{getKhmerShortName(subject.code)}</span>
                    <span className="text-[10px] text-gray-500">
                      ({subject.coefficient})
                    </span>
                  </div>
                </th>
              ))}

              {/* Summary Headers */}
              <th className="px-3 py-3 text-center text-xs font-bold text-blue-800 border-r border-gray-300 min-w-[60px] bg-blue-50">
                សរុប
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-green-800 border-r border-gray-300 min-w-[60px] bg-green-50">
                ម. ភាគ
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-yellow-800 border-r border-gray-300 min-w-[60px] bg-yellow-50">
                និទ្ទេស
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-indigo-800 border-r border-gray-300 min-w-[60px] bg-indigo-50">
                ចំ.ថ្នាក់
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-red-800 border-r border-gray-300 w-12 bg-red-50">
                អ. ច
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-orange-800 border-gray-300 w-12 bg-orange-50">
                ម.ច
              </th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((student, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";

              return (
                <tr key={student.studentId} className={rowBg}>
                  <td
                    className={`${rowBg} px-3 py-2.5 text-center text-sm font-semibold text-gray-700 border-b border-r border-gray-200`}
                  >
                    {index + 1}
                  </td>
                  <td
                    className={`${rowBg} px-4 py-2.5 text-sm font-semibold text-gray-800 border-b border-r border-gray-200`}
                  >
                    {student.studentName}
                  </td>
                  <td
                    className={`${rowBg} px-3 py-2.5 text-center border-b border-r border-gray-200`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        student.gender === "MALE"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {student.gender === "MALE" ? "ប" : "ស"}
                    </span>
                  </td>

                  {/* Grade Cells */}
                  {data.subjects.map((subject) => {
                    const score = student.grades[subject.id];
                    const isAbsent = score === 0;
                    return (
                      <td
                        key={subject.id}
                        className={`px-3 py-2.5 text-center text-sm font-semibold border-b border-r border-gray-200 ${
                          isAbsent ? "bg-red-50 text-red-700 relative" : ""
                        }`}
                      >
                        <div className="relative inline-block">
                          {score !== null ? score.toFixed(1) : "-"}
                          {isAbsent && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">
                              A
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Summary Cells */}
                  <td className="px-3 py-2.5 text-center text-sm font-bold border-b border-r border-gray-200 bg-blue-50/50 text-blue-700">
                    {student.totalScore}
                  </td>
                  <td className="px-3 py-2.5 text-center text-base font-bold border-b border-r border-gray-200 bg-green-50/50 text-green-700">
                    {student.average}
                  </td>
                  <td className="px-3 py-2.5 text-center border-b border-r border-gray-200 bg-yellow-50/50">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold ${getGradeLevelColor(
                        student.gradeLevel
                      )}`}
                    >
                      {student.gradeLevel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm font-bold border-b border-r border-gray-200 bg-indigo-50/50 text-indigo-700">
                    #{student.rank}
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm font-semibold border-b border-r border-gray-200 bg-red-50/50 text-red-600">
                    {student.absent || "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm font-semibold border-b border-gray-200 bg-orange-50/50 text-orange-600">
                    {student.permission || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <p className="font-semibold">និទ្ទេស:</p>
            <p className="mt-1">
              <span className="text-green-700 font-bold">A (≥45)</span> •
              <span className="text-blue-700 font-bold"> B (≥40)</span> •
              <span className="text-yellow-700 font-bold"> C (≥35)</span> •
              <span className="text-orange-700 font-bold"> D (≥30)</span> •
              <span className="text-red-600 font-bold"> E (≥25)</span> •
              <span className="text-red-800 font-bold"> F (&lt;25)</span>
            </p>
          </div>
          <div>
            <p className="font-semibold">អត្ថន័យ:</p>
            <p className="mt-1">
              <span className="font-bold">អ.ច</span> = អវត្តមានអត់ច្បាប់ •
              <span className="font-bold"> ម.ច</span> = អវត្តមានមានច្បាប់
            </p>
            <p className="mt-1 flex items-center gap-1">
              <span className="inline-flex items-center justify-center bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">
                A
              </span>
              <span>= អវត្តមាន (ពិន្ទុ 0 មិនបញ្ចូលក្នុងការគណនា)</span>
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            បង្កើតនៅថ្ងៃទី {new Date().toLocaleDateString("km-KH")} •
            មជ្ឈមណ្ឌលគ្រប់គ្រងពិន្ទុសិស្ស
          </p>
        </div>
      </div>
    </div>
  );
}
