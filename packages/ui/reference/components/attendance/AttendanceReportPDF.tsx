"use client";

import { AttendanceGridData } from "@/lib/api/attendance";

interface AttendanceReportPDFProps {
  gridData: AttendanceGridData;
  schoolName?: string;
  province?: string;
  signatureLocation?: string;
  signatureDay?: string;
  signatureMonth?: string;
  signatureYear?: string;
  principalName?: string;
  teacherName?: string;
}

export default function AttendanceReportPDF({
  gridData,
  schoolName = "វិទ្យាល័យ ហ៊ុន សែន យធំ",
  province = "មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប",
  signatureLocation = "សៀមរាប",
  signatureDay = "",
  signatureMonth = "",
  signatureYear = "",
  principalName = "",
  teacherName = "",
}: AttendanceReportPDFProps) {
  // Pagination - 37 students per page
  const studentsPerPage = 37;
  const totalPages = Math.ceil(gridData.students.length / studentsPerPage);

  const paginatedStudents: any[][] = [];
  for (let i = 0; i < totalPages; i++) {
    const start = i * studentsPerPage;
    const end = start + studentsPerPage;
    paginatedStudents.push(gridData.students.slice(start, end));
  }

  // Helper function to get day of week
  const getDayOfWeek = (day: number): number => {
    const date = new Date(gridData.year, gridData.monthNumber - 1, day);
    return date.getDay();
  };

  // Helper function to get day label
  const getDayLabel = (day: number): string => {
    const dayOfWeek = getDayOfWeek(day);
    const dayLabels = ["អា", "ច", "អ", "ព", "ព្រ", "សុ", "ស"];
    return dayLabels[dayOfWeek];
  };

  // Helper function to get day color scheme
  const getDayColorClass = (day: number): string => {
    const dayOfWeek = getDayOfWeek(day);
    const colors = [
      "bg-rose-50", // Sunday
      "bg-sky-50", // Monday
      "bg-emerald-50", // Tuesday
      "bg-amber-50", // Wednesday
      "bg-violet-50", // Thursday
      "bg-fuchsia-50", // Friday
      "bg-orange-50", // Saturday
    ];
    return colors[dayOfWeek];
  };

  // Calculate totals for each student
  const getStudentTotals = (student: any) => {
    let absent = 0;
    let permission = 0;

    gridData.days.forEach((day) => {
      const morningData = student.attendance[`${day}_M`];
      const afternoonData = student.attendance[`${day}_A`];

      if (morningData?.displayValue === "A") absent++;
      if (morningData?.displayValue === "P") permission++;
      if (afternoonData?.displayValue === "A") absent++;
      if (afternoonData?.displayValue === "P") permission++;
    });

    return { absent, permission };
  };

  return (
    <>
      <style jsx global>{`
        @font-face {
          font-family: "Khmer OS Muol Light";
          src: local("Khmer OS Muol Light"), local("KhmerOSMuolLight");
        }
        @font-face {
          font-family: "Khmer OS Battambang";
          src: local("Khmer OS Battambang"), local("KhmerOSBattambang");
        }
        @font-face {
          font-family: "Tacteing";
          src: local("Tacteing");
        }

        . attendance-report {
          width: 100%;
          background: white;
          font-family: "Khmer OS Battambang", Arial, sans-serif;
          color: #000;
        }

        .attendance-page {
          page-break-after: always;
          page-break-inside: avoid;
        }

        .attendance-page: last-child {
          page-break-after: auto;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0.5cm;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .attendance-page {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0.5cm !important;
            box-shadow: none !important;
            background: white !important;
          }

          .attendance-page:last-child {
            page-break-after: auto !important;
          }

          .attendance-report {
            width: 100%;
            display: block;
            position: relative;
          }

          thead {
            display: table-header-group;
          }

          tbody {
            display: table-row-group;
          }

          tr {
            page-break-inside: avoid;
          }

          table {
            page-break-inside: auto;
            width: 100%;
            border-collapse: collapse !important;
          }

          . no-print {
            display: none;
          }
        }

        .header-title {
          font-family: "Khmer OS Muol Light", "Khmer OS Battambang", Arial,
            sans-serif;
        }

        .cell-border {
          border: 0.5px solid #000;
        }

        .attendance-cell {
          min-width: 15px;
          max-width: 15px;
          width: 15px;
          padding: 0.5px;
          text-align: center;
          font-size: 7px;
          font-weight: bold;
          font-family: "Khmer OS Battambang", Arial, sans-serif;
        }

        .total-cell {
          min-width: 14px;
          max-width: 14px;
          width: 14px;
          padding: 1px;
          text-align: center;
          font-size: 7px;
          font-family: "Khmer OS Battambang", Arial, sans-serif;
        }

        .student-name {
          min-width: 110px;
          max-width: 110px;
          width: 110px;
          padding: 1px 3px;
          font-size: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: "Khmer OS Battambang", Arial, sans-serif;
        }

        .day-header {
          font-size: 7px;
          font-weight: bold;
          text-align: center;
          padding: 1px 0.5px;
          font-family: "Khmer OS Battambang", Arial, sans-serif;
        }

        .session-header {
          font-size: 6px;
          text-align: center;
          padding: 0.5px;
          font-weight: 600;
          font-family: "Khmer OS Battambang", Arial, sans-serif;
        }
      `}</style>

      <div id="attendance-report-content">
        {paginatedStudents.map((studentsOnPage, pageIndex) => (
          <div
            key={pageIndex}
            className="attendance-page attendance-report"
            style={{
              width: "100%",
              minHeight: "auto",
              margin: "0 auto",
              boxSizing: "border-box",
              maxWidth: "100%",
              marginBottom: "20px",
            }}
          >
            {/* Header - Full header on first page */}
            {pageIndex === 0 && (
              <>
                <div className="flex items-start justify-between mb-2">
                  {/* Left side */}
                  <div
                    className="text-left"
                    style={{
                      fontSize: "9px",
                      fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                    }}
                  >
                    <div className="font-semibold font-koulen">{province}</div>
                    <div
                      className="font-bold header-title"
                      style={{ fontSize: "11px" }}
                    >
                      {schoolName}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="text-center">
                    <div
                      className="header-title font-bold"
                      style={{ fontSize: "12px", marginBottom: "1px" }}
                    >
                      ព្រះរាជាណាចក្រកម្ពុជា
                    </div>
                    <div
                      style={{ fontSize: "12px", marginBottom: "1px" }}
                      className="header-title"
                    >
                      ជាតិ សាសនា ព្រះមហាក្សត្រ
                    </div>
                    <div
                      className="text-red-600"
                      style={{
                        fontFamily: "'Tacteing', serif",
                        letterSpacing: "0.1em",
                        fontSize: "22px",
                        marginTop: "0px",
                      }}
                    >
                      3
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-2">
                  <h1
                    className="header-title font-bold"
                    style={{ fontSize: "13px", marginBottom: "2px" }}
                  >
                    សម្រង់អវត្តមានសិស្ស
                  </h1>
                  <div
                    style={{
                      fontSize: "9px",
                      fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                    }}
                  >
                    <span>ខែ: {gridData.month} </span>
                    <span className="mx-1">•</span>
                    <span>
                      ឆ្នាំសិក្សា: {gridData.year}-{gridData.year + 1}
                    </span>
                  </div>
                  <div
                    className="font-bold header-title"
                    style={{ fontSize: "11px", marginTop: "2px" }}
                  >
                    {gridData.className}
                    {totalPages > 1 && (
                      <span
                        style={{
                          fontSize: "8px",
                          marginLeft: "8px",
                          fontFamily:
                            "'Khmer OS Battambang', Arial, sans-serif",
                        }}
                      >
                        (ទំព័រ {pageIndex + 1}/{totalPages})
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Simplified header for continuation pages */}
            {pageIndex > 0 && (
              <div className="text-center mb-2">
                <div
                  className="font-bold header-title"
                  style={{ fontSize: "11px" }}
                >
                  {gridData.className} - តារាងវត្តមាន {gridData.month}{" "}
                  {gridData.year}
                  <span
                    style={{
                      fontSize: "8px",
                      marginLeft: "8px",
                      fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                    }}
                  >
                    (ទំព័រ {pageIndex + 1}/{totalPages})
                  </span>
                </div>
              </div>
            )}

            {/* Attendance Table */}
            <table
              className="w-full border-collapse"
              style={{ fontSize: "7px" }}
            >
              <thead>
                {/* Day numbers row */}
                <tr>
                  <th
                    rowSpan={2}
                    className="cell-border bg-gray-100"
                    style={{
                      minWidth: "15px",
                      maxWidth: "15px",
                      width: "15px",
                      padding: "2px 1px",
                      fontSize: "7px",
                      fontWeight: "bold",
                      fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                    }}
                  >
                    ល. រ
                  </th>
                  <th
                    rowSpan={2}
                    className="cell-border bg-gray-100 student-name"
                    style={{
                      fontSize: "7px",
                      fontWeight: "bold",
                      textAlign: "left",
                      fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                    }}
                  >
                    គោត្តនាម និងនាម
                  </th>
                  {gridData.days.map((day) => (
                    <th
                      key={day}
                      colSpan={2}
                      className={`cell-border day-header ${getDayColorClass(
                        day
                      )}`}
                    >
                      <div>{day}</div>
                    </th>
                  ))}
                  <th
                    colSpan={2}
                    className="cell-border bg-gray-100"
                    style={{
                      minWidth: "28px",
                      maxWidth: "28px",
                      width: "28px",
                      padding: "2px 1px",
                      fontSize: "7px",
                      fontWeight: "bold",
                      fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                    }}
                  >
                    សរុប
                    <br />
                    <span style={{ fontSize: "6px" }}>Total</span>
                  </th>
                </tr>

                {/* Session labels row (M/A) */}
                <tr>
                  {gridData.days.map((day) => (
                    <>
                      <th
                        key={`${day}_M`}
                        className={`cell-border session-header ${getDayColorClass(
                          day
                        )}`}
                      >
                        M
                      </th>
                      <th
                        key={`${day}_A`}
                        className={`cell-border session-header ${getDayColorClass(
                          day
                        )}`}
                        style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                      >
                        A
                      </th>
                    </>
                  ))}
                  <th className="cell-border session-header bg-gray-100 total-cell">
                    A
                  </th>
                  <th className="cell-border session-header bg-gray-100 total-cell">
                    P
                  </th>
                </tr>
              </thead>

              <tbody>
                {studentsOnPage.map((student, relativeIndex) => {
                  const index = pageIndex * studentsPerPage + relativeIndex;
                  const totals = getStudentTotals(student);
                  return (
                    <tr key={student.studentId}>
                      {/* Row number */}
                      <td
                        className="cell-border text-center"
                        style={{
                          padding: "1px",
                          fontSize: "7px",
                          backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb",
                        }}
                      >
                        {index + 1}
                      </td>

                      {/* Student name */}
                      <td
                        className="cell-border student-name"
                        style={{
                          backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb",
                        }}
                      >
                        {student.studentName}
                      </td>

                      {/* Attendance cells */}
                      {gridData.days.map((day) => {
                        const morningData = student.attendance[`${day}_M`];
                        const afternoonData = student.attendance[`${day}_A`];
                        const morningValue = morningData?.displayValue || "";
                        const afternoonValue =
                          afternoonData?.displayValue || "";

                        return (
                          <>
                            {/* Morning */}
                            <td
                              key={`${day}_M`}
                              className={`cell-border attendance-cell ${getDayColorClass(
                                day
                              )}`}
                              style={{
                                backgroundColor:
                                  morningValue === "A"
                                    ? "#fecaca"
                                    : morningValue === "P"
                                    ? "#fed7aa"
                                    : undefined,
                                color:
                                  morningValue === "A" || morningValue === "P"
                                    ? "#000"
                                    : "#666",
                              }}
                            >
                              {morningValue}
                            </td>

                            {/* Afternoon */}
                            <td
                              key={`${day}_A`}
                              className={`cell-border attendance-cell ${getDayColorClass(
                                day
                              )}`}
                              style={{
                                backgroundColor:
                                  afternoonValue === "A"
                                    ? "#fecaca"
                                    : afternoonValue === "P"
                                    ? "#fed7aa"
                                    : "rgba(0,0,0,0.03)",
                                color:
                                  afternoonValue === "A" ||
                                  afternoonValue === "P"
                                    ? "#000"
                                    : "#666",
                              }}
                            >
                              {afternoonValue}
                            </td>
                          </>
                        );
                      })}

                      {/* Total absent */}
                      <td
                        className="cell-border total-cell"
                        style={{
                          fontWeight: "bold",
                          backgroundColor:
                            totals.absent > 0 ? "#fee2e2" : "#f9fafb",
                          color: totals.absent > 0 ? "#dc2626" : "#000",
                        }}
                      >
                        {totals.absent || ""}
                      </td>

                      {/* Total permission */}
                      <td
                        className="cell-border total-cell"
                        style={{
                          fontWeight: "bold",
                          backgroundColor:
                            totals.permission > 0 ? "#ffedd5" : "#f9fafb",
                          color: totals.permission > 0 ? "#ea580c" : "#000",
                        }}
                      >
                        {totals.permission || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary */}
            <div
              className="mt-2 flex items-center gap-4"
              style={{
                fontSize: "7px",
                fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
              }}
            >
              <div>
                <strong>សិស្សសរុប:</strong> {gridData.students.length} នាក់
                {totalPages > 1 && (
                  <span style={{ marginLeft: "8px" }}>
                    (ទំព័រនេះ: {studentsOnPage.length} នាក់)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span style={{ fontWeight: "bold" }}>M=ព្រឹក</span>
                </div>
                <div className="flex items-center gap-1">
                  <span style={{ fontWeight: "bold" }}>A=ល្ងាច</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#fecaca",
                      border: "0.5px solid #000",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "6px",
                      fontWeight: "bold",
                      fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                    }}
                  >
                    A
                  </div>
                  <span>អត់ច្បាប់</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#fed7aa",
                      border: "0.5px solid #000",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "6px",
                      fontWeight: "bold",
                      fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                    }}
                  >
                    P
                  </div>
                  <span>មានច្បាប់</span>
                </div>
              </div>
            </div>

            {/* Footer - Only on last page */}
            {pageIndex === totalPages - 1 && (
              <div className="mt-4 flex justify-between items-start">
                <div
                  className="text-center"
                  style={{
                    fontSize: "8px",
                    fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                  }}
                >
                  <div>
                    {signatureLocation} ថ្ងៃទី{signatureDay} ខែ{signatureMonth}{" "}
                    ឆ្នាំ{signatureYear}
                  </div>
                  <div className="mt-1 font-semibold header-title">
                    បានឃើញ និងឯកភាព
                  </div>
                  <div className="mt-6 font-semibold text-blue-600">
                    {principalName || ""}
                  </div>
                </div>

                <div
                  className="text-center"
                  style={{
                    fontSize: "8px",
                    fontFamily: "'Khmer OS Battambang', Arial, sans-serif",
                  }}
                >
                  <div>
                    {signatureLocation} ថ្ងៃទី{signatureDay} ខែ{signatureMonth}{" "}
                    ឆ្នាំ{signatureYear}
                  </div>
                  <div className="mt-1 font-semibold header-title">
                    គ្រូទទួលបន្ទុកថ្នាក់
                  </div>
                  <div className="mt-8 font-semibold text-blue-600">
                    {teacherName || ""}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
