"use client";

import React from "react";

interface TopStudent {
  rank: number;
  studentId: string;
  khmerName: string;
  className: string;
  averageScore: number;
  letterGrade: string;
  tied?: boolean;
}

interface HonorCertificateProps {
  topStudents: TopStudent[];
  reportType: "class" | "grade";
  className?: string;
  grade?: string;
  academicYear: string;
  month?: string;
  teacherName?: string;
  principalName?: string;
  oldKhmerDate?: string;
  newKhmerDate?: string;
}

export default function HonorCertificate({
  topStudents,
  reportType,
  className,
  grade,
  academicYear,
  month,
  teacherName,
  principalName,
  oldKhmerDate,
  newKhmerDate,
}: HonorCertificateProps) {
  const getRankImage = (rank: number): string => {
    const images = [
      "/images/awards/number1.png",
      "/images/awards/number2.png",
      "/images/awards/number3.png",
      "/images/awards/number4.png",
      "/images/awards/number5.png",
    ];
    return images[rank - 1] || "/images/awards/number5.png";
  };

  const getCurrentDate = () => {
    const months = [
      "មករា",
      "កុម្ភៈ",
      "មីនា",
      "មេសា",
      "ឧសភា",
      "មិថុនា",
      "កក្កដា",
      "សីហា",
      "កញ្ញា",
      "តុលា",
      "វិច្ឆិកា",
      "ធ្នូ",
    ];
    const now = new Date();
    const day = now.getDate();
    const khmerMonth = month || months[now.getMonth()];
    const year = now.getFullYear();
    return `ថ្ងៃទី${day < 10 ? "0" + day : day} ខែ${khmerMonth} ឆ្នាំ${year}`;
  };

  const getGradeColor = (letterGrade?: string): string => {
    if (!letterGrade || letterGrade === "undefined") return "#6B7280";
    const grade = letterGrade.toUpperCase().trim();
    switch (grade) {
      case "A":
        return "#10B981"; // Green
      case "B":
        return "#3B82F6"; // Blue
      case "C":
        return "#F59E0B"; // Orange
      case "D":
        return "#F97316"; // Orange-Red
      case "E":
        return "#EF4444"; // Red
      case "F":
        return "#DC2626"; // Dark Red
      default:
        return "#6B7280"; // Gray
    }
  };

  const displayGrade = (letterGrade?: string): string => {
    if (!letterGrade || letterGrade === "undefined") return "N/A";
    return letterGrade.toUpperCase().trim();
  };

  return (
    <>
      <style jsx>{`
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
          src: local("Tacteing"), local("TacteingA");
        }
      `}</style>
      <div
        className="bg-white mx-auto relative overflow-hidden"
        style={{
          width: "210mm",
          height: "297mm",
          padding: "10mm 15mm",
          fontFamily: "Khmer OS Battambang",
        }}
      >
        {/* Abstract Background */}
        <div className="absolute inset-0 overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0.04 }}
          >
            <defs>
              <pattern
                id="hexPattern"
                x="0"
                y="0"
                width="120"
                height="104"
                patternUnits="userSpaceOnUse"
              >
                <polygon
                  points="60,2 90,26 90,74 60,98 30,74 30,26"
                  fill="none"
                  stroke="#EC4899"
                  strokeWidth="2"
                />
                <circle cx="60" cy="2" r="3" fill="#EC4899" />
                <circle cx="90" cy="26" r="3" fill="#F472B6" />
                <circle cx="90" cy="74" r="3" fill="#EC4899" />
                <circle cx="60" cy="98" r="3" fill="#F472B6" />
                <circle cx="30" cy="74" r="3" fill="#EC4899" />
                <circle cx="30" cy="26" r="3" fill="#F472B6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexPattern)" />
          </svg>

          <div className="absolute bottom-10 right-10 opacity-[0.035]">
            <svg width="300" height="400" viewBox="0 0 300 400">
              <line
                x1="150"
                y1="400"
                x2="150"
                y2="250"
                stroke="#3B82F6"
                strokeWidth="3"
              />
              <line
                x1="150"
                y1="250"
                x2="100"
                y2="200"
                stroke="#3B82F6"
                strokeWidth="2. 5"
              />
              <line
                x1="150"
                y1="250"
                x2="200"
                y2="200"
                stroke="#3B82F6"
                strokeWidth="2.5"
              />
              <line
                x1="150"
                y1="250"
                x2="150"
                y2="180"
                stroke="#3B82F6"
                strokeWidth="2.5"
              />
              <line
                x1="100"
                y1="200"
                x2="70"
                y2="160"
                stroke="#10B981"
                strokeWidth="2"
              />
              <line
                x1="100"
                y1="200"
                x2="130"
                y2="160"
                stroke="#10B981"
                strokeWidth="2"
              />
              <line
                x1="200"
                y1="200"
                x2="170"
                y2="160"
                stroke="#10B981"
                strokeWidth="2"
              />
              <line
                x1="200"
                y1="200"
                x2="230"
                y2="160"
                stroke="#10B981"
                strokeWidth="2"
              />
              <line
                x1="150"
                y1="180"
                x2="120"
                y2="130"
                stroke="#10B981"
                strokeWidth="2"
              />
              <line
                x1="150"
                y1="180"
                x2="180"
                y2="130"
                stroke="#10B981"
                strokeWidth="2"
              />

              <circle cx="150" cy="100" r="25" fill="#06B6D4" />
              <circle cx="70" cy="160" r="18" fill="#8B5CF6" />
              <circle cx="230" cy="160" r="18" fill="#8B5CF6" />
              <circle cx="130" cy="160" r="18" fill="#10B981" />
              <circle cx="170" cy="160" r="18" fill="#F59E0B" />
              <circle cx="120" cy="130" r="16" fill="#3B82F6" />
              <circle cx="180" cy="130" r="16" fill="#06B6D4" />
              <circle cx="100" cy="200" r="20" fill="#EC4899" />
              <circle cx="200" cy="200" r="20" fill="#EC4899" />
              <circle cx="150" cy="250" r="5" fill="#3B82F6" />
            </svg>
          </div>

          <div className="absolute top-1/4 left-12 opacity-[0.02]">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="#EC4899">
              <path d="M5 13. 18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
            </svg>
          </div>
          <div className="absolute bottom-1/3 left-1/4 opacity-[0.02]">
            <svg width="70" height="70" viewBox="0 0 24 24" fill="#3B82F6">
              <path d="M21 5c-1.11-. 35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14. 65c0 . 25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05. 25 0 .5-.25.5-.5V6c-. 6-.45-1.25-.75-2-1zm0 13. 5c-1.1-. 35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-. 85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
            </svg>
          </div>
          <div className="absolute top-1/3 right-1/3 text-pink-400 opacity-[0.025] text-4xl">
            ⭐
          </div>
          <div className="absolute bottom-1/2 left-1/3 text-blue-400 opacity-[0.02] text-3xl">
            ✨
          </div>

          <div
            className="absolute inset-4 border-2 border-pink-200 opacity-[0.1] rounded-xl pointer-events-none"
            style={{ borderStyle: "double" }}
          />
          <div className="absolute inset-6 border border-blue-200 opacity-[0.08] rounded-lg pointer-events-none" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="mb-0">
            <div className="text-center">
              <div
                style={{
                  fontFamily: "Khmer OS Muol Light",
                  fontSize: "10pt",
                  lineHeight: "1.4",
                }}
              >
                <div className="text-red-600">ព្រះរាជាណាចក្រកម្ពុជា</div>
                <div className="text-red-600">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
                <div
                  className="text-red-600"
                  style={{
                    fontFamily: "Tacteing",
                    fontSize: "26pt",
                    marginTop: "-12px",
                  }}
                >
                  3
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "-28px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: "flex-start",
              }}
            >
              <img
                src="/logo.png"
                alt="School Logo"
                style={{
                  width: "70px",
                  height: "70px",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontFamily: "Khmer OS Bokor",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <p style={{ margin: 0, padding: 0 }}>
                  វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ
                </p>
                <p style={{ margin: 0, padding: 0 }}>ខេត្តសៀមរាប</p>
              </div>
            </div>

            <div className="text-center mb-2">
              <h1
                className="text-red-600 text-2xl font-black mb-1"
                style={{
                  fontFamily: "Khmer OS Muol Light",
                  lineHeight: "1.1",
                  marginTop: "-35px",
                }}
              >
                តារាងកិត្តិយស
              </h1>
            </div>

            <div
              className="text-center space-y-0"
              style={{ fontFamily: "Khmer OS Muol Light", fontSize: "10.5pt" }}
            >
              <div className="font-bold text-gray-800">
                {reportType === "class" &&
                  className &&
                  `ប្រចាំខែ ${month || "..."}, ${className}`}
                {reportType === "grade" &&
                  grade &&
                  `ប្រចាំខែ ${month || "..."}, ថ្នាក់ទី ${grade}`}
              </div>
              <div className="font-bold text-gray-700">
                ឆ្នាំសិក្សា {academicYear}
              </div>
            </div>
          </div>

          {/* Top 5 Students */}
          <div className="flex-1 flex flex-col justify-center">
            {topStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-3">🏆</div>
                <p className="text-lg text-gray-500 font-bold">
                  មិនទាន់មានទិន្នន័យ
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Rank 1 */}
                {topStudents[0] && (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ transform: "scale(1.15)" }}
                      >
                        <svg width="180" height="180" viewBox="0 0 180 180">
                          <circle
                            cx="90"
                            cy="90"
                            r="82"
                            fill="none"
                            stroke="#FFD700"
                            strokeWidth="6"
                            strokeDasharray="3,3"
                            opacity="0.6"
                          />
                          <circle
                            cx="90"
                            cy="90"
                            r="77"
                            fill="none"
                            stroke="#FFA500"
                            strokeWidth="3"
                            opacity="0.4"
                          />
                        </svg>
                      </div>

                      <div
                        style={{
                          position: "relative",
                          width: "155px",
                          height: "155px",
                          borderRadius: "50%",
                          border: "4px solid #EF4444",
                          overflow: "hidden",
                          backgroundColor: "white",
                          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        }}
                      >
                        <img
                          src={getRankImage(1)}
                          alt="Rank 1"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            padding: "8px",
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-0.5 text-center">
                      {/* ✅ Grade Letter as Text */}
                      <div
                        style={{
                          fontSize: "32px",
                          fontWeight: 900,
                          fontFamily: "Arial, sans-serif",
                          color: getGradeColor(topStudents[0].letterGrade),
                          lineHeight: "1",
                          marginBottom: "4px",
                        }}
                      >
                        {displayGrade(topStudents[0].letterGrade)}
                      </div>

                      {/* Average Score */}
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          color: "#C2410C",
                          fontFamily: "Khmer OS Battambang",
                          marginBottom: "2px",
                        }}
                      >
                        មធ្យមភាគ {topStudents[0].averageScore.toFixed(2)}
                      </div>

                      {/* Student Name */}
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 900,
                          color: "#111827",
                          fontFamily: "Khmer OS Muol Light",
                        }}
                      >
                        {topStudents[0].khmerName}
                      </div>

                      {/* Class Name (for grade report) */}
                      {reportType === "grade" && (
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#4B5563",
                            fontFamily: "Khmer OS Battambang",
                            marginTop: "2px",
                          }}
                        >
                          ថ្នាក់ {topStudents[0].className}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ranks 2-3 */}
                <div
                  className="grid grid-cols-2 gap-12 max-w-4xl mx-auto px-4"
                  style={{ marginTop: "-140px" }}
                >
                  {topStudents.slice(1, 3).map((student) => (
                    <div
                      key={student.studentId}
                      className="flex flex-col items-center"
                    >
                      <div className="relative">
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ transform: "scale(1.15)" }}
                        >
                          <svg width="180" height="180" viewBox="0 0 180 180">
                            <circle
                              cx="90"
                              cy="90"
                              r="82"
                              fill="none"
                              stroke="#FFD700"
                              strokeWidth="6"
                              strokeDasharray="3,3"
                              opacity="0.6"
                            />
                            <circle
                              cx="90"
                              cy="90"
                              r="77"
                              fill="none"
                              stroke="#FFA500"
                              strokeWidth="3"
                              opacity="0.4"
                            />
                          </svg>
                        </div>

                        <div
                          style={{
                            position: "relative",
                            width: "150px",
                            height: "150px",
                            borderRadius: "50%",
                            border: "4px solid #F87171",
                            overflow: "hidden",
                            backgroundColor: "white",
                            boxShadow:
                              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                          }}
                        >
                          <img
                            src={getRankImage(student.rank)}
                            alt={`Rank ${student.rank}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              padding: "8px",
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-0.5 text-center">
                        {/* ✅ Grade Letter as Text */}
                        <div
                          style={{
                            fontSize: "32px",
                            fontWeight: 900,
                            fontFamily: "Arial, sans-serif",
                            color: getGradeColor(student.letterGrade),
                            lineHeight: "1",
                            marginBottom: "4px",
                          }}
                        >
                          {displayGrade(student.letterGrade)}
                        </div>

                        {/* Average Score */}
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#C2410C",
                            fontFamily: "Khmer OS Battambang",
                            marginBottom: "2px",
                          }}
                        >
                          មធ្យមភាគ {student.averageScore.toFixed(2)}
                        </div>

                        {/* Student Name */}
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 900,
                            color: "#111827",
                            fontFamily: "Khmer OS Muol Light",
                          }}
                        >
                          {student.khmerName}
                        </div>

                        {/* Class Name (for grade report) */}
                        {reportType === "grade" && (
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#4B5563",
                              fontFamily: "Khmer OS Battambang",
                              marginTop: "2px",
                            }}
                          >
                            ថ្នាក់ {student.className}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ranks 4-5 */}
                {topStudents.length >= 4 && (
                  <div className="grid grid-cols-2 gap-12 max-w-4xl mx-auto px-4">
                    {topStudents.slice(3, 5).map((student) => (
                      <div
                        key={student.studentId}
                        className="flex flex-col items-center"
                      >
                        <div className="relative">
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ transform: "scale(1.10)" }}
                          >
                            <svg width="150" height="150" viewBox="0 0 180 180">
                              <circle
                                cx="90"
                                cy="90"
                                r="82"
                                fill="none"
                                stroke="#FFD700"
                                strokeWidth="6"
                                strokeDasharray="3,3"
                                opacity="0.6"
                              />
                              <circle
                                cx="90"
                                cy="90"
                                r="77"
                                fill="none"
                                stroke="#FFA500"
                                strokeWidth="3"
                                opacity="0.4"
                              />
                            </svg>
                          </div>

                          <div
                            style={{
                              position: "relative",
                              width: "140px",
                              height: "140px",
                              borderRadius: "50%",
                              border: "4px solid #F87171",
                              overflow: "hidden",
                              backgroundColor: "white",
                              boxShadow:
                                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                            }}
                          >
                            <img
                              src={getRankImage(student.rank)}
                              alt={`Rank ${student.rank}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                padding: "8px",
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-0.5 text-center">
                          {/* ✅ Grade Letter as Text */}
                          <div
                            style={{
                              fontSize: "30px",
                              fontWeight: 900,
                              fontFamily: "Arial, sans-serif",
                              color: getGradeColor(student.letterGrade),
                              lineHeight: "1",
                              marginBottom: "4px",
                            }}
                          >
                            {displayGrade(student.letterGrade)}
                          </div>

                          {/* Average Score */}
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              color: "#C2410C",
                              fontFamily: "Khmer OS Battambang",
                              marginBottom: "2px",
                            }}
                          >
                            មធ្យមភាគ {student.averageScore.toFixed(2)}
                          </div>

                          {/* Student Name */}
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 900,
                              color: "#111827",
                              fontFamily: "Khmer OS Muol Light",
                            }}
                          >
                            {student.khmerName}
                          </div>

                          {/* Class Name (for grade report) */}
                          {reportType === "grade" && (
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#4B5563",
                                fontFamily: "Khmer OS Battambang",
                                marginTop: "2px",
                              }}
                            >
                              ថ្នាក់ {student.className}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Approval Section */}
          <div className="mt-auto pt-3 border-t-2 border-gray-300">
            <div className="grid grid-cols-2 gap-12 mt-3">
              <div className="text-center">
                <p
                  className="text-xs font-bold mb-1"
                  style={{ fontFamily: "Khmer OS Battambang" }}
                >
                  បានឃើញ និងឯកភាព
                </p>

                <p
                  className="text-xs font-bold text-blue-600"
                  style={{ fontFamily: "Khmer OS Muol Light" }}
                >
                  {principalName || "នាយកសាលា"}
                </p>
              </div>

              <div className="text-center">
                <p
                  className="text-xs font-bold mb-0.5"
                  style={{ fontFamily: "Khmer OS Battambang" }}
                >
                  {oldKhmerDate ||
                    "ថ្ងៃចន្ទ ១៥រោច ខែមិគសិរ ឆ្នាំជូត សំរឹទ្ធិ ព. ស. ២៥៦៩"}
                </p>
                <p
                  className="text-xs font-bold mb-0.5"
                  style={{ fontFamily: "Khmer OS Battambang" }}
                >
                  {newKhmerDate || `សៀមរាប ថ្ងៃទី${getCurrentDate()}`}
                </p>
                {reportType === "class" && (
                  <>
                    <p
                      className="text-xs font-bold mb-0.5"
                      style={{ fontFamily: "Khmer OS Muol Light" }}
                    >
                      គ្រូទទួលបន្ទុកថ្នាក់
                    </p>
                    <div className="h-10"></div>
                    <p
                      className="text-xs font-bold text-blue-600"
                      style={{ fontFamily: "Khmer OS Muol Light" }}
                    >
                      {teacherName || "គ្រូបន្ទុកថ្នាក់"}
                    </p>
                  </>
                )}
                {reportType === "grade" && (
                  <>
                    <p
                      className="text-xs font-bold mb-0.5 mt-2"
                      style={{ fontFamily: "Khmer OS Muol Light" }}
                    >
                      គ្រូទទួលបន្ទុក
                    </p>
                    <div className="h-10"></div>
                    {/* <p
                      className="text-xs font-bold text-blue-600"
                      style={{ fontFamily: "Khmer OS Muol Light" }}
                    >
                      ក្រុមគ្រូបង្រៀនថ្នាក់ទី {grade}
                    </p> */}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
