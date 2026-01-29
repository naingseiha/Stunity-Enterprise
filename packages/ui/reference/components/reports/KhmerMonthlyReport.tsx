"use client";

interface KhmerMonthlyReportProps {
  paginatedReports: any[][];
  selectedClass: any;
  subjects: any[];
  province: string;
  examCenter: string;
  roomNumber: string;
  reportTitle: string;
  examSession: string;
  reportDate: string;
  teacherName: string;
  principalName: string;
  showCircles: boolean;
  autoCircle: boolean;
  showDateOfBirth: boolean;
  showGrade: boolean;
  showOther: boolean;
  studentsPerPage: number;
  getSubjectAbbr: (subjectName: string) => string;
  showSubjects?: boolean;
  showAttendance?: boolean;
  showTotal?: boolean;
  showAverage?: boolean;
  showGradeLevel?: boolean;
  showRank?: boolean;
  showRoomNumber?: boolean;
  selectedYear?: number;
  isGradeWide?: boolean;
  showClassName?: boolean;
  firstPageStudentCount?: number;
  tableFontSize?: number;
}

export default function KhmerMonthlyReport({
  paginatedReports,
  selectedClass,
  subjects,
  province,
  examCenter,
  roomNumber,
  reportTitle,
  examSession,
  reportDate,
  teacherName,
  principalName,
  showCircles,
  autoCircle,
  showDateOfBirth,
  showGrade,
  showOther,
  studentsPerPage,
  getSubjectAbbr,
  showSubjects = false,
  showAttendance = true,
  showTotal = true,
  showAverage = true,
  showGradeLevel = true,
  showRank = true,
  showRoomNumber = true,
  selectedYear = 2025,
  isGradeWide = false,
  showClassName = true,
  firstPageStudentCount = 20,
  tableFontSize = 10,
}: KhmerMonthlyReportProps) {
  return (
    <>
      <style jsx>{`
        @font-face {
          font-family: "Khmer OS Muol Light";
          src: local("Khmer OS Muol Light"), local("KhmerOSMuolLight");
        }
        @font-face {
          font-family: "Khmer OS Bokor";
          src: local("Khmer OS Bokor"), local("KhmerOSBokor");
        }
        @font-face {
          font-family: "Khmer OS Siem Reap";
          src: local("Khmer OS Siemreap"), local("KhmerOSSiemreap");
        }
        @font-face {
          font-family: "Tacteing";
          src: local("Tacteing"), local("TacteingA");
        }

        .report-page {
          page-break-inside: avoid;
          page-break-after: always;
          break-inside: avoid;
          break-after: page;
        }

        .report-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        @media print {
          .report-page {
            page-break-inside: avoid !important;
            page-break-after: always !important;
            break-inside: avoid !important;
            break-after: page !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            min-height: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 5mm 3mm !important;
            box-shadow: none !important;
            background: white !important;
            overflow: visible !important;
          }

          .report-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }

          th,
          td {
            border: 0.5px solid black !important;
            box-shadow: none !important;
          }

          /* Compact spacing for print */
          .report-page > div:first-child {
            margin-bottom: 2mm !important;
          }

          /* Compact footer for print */
          .report-page > div:last-child {
            margin-top: 2mm !important;
          }

          .grid.grid-cols-2.gap-16 {
            gap: 5mm !important;
            margin-top: 2mm !important;
          }

          .print\\:h-16 {
            height: 8mm !important;
          }
        }
      `}</style>

      {paginatedReports.map((pageReports, pageIndex) => (
        <div
          key={pageIndex}
          className="report-page bg-white mb-8"
          style={{
            width: "210mm",
            minHeight: pageIndex === 0 ? "auto" : "auto",
            margin: "0 auto",
            padding: "5mm 3mm",
            boxSizing: "border-box",
            maxWidth: "100%",
          }}
        >
          {/* Header - Only on first page */}
          {pageIndex === 0 && (
            <div className="mb-2">
              {/* Row 1: Kingdom (right) and School info (left) on same level */}
              <div className="flex justify-between items-start mb-1">
                {/* Left: School info - aligned with "ជាតិ សាសនា ព្រះមហាក្សត្រ" */}
                <div
                  className="text-left"
                  style={{
                    fontFamily: "'Khmer OS Bokor', serif",
                    paddingTop: "14px",
                  }}
                >
                  <p className="text-xs" style={{ lineHeight: "1.4" }}>
                    {province || "មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប"}
                  </p>
                  <p
                    className="text-xs font-bold"
                    style={{ lineHeight: "1.4" }}
                  >
                    {examCenter || "វិទ្យាល័យ ហ៊ុន សែនស្វាយធំ"}
                  </p>
                </div>

                {/* Right: Kingdom */}
                <div className="text-center">
                  <p
                    className="font-bold text-sm"
                    style={{
                      fontFamily:
                        "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                      lineHeight: "1.2",
                    }}
                  >
                    ព្រះរាជាណាចក្រកម្ពុជា
                  </p>
                  <p
                    className="font-bold text-sm"
                    style={{
                      fontFamily:
                        "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                      lineHeight: "1.2",
                    }}
                  >
                    ជាតិ សាសនា ព្រះមហាក្សត្រ
                  </p>
                  <p
                    className="text-red-600 text-base mt-0"
                    style={{
                      fontFamily: "'Tacteing', serif",
                      letterSpacing: "0.1em",
                      fontSize: "24px",
                    }}
                  >
                    3
                  </p>
                </div>
              </div>

              {/* Row 2: Title in center */}
              <div className="text-center mb-1.5">
                <h1
                  className="text-base font-bold mb-0.5"
                  style={{
                    fontFamily: "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                  }}
                >
                  {reportTitle}
                </h1>
                <p
                  className="text-xs mb-0.5"
                  style={{
                    fontFamily: "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                  }}
                >
                  ឆ្នាំសិក្សា៖ {selectedYear}-{selectedYear + 1}
                </p>

                {/* Class and Room on same line */}
                <div className="flex justify-center items-center">
                  <p
                    className="text-xs font-bold"
                    style={{
                      fontFamily:
                        "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                    }}
                  >
                    {isGradeWide
                      ? `កម្រិតថ្នាក់៖ ${selectedClass?.name}`
                      : `${selectedClass?.name}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <table
            className="w-full"
            style={{
              fontFamily: "'Khmer OS Siem Reap', 'Khmer OS Siemreap', serif",
              borderCollapse: "collapse",
              fontSize: `${tableFontSize}px`,
            }}
          >
            <thead>
              {/* Row 1: Main Headers */}
              <tr style={{ border: "1px solid black" }}>
                {/* ល.រ */}
                <th
                  rowSpan={showAttendance ? 2 : 1}
                  className="px-2 py-2 bg-gray-100 w-10 align-middle"
                  style={{ border: "1px solid black" }}
                >
                  ល.រ
                </th>

                {/* គោត្តនាម និងនាម */}
                <th
                  rowSpan={showAttendance ? 2 : 1}
                  className="px-2 py-2 bg-gray-100 align-middle"
                  style={{ border: "1px solid black", minWidth: "120px" }}
                >
                  គោត្តនាម និងនាម
                </th>

                {/* ថ្នាក់ (for grade-wide only) */}
                {isGradeWide && showClassName && (
                  <th
                    rowSpan={showAttendance ? 2 : 1}
                    className="px-2 py-2 bg-blue-100 align-middle"
                    style={{ border: "1px solid black", minWidth: "50px" }}
                  >
                    ថ្នាក់
                  </th>
                )}

                {/* អវត្តមាន */}
                {showAttendance && (
                  <th
                    colSpan={3}
                    className="px-1 py-2 bg-yellow-100"
                    style={{ border: "1px solid black" }}
                  >
                    អវត្តមាន
                  </th>
                )}

                {/* មុខវិជ្ជា */}
                {showSubjects &&
                  subjects.map((subject) => (
                    <th
                      key={subject.id}
                      rowSpan={showAttendance ? 2 : 1}
                      className="px-1 py-2 bg-blue-50 text-center align-middle"
                      style={{ border: "1px solid black", minWidth: "35px" }}
                    >
                      {getSubjectAbbr(subject.name)}
                    </th>
                  ))}

                {/* ពិន្ទុសរុប */}
                {showTotal && (
                  <th
                    rowSpan={showAttendance ? 2 : 1}
                    className="px-2 py-2 bg-green-100 w-16 align-middle"
                    style={{ border: "1px solid black" }}
                  >
                    ពិន្ទុសរុប
                  </th>
                )}

                {/* ម. ភាគ */}
                {showAverage && (
                  <th
                    rowSpan={showAttendance ? 2 : 1}
                    className="px-2 py-2 bg-green-100 w-16 align-middle"
                    style={{ border: "1px solid black" }}
                  >
                    ម. ភាគ
                  </th>
                )}

                {/* ចំ. ថ្នាក់ */}
                {showRank && (
                  <th
                    rowSpan={showAttendance ? 2 : 1}
                    className="px-2 py-2 bg-indigo-100 w-16 align-middle"
                    style={{ border: "1px solid black" }}
                  >
                    ចំ.ថ្នាក់
                  </th>
                )}

                {/* និទ្ទេស */}
                {showGradeLevel && (
                  <th
                    rowSpan={showAttendance ? 2 : 1}
                    className="px-2 py-2 bg-yellow-100 w-16 align-middle"
                    style={{ border: "1px solid black" }}
                  >
                    និទ្ទេស
                  </th>
                )}
              </tr>

              {/* Row 2: Sub-headers */}
              {showAttendance && (
                <tr style={{ border: "1px solid black" }}>
                  <th
                    className="px-1 py-1 bg-yellow-50 text-xs w-10"
                    style={{ border: "1px solid black" }}
                  >
                    ច
                  </th>
                  <th
                    className="px-1 py-1 bg-yellow-50 text-xs w-10"
                    style={{ border: "1px solid black" }}
                  >
                    អ
                  </th>
                  <th
                    className="px-1 py-1 bg-yellow-50 text-xs w-10"
                    style={{ border: "1px solid black" }}
                  >
                    សរុប
                  </th>
                </tr>
              )}
            </thead>

            <tbody>
              {pageReports.map((report, index) => {
                // ✅ Calculate global index correctly
                const globalIndex =
                  pageIndex === 0
                    ? index + 1
                    : firstPageStudentCount +
                      (pageIndex - 1) * studentsPerPage +
                      index +
                      1;

                const isPassed =
                  autoCircle &&
                  showCircles &&
                  ["A", "B", "C", "D", "E"].includes(report.letterGrade);

                return (
                  <tr
                    key={report.student.id}
                    style={{ border: "1px solid black" }}
                  >
                    {/* ល.រ */}
                    <td
                      className="px-2 py-1.5 text-center relative"
                      style={{ border: "1px solid black" }}
                    >
                      {isPassed ? (
                        <div className="relative inline-flex items-center justify-center">
                          <span className="absolute w-6 h-6 border-2 border-red-600 rounded-full"></span>
                          <span className="relative z-10">{globalIndex}</span>
                        </div>
                      ) : (
                        globalIndex
                      )}
                    </td>

                    {/* គោត្តនាម និងនាម */}
                    <td
                      className={`px-2 py-1.5 ${
                        isPassed ? "bg-yellow-100 font-bold" : ""
                      }`}
                      style={{ border: "1px solid black" }}
                    >
                      {report.student.lastName} {report.student.firstName}
                    </td>

                    {/* ថ្នាក់ (for grade-wide only) */}
                    {isGradeWide && showClassName && (
                      <td
                        className="px-2 py-1.5 text-center font-semibold bg-blue-50"
                        style={{ border: "1px solid black" }}
                      >
                        {report.student.className}
                      </td>
                    )}

                    {/* អវត្តមាន */}
                    {showAttendance && (
                      <>
                        <td
                          className="px-1 py-1.5 text-center"
                          style={{ border: "1px solid black" }}
                        >
                          {report.permission || 0}
                        </td>
                        <td
                          className="px-1 py-1.5 text-center"
                          style={{ border: "1px solid black" }}
                        >
                          {report.absent || 0}
                        </td>
                        <td
                          className="px-1 py-1.5 text-center font-bold"
                          style={{ border: "1px solid black" }}
                        >
                          {(report.permission || 0) + (report.absent || 0)}
                        </td>
                      </>
                    )}

                    {/* មុខវិជ្ជា */}
                    {showSubjects &&
                      subjects.map((subject) => {
                        const grade = report.grades.find(
                          (g: any) => g.subjectId === subject.id
                        );
                        const score = grade?.score;
                        return (
                          <td
                            key={subject.id}
                            className="px-1 py-1.5 text-center"
                            style={{ border: "1px solid black" }}
                          >
                            {score !== null && score !== undefined
                              ? parseFloat(score.toString()).toFixed(1)
                              : "-"}
                          </td>
                        );
                      })}

                    {/* Summary */}
                    {showTotal && (
                      <td
                        className="px-2 py-1.5 text-center font-bold bg-green-50"
                        style={{ border: "1px solid black" }}
                      >
                        {report.total.toFixed(0)}
                      </td>
                    )}
                    {showAverage && (
                      <td
                        className="px-2 py-1.5 text-center font-bold bg-green-50"
                        style={{ border: "1px solid black" }}
                      >
                        {report.average.toFixed(2)}
                      </td>
                    )}
                    {showRank && (
                      <td
                        className="px-2 py-1.5 text-center font-bold text-red-600 bg-indigo-50"
                        style={{ border: "1px solid black" }}
                      >
                        {report.rank}
                      </td>
                    )}
                    {showGradeLevel && (
                      <td
                        className="px-2 py-1.5 text-center font-bold bg-yellow-50"
                        style={{ border: "1px solid black" }}
                      >
                        {report.letterGrade}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ✅ Statistics & Signatures (only on last page) */}
          {pageIndex === paginatedReports.length - 1 && (
            <>
              {/* Statistics Summary */}
              <div className="mb-2 pb-1 mt-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex-1">
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: "'Khmer OS Bokor', 'Khmer OS Bokor', serif",
                      }}
                    >
                      សិស្សសរុប៖{" "}
                    </span>
                    <span className="font-bold text-blue-700">
                      {paginatedReports.flat().length} នាក់
                    </span>
                    <span className="mx-1">/</span>
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: "'Khmer OS Bokor', 'Khmer OS Bokor', serif",
                      }}
                    >
                      ស្រី៖{" "}
                    </span>
                    <span className="font-bold text-pink-700">
                      {
                        paginatedReports
                          .flat()
                          .filter((r) => r.student.gender === "female").length
                      }{" "}
                      នាក់
                    </span>
                  </div>

                  <div className="flex-1 text-center">
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: "'Khmer OS Bokor', 'Khmer OS Bokor', serif",
                      }}
                    >
                      ជាប់៖{" "}
                    </span>
                    <span className="font-bold text-green-700">
                      {
                        paginatedReports.flat().filter((r) => r.average >= 25)
                          .length
                      }{" "}
                      នាក់
                    </span>
                    <span className="mx-1">/</span>
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: "'Khmer OS Bokor', 'Khmer OS Bokor', serif",
                      }}
                    >
                      ស្រី៖{" "}
                    </span>
                    <span className="font-bold text-pink-700">
                      {
                        paginatedReports
                          .flat()
                          .filter(
                            (r) =>
                              r.average >= 25 && r.student.gender === "female"
                          ).length
                      }{" "}
                      នាក់
                    </span>
                  </div>

                  <div className="flex-1 text-right">
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: "'Khmer OS Bokor', 'Khmer OS Bokor', serif",
                      }}
                    >
                      ធ្លាក់៖{" "}
                    </span>
                    <span className="font-bold text-orange-700">
                      {
                        paginatedReports.flat().filter((r) => r.average < 25)
                          .length
                      }{" "}
                      នាក់
                    </span>
                    <span className="mx-1">/</span>
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: "'Khmer OS Bokor', 'Khmer OS Bokor', serif",
                      }}
                    >
                      ស្រី៖{" "}
                    </span>
                    <span className="font-bold text-pink-700">
                      {
                        paginatedReports
                          .flat()
                          .filter(
                            (r) =>
                              r.average < 25 && r.student.gender === "female"
                          ).length
                      }{" "}
                      នាក់
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-10 mt-3">
                {/* Principal */}
                <div className="text-center">
                  <p
                    className="text-xs mb-0.5"
                    style={{
                      fontFamily:
                        "'Khmer OS Siem Reap', 'Khmer OS Siem Reap', serif",
                    }}
                  >
                    {reportDate}
                  </p>
                  <p
                    className="text-xs font-bold mb-0.5"
                    style={{
                      fontFamily:
                        "'Khmer OS Siem Reap', 'Khmer OS Siem Reap', serif",
                    }}
                  >
                    បានឃើញ និងឯកភាព
                  </p>

                  <p
                    className="text-xs font-bold text-blue-600"
                    style={{
                      fontFamily:
                        "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                    }}
                  >
                    {principalName}
                  </p>
                </div>

                {/* Teacher */}
                <div className="text-center">
                  <p
                    className="text-xs mb-0.5"
                    style={{
                      fontFamily:
                        "'Khmer OS Siem Reap', 'Khmer OS Siem Reap', serif",
                    }}
                  >
                    {reportDate}
                  </p>
                  <p
                    className="text-xs font-bold mb-0.5"
                    style={{
                      fontFamily:
                        "'Khmer OS Siem Reap', 'Khmer OS Siem Reap', serif",
                    }}
                  >
                    គ្រូទទួលបន្ទុកថ្នាក់
                  </p>
                  <div className="h-10 print:h-14"></div>
                  <p
                    className="text-xs font-bold text-blue-600"
                    style={{
                      fontFamily:
                        "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                    }}
                  >
                    {teacherName}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </>
  );
}
