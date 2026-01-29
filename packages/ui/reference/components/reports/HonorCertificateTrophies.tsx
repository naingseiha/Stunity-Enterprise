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

export default function HonorCertificateTrophies({
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
  // ✅ UPDATED: New trophy images
  const getTrophyImage = (rank: number): string => {
    const images = [
      "/images/awards/trophy1.png",
      "/images/awards/trophy2.png",
      "/images/awards/trophy3.png",
      "/images/awards/trophy4.png",
      "/images/awards/trophy5.png",
    ];
    return images[rank - 1] || "/images/awards/trophy5.png";
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
        return "#10B981";
      case "B":
        return "#3B82F6";
      case "C":
        return "#F59E0B";
      case "D":
        return "#F97316";
      case "E":
        return "#EF4444";
      case "F":
        return "#DC2626";
      default:
        return "#6B7280";
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
        {/* Enhanced Trophy Background */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)",
            }}
          />

          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.12,
            }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="confettiPattern"
                x="0"
                y="0"
                width="100"
                height="100"
                patternUnits="userSpaceOnUse"
              >
                <rect
                  x="10"
                  y="10"
                  width="8"
                  height="15"
                  fill="#FBBF24"
                  opacity="0.6"
                  transform="rotate(45 14 17. 5)"
                />
                <rect
                  x="60"
                  y="30"
                  width="8"
                  height="15"
                  fill="#3B82F6"
                  opacity="0.6"
                  transform="rotate(-30 64 37.5)"
                />
                <rect
                  x="35"
                  y="55"
                  width="8"
                  height="15"
                  fill="#EC4899"
                  opacity="0.6"
                  transform="rotate(20 39 62.5)"
                />
                <rect
                  x="80"
                  y="70"
                  width="8"
                  height="15"
                  fill="#10B981"
                  opacity="0.6"
                  transform="rotate(-45 84 77.5)"
                />
                <rect
                  x="20"
                  y="85"
                  width="8"
                  height="15"
                  fill="#F59E0B"
                  opacity="0.6"
                  transform="rotate(60 24 92.5)"
                />
                <circle cx="50" cy="20" r="4" fill="#8B5CF6" opacity="0.5" />
                <circle cx="75" cy="50" r="4" fill="#EC4899" opacity="0.5" />
                <circle cx="15" cy="65" r="4" fill="#06B6D4" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#confettiPattern)" />
          </svg>

          <div
            style={{
              position: "absolute",
              top: "15%",
              right: "8%",
              fontSize: "64px",
              opacity: 0.08,
            }}
          >
            🏆
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "25%",
              left: "5%",
              fontSize: "56px",
              opacity: 0.08,
            }}
          >
            🥇
          </div>
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "10%",
              fontSize: "48px",
              opacity: 0.06,
            }}
          >
            ⭐
          </div>
          <div
            style={{
              position: "absolute",
              top: "25%",
              right: "15%",
              fontSize: "52px",
              opacity: 0.07,
            }}
          >
            🎯
          </div>

          <div
            style={{
              position: "absolute",
              inset: "16px",
              border: "3px double rgba(251, 191, 36, 0.3)",
              borderRadius: "16px",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "24px",
              border: "2px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "12px",
              pointerEvents: "none",
            }}
          />
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

            <div className="text-center">
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

          {/* Top 5 Students - Trophy Layout */}
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
                {/* Rank 1 - Center, Larger */}
                {topStudents[0] && (
                  <div className="flex flex-col items-center">
                    <div
                      className="relative flex items-center justify-center"
                      style={{ width: "190px", height: "200px" }}
                    >
                      {/* Glowing Effect */}
                      <div
                        style={{
                          position: "absolute",
                          inset: "-20px",
                          background:
                            "radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)",
                          borderRadius: "50%",
                        }}
                      />

                      {/* ✅ Trophy Image Only - No badges */}
                      <img
                        src={getTrophyImage(1)}
                        alt="Trophy 1"
                        style={{
                          width: "190px",
                          height: "190px",
                          objectFit: "contain",
                          filter:
                            "drop-shadow(0 20px 40px rgba(255, 215, 0, 0.4))",
                        }}
                      />
                    </div>

                    {/* ✅ Grade Text Below Trophy (No circle) */}
                    <div
                      style={{
                        marginTop: "-5px",
                        fontSize: "30px",
                        fontWeight: 900,
                        fontFamily: "Arial, sans-serif",
                        color: getGradeColor(topStudents[0].letterGrade),
                        textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      {displayGrade(topStudents[0].letterGrade)}
                    </div>

                    <div className="mt-0 text-center">
                      <div className="text-xs text-orange-700 font-bold mb-0.5">
                        មធ្យមភាគ {topStudents[0].averageScore.toFixed(2)}
                      </div>
                      <div
                        className="text-base font-black text-gray-900"
                        style={{ fontFamily: "Khmer OS Muol Light" }}
                      >
                        {topStudents[0].khmerName}
                      </div>
                      {reportType === "grade" && (
                        <div className="text-xs text-gray-600 mt-0.5 font-semibold">
                          ថ្នាក់ {topStudents[0].className}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ranks 2-3 - Side by Side */}
                <div
                  className="grid grid-cols-2 gap-8 max-w-4xl mx-auto px-4"
                  style={{ marginTop: "-180px" }}
                >
                  {topStudents.slice(1, 3).map((student) => (
                    <div
                      key={student.studentId}
                      className="flex flex-col items-center"
                    >
                      <div
                        className="relative flex items-center justify-center"
                        style={{ width: "165px", height: "180px" }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: "-15px",
                            background: `radial-gradient(circle, ${
                              student.rank === 2
                                ? "rgba(192, 192, 192, 0.25)"
                                : "rgba(205, 127, 50, 0.25)"
                            } 0%, transparent 70%)`,
                            borderRadius: "50%",
                          }}
                        />

                        {/* ✅ Trophy Image Only */}
                        <img
                          src={getTrophyImage(student.rank)}
                          alt={`Trophy ${student.rank}`}
                          style={{
                            width: "165px",
                            height: "165px",
                            objectFit: "contain",
                            filter: `drop-shadow(0 15px 30px ${
                              student.rank === 2
                                ? "rgba(192, 192, 192, 0.3)"
                                : "rgba(205, 127, 50, 0.3)"
                            })`,
                          }}
                        />
                      </div>

                      {/* ✅ Grade Text Below Trophy */}
                      <div
                        style={{
                          marginTop: "-5px",
                          fontSize: "26px",
                          fontWeight: 900,
                          fontFamily: "Arial, sans-serif",
                          color: getGradeColor(student.letterGrade),
                          textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        {displayGrade(student.letterGrade)}
                      </div>

                      <div className="mt-0 text-center">
                        <div className="text-xs text-orange-700 font-bold mb-0.5">
                          មធ្យមភាគ {student.averageScore.toFixed(2)}
                        </div>
                        <div
                          className="text-sm font-black text-gray-900"
                          style={{ fontFamily: "Khmer OS Muol Light" }}
                        >
                          {student.khmerName}
                        </div>
                        {reportType === "grade" && (
                          <div className="text-xs text-gray-600 mt-0.5 font-semibold">
                            ថ្នាក់ {student.className}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ranks 4-5 - Smaller */}
                {topStudents.length >= 4 && (
                  <div className="grid grid-cols-2 gap-8 max-w-3xl mx-auto px-4">
                    {topStudents.slice(3, 5).map((student) => (
                      <div
                        key={student.studentId}
                        className="flex flex-col items-center"
                      >
                        <div
                          className="relative flex items-center justify-center"
                          style={{ width: "145px", height: "160px" }}
                        >
                          {/* ✅ Trophy Image Only */}
                          <img
                            src={getTrophyImage(student.rank)}
                            alt={`Trophy ${student.rank}`}
                            style={{
                              width: "145px",
                              height: "145px",
                              objectFit: "contain",
                              filter:
                                "drop-shadow(0 10px 20px rgba(148, 163, 184, 0.3))",
                            }}
                          />
                        </div>

                        {/* ✅ Grade Text Below Trophy */}
                        <div
                          style={{
                            marginTop: "-5px",
                            fontSize: "26px",
                            fontWeight: 900,
                            fontFamily: "Arial, sans-serif",
                            color: getGradeColor(student.letterGrade),
                            textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          {displayGrade(student.letterGrade)}
                        </div>

                        <div className="mt-0 text-center">
                          <div className="text-xs text-orange-700 font-bold mb-0.5">
                            មធ្យមភាគ {student.averageScore.toFixed(2)}
                          </div>
                          <div
                            className="text-sm font-black text-gray-900"
                            style={{ fontFamily: "Khmer OS Muol Light" }}
                          >
                            {student.khmerName}
                          </div>
                          {reportType === "grade" && (
                            <div className="text-xs text-gray-600 mt-0.5 font-semibold">
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

          {/* Footer */}
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
