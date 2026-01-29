"use client";

interface SubjectDetailsReportProps {
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
  studentsPerPage: number;
  firstPageStudentCount: number;
  tableFontSize: number;
  showAttendance: boolean;
  showTotal: boolean;
  showAverage: boolean;
  showGradeLevel: boolean;
  showRank: boolean;
  selectedYear: number;
  isGradeWide: boolean;
  showClassName: boolean;
  selectedMonth: string;
}

export default function SubjectDetailsReport({
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
  studentsPerPage,
  firstPageStudentCount,
  tableFontSize,
  showAttendance,
  showTotal,
  showAverage,
  showGradeLevel,
  showRank,
  selectedYear,
  isGradeWide,
  showClassName,
  selectedMonth,
}: SubjectDetailsReportProps) {
  console.log(
    "📋 [SubjectDetailsReport] Subjects order:",
    subjects.map((s) => s.nameKh || s.name || s.code)
  );

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

        /* Vertical text for column headers */
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          white-space: nowrap;
          height: 70px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
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
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          th,
          td {
            padding: 0.5mm 0.3mm !important;
            font-size: inherit !important;
            border: 0.5px solid black !important;
            line-height: 1.1 !important;
            box-shadow: none !important;
          }

          tbody tr {
            height: 5.5mm !important;
          }

          thead tr {
            height: auto !important;
          }

          /* Reduce column widths for print to fit all columns */
          th:first-child,
          td:first-child {
            width: 12px !important;
            min-width: 12px !important;
          }

          th:nth-child(2),
          td:nth-child(2) {
            width: 50px !important;
            min-width: 50px !important;
            max-width: 50px !important;
          }

          /* Subject columns - slightly wider with extra margin space */
          th.bg-blue-50,
          td.px-0 {
            width: 16px !important;
            min-width: 16px !important;
            padding: 0.3mm 0.2mm !important;
            box-shadow: none !important;
          }

          /* Summary columns - slightly wider */
          th.bg-yellow-100,
          th.bg-green-100,
          th.bg-indigo-100,
          td.bg-yellow-50,
          td.bg-green-50,
          td.bg-indigo-50 {
            width: 17px !important;
            min-width: 17px !important;
            box-shadow: none !important;
          }

          .vertical-text {
            height: 50px !important;
            font-size: 5.5px !important;
          }

          /* Compact footer for print - optimized for A4 */
          .report-page > div:last-child {
            margin-top: 2mm !important;
          }

          .grid.grid-cols-2.gap-10 {
            gap: 5mm !important;
            margin-top: 2mm !important;
          }

          .print\\:h-10 {
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
              {/* Row 1: Kingdom and School info */}
              <div className="flex justify-between items-start mb-1">
                {/* Left: School info */}
                <div
                  className="text-left"
                  style={{
                    fontFamily: "'Khmer OS Bokor', serif",
                    paddingTop: "14px",
                  }}
                >
                  <p className="text-xs" style={{ lineHeight: "1.4" }}>
                    {province}
                  </p>
                  <p
                    className="text-xs font-bold"
                    style={{ lineHeight: "1.4" }}
                  >
                    {examCenter}
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
                      lineHeight: "1. 2",
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

              {/* Row 2: Title */}
              <div className="text-center mb-1. 5">
                <h1
                  className="text-base font-bold mb-0.5"
                  style={{
                    fontFamily: "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                  }}
                >
                  តារាងលទ្ធផលប្រចាំខែ៖ ខែ{selectedMonth}
                </h1>
                <p
                  className="text-xs mb-0.5"
                  style={{
                    fontFamily: "'Khmer OS Muol Light', 'Khmer OS Muol', serif",
                  }}
                >
                  ឆ្នាំសិក្សា៖ {selectedYear}-{selectedYear + 1}
                </p>

                {/* Class info */}
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
              <tr style={{ border: "1px solid black" }}>
                {/* ល.រ */}
                <th
                  className="px-0.5 py-0.5 bg-gray-100 align-middle"
                  style={{ border: "1px solid black", width: "18px" }}
                >
                  <div
                    className="vertical-text"
                    style={{ fontSize: `${tableFontSize}px` }}
                  >
                    ល. រ
                  </div>
                </th>

                {/* គោត្តនាម និងនាម */}
                <th
                  className="px-1 py-0.5 bg-gray-100 text-center"
                  style={{
                    border: "1px solid black",
                    width: "65px",
                    minWidth: "65px",
                    maxWidth: "65px",
                    fontSize: `${tableFontSize}px`,
                    lineHeight: "1.1",
                  }}
                >
                  <div
                    style={{
                      fontSize: `${tableFontSize}px`,
                      lineHeight: "1.2",
                    }}
                  >
                    គោត្តនាម
                    <br />
                    និងនាម
                  </div>
                </th>

                {/* ថ្នាក់ (for grade-wide only) */}
                {isGradeWide && showClassName && (
                  <th
                    className="px-0.5 py-0.5 bg-blue-100 align-middle"
                    style={{ border: "1px solid black", width: "22px" }}
                  >
                    <div
                      className="vertical-text"
                      style={{ fontSize: `${tableFontSize}px` }}
                    >
                      ថ្នាក់
                    </div>
                  </th>
                )}

                {/* Subject columns - Vertical */}
                {subjects.map((subject) => (
                  <th
                    key={subject.id}
                    className="px-0.5 py-0.5 bg-blue-50 align-middle"
                    style={{ border: "1px solid black", width: "20px" }}
                  >
                    <div
                      className="vertical-text"
                      style={{ fontSize: `${tableFontSize - 1}px` }}
                    >
                      {subject.nameKh}
                    </div>
                  </th>
                ))}

                {/* អវត្តមាន */}
                {showAttendance && (
                  <>
                    <th
                      className="px-0.5 py-0.5 bg-yellow-100 align-middle"
                      style={{ border: "1px solid black", width: "14px" }}
                    >
                      <div
                        className="vertical-text"
                        style={{ fontSize: `${tableFontSize - 1}px` }}
                      >
                        ច
                      </div>
                    </th>
                    <th
                      className="px-0.5 py-0.5 bg-yellow-100 align-middle"
                      style={{ border: "1px solid black", width: "14px" }}
                    >
                      <div
                        className="vertical-text"
                        style={{ fontSize: `${tableFontSize - 1}px` }}
                      >
                        អ
                      </div>
                    </th>
                    <th
                      className="px-0.5 py-0.5 bg-yellow-100 align-middle"
                      style={{ border: "1px solid black", width: "16px" }}
                    >
                      <div
                        className="vertical-text"
                        style={{ fontSize: `${tableFontSize - 1}px` }}
                      >
                        សរុប
                      </div>
                    </th>
                  </>
                )}

                {/* ពិន្ទុសរុប */}
                {showTotal && (
                  <th
                    className="px-0.5 py-0. 5 bg-green-100 align-middle"
                    style={{ border: "1px solid black", width: "20px" }}
                  >
                    <div
                      className="vertical-text"
                      style={{ fontSize: `${tableFontSize}px` }}
                    >
                      ពិន្ទុសរុប
                    </div>
                  </th>
                )}

                {/* ម.ភាគ */}
                {showAverage && (
                  <th
                    className="px-0.5 py-0.5 bg-green-100 align-middle"
                    style={{ border: "1px solid black", width: "20px" }}
                  >
                    <div
                      className="vertical-text"
                      style={{ fontSize: `${tableFontSize}px` }}
                    >
                      ម.ភាគ
                    </div>
                  </th>
                )}

                {/* ចំ.ថ្នាក់ */}
                {showRank && (
                  <th
                    className="px-0.5 py-0.5 bg-indigo-100 align-middle"
                    style={{ border: "1px solid black", width: "20px" }}
                  >
                    <div
                      className="vertical-text"
                      style={{ fontSize: `${tableFontSize}px` }}
                    >
                      ចំ.ថ្នាក់
                    </div>
                  </th>
                )}

                {/* និទ្ទេស */}
                {showGradeLevel && (
                  <th
                    className="px-0.5 py-0.5 bg-yellow-100 align-middle"
                    style={{ border: "1px solid black", width: "18px" }}
                  >
                    <div
                      className="vertical-text"
                      style={{ fontSize: `${tableFontSize}px` }}
                    >
                      និទ្ទេស
                    </div>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {pageReports.map((report, index) => {
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
                    {/* ✅ ល.រ - បង្រីក padding */}
                    <td
                      className="px-0.5 py-1 text-center"
                      style={{
                        border: "1px solid black",
                        fontSize: `${tableFontSize - 1}px`,
                        height: "20px",
                      }}
                    >
                      {isPassed ? (
                        <div
                          className="relative inline-flex items-center justify-center"
                          style={{ width: "14px", height: "14px" }}
                        >
                          <span
                            className="absolute rounded-full"
                            style={{
                              width: "12px",
                              height: "12px",
                              border: "1. 5px solid #dc2626",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                            }}
                          ></span>
                          <span
                            className="relative z-10"
                            style={{ fontSize: `${tableFontSize - 1}px` }}
                          >
                            {globalIndex}
                          </span>
                        </div>
                      ) : (
                        globalIndex
                      )}
                    </td>

                    {/* ✅ គោត្តនាម និងនាម - បង្រីក padding */}
                    <td
                      className={`px-1 py-1 text-left ${
                        isPassed ? "bg-yellow-100 font-bold" : ""
                      }`}
                      style={{
                        border: "1px solid black",
                        fontSize: `${tableFontSize - 1}px`,
                        lineHeight: "1.2",
                        width: "65px",
                        minWidth: "65px",
                        maxWidth: "65px",
                        wordBreak: "break-word",
                        whiteSpace: "normal",
                        overflow: "hidden",
                        height: "20px",
                      }}
                    >
                      {report.student.lastName} {report.student.firstName}
                    </td>

                    {/* ✅ ថ្នាក់ - បង្រីក padding */}
                    {isGradeWide && showClassName && (
                      <td
                        className="px-0.5 py-1 text-center font-semibold bg-blue-50"
                        style={{
                          border: "1px solid black",
                          fontSize: `${tableFontSize - 1}px`,
                          height: "20px",
                        }}
                      >
                        {report.student.className}
                      </td>
                    )}

                    {/* ✅ Subject scores - បង្រីក padding */}
                    {subjects.map((subject) => {
                      const grade = report.grades.find(
                        (g: any) => g.subjectId === subject.id
                      );
                      const score = grade?.score;
                      return (
                        <td
                          key={subject.id}
                          className="px-0 py-1 text-center"
                          style={{
                            border: "1px solid black",
                            fontSize: `${tableFontSize - 1}px`,
                            height: "20px",
                          }}
                        >
                          {score !== null && score !== undefined
                            ? parseFloat(score.toString()).toFixed(1)
                            : "-"}
                        </td>
                      );
                    })}

                    {/* ✅ Attendance - បង្រីក padding */}
                    {showAttendance && (
                      <>
                        <td
                          className="px-0 py-1 text-center"
                          style={{
                            border: "1px solid black",
                            fontSize: `${tableFontSize - 1}px`,
                            height: "20px",
                          }}
                        >
                          {report.permission || 0}
                        </td>
                        <td
                          className="px-0 py-1 text-center"
                          style={{
                            border: "1px solid black",
                            fontSize: `${tableFontSize - 1}px`,
                            height: "20px",
                          }}
                        >
                          {report.absent || 0}
                        </td>
                        <td
                          className="px-0 py-1 text-center font-bold"
                          style={{
                            border: "1px solid black",
                            fontSize: `${tableFontSize - 1}px`,
                            height: "20px",
                          }}
                        >
                          {(report.permission || 0) + (report.absent || 0)}
                        </td>
                      </>
                    )}

                    {/* ✅ Summary - បង្រីក padding */}
                    {showTotal && (
                      <td
                        className="px-0 py-1 text-center font-bold bg-green-50"
                        style={{
                          border: "1px solid black",
                          fontSize: `${tableFontSize}px`,
                          height: "20px",
                        }}
                      >
                        {report.total.toFixed(0)}
                      </td>
                    )}
                    {showAverage && (
                      <td
                        className="px-0 py-1 text-center font-bold bg-green-50"
                        style={{
                          border: "1px solid black",
                          fontSize: `${tableFontSize}px`,
                          height: "20px",
                        }}
                      >
                        {report.average.toFixed(2)}
                      </td>
                    )}
                    {showRank && (
                      <td
                        className="px-0 py-1 text-center font-bold text-red-600 bg-indigo-50"
                        style={{
                          border: "1px solid black",
                          fontSize: `${tableFontSize}px`,
                          height: "20px",
                        }}
                      >
                        {report.rank}
                      </td>
                    )}
                    {showGradeLevel && (
                      <td
                        className="px-0 py-1 text-center font-bold bg-yellow-50"
                        style={{
                          border: "1px solid black",
                          fontSize: `${tableFontSize}px`,
                          height: "20px",
                        }}
                      >
                        {report.letterGrade}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Statistics & Signatures (only on last page) */}
          {pageIndex === paginatedReports.length - 1 && (
            <>
              {/* Statistics */}
              <div className="mb-2 pb-1 mt-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex-1">
                    <span
                      className="font-bold"
                      style={{ fontFamily: "'Khmer OS Bokor', serif" }}
                    >
                      សិស្សសរុប៖{" "}
                    </span>
                    <span className="font-bold text-blue-700">
                      {paginatedReports.flat().length} នាក់
                    </span>
                    <span className="mx-1">/</span>
                    <span
                      className="font-bold"
                      style={{ fontFamily: "'Khmer OS Bokor', serif" }}
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
                      style={{ fontFamily: "'Khmer OS Bokor', serif" }}
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
                      style={{ fontFamily: "'Khmer OS Bokor', serif" }}
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
                      style={{ fontFamily: "'Khmer OS Bokor', serif" }}
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
                      style={{ fontFamily: "'Khmer OS Bokor', serif" }}
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
                    className="text-xs mb-0. 5"
                    style={{ fontFamily: "'Khmer OS Siem Reap', serif" }}
                  >
                    {reportDate}
                  </p>
                  <p
                    className="text-xs font-bold mb-0.5"
                    style={{ fontFamily: "'Khmer OS Siem Reap', serif" }}
                  >
                    បានឃើញ និងឯកភាព
                  </p>

                  <p
                    className="text-xs font-bold text-blue-600"
                    style={{ fontFamily: "'Khmer OS Muol Light', serif" }}
                  >
                    {principalName}
                  </p>
                </div>

                {/* Teacher */}
                <div className="text-center">
                  <p
                    className="text-xs mb-0.5"
                    style={{ fontFamily: "'Khmer OS Siem Reap', serif" }}
                  >
                    {reportDate}
                  </p>
                  <p
                    className="text-xs font-bold mb-0. 5"
                    style={{ fontFamily: "'Khmer OS Siem Reap', serif" }}
                  >
                    គ្រូទទួលបន្ទុកថ្នាក់
                  </p>
                  <div className="h-10 print:h-14"></div>
                  <p
                    className="text-xs font-bold text-blue-600"
                    style={{ fontFamily: "'Khmer OS Muol Light', serif" }}
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
