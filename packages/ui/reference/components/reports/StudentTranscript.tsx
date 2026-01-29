"use client";

interface StudentTranscriptProps {
  studentData: {
    studentId: string;
    studentName: string;
    studentNumber: string;
    dateOfBirth: string;
    placeOfBirth: string;
    gender: string;
    fatherName: string;
    fatherOccupation?: string;
    motherName: string;
    motherOccupation?: string;
    guardianPhone?: string;
    address: string;
    className: string;
    grade: string;
  };
  subjects: Array<{
    id: string;
    nameKh: string;
    code: string;
    maxScore: number;
  }>;
  subjectScores: {
    [subjectId: string]: {
      score: number | null;
      maxScore: number;
      gradeLevel?: string;
      gradeLevelKhmer?: string;
      percentage?: number;
    };
  };
  summary: {
    totalScore: number;
    averageScore: number;
    gradeLevel: string;
    gradeLevelKhmer: string;
    rank: number;
  };
  attendance?: {
    totalAbsent: number;
    permission: number;
    withoutPermission: number;
  };
  year: number;
  month: string | null;
  teacherName: string;
  principalName: string;
  schoolName: string;
  province: string;
  placeName: string;
  directorDate: string;
  teacherDate: string;
}

export default function StudentTranscript({
  studentData,
  subjects,
  subjectScores,
  summary,
  attendance,
  year,
  month,
  teacherName,
  principalName,
  schoolName,
  province,
  placeName,
  directorDate,
  teacherDate,
}: StudentTranscriptProps) {
  const displayValue = (
    value: string | number | null | undefined,
    suffix: string = ""
  ): string => {
    if (value === null || value === undefined || value === "" || value === 0) {
      return "N/A";
    }
    return `${value}${suffix}`;
  };

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
          font-family: "Khmer OS Battambang";
          src: local("Khmer OS Battambang"), local("KhmerOSBattambang");
        }
        @font-face {
          font-family: "Tacteing";
          src: local("Tacteing"), local("TacteingA");
        }

        .transcript-page-wrapper {
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white !important;
          padding: 20mm 0;
          page-break-after: always;
          page-break-inside: avoid;
        }

        .transcript-page-wrapper:last-child {
          page-break-after: auto;
        }

        @media screen {
          .transcript-page-wrapper {
            margin-bottom: 20px;
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          html {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .transcript-page-wrapper {
            width: 100%;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            break-inside: avoid;
            background: white !important;
            padding: 10mm 0 !important;
            margin: 0 !important;
            position: relative;
          }

          .transcript-page-wrapper:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .student-transcript-container {
            box-shadow: none !important;
            background: white !important;
            margin: 0 auto !important;
            page-break-inside: avoid;
            break-inside: avoid;
            position: relative;
            left: auto;
            transform: none;
          }

          .student-transcript-container * {
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="transcript-page-wrapper">
        <div
          className="bg-white student-transcript-container"
          style={{
            width: "277mm",
            maxWidth: "277mm",
            height: "190mm",
            padding: "4mm",
            border: "2px solid black",
            boxSizing: "border-box",
            fontFamily: "'Khmer OS Battambang', serif",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "none",
            margin: "0 auto",
          }}
        >
          <div className="flex flex-1">
            {/* Left Side - Student Info (50%) */}
            <div
              style={{
                width: "50%",
                display: "flex",
                flexDirection: "column",
                padding: "4mm",
              }}
            >
              {/* Header */}
              <div className="text-center mb-1.5">
                <div>
                  <p
                    className="font-bold text-blue-700"
                    style={{
                      fontFamily: "'Khmer OS Muol Light', serif",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  >
                    ព្រះរាជាណាចក្រកម្ពុជា
                  </p>
                  <p
                    className="font-bold text-blue-700"
                    style={{
                      fontFamily: "'Khmer OS Muol Light', serif",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  >
                    ជាតិ សាសនា ព្រះមហាក្សត្រ
                  </p>
                  <p
                    className="text-red-600"
                    style={{
                      fontFamily: "'Tacteing', serif",
                      fontSize: "22px",
                      letterSpacing: "0.1em",
                      margin: "1px 0",
                    }}
                  >
                    3
                  </p>
                </div>

                <h1
                  className="font-bold text-blue-700 mt-1.5"
                  style={{
                    fontFamily: "'Khmer OS Muol Light', serif",
                    fontSize: "13px",
                    lineHeight: "1.3",
                  }}
                >
                  ព្រឹត្តិបត្រពិន្ទុ
                </h1>
                <p
                  className="mt-2.5"
                  style={{
                    fontFamily: "'Khmer OS Muol Light', serif",
                    fontSize: "10px",
                    lineHeight: "1.3",
                  }}
                >
                  {schoolName || "វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ"}
                </p>
              </div>

              {/* Student Details */}
              <div
                className="space-y-2"
                style={{
                  fontSize: "10px",
                  lineHeight: "2",
                  textAlign: "justify",
                }}
              >
                <div className="flex items-start">
                  <span
                    className="text-red-600 font-bold"
                    style={{ width: "105px" }}
                  >
                    សម្រាប់ខែ
                  </span>
                  <span className="text-red-600 font-bold">
                    ៖ {month || "ទាំងអស់"}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="font-bold" style={{ width: "105px" }}>
                    អត្តលេខ
                  </span>
                  <span className="font-bold">
                    ៖ {displayValue(studentData.studentNumber)}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="font-bold" style={{ width: "105px" }}>
                    ឈ្មោះសិស្ស
                  </span>
                  <span className="font-bold" style={{ width: "140px" }}>
                    ៖ {displayValue(studentData.studentName)}
                  </span>
                  <span style={{ fontSize: "10px", marginLeft: "auto" }}>
                    ភេទ៖ {studentData.gender?.toUpperCase() === "MALE" || studentData.gender === "male" ? "ប្រុស" : "ស្រី"}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="font-bold" style={{ width: "105px" }}>
                    ថ្ងៃខែឆ្នាំកំណើត
                  </span>
                  <span>៖ {displayValue(studentData.dateOfBirth)}</span>
                </div>

                <div className="flex items-start">
                  <span className="font-bold" style={{ width: "105px" }}>
                    ទីកន្លែងកំណើត
                  </span>
                  <span>៖ {displayValue(studentData.placeOfBirth)}</span>
                </div>

                <div className="flex items-start">
                  <span className="font-bold" style={{ width: "105px" }}>
                    ឪពុក
                  </span>
                  <span style={{ width: "140px" }}>
                    ៖ {displayValue(studentData.fatherName)}
                  </span>
                  <span style={{ fontSize: "10px", marginLeft: "auto" }}>
                    មុខរបរ៖ {displayValue(studentData.fatherOccupation)}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="font-bold" style={{ width: "105px" }}>
                    ម្តាយ
                  </span>
                  <span style={{ width: "140px" }}>
                    ៖ {displayValue(studentData.motherName)}
                  </span>
                  <span style={{ fontSize: "10px", marginLeft: "auto" }}>
                    មុខរបរ៖ {displayValue(studentData.motherOccupation)}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="font-bold" style={{ width: "105px" }}>
                    អាសយដ្ឋានសព្វថ្ងៃ
                  </span>
                  <span>៖ {displayValue(studentData.address)}</span>
                </div>

                <div className="flex items-start">
                  <span className="font-bold" style={{ width: "105px" }}>
                    ទូរសព្ទអាណាព្យាបាល
                  </span>
                  <span>៖ {displayValue(studentData.guardianPhone)}</span>
                </div>
              </div>

              {/* Footer Signatures */}
              <div className="mt-3 pt-1.5 border-t border-gray-300">
                <div
                  className="grid grid-cols-3 gap-1 text-center"
                  style={{ fontSize: "9px", lineHeight: "1.5" }}
                >
                  <div>
                    <p className="font-bold">
                      អវត្តមាន៖{" "}
                      {String(attendance?.totalAbsent || 0).padStart(2, "0")} ដង
                    </p>
                  </div>
                  <div>
                    <p className="font-bold">
                      មានច្បាប់៖{" "}
                      {String(attendance?.permission || 0).padStart(2, "0")} ដង
                    </p>
                  </div>
                  <div>
                    <p className="font-bold">
                      អត់ច្បាប់៖{" "}
                      {String(attendance?.withoutPermission || 0).padStart(
                        2,
                        "0"
                      )}{" "}
                      ដង
                    </p>
                  </div>
                </div>

                <div
                  className="mt-1.5 space-y-0"
                  style={{ fontSize: "8px", lineHeight: "1.6" }}
                >
                  <p>មតិឆ្លើយឆ្លងរបស់អាណាព្យាបាល៖</p>
                  <p
                    style={{
                      borderBottom: "1px dotted #000",
                      height: "18px",
                      margin: "2px 0",
                    }}
                  ></p>
                  <p
                    style={{
                      borderBottom: "1px dotted #000",
                      height: "18px",
                      margin: "2px 0",
                    }}
                  ></p>
                  <p
                    style={{
                      borderBottom: "1px dotted #000",
                      height: "18px",
                      margin: "2px 0",
                    }}
                  ></p>
                  <p
                    style={{
                      borderBottom: "1px dotted #000",
                      height: "18px",
                      margin: "2px 0",
                    }}
                  ></p>
                </div>

                <div
                  className="mt-1.5 text-center"
                  style={{
                    fontSize: "9px",
                    lineHeight: "2",
                    marginBottom: "8mm",
                  }}
                >
                  <p>
                    {placeName} {directorDate}
                  </p>
                  <p className="mt-1">បានឃើញ និងឯកភាព</p>
                  <p
                    className="font-bold text-blue-700"
                    style={{ fontFamily: "'Khmer OS Muol Light', serif" }}
                  >
                    {principalName || "នាយកសាលា"}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Grade Table (50%) */}
            <div
              style={{
                width: "50%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "10px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#FFF9E6" }}>
                    <th
                      rowSpan={2}
                      className="border border-black px-1.5 py-1.5"
                      style={{
                        width: "7%",
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      ល.រ
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-black px-1.5 py-1.5"
                      style={{
                        width: "25%",
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      មុខវិជ្ជា
                    </th>
                    <th
                      colSpan={3}
                      className="border border-black px-1.5 py-1"
                      style={{
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      ពិន្ទុ
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-black px-1.5 py-1.5"
                      style={{
                        width: "15%",
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      ផ្សេងៗ
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: "#FFF9E6" }}>
                    <th
                      className="border border-black px-1.5 py-1"
                      style={{
                        width: "12%",
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      អតិបរមា
                    </th>
                    <th
                      className="border border-black px-1.5 py-1"
                      style={{
                        width: "15%",
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      ពិន្ទុបាន
                    </th>
                    <th
                      className="border border-black px-1.5 py-1"
                      style={{
                        width: "12%",
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      និទ្ទេស
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {subjects.map((subject, index) => {
                    const scoreData = subjectScores[subject.id];
                    const score = scoreData?.score;
                    const maxScore = scoreData?.maxScore || subject.maxScore;

                    // ✅ Use grade level from backend if available, otherwise calculate
                    let gradeLevel = "";
                    if (scoreData?.gradeLevelKhmer) {
                      gradeLevel = scoreData.gradeLevelKhmer;
                    } else if (score !== null && score !== undefined) {
                      const percentage = (score / maxScore) * 100;
                      if (percentage >= 80) gradeLevel = "ល្អប្រសើរ";
                      else if (percentage >= 70) gradeLevel = "ល្អណាស់";
                      else if (percentage >= 60) gradeLevel = "ល្អ";
                      else if (percentage >= 50) gradeLevel = "ល្អបង្គួរ";
                      else if (percentage >= 40) gradeLevel = "មធ្យម";
                      else gradeLevel = "ខ្សោយ";
                    }

                    return (
                      <tr key={subject.id}>
                        <td
                          className="border border-black px-1.5 py-1 text-center"
                          style={{
                            fontFamily: "'Time New Roman'",
                            fontWeight: "bold",
                          }}
                        >
                          {index + 1}
                        </td>
                        <td className="border border-black px-1.5 py-1">
                          {subject.nameKh}
                        </td>
                        <td
                          className="border border-black px-1.5 py-1 text-center font-bold"
                          style={{
                            fontFamily: "'Time New Roman'",
                            fontWeight: "bold",
                          }}
                        >
                          {maxScore}
                        </td>
                        <td
                          className="border border-black px-1.5 py-1 text-center font-bold"
                          style={{
                            color: "#2563EB",
                            fontSize: "11px",
                            fontFamily: "'Time New Roman'",
                            fontWeight: "bold",
                          }}
                        >
                          {score !== null && score !== undefined
                            ? Math.round(score)
                            : "N/A"}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center">
                          {gradeLevel || "N/A"}
                        </td>
                        {/* ✅ Keep column but remove data */}
                        <td className="border border-black px-1.5 py-1 text-center"></td>
                      </tr>
                    );
                  })}

                  {/* Empty rows */}
                  {Array.from({
                    length: Math.max(0, 11 - subjects.length),
                  }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="border border-black px-1.5 py-1 text-center">
                        {subjects.length + i + 1}
                      </td>
                      <td className="border border-black px-1.5 py-1"></td>
                      <td className="border border-black px-1.5 py-1"></td>
                      <td className="border border-black px-1.5 py-1"></td>
                      <td className="border border-black px-1.5 py-1"></td>
                      <td className="border border-black px-1.5 py-1"></td>
                    </tr>
                  ))}

                  {/* Summary Rows */}
                  <tr style={{ backgroundColor: "#EFF6FF" }}>
                    <td
                      colSpan={3}
                      className="border border-black px-1.5 py-1.5 text-center font-bold"
                      style={{
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      ពិន្ទុសរុប
                    </td>

                    <td
                      className="border border-black px-1.5 py-1.5 text-center font-bold"
                      style={{
                        color: "#2563EB",
                        fontSize: "12px",
                        fontFamily: "'Time New Roman'",
                      }}
                    >
                      {summary.totalScore > 0
                        ? summary.totalScore.toFixed(0)
                        : "N/A"}
                    </td>
                    <td
                      className="border border-black px-1.5 py-1.5 text-center font-bold"
                      style={{
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      ចំណាត់ថ្នាក់
                    </td>
                    <td
                      className="border border-black px-1.5 py-1.5 text-center font-bold"
                      style={{
                        color: "#DC2626",
                        fontSize: "12px",
                        fontFamily: "'Time New Roman'",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.rank > 0 ? summary.rank : "N/A"}
                    </td>
                  </tr>

                  <tr style={{ backgroundColor: "#EFF6FF" }}>
                    <td
                      colSpan={3}
                      className="border border-black px-1.5 py-1.5 text-center font-bold"
                      style={{
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      មធ្យមភាគ
                    </td>
                    <td
                      className="border border-black px-1.5 py-1.5 text-center font-bold"
                      style={{
                        color: "#2563EB",
                        fontSize: "12px",
                        fontFamily: "'Time New Roman'",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.averageScore > 0
                        ? summary.averageScore.toFixed(2)
                        : "N/A"}
                    </td>
                    <td
                      className="border border-black px-1.5 py-1.5 text-center font-bold"
                      style={{
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      និទ្ទេស
                    </td>
                    <td
                      className="border border-black px-1.5 py-1.5 text-center font-bold"
                      style={{
                        color: "#2563EB",
                        fontSize: "12px",
                        fontFamily: "'Khmer OS Muol Light', serif",
                      }}
                    >
                      {summary.gradeLevelKhmer || "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="mt-3 p-1.5" style={{ marginBottom: "8mm" }}>
                <div
                  className="text-center space-y-0"
                  style={{
                    fontSize: "9px",
                    lineHeight: "2",
                    textAlign: "center",
                  }}
                >
                  <p>
                    {placeName} {teacherDate}
                  </p>
                  <p className="mt-0.5">បានឃើញ និងឯកភាព</p>
                  <p
                    className="font-bold text-blue-700"
                    style={{
                      fontFamily: "'Khmer OS Muol Light', serif",
                    }}
                  >
                    គ្រូប្រចាំថ្នាក់
                  </p>
                </div>

                <div className="mt-16 text-center" style={{ fontSize: "9px" }}>
                  <p className="font-bold">
                    {teacherName ? `${teacherName}` : "វ៉ែន សុភា 092 25 67 87"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
