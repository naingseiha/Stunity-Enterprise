"use client";

interface StatisticsReportProps {
  statsReports: any[];
  selectedClass: any;
  subjects: any[];
  selectedStatsMonth: string;
  teacherName: string;
  principalName: string;
  getMonthName: (month: string) => string;
  getMedalEmoji: (rank: number) => string;
  getSubjectAbbr: (name: string) => string;
}

export default function StatisticsReport({
  statsReports,
  selectedClass,
  subjects,
  selectedStatsMonth,
  teacherName,
  principalName,
  getMonthName,
  getMedalEmoji,
  getSubjectAbbr,
}: StatisticsReportProps) {
  const sortedStatsReports = [...statsReports].sort(
    (a, b) => b.average - a.average
  );

  const passedStudents = statsReports.filter((s) => s.average >= 50).length;
  const failedStudents = statsReports.filter((s) => s.average < 50).length;
  const passRate =
    statsReports.length > 0 ? (passedStudents / statsReports.length) * 100 : 0;
  const classAverage =
    statsReports.length > 0
      ? statsReports.reduce((sum, s) => sum + s.average, 0) /
        statsReports.length
      : 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold text-gray-800 mb-2"
          style={{ fontFamily: "Khmer OS Muol Light" }}
        >
          សន្លឹកលទ្ធផលប្រចាំខែ Monthly Results
        </h1>
        <p
          className="text-xl text-gray-600"
          style={{ fontFamily: "Khmer OS Muol Light" }}
        >
          ថ្នាក់ទី {selectedClass?.name} - ឆ្នាំសិក្សា {selectedClass?.year}
        </p>
        <p className="text-base text-gray-500 mt-1">
          ខែ {getMonthName(selectedStatsMonth)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-l-4 border-blue-500">
          <p className="text-sm text-blue-600 font-semibold mb-1">
            សិស្សសរុប Total Students
          </p>
          <p className="text-4xl font-bold text-blue-700">
            {statsReports.length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-l-4 border-green-500">
          <p className="text-sm text-green-600 font-semibold mb-1">
            មធ្យមភាគថ្នាក់ Class Average
          </p>
          <p className="text-4xl font-bold text-green-700">
            {classAverage.toFixed(2)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-l-4 border-purple-500">
          <p className="text-sm text-purple-600 font-semibold mb-1">
            អត្រាជាប់ Pass Rate
          </p>
          <p className="text-4xl font-bold text-purple-700">
            {passRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Student Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <th className="px-4 py-3 text-left rounded-tl-lg">ល.រ</th>
              <th className="px-4 py-3 text-left">អត្តសញ្ញាណ និងឈ្មោះ</th>
              <th className="px-4 py-3 text-center">ភេទ</th>
              {subjects.map((subject) => (
                <th key={subject.id} className="px-4 py-3 text-center">
                  {getSubjectAbbr(subject.name)}
                </th>
              ))}
              <th className="px-4 py-3 text-center bg-yellow-500 font-bold">
                សរុប
              </th>
              <th className="px-4 py-3 text-center bg-green-500 font-bold">
                មធ្យមភាគ
              </th>
              <th className="px-4 py-3 text-center bg-blue-500 font-bold rounded-tr-lg">
                និទ្ទេស
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStatsReports.map((report, index) => (
              <tr
                key={report.student.id}
                className={`${
                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                } hover:bg-blue-50 transition-colors`}
              >
                <td className="px-4 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getMedalEmoji(index + 1)}</span>
                    <span className="font-bold text-gray-700">{index + 1}</span>
                  </div>
                </td>
                <td className="px-4 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {report.student.gender === "male" ? "👦" : "👧"}
                    </span>
                    <span
                      className="font-semibold text-gray-800"
                      style={{ fontFamily: "Khmer OS Muol Light" }}
                    >
                      {report.student.lastName} {report.student.firstName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 border-b border-gray-200 text-center">
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor:
                        report.student.gender === "male"
                          ? "#DBEAFE"
                          : "#FCE7F3",
                      color:
                        report.student.gender === "male"
                          ? "#1E40AF"
                          : "#BE185D",
                    }}
                  >
                    {report.student.gender === "male" ? "ប្រុស" : "ស្រី"}
                  </span>
                </td>
                {subjects.map((subject) => {
                  const grade = report.grades.find(
                    (g: any) => g.subjectId === subject.id
                  );
                  const score = grade ? parseFloat(grade.score) : 0;
                  return (
                    <td
                      key={subject.id}
                      className="px-4 py-4 border-b border-gray-200 text-center"
                    >
                      <span
                        className={`font-semibold ${
                          score >= 90
                            ? "text-green-600"
                            : score >= 80
                            ? "text-blue-600"
                            : score >= 70
                            ? "text-yellow-600"
                            : score >= 50
                            ? "text-orange-600"
                            : "text-red-600"
                        }`}
                      >
                        {grade ? grade.score : "-"}
                      </span>
                    </td>
                  );
                })}
                <td className="px-4 py-4 border-b border-gray-200 text-center bg-yellow-50">
                  <span className="font-bold text-yellow-700 text-lg">
                    {report.total.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4 border-b border-gray-200 text-center bg-green-50">
                  <span className="font-bold text-green-700 text-lg">
                    {report.average.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-4 border-b border-gray-200 text-center bg-blue-50">
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg"
                    style={{
                      backgroundColor:
                        report.letterGrade === "A"
                          ? "#22C55E"
                          : report.letterGrade === "B"
                          ? "#3B82F6"
                          : report.letterGrade === "C"
                          ? "#EAB308"
                          : report.letterGrade === "D"
                          ? "#F97316"
                          : "#EF4444",
                      color: "white",
                    }}
                  >
                    {report.letterGrade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t-2 border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            ត្រូតពិនិត្យដោយ Reviewed by
          </p>
          <p className="text-xs text-gray-500 mb-16">
            ថ្ងៃទី..... ខែ..... ឆ្នាំ២០២៥
          </p>
          <div className="border-t-2 border-gray-400 pt-2 inline-block px-12">
            <p
              className="font-bold text-gray-800"
              style={{ fontFamily: "Khmer OS Muol Light" }}
            >
              {teacherName}
            </p>
            <p className="text-sm text-gray-600 mt-1">Class Teacher</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">អនុម័តដោយ Approved by</p>
          <p className="text-xs text-gray-500 mb-16">
            ថ្ងៃទី..... ខែ..... ឆ្នាំ២០២៥
          </p>
          <div className="border-t-2 border-gray-400 pt-2 inline-block px-12">
            <p
              className="font-bold text-gray-800"
              style={{ fontFamily: "Khmer OS Muol Light" }}
            >
              {principalName}
            </p>
            <p className="text-sm text-gray-600 mt-1">Principal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
