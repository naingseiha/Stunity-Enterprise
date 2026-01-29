"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface AwardReportProps {
  topStudents: TopStudent[];
  reportType: "class" | "grade";
  className?: string;
  grade?: string;
  academicYear: string;
}

interface TopStudent {
  rank: number;
  studentId: string;
  khmerName: string;
  className: string;
  averageScore: number;
  tied?: boolean;
}

export default function AwardReport({
  topStudents,
  reportType,
  className,
  grade,
  academicYear,
}: AwardReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(
        imgData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );

      const fileName = `តារាងកិត្តិយស_${
        reportType === "class" ? className : `Grade_${grade}`
      }_${academicYear}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const getAwardSymbol = (rank: number) => {
    switch (rank) {
      case 1:
        return "🏆";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      case 4:
      case 5:
        return "🎖️";
      default:
        return "🏅";
    }
  };

  const getRankText = (rank: number) => {
    const khmerNumbers = ["", "១", "២", "៣", "៤", "៥"];
    return khmerNumbers[rank] || rank.toString();
  };

  const getBoxColors = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          border: "border-yellow-300",
          bg: "bg-gradient-to-br from-yellow-50 to-orange-50",
          shadow: "shadow-yellow-200",
        };
      case 2:
        return {
          border: "border-gray-300",
          bg: "bg-gradient-to-br from-gray-50 to-slate-50",
          shadow: "shadow-gray-200",
        };
      case 3:
        return {
          border: "border-orange-300",
          bg: "bg-gradient-to-br from-orange-50 to-amber-50",
          shadow: "shadow-orange-200",
        };
      case 4:
        return {
          border: "border-blue-300",
          bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
          shadow: "shadow-blue-200",
        };
      case 5:
        return {
          border: "border-green-300",
          bg: "bg-gradient-to-br from-green-50 to-emerald-50",
          shadow: "shadow-green-200",
        };
      default:
        return {
          border: "border-gray-300",
          bg: "bg-gray-50",
          shadow: "shadow-gray-200",
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end no-print">
        <button
          onClick={exportToPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-bold shadow-lg transition-all disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              កំពុងនាំចេញ...
            </>
          ) : (
            <>📥 នាំចេញជា PDF</>
          )}
        </button>
      </div>

      {/* Report Container - A4 Size */}
      <div
        ref={reportRef}
        className="bg-white mx-auto"
        style={{
          width: "210mm",
          height: "297mm",
          padding: "15mm 20mm",
        }}
      >
        {/* ✅ HEADER */}
        <div className="mb-5">
          {/* Top Row */}
          <div className="flex justify-between items-start mb-5">
            {/* Left - Ministry & School */}
            <div
              className="text-left"
              style={{
                fontFamily: "Khmer OS Bokor",
                fontSize: "11pt",
                lineHeight: "1.7",
                marginTop: "18px",
              }}
            >
              <div>មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប</div>
              <div>វិទ្យាល័យ ហ៊ុន សែនស្វាយធំ</div>
            </div>

            {/* Right - Royal Motto */}
            <div
              className="flex flex-col items-center text-center"
              style={{
                fontFamily: "Khmer OS Muol Light",
                fontSize: "11pt",
                lineHeight: "1.4",
              }}
            >
              <div className="mb-0. 5">ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div className="mb-0. 5">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
              <div
                className="text-red-600"
                style={{
                  fontFamily: "Tacteing",
                  fontSize: "13pt",
                  marginTop: "2px",
                }}
              >
                3
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1
              className="text-3xl font-black mb-2"
              style={{ fontFamily: "Khmer OS Muol Light", lineHeight: "1.2" }}
            >
              តារាងកិត្តិយស
            </h1>

            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-28 h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
              <div
                className="text-red-600 text-lg"
                style={{ fontFamily: "Tacteing" }}
              >
                3
              </div>
              <div className="w-28 h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
            </div>

            <div
              className="text-lg font-bold text-gray-800 mb-1"
              style={{ fontFamily: "Khmer OS Muol Light" }}
            >
              ឆ្នាំសិក្សា៖ {academicYear}
            </div>

            {reportType === "class" && className && (
              <div
                className="text-base font-bold text-gray-700"
                style={{ fontFamily: "Khmer OS Muol Light" }}
              >
                ថ្នាក់៖ {className}
              </div>
            )}
            {reportType === "grade" && grade && (
              <div
                className="text-base font-bold text-gray-700"
                style={{ fontFamily: "Khmer OS Muol Light" }}
              >
                កម្រិត៖ ថ្នាក់ទី {grade}
              </div>
            )}
          </div>
        </div>

        {/* ✅ TOP STUDENTS - Same Design for Both Class & Grade */}
        <div className="mb-8">
          {topStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🏆</div>
              <p className="text-lg text-gray-500 font-bold">
                មិនទាន់មានទិន្នន័យ
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Rank 1 - Large Box */}
              {topStudents[0] && (
                <div className="flex justify-center">
                  <div
                    className={`${getBoxColors(1).bg} ${
                      getBoxColors(1).border
                    } border-2 rounded-2xl shadow-lg ${
                      getBoxColors(1).shadow
                    } p-5 w-full max-w-md`}
                  >
                    <div className="text-center">
                      {/* Award Symbol */}
                      <div className="text-7xl mb-3">{getAwardSymbol(1)}</div>

                      {/* Rank Badge */}
                      <div className="inline-block bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full mb-3 shadow-sm">
                        <span
                          className="text-base font-black"
                          style={{ fontFamily: "Khmer OS Muol Light" }}
                        >
                          លេខ {getRankText(1)}
                        </span>
                      </div>

                      {/* Name */}
                      <h2
                        className="text-2xl font-black text-gray-900 leading-snug"
                        style={{ fontFamily: "Khmer OS Muol Light" }}
                      >
                        {topStudents[0].khmerName}
                      </h2>

                      {/* Class (if grade-wide) */}
                      {reportType === "grade" && (
                        <div
                          className="text-base text-gray-600 mt-2"
                          style={{ fontFamily: "Khmer OS Muol Light" }}
                        >
                          ថ្នាក់៖ {topStudents[0].className}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ranks 2-5 - Grid with Boxes */}
              {topStudents.length > 1 && (
                <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {topStudents.slice(1, 5).map((student) => {
                    const colors = getBoxColors(student.rank);
                    return (
                      <div
                        key={student.studentId}
                        className={`${colors.bg} ${colors.border} border-2 rounded-xl shadow-md ${colors.shadow} p-4`}
                      >
                        <div className="text-center">
                          {/* Award Symbol */}
                          <div className="text-5xl mb-2">
                            {getAwardSymbol(student.rank)}
                          </div>

                          {/* Rank Badge */}
                          <div className="inline-block bg-white bg-opacity-80 px-3 py-0.5 rounded-full mb-2 shadow-sm">
                            <span
                              className="text-sm font-black text-gray-800"
                              style={{ fontFamily: "Khmer OS Muol Light" }}
                            >
                              លេខ {getRankText(student.rank)}
                              {student.tied && (
                                <span className="ml-1 text-xs text-yellow-600">
                                  (ស្មើ)
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Name */}
                          <h3
                            className="text-xl font-black text-gray-900 leading-snug"
                            style={{ fontFamily: "Khmer OS Muol Light" }}
                          >
                            {student.khmerName}
                          </h3>

                          {/* Class (if grade-wide) */}
                          {reportType === "grade" && (
                            <div
                              className="text-sm text-gray-600 mt-1"
                              style={{ fontFamily: "Khmer OS Muol Light" }}
                            >
                              ថ្នាក់៖ {student.className}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Extra Students (6+) - Compact Boxes */}
              {topStudents.length > 5 && (
                <div className="border-t border-gray-200 pt-3 mt-4">
                  <div
                    className="text-center text-xs font-bold text-gray-600 mb-2"
                    style={{ fontFamily: "Khmer OS Muol Light" }}
                  >
                    សិស្សផ្សេងទៀតដែលជាប់ពិន្ទុស្មើ
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {topStudents.slice(5).map((student) => (
                      <div
                        key={student.studentId}
                        className="bg-gray-50 border border-gray-300 rounded-lg p-2 text-center shadow-sm"
                      >
                        <div className="text-2xl mb-0.5">
                          {getAwardSymbol(student.rank)}
                        </div>
                        <div
                          className="text-sm font-black text-gray-900"
                          style={{ fontFamily: "Khmer OS Muol Light" }}
                        >
                          {student.khmerName}
                        </div>
                        {reportType === "grade" && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            {student.className}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ FOOTER */}
        <div className="mt-auto pt-4 border-t-2 border-gray-300">
          <div className="grid grid-cols-3 gap-6 text-center">
            {/* Teacher */}
            <div>
              <div
                className="font-bold text-xs mb-12"
                style={{ fontFamily: "Khmer OS Muol Light" }}
              >
                គ្រូបន្ទុកថ្នាក់
              </div>
              <div className="border-t-2 border-gray-800 pt-1 inline-block px-6">
                <div className="text-xs font-bold">ឈ្មោះ និងហត្ថលេខា</div>
              </div>
            </div>

            {/* Principal */}
            <div>
              <div
                className="font-bold text-xs mb-12"
                style={{ fontFamily: "Khmer OS Muol Light" }}
              >
                នាយកសាលា
              </div>
              <div className="border-t-2 border-gray-800 pt-1 inline-block px-6">
                <div className="text-xs font-bold">ឈ្មោះ និងហត្ថលេខា</div>
              </div>
            </div>

            {/* Council */}
            <div>
              <div
                className="font-bold text-xs mb-12"
                style={{ fontFamily: "Khmer OS Muol Light" }}
              >
                ប្រធានក្រុមប្រឹក្សា
              </div>
              <div className="border-t-2 border-gray-800 pt-1 inline-block px-6">
                <div className="text-xs font-bold">ឈ្មោះ និងហត្ថលេខា</div>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="text-center mt-4 text-xs text-gray-600">
            ថ្ងៃខែឆ្នាំ៖ ........................
          </div>
        </div>
      </div>
    </div>
  );
}
